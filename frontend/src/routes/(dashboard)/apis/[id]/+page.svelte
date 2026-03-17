<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import {
    DrawerStack,
    Pill,
    FormField,
    FormLabel,
    EndpointItem,
    ParameterEditor,
    QueryParametersEditor,
    ObjectSelector,
    ResponsePreview,
    GenerateModal
  } from '$lib/components';
  import { ObjectFormContent, FieldFormContent } from '$lib/components/form';
  import { HTTP_METHODS } from '$lib/types';
  import type { ObjectDefinition, Field } from '$lib/types';
  import { isValidSnakeCaseName, isValidPascalCaseName } from '$lib/utils/validation';
  import { createApiDetailState } from '$lib/stores/apiDetailState.svelte';
  import { getApiById } from '$lib/stores/apis';
  import { namespacesStore } from '$lib/stores/namespaces';
  import { fieldsStore } from '$lib/stores/fields';
  import { typesStore, getTypeIdByName } from '$lib/stores/types';
  import { fieldConstraintsStore } from '$lib/stores/fieldConstraints';
  import { fieldValidatorTemplatesStore } from '$lib/stores/fieldValidatorTemplates';
  import { modelValidatorTemplatesStore } from '$lib/stores/modelValidatorTemplates';
  import { objectsStore } from '$lib/stores/objects';
  import { createObjectAction, createFieldAction } from '$lib/domain/mutations';
  import { showToast } from '$lib/stores/toasts';

  // Get API ID from URL
  let apiId = $derived(page.params.id ?? '');

  // Check if existing API exists
  let apiExists = $derived(apiId !== '' && getApiById(apiId) !== undefined);

  // Create state container for this specific API
  const apiState = createApiDetailState({
    apiId: untrack(() => apiId),
    onNavigateBack: () => goto('/apis')
  });

  // Fields filtered by API namespace (for path param field selectors)
  const availableFields = $derived(
    $fieldsStore.filter(f => f.namespaceId === apiState.apiNamespaceId)
  );

  // Fields on the endpoint's selected object (for query param field selector)
  const endpointObjectFields = $derived.by((): Field[] => {
    const objectId = apiState.editedEndpoint?.objectId;
    if (!objectId) return [];
    const obj = $objectsStore.find(o => o.id === objectId);
    if (!obj) return [];
    return obj.fields
      .map(ref => $fieldsStore.find(f => f.id === ref.fieldId))
      .filter((f): f is Field => f !== undefined);
  });

  // Namespace name for display
  let namespaceName = $derived(
    $namespacesStore.find(ns => ns.id === apiState.apiNamespaceId)?.name ?? ''
  );

  // Filtered tag suggestions based on input
  const filteredTags = $derived.by(() => {
    const input = apiState.tagInputValue.toLowerCase().trim();
    if (!input) return apiState.tags;
    return apiState.tags.filter(t => t.toLowerCase().includes(input));
  });

  // Check if input exactly matches an existing tag
  const exactTagMatch = $derived(
    apiState.tags.find(t => t.toLowerCase() === apiState.tagInputValue.toLowerCase().trim())
  );

  function handleTagInputCommit() {
    const trimmed = apiState.tagInputValue.trim();
    if (trimmed) {
      apiState.handleTagSelect(trimmed);
    }
  }

  // ============================================================================
  // Inline Object Creation Overlay
  // ============================================================================

  let objectCreateOpen = $state(false);
  let editedNewObject = $state<ObjectDefinition | null>(null);
  let objectCreateTarget = $state<'query' | 'body'>('body');
  let objectFormTouched = $state(false);
  let objectSaving = $state(false);

  let objectFormErrors = $derived.by(() => {
    if (!editedNewObject) return {};
    const errors: Record<string, string> = {};
    if (!editedNewObject.name.trim()) {
      errors.name = 'Object name is required';
    } else if (!isValidPascalCaseName(editedNewObject.name)) {
      errors.name = 'Must be PascalCase (e.g. UserEmail)';
    }
    return errors;
  });
  let objectFormValid = $derived(editedNewObject !== null && Object.keys(objectFormErrors).length === 0);
  let objectImmediateErrors = $derived.by((): Record<string, string> => {
    if (!editedNewObject || !editedNewObject.name.trim()) return {};
    if (!isValidPascalCaseName(editedNewObject.name)) {
      return { name: objectFormErrors.name };
    }
    return {};
  });
  let objectVisibleErrors = $derived({ ...objectImmediateErrors, ...(objectFormTouched ? objectFormErrors : {}) });

  function openObjectCreate(target: 'query' | 'body') {
    objectCreateTarget = target;
    editedNewObject = {
      id: '',
      namespaceId: apiState.apiNamespaceId,
      name: '',
      description: '',
      fields: [],
      relationships: [],
      validators: [],
      usedInApis: []
    };
    objectFormTouched = false;
    objectCreateOpen = true;
  }

  function closeObjectCreate() {
    objectCreateOpen = false;
    editedNewObject = null;
  }

  async function handleCreateObject() {
    objectFormTouched = true;
    if (!objectFormValid || !editedNewObject) return;

    objectSaving = true;
    try {
      const result = await createObjectAction({
        namespaceId: editedNewObject.namespaceId,
        name: editedNewObject.name,
        description: editedNewObject.description,
        fields: editedNewObject.fields,
        validators: editedNewObject.validators.length > 0
          ? editedNewObject.validators.map(v => ({
              templateId: v.templateId,
              parameters: v.parameters ?? undefined,
              fieldMappings: v.fieldMappings
            }))
          : undefined
      });

      if (!result.success) {
        showToast(result.error ?? 'Failed to create object', 'error');
        return;
      }

      // Auto-select the new object in the appropriate selector
      const newObjectId = result.data!.id;
      if (objectCreateTarget === 'query') {
        apiState.handleSelectQueryParamsObject(newObjectId);
      } else {
        apiState.handleSelectObject(newObjectId);
      }

      showToast(`Object "${editedNewObject.name}" created`, 'success');
      closeObjectCreate();
    } finally {
      objectSaving = false;
    }
  }

  // ============================================================================
  // Inline Field Creation Overlay (from within Object creation)
  // ============================================================================

  let fieldCreateOpen = $state(false);
  let editedNewField = $state<Field | null>(null);
  let fieldFormTouched = $state(false);
  let fieldSaving = $state(false);

  let fieldFormErrors = $derived.by(() => {
    if (!editedNewField) return {};
    const errors: Record<string, string> = {};
    if (!editedNewField.name.trim()) {
      errors.name = 'Field name is required';
    } else if (!isValidSnakeCaseName(editedNewField.name)) {
      errors.name = 'Must be snake_case (e.g. user_email)';
    }
    if (!editedNewField.type) errors.type = 'Type is required';
    return errors;
  });
  let fieldFormValid = $derived(editedNewField !== null && Object.keys(fieldFormErrors).length === 0);
  let fieldImmediateErrors = $derived.by((): Record<string, string> => {
    if (!editedNewField || !editedNewField.name.trim()) return {};
    if (!isValidSnakeCaseName(editedNewField.name)) {
      return { name: fieldFormErrors.name };
    }
    return {};
  });
  let fieldVisibleErrors = $derived({ ...fieldImmediateErrors, ...(fieldFormTouched ? fieldFormErrors : {}) });

  function openFieldCreate() {
    editedNewField = {
      id: '',
      namespaceId: apiState.apiNamespaceId,
      name: '',
      type: $typesStore.length > 0 ? $typesStore[0].name : 'str',
      container: null,
      constraints: [],
      validators: [],
      usedInApis: [],
      description: '',
      defaultValue: ''
    };
    fieldFormTouched = false;
    fieldCreateOpen = true;
  }

  function closeFieldCreate() {
    fieldCreateOpen = false;
    editedNewField = null;
  }

  // ============================================================================
  // Code Generation Modal
  // ============================================================================

  let generateModalOpen = $state(false);

  async function handleCreateField() {
    fieldFormTouched = true;
    if (!fieldFormValid || !editedNewField) return;

    const typeId = getTypeIdByName(editedNewField.type);
    if (!typeId) {
      showToast(`Unknown type "${editedNewField.type}"`, 'error');
      return;
    }

    fieldSaving = true;
    try {
      const result = await createFieldAction({
        namespaceId: editedNewField.namespaceId,
        name: editedNewField.name,
        typeId,
        container: editedNewField.container,
        description: editedNewField.description,
        defaultValue: editedNewField.defaultValue,
        constraints: editedNewField.constraints.map(c => ({ constraintId: c.constraintId, value: c.value })),
        validators: editedNewField.validators.length > 0
          ? editedNewField.validators.map(v => ({ templateId: v.templateId, parameters: v.parameters ?? undefined }))
          : undefined
      });

      if (!result.success) {
        showToast(result.error ?? 'Failed to create field', 'error');
        return;
      }

      // Auto-add the new field to the object being created
      if (editedNewObject) {
        editedNewObject = {
          ...editedNewObject,
          fields: [...editedNewObject.fields, { fieldId: result.data!.id, optional: false, isPk: false, appears: 'both' as const }]
        };
      }

      showToast(`Field "${editedNewField.name}" created`, 'success');
      closeFieldCreate();
    } finally {
      fieldSaving = false;
    }
  }
</script>

{#if !apiExists}
  <div class="flex-1 flex items-center justify-center">
    <div class="text-center">
      <i class="fa-solid fa-circle-exclamation text-4xl text-mono-400 mb-4"></i>
      <h2 class="text-xl text-mono-100 mb-2">API Not Found</h2>
      <p class="text-mono-400 mb-4">The API you're looking for doesn't exist or has been deleted.</p>
      <button
        onclick={() => goto('/apis')}
        class="px-4 py-2 bg-green-400 text-mono-950 font-bold tracking-wide hover:bg-green-300"
      >
        Back to APIs
      </button>
    </div>
  </div>
{:else}
  <!-- Compact Header -->
  <div class="bg-mono-950 border-b-2 border-mono-700 py-4 px-6">
    <div class="flex justify-between items-center">
      <!-- Left side -->
      <div>
        <button
          onclick={() => goto('/apis')}
          class="text-sm text-mono-400 hover:text-mono-300 transition-colors flex items-center space-x-1 mb-2"
        >
          <i class="fa-solid fa-arrow-left text-xs"></i>
          <span>Back to APIs</span>
        </button>

        <div class="flex items-center space-x-3 mb-1">
          <h1 class="text-xl font-semibold text-mono-100">{apiState.api?.title || 'Untitled API'}</h1>
          <Pill>{apiState.api?.version ?? ''}</Pill>
        </div>

        {#if apiState.api?.description}
          <p class="text-sm text-mono-400 mb-2">{apiState.api.description}</p>
        {/if}

        <div class="flex items-center space-x-4 text-xs text-mono-400">
          {#if apiState.api?.serverUrl}
            <div class="flex items-center space-x-1.5">
              <i class="fa-solid fa-server"></i>
              <code class="font-mono">{apiState.api.serverUrl}</code>
            </div>
          {/if}
          {#if apiState.api?.baseUrl}
            <div class="flex items-center space-x-1.5">
              <i class="fa-solid fa-link"></i>
              <code class="font-mono">{apiState.api.baseUrl}</code>
            </div>
          {/if}
          {#if namespaceName}
            <div class="flex items-center space-x-1.5">
              <i class="fa-solid fa-layer-group"></i>
              <span>{namespaceName}</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right side -->
      <div class="flex items-center space-x-2">
        <button
          onclick={() => generateModalOpen = true}
          class="px-4 py-2 bg-green-400 text-mono-950 font-bold tracking-wide flex items-center space-x-2 hover:bg-green-300 cursor-pointer transition-colors"
        >
          <i class="fa-solid fa-code"></i>
          <span>Generate Code</span>
        </button>
        <button
          onclick={apiState.handleAddEndpoint}
          class="px-4 py-2 border border-mono-600 text-mono-300 flex items-center space-x-2 hover:bg-mono-950 cursor-pointer transition-colors"
        >
          <i class="fa-solid fa-plus"></i>
          <span>Add Endpoint</span>
        </button>
        <button
          onclick={apiState.openEditDrawer}
          class="px-4 py-2 border border-mono-600 text-mono-300 flex items-center space-x-2 hover:bg-mono-950 cursor-pointer transition-colors"
        >
          <i class="fa-solid fa-pen-to-square"></i>
          <span>Edit API</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="flex-1 overflow-auto">
    <div class="max-w-7xl mx-auto p-6">
      {#if apiState.endpoints.length === 0}
        <div class="bg-mono-900 border-2 border-mono-700">
          <div class="text-center py-8 text-mono-400">
            <i class="fa-solid fa-route text-2xl mb-2 text-mono-600"></i>
            <p class="text-sm">No endpoints yet. Create your first API endpoint.</p>
          </div>
        </div>
      {:else}
        <!-- Swagger-style flush tag sections -->
        <div class="overflow-hidden border-2 border-mono-700">
          {#each apiState.allTagSections as section, i (section.tag)}
            {@const isExpanded = apiState.expandedTags.has(section.tag)}
            <div class="{i < apiState.allTagSections.length - 1 ? 'border-b border-mono-700' : ''}">
              <!-- Tag section header -->
              <button
                type="button"
                onclick={() => apiState.toggleTagSection(section.tag)}
                class="w-full flex items-center justify-between px-4 py-3 bg-mono-900 hover:bg-mono-950 transition-colors text-left"
              >
                <div class="flex items-center space-x-2">
                  <h2 class="text-base font-semibold text-mono-100">{section.tag}</h2>
                  <span class="text-xs text-mono-400">{section.endpoints.length} endpoint{section.endpoints.length !== 1 ? 's' : ''}</span>
                </div>
                <i class="fa-solid fa-chevron-down text-mono-400 text-sm transition-transform {isExpanded ? 'rotate-0' : '-rotate-90'}"></i>
              </button>
              <!-- Tag section body -->
              {#if isExpanded}
                <div class="px-4 pb-3">
                  <div class="space-y-2">
                    {#each section.endpoints as endpoint (endpoint.id)}
                      <EndpointItem
                        {endpoint}
                        onClick={() => apiState.openEndpoint(endpoint)}
                      />
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  {#snippet editApiFormContent(_: { close: () => void })}
    <div class="space-y-4">
      <!-- Namespace (Read-only) -->
      <div>
        <FormLabel label="Namespace" forId="edit-namespace" />
        <input
          id="edit-namespace"
          type="text"
          value={namespaceName}
          disabled
          class="w-full px-3 py-1.5 text-sm border border-mono-600 bg-mono-950 text-mono-400 cursor-not-allowed"
        />
        <p class="text-xs text-mono-400 mt-1">Namespace cannot be changed after creation</p>
      </div>

      <!-- API Title -->
      <FormField
        id="edit-title"
        label="API Title"
        bind:value={apiState.editForm.title}
        error={apiState.editVisibleErrors?.title}
        required
      />

      <!-- Version -->
      <FormField
        id="edit-version"
        label="Version"
        bind:value={apiState.editForm.version}
        placeholder="1.0.0"
      />

      <!-- Description -->
      <div>
        <FormLabel label="Description" forId="edit-description" />
        <textarea
          id="edit-description"
          bind:value={apiState.editForm.description}
          rows="3"
          placeholder="Describe what this API does..."
          class="w-full px-3 py-1.5 text-sm border border-mono-600 focus:ring-2 focus:ring-green-400 focus:border-transparent"
        ></textarea>
      </div>

      <!-- Server URL -->
      <FormField
        id="edit-server-url"
        label="Server URL"
        bind:value={apiState.editForm.serverUrl}
        placeholder="https://api.example.com"
      />

      <!-- Base URL -->
      <FormField
        id="edit-base-url"
        label="Base URL"
        bind:value={apiState.editForm.baseUrl}
        placeholder="/api/v1"
      />
    </div>
  {/snippet}

  {#snippet editApiFormFooter(_: { close: () => void })}
    {#if !apiState.showEditDeleteConfirm}
      <button
        type="button"
        onclick={apiState.handleEditSave}
        disabled={!apiState.hasEditChanges || apiState.isSaving}
        class="w-full px-4 py-2 transition-colors font-medium {apiState.hasEditChanges && !apiState.isSaving ? 'bg-green-400 text-mono-950 hover:bg-green-300 font-bold tracking-wide cursor-pointer' : 'bg-mono-700 text-mono-500 cursor-not-allowed'}"
      >
        {#if apiState.isSaving}
          <i class="fa-solid fa-spinner fa-spin mr-2"></i>
          Saving...
        {:else}
          Save Changes
        {/if}
      </button>
      <button
        type="button"
        onclick={apiState.handleEditUndo}
        disabled={!apiState.hasEditChanges}
        class="w-full px-4 py-2 border transition-colors font-medium {apiState.hasEditChanges ? 'border-mono-600 text-mono-300 hover:bg-mono-950 cursor-pointer' : 'border-mono-700 text-mono-400 cursor-not-allowed bg-mono-950'}"
      >
        Undo
      </button>
      <button
        type="button"
        onclick={apiState.handleEditDeleteClick}
        class="w-full px-4 py-2 bg-mono-800 text-red-400 hover:bg-red-400/10 cursor-pointer transition-colors font-medium flex items-center justify-center space-x-2"
      >
        <i class="fa-solid fa-xmark"></i>
        <span>Delete API</span>
      </button>
    {:else}
      <div class="bg-red-400/10 border border-red-400/30 p-3">
        <p class="text-sm text-red-400 mb-2">Delete this API and all its endpoints?</p>
        <div class="flex space-x-2">
          <button
            type="button"
            onclick={apiState.handleDeleteApi}
            disabled={apiState.isSaving}
            class="flex-1 px-3 py-1.5 text-sm font-medium transition-colors {apiState.isSaving ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'}"
          >
            {#if apiState.isSaving}
              <i class="fa-solid fa-spinner fa-spin mr-1"></i>
              Deleting...
            {:else}
              Yes, Delete
            {/if}
          </button>
          <button
            type="button"
            onclick={apiState.cancelEditDelete}
            disabled={apiState.isSaving}
            class="flex-1 px-3 py-1.5 border border-mono-600 text-mono-300 hover:bg-mono-950 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet endpointFormContent(_: { close: () => void })}
    {#if apiState.editedEndpoint}
        <div class="space-y-6" style="container-type: inline-size;">
          <!-- Tag and Description -->
          <div class="endpoint-tag-description">
            <div class="relative">
              <h3 class="text-sm text-mono-300 mb-2 flex items-center font-medium">
                <i class="fa-solid fa-tag mr-2"></i>
                Tag
              </h3>
              <div class="relative">
                <input
                  type="text"
                  bind:value={apiState.tagInputValue}
                  onfocus={() => apiState.tagDropdownOpen = true}
                  onblur={() => setTimeout(() => { apiState.tagDropdownOpen = false; }, 150)}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTagInputCommit();
                    }
                  }}
                  placeholder="Type or select tag..."
                  class="w-full px-3 py-1.5 border border-mono-600 focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm pr-8"
                />
                {#if apiState.tagInputValue}
                  <button
                    type="button"
                    onclick={() => apiState.handleTagSelect(undefined)}
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-300"
                    aria-label="Clear tag"
                  >
                    <i class="fa-solid fa-xmark text-xs"></i>
                  </button>
                {:else}
                  <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
                {/if}
              </div>
              {#if apiState.tagDropdownOpen}
                <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-600 shadow-lg shadow-black/30 max-h-48 overflow-auto">
                  {#if apiState.tagInputValue.trim() && !exactTagMatch}
                    <button
                      type="button"
                      onclick={handleTagInputCommit}
                      class="w-full px-3 py-2 text-left text-sm hover:bg-mono-950 flex items-center space-x-2 text-mono-300 border-b border-mono-700"
                    >
                      <i class="fa-solid fa-plus text-xs"></i>
                      <span>Use "<strong>{apiState.tagInputValue.trim()}</strong>"</span>
                    </button>
                  {/if}
                  {#each filteredTags as tag (tag)}
                    <button
                      type="button"
                      onclick={() => apiState.handleTagSelect(tag)}
                      class="w-full px-3 py-2 text-left text-sm text-mono-300 hover:bg-mono-950 {apiState.editedEndpoint?.tagName === tag ? 'bg-mono-800' : ''}"
                    >
                      {tag}
                    </button>
                  {/each}
                  {#if filteredTags.length === 0 && !apiState.tagInputValue.trim()}
                    <div class="px-3 py-2 text-sm text-mono-400">No tags yet</div>
                  {/if}
                </div>
              {/if}
            </div>
            <div>
              <h3 class="text-sm text-mono-300 mb-2 flex items-center font-medium">
                <i class="fa-solid fa-align-left mr-2"></i>
                Description
              </h3>
              <input
                type="text"
                bind:value={apiState.editedEndpoint.description}
                placeholder="Add a description for this endpoint..."
                class="w-full px-3 py-1.5 border border-mono-600 focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <!-- Method and Path -->
          <div>
            <h3 class="text-sm text-mono-300 mb-2 flex items-center font-medium">
              <i class="fa-solid fa-route mr-2"></i>
              Method & Path
            </h3>
            <div class="endpoint-method-path">
              <select
                bind:value={apiState.editedEndpoint.method}
                class="px-3 py-1.5 border border-mono-600 focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm"
              >
                {#each HTTP_METHODS as method}
                  <option value={method}>{method}</option>
                {/each}
              </select>
              <div class="endpoint-path-input flex items-center border border-mono-600 focus-within:ring-2 focus-within:ring-green-400 focus-within:border-transparent">
                <span class="px-3 py-1.5 text-sm font-mono text-mono-400 bg-mono-950 border-r border-mono-600">/</span>
                <input
                  type="text"
                  value={apiState.editedEndpoint.path.substring(1)}
                  oninput={(e) => apiState.handlePathChange('/' + e.currentTarget.value)}
                  placeholder="users/{`{user_id}`}"
                  class="flex-1 px-3 py-1.5 text-sm font-mono border-0 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
            {#if apiState.pathError}
              <p class="text-xs text-red-500 mt-1">{apiState.pathError}</p>
            {/if}
          </div>

          <!-- Object Selection + Response Shape (input controls, placed near top) -->
          <ObjectSelector
            endpointNamespaceId={apiState.apiNamespaceId}
            selectedObjectId={apiState.editedEndpoint.objectId}
            responseShape={apiState.editedEndpoint.responseShape}
            responseShapeLocked={apiState.isDetailPath}
            responseShapeLockedReason="Detail endpoints return a single object"
            validationErrors={apiState.validationErrors.filter(e => e.rule === 1)}
            onSelectObject={apiState.handleSelectObject}
            onSetResponseShape={apiState.handleSetResponseShape}
            onCreateNewObject={() => openObjectCreate('body')}
          />

          <!-- Path Parameters -->
          <div>
            <h3 class="text-sm text-mono-300 mb-2 flex items-center font-medium">
              <i class="fa-solid fa-link mr-2"></i>
              Path Parameters
            </h3>
            {#if apiState.editedEndpoint.pathParams.length === 0}
              <div class="px-3 py-2 bg-mono-950 rounded border border-mono-700">
                <p class="text-xs text-mono-400">No path parameters. Add parameters to your URL path using <code class="bg-mono-800 px-1 rounded">{`{param_name}`}</code></p>
              </div>
            {:else}
              <div class="px-3 py-1 bg-mono-950 rounded border border-mono-700">
                <!-- Column headers -->
                <div class="flex items-center gap-2 py-1 border-b border-mono-700 text-[10px] text-mono-500 uppercase tracking-wider">
                  <div class="w-28 shrink-0">Name</div>
                  <div class="flex-1">Field</div>
                  <div class="w-20 shrink-0">Type</div>
                  <div class="w-6 shrink-0"></div>
                </div>
                {#each apiState.editedEndpoint.pathParams as param (param.name)}
                  <ParameterEditor
                    paramName={param.name}
                    fieldName={param.field}
                    targetFields={apiState.targetFields}
                    objectFields={endpointObjectFields}
                    validationErrors={apiState.validationErrors.filter(e => (e.rule === 2 || e.rule === 3 || e.rule === 5) && e.param === param.name)}
                    onFieldSelect={(fieldName) => apiState.handlePathParamFieldSelect(param.name, fieldName)}
                  />
                {/each}
              </div>
            {/if}
          </div>

          <!-- Query Parameters (only visible for list endpoints) -->
          <QueryParametersEditor
            queryParams={apiState.editedEndpoint.queryParams ?? []}
            targetFields={apiState.targetFields}
            objectFields={endpointObjectFields}
            responseShape={apiState.editedEndpoint.responseShape}
            pagination={apiState.editedEndpoint.pagination ?? false}
            validationErrors={apiState.validationErrors}
            onAddFromField={apiState.handleAddQueryParamFromField}
            onUpdate={apiState.handleUpdateQueryParam}
            onRemove={apiState.handleRemoveQueryParam}
            onTogglePagination={apiState.handleTogglePagination}
          />

          <!-- Request/Response Preview (output, placed at bottom) -->
          <ResponsePreview
            selectedObjectId={apiState.editedEndpoint.objectId}
            responseShape={apiState.editedEndpoint.responseShape}
          />

        </div>
      {/if}
  {/snippet}

  {#snippet endpointFormFooter(_: { close: () => void })}
    {#if apiState.editedEndpoint}
        {#if apiState.isCreating}
          <div class="flex space-x-2">
            <button
              type="button"
              onclick={apiState.handleCreateEndpoint}
              disabled={!apiState.hasEndpointChanges || apiState.isSaving}
              class="flex-1 px-4 py-2 transition-colors font-medium flex items-center justify-center space-x-2 {apiState.hasEndpointChanges && !apiState.isSaving ? 'bg-green-400 text-mono-950 hover:bg-green-300 font-bold tracking-wide cursor-pointer' : 'bg-mono-700 text-mono-500 cursor-not-allowed'}"
            >
              {#if apiState.isSaving}
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Creating...</span>
              {:else}
                <span>Create Endpoint</span>
              {/if}
            </button>
            <button
              type="button"
              onclick={apiState.handleCancelCreate}
              disabled={apiState.isSaving}
              class="flex-1 px-4 py-2 border border-mono-600 text-mono-300 hover:bg-mono-950 cursor-pointer transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <span>Cancel</span>
            </button>
          </div>
        {:else if !apiState.showEndpointDeleteConfirm}
          <div class="flex space-x-2">
            <button
              type="button"
              onclick={apiState.handleSaveEndpoint}
              disabled={!apiState.hasEndpointChanges}
              class="flex-1 px-4 py-2 transition-colors font-medium flex items-center justify-center space-x-2 {apiState.hasEndpointChanges ? 'bg-green-400 text-mono-950 hover:bg-green-300 font-bold tracking-wide cursor-pointer' : 'bg-mono-700 text-mono-500 cursor-not-allowed'}"
            >
              <span>Save</span>
            </button>
            <button
              type="button"
              onclick={apiState.handleUndoEndpoint}
              disabled={!apiState.hasEndpointChanges}
              class="flex-1 px-4 py-2 border transition-colors font-medium flex items-center justify-center space-x-2 {apiState.hasEndpointChanges ? 'border-mono-600 text-mono-300 hover:bg-mono-950 cursor-pointer' : 'border-mono-700 text-mono-400 cursor-not-allowed bg-mono-950'}"
            >
              <span>Undo</span>
            </button>
            <button
              type="button"
              onclick={() => apiState.handleDuplicateEndpoint(apiState.editedEndpoint!.id)}
              class="flex-1 px-4 py-2 border border-mono-600 text-mono-300 hover:bg-mono-950 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onclick={apiState.handleDeleteEndpointClick}
              class="flex-1 px-4 py-2 border border-mono-600 text-red-400 hover:bg-red-400/10 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <i class="fa-solid fa-xmark"></i>
              <span>Delete</span>
            </button>
          </div>
        {:else}
          <div class="bg-red-400/10 border border-red-400/30 p-3">
            <p class="text-sm text-red-400 mb-2">Are you sure?</p>
            <div class="flex space-x-2">
              <button
                type="button"
                onclick={apiState.handleDeleteEndpoint}
                class="flex-1 px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onclick={apiState.cancelDeleteEndpoint}
                class="flex-1 px-3 py-1.5 border border-mono-600 text-mono-300 hover:bg-mono-950 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      {/if}
  {/snippet}

  {#snippet objectFormContent(_: { close: () => void })}
    {#if editedNewObject}
      <ObjectFormContent
        bind:editedItem={editedNewObject}
        mode="creating"
        {namespaceName}
        {availableFields}
        modelValidatorTemplates={$modelValidatorTemplatesStore}
        visibleErrors={objectVisibleErrors}
        onCreateNewField={openFieldCreate}
      />
    {/if}
  {/snippet}

  {#snippet objectFormFooter(_: { close: () => void })}
    <div class="flex space-x-2">
      <button
        type="button"
        onclick={handleCreateObject}
        disabled={objectSaving}
        class="flex-1 px-4 py-2 transition-colors font-medium flex items-center justify-center space-x-2 {!objectSaving ? 'bg-green-400 text-mono-950 hover:bg-green-300 font-bold tracking-wide cursor-pointer' : 'bg-mono-700 text-mono-500 cursor-not-allowed'}"
      >
        {#if objectSaving}
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Creating...</span>
        {:else}
          <span>Create Object</span>
        {/if}
      </button>
      <button
        type="button"
        onclick={closeObjectCreate}
        disabled={objectSaving}
        class="flex-1 px-4 py-2 border border-mono-600 text-mono-300 hover:bg-mono-950 cursor-pointer transition-colors font-medium"
      >
        Cancel
      </button>
    </div>
  {/snippet}

  {#snippet fieldFormContent(_: { close: () => void })}
    {#if editedNewField}
      <FieldFormContent
        bind:editedItem={editedNewField}
        mode="creating"
        {namespaceName}
        selectableTypes={$typesStore}
        fieldConstraintDefinitions={$fieldConstraintsStore}
        fieldValidatorTemplates={$fieldValidatorTemplatesStore}
        visibleErrors={fieldVisibleErrors}
      />
    {/if}
  {/snippet}

  {#snippet fieldFormFooter(_: { close: () => void })}
    <div class="flex space-x-2">
      <button
        type="button"
        onclick={handleCreateField}
        disabled={fieldSaving}
        class="flex-1 px-4 py-2 transition-colors font-medium flex items-center justify-center space-x-2 {!fieldSaving ? 'bg-green-400 text-mono-950 hover:bg-green-300 font-bold tracking-wide cursor-pointer' : 'bg-mono-700 text-mono-500 cursor-not-allowed'}"
      >
        {#if fieldSaving}
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Creating...</span>
        {:else}
          <span>Create Field</span>
        {/if}
      </button>
      <button
        type="button"
        onclick={closeFieldCreate}
        disabled={fieldSaving}
        class="flex-1 px-4 py-2 border border-mono-600 text-mono-300 hover:bg-mono-950 cursor-pointer transition-colors font-medium"
      >
        Cancel
      </button>
    </div>
  {/snippet}

  <!-- Unified DrawerStack: always mounted, panels array controls visibility -->
  <DrawerStack
    panels={[
      ...(apiState.editDrawerOpen
        ? [{ id: 'edit-api', title: 'Edit API', width: 520, minWidth: 380, content: editApiFormContent, footer: editApiFormFooter }]
        : []),
      ...(apiState.endpointDrawerOpen
        ? [{ id: 'endpoint', title: apiState.isCreating ? 'Create Endpoint' : 'Edit Endpoint', width: 1200, minWidth: 700, content: endpointFormContent, footer: endpointFormFooter }]
        : []),
      ...(objectCreateOpen
        ? [{ id: 'object', title: 'Create Object', width: 720, minWidth: 500, content: objectFormContent, footer: objectFormFooter }]
        : []),
      ...(fieldCreateOpen
        ? [{ id: 'field', title: 'Create Field', width: 720, minWidth: 500, content: fieldFormContent, footer: fieldFormFooter }]
        : [])
    ]}
    onPopPanel={() => {
      if (fieldCreateOpen) closeFieldCreate();
      else if (objectCreateOpen) closeObjectCreate();
      else if (apiState.endpointDrawerOpen) {
        if (apiState.isCreating) apiState.handleCancelCreate();
        else apiState.closeEndpointDrawer();
      }
      else if (apiState.editDrawerOpen) apiState.closeEditDrawer();
    }}
  />

  <!-- Generate Code Modal -->
  <GenerateModal
    open={generateModalOpen}
    apiId={apiId}
    apiTitle={apiState.api?.title ?? 'api'}
    onClose={() => generateModalOpen = false}
  />
{/if}

<style>
  .endpoint-tag-description {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @container (min-width: 700px) {
    .endpoint-tag-description {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .endpoint-method-path {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .endpoint-path-input {
    flex: 1;
  }
  @container (max-width: 700px) {
    .endpoint-method-path {
      flex-direction: column;
      align-items: stretch;
    }
    .endpoint-path-input {
      flex: none;
    }
  }
</style>

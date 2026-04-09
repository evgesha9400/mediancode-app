<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import {
    BackNavButton,
    MainColumnFrame,
    DrawerStack,
    CrudDrawerFooter,
    DrawerFooterDeleteConfirm,
    Pill,
    FormField,
    FormLabel,
    GlassSelectDropdown,
    EndpointItem,
    ParameterEditor,
    QueryParametersEditor,
    ObjectSelector,
    ResponsePreview,
    GenerateModal
  } from '$lib/components';
  import { ObjectFormContent, FieldFormContent } from '$lib/components/form';
  import { HTTP_METHOD_SELECT_OPTIONS } from '$lib/types';
  import type { HttpMethod, ObjectDefinition, Field } from '$lib/types';
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
  import { createObjectApi } from '$lib/api/objects';
  import { createFieldApi } from '$lib/api/fields';
  import { mapApiError } from '$lib/domain/errorMap';
  import { showToast } from '$lib/stores/toasts';
  import {
    dashboardCardGlass,
    dashboardPageHeaderPrimaryButton,
    dashboardPageHeaderShell,
    dashboardPageHeaderTitleBand,
    dashboardPageTitleTextDetail,
    dashboardTextPrimary,
    defaultValueComboShell,
    drawerFooterBtnDestructive,
    drawerFooterBtnDuplicateSegment,
    drawerFooterBtnDuplicateSegmentMuted,
    drawerFooterBtnPrimaryDisabledSegment,
    drawerFooterBtnPrimaryEnabled,
    drawerFooterBtnSecondarySegment,
    drawerFooterBtnSecondarySegmentMuted,
    drawerFooterBtnUndoSegment,
    drawerFooterBtnUndoSegmentMuted,
    drawerFooterSegmentDivider,
    drawerFooterSegmentedPanel,
    drawerFooterSegmentBtn,
    dropdownCreateRow,
    dropdownListScroll,
    dropdownPanel,
    dropdownRow,
    headerMetaSeparator,
    headerNamespaceCluster,
    inputGlass,
    inputGlassSearch,
    surfaceInsideFrostedPanel,
    textareaInsideFrostedPanel
  } from '$lib/ui/classes';

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
    return obj.members
      .filter(m => m.memberType === 'scalar')
      .map(m => $fieldsStore.find(f => f.id === m.fieldId))
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
      members: [],
      derivedRelationships: [],
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
      const obj = await createObjectApi({
        namespaceId: editedNewObject.namespaceId,
        name: editedNewObject.name,
        description: editedNewObject.description,
        members: editedNewObject.members.map(({ id, ...rest }) => rest),
        validators: editedNewObject.validators.length > 0
          ? editedNewObject.validators.map(v => ({
              templateId: v.templateId,
              parameters: v.parameters ?? undefined,
              fieldMappings: v.fieldMappings
            }))
          : undefined
      });

      objectsStore.update(objects => [...objects, obj]);

      // Auto-select the new object in the appropriate selector
      if (objectCreateTarget === 'query') {
        apiState.handleSelectQueryParamsObject(obj.id);
      } else {
        apiState.handleSelectObject(obj.id);
      }

      showToast(`Object "${editedNewObject.name}" created`, 'success');
      closeObjectCreate();
    } catch (err) {
      showToast(mapApiError(err, 'create object'), 'error');
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
      const field = await createFieldApi({
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

      fieldsStore.update(fields => [...fields, field]);

      // Auto-add the new field to the object being created
      if (editedNewObject) {
        editedNewObject = {
          ...editedNewObject,
          members: [...editedNewObject.members, { memberType: 'scalar' as const, name: field.name, fieldId: field.id, role: 'writable' as const, isNullable: false }]
        };
      }

      showToast(`Field "${editedNewField.name}" created`, 'success');
      closeFieldCreate();
    } catch (err) {
      showToast(mapApiError(err, 'create field'), 'error');
    } finally {
      fieldSaving = false;
    }
  }
</script>

{#if !apiExists}
  <MainColumnFrame bodyClass="p-6">
    {#snippet header()}{/snippet}
    <div class="flex min-h-[50vh] flex-col items-center justify-center">
      <div class="text-center">
        <i class="fa-solid fa-circle-exclamation text-4xl text-fg-muted mb-4"></i>
        <h2 class="text-xl mb-2 {dashboardTextPrimary}">API Not Found</h2>
        <p class="text-fg-muted mb-4">The API you're looking for doesn't exist or has been deleted.</p>
        <button
          type="button"
          onclick={() => goto('/apis')}
          class={dashboardPageHeaderPrimaryButton}
        >
          Back to APIs
        </button>
      </div>
    </div>
  </MainColumnFrame>
{:else}
  <MainColumnFrame bodyClass="">
    {#snippet header()}
      <div class={dashboardPageHeaderShell}>
        <div
          class="relative z-20 flex justify-between gap-3 {dashboardPageHeaderTitleBand} flex-nowrap"
        >
          <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            <BackNavButton
              ariaLabel="Back to APIs list"
              onclick={() => goto('/apis')}
            />
            <h1 class={dashboardPageTitleTextDetail} title={apiState.api?.title || undefined}>
              {apiState.api?.title || 'Untitled API'}
            </h1>
            <Pill class="shrink-0">{apiState.api?.version ?? ''}</Pill>

            {#if apiState.api?.description?.trim()}
              <span class="text-fg-faint shrink-0 hidden md:inline" aria-hidden="true">·</span>
              <span
                class="hidden md:inline text-sm text-fg-muted truncate min-w-0 max-w-[min(28vw,14rem)] lg:max-w-md"
                title={apiState.api.description}
              >{apiState.api.description.trim()}</span>
            {/if}

            {#if namespaceName}
              <span class={headerMetaSeparator} aria-hidden="true">·</span>
              <span class={headerNamespaceCluster} title={namespaceName}>
                <i class="fa-solid fa-layer-group text-xs shrink-0"></i>
                <span class="truncate">{namespaceName}</span>
              </span>
            {/if}

            {#if apiState.api?.serverUrl}
              <span class="text-fg-faint shrink-0 hidden lg:inline" aria-hidden="true">·</span>
              <span
                class="hidden lg:inline-flex items-center gap-1 text-xs text-fg-muted max-w-[8rem] min-w-0 truncate font-mono"
                title={apiState.api.serverUrl}
              >
                <i class="fa-solid fa-server text-[10px] shrink-0"></i>
                <span class="truncate">{apiState.api.serverUrl}</span>
              </span>
            {/if}

            {#if apiState.api?.baseUrl}
              <span class="text-fg-faint shrink-0 hidden lg:inline" aria-hidden="true">·</span>
              <span
                class="hidden lg:inline-flex items-center gap-1 text-xs text-fg-muted max-w-[6rem] min-w-0 truncate font-mono"
                title={apiState.api.baseUrl}
              >
                <i class="fa-solid fa-link text-[10px] shrink-0"></i>
                <span class="truncate">{apiState.api.baseUrl}</span>
              </span>
            {/if}
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onclick={() => generateModalOpen = true}
              class="{dashboardPageHeaderPrimaryButton} border border-transparent"
            >
              <i class="fa-solid fa-code"></i>
              <span>Generate Code</span>
            </button>
            <button
              type="button"
              onclick={apiState.handleAddEndpoint}
              class="px-4 py-2 border border-edge rounded-xl font-inter font-medium text-sm tracking-wide text-fg-secondary flex items-center space-x-2 hover:bg-surface cursor-pointer transition-all shadow-sm"
            >
              <i class="fa-solid fa-plus"></i>
              <span>Add Endpoint</span>
            </button>
            <button
              type="button"
              onclick={apiState.openEditDrawer}
              class="px-4 py-2 border border-edge rounded-xl font-inter font-medium text-sm tracking-wide text-fg-secondary flex items-center space-x-2 hover:bg-surface cursor-pointer transition-all shadow-sm"
            >
              <i class="fa-solid fa-pen-to-square"></i>
              <span>Edit API</span>
            </button>
          </div>
        </div>
      </div>
    {/snippet}

    <div class="max-w-7xl mx-auto p-6">
      {#if apiState.endpoints.length === 0}
        <div class="{dashboardCardGlass} overflow-hidden rounded-2xl">
          <div class="text-center py-8 text-fg-muted">
            <i class="fa-solid fa-route text-2xl mb-2 text-fg-faint"></i>
            <p class="text-sm">No endpoints yet. Create your first API endpoint.</p>
          </div>
        </div>
      {:else}
        <!-- Swagger-style flush tag sections -->
        <div class="{dashboardCardGlass} overflow-hidden rounded-2xl">
          {#each apiState.allTagSections as section, i (section.tag)}
            {@const isExpanded = apiState.expandedTags.has(section.tag)}
            <div class="{i < apiState.allTagSections.length - 1 ? 'border-b border-edge' : ''}">
              <!-- Tag section header -->
              <button
                type="button"
                onclick={() => apiState.toggleTagSection(section.tag)}
                class="w-full flex items-center justify-between px-4 py-3 bg-surface-base/20 hover:bg-surface-base/45 transition-colors text-left"
              >
                <div class="flex items-center space-x-2">
                  <h2 class="text-base font-semibold {dashboardTextPrimary}">{section.tag}</h2>
                  <span class="text-xs text-fg-muted">{section.endpoints.length} endpoint{section.endpoints.length !== 1 ? 's' : ''}</span>
                </div>
                <i class="fa-solid fa-chevron-down text-fg-muted text-sm transition-transform {isExpanded ? 'rotate-0' : '-rotate-90'}"></i>
              </button>
              <!-- Tag section body -->
              {#if isExpanded}
                <div class="p-4">
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
</MainColumnFrame>

  {#snippet editApiFormContent(_: { close: () => void })}
    <div class="space-y-4">
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
          class={textareaInsideFrostedPanel}
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
      <div class={drawerFooterSegmentedPanel} role="group" aria-label="Edit API actions">
        <button
          type="button"
          onclick={apiState.handleEditDeleteClick}
          disabled={apiState.isSaving}
          class="{drawerFooterSegmentBtn} font-medium {drawerFooterBtnDestructive} {apiState.isSaving ? 'cursor-not-allowed opacity-50' : ''}"
        >
          <span>Delete API</span>
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        </button>
        <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
        <button
          type="button"
          onclick={apiState.handleEditUndo}
          disabled={!apiState.hasEditChanges || apiState.isSaving}
          class="{drawerFooterSegmentBtn} {apiState.hasEditChanges && !apiState.isSaving
            ? drawerFooterBtnUndoSegment
            : drawerFooterBtnUndoSegmentMuted}"
        >
          <span>Undo</span>
          <i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
        </button>
        <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
        <button
          type="button"
          onclick={apiState.handleEditSave}
          disabled={!apiState.hasEditChanges || apiState.isSaving}
          class="{drawerFooterSegmentBtn} {apiState.hasEditChanges && !apiState.isSaving
            ? drawerFooterBtnPrimaryEnabled
            : drawerFooterBtnPrimaryDisabledSegment}"
        >
          {#if apiState.isSaving}
            <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
            <span>Saving...</span>
          {:else}
            <span>Save</span>
            <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
          {/if}
        </button>
      </div>
    {:else}
      <DrawerFooterDeleteConfirm
        prompt="Delete this API and all its endpoints?"
        promptId="edit-api-delete-confirm-prompt"
        actionsAriaLabel="Confirm or cancel API delete"
        busy={apiState.isSaving}
        onCancel={apiState.cancelEditDelete}
        onConfirm={apiState.handleDeleteApi}
      />
    {/if}
  {/snippet}

  {#snippet endpointFormContent(_: { close: () => void })}
    {#if apiState.editedEndpoint}
        <div class="space-y-6" style="container-type: inline-size;">
          <!-- Tag and Description -->
          <div class="endpoint-tag-description">
            <div class="relative">
              <h3 class="text-sm text-fg-secondary mb-2 flex items-center font-medium">
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
                  class={inputGlassSearch}
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
                  <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted text-xs pointer-events-none"></i>
                {/if}
              </div>
              {#if apiState.tagDropdownOpen}
                <div class={dropdownPanel}>
                  <div class="{dropdownListScroll} max-h-48">
                    {#if apiState.tagInputValue.trim() && !exactTagMatch}
                      <button
                        type="button"
                        onclick={handleTagInputCommit}
                        class="{dropdownCreateRow} border-b border-edge rounded-none text-fg-secondary"
                      >
                        <i class="fa-solid fa-plus text-xs"></i>
                        <span>Use "<strong>{apiState.tagInputValue.trim()}</strong>"</span>
                      </button>
                    {/if}
                    {#each filteredTags as tag (tag)}
                      <button
                        type="button"
                        onclick={() => apiState.handleTagSelect(tag)}
                        class="{dropdownRow} text-sm text-fg-secondary {apiState.editedEndpoint?.tagName === tag ? 'bg-surface-raised' : ''}"
                      >
                        {tag}
                      </button>
                    {/each}
                    {#if filteredTags.length === 0 && !apiState.tagInputValue.trim()}
                      <div class="px-3 py-2 text-sm text-fg-muted">No tags yet</div>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
            <div>
              <h3 class="text-sm text-fg-secondary mb-2 flex items-center font-medium">
                <i class="fa-solid fa-align-left mr-2"></i>
                Description
              </h3>
              <input
                type="text"
                bind:value={apiState.editedEndpoint.description}
                placeholder="Add a description for this endpoint..."
                class={inputGlass}
              />
            </div>
          </div>

          <!-- Method and Path -->
          <div>
            <h3 class="text-sm text-fg-secondary mb-2 flex items-center font-medium">
              <i class="fa-solid fa-route mr-2"></i>
              Method & Path
            </h3>
            <div class="endpoint-method-path">
              <div class="endpoint-method-select">
                <GlassSelectDropdown
                  value={apiState.editedEndpoint.method}
                  options={HTTP_METHOD_SELECT_OPTIONS}
                  ariaLabel="HTTP method"
                  mono
                  onSelect={(m) => {
                    if (apiState.editedEndpoint) apiState.editedEndpoint.method = m as HttpMethod;
                  }}
                />
              </div>
              <div class="endpoint-path-input {defaultValueComboShell}">
                <span class="px-3 py-1.5 text-sm font-mono text-fg-muted bg-surface/80 border-r border-edge/80">/</span>
                <input
                  type="text"
                  value={apiState.editedEndpoint.path.substring(1)}
                  oninput={(e) => apiState.handlePathChange('/' + e.currentTarget.value)}
                  placeholder="users/{`{user_id}`}"
                  class="flex-1 px-3 py-1.5 text-sm font-mono border-none focus:ring-0 outline-none focus:outline-none shadow-none"
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
            responseShapeLocked={apiState.responseShapeLocked}
            responseShapeLockedReason={apiState.responseShapeLockedReason}
            validationErrors={apiState.validationErrors.filter(e => e.rule === 1)}
            onSelectObject={apiState.handleSelectObject}
            onSetResponseShape={apiState.handleSetResponseShape}
            onCreateNewObject={() => openObjectCreate('body')}
          />

          <!-- Path Parameters -->
          <div>
            <h3 class="text-sm text-fg-secondary mb-2 flex items-center font-medium">
              <i class="fa-solid fa-link mr-2"></i>
              Path Parameters
            </h3>
            {#if apiState.editedEndpoint.pathParams.length === 0}
              <div class="px-3 py-2 {surfaceInsideFrostedPanel}">
                <p class="text-xs text-fg-muted">No path parameters. Add parameters to your URL path using <code class="bg-surface-raised px-1 rounded-lg">{`{param_name}`}</code></p>
              </div>
            {:else}
              <div class="px-3 py-1 {surfaceInsideFrostedPanel}">
                <!-- Column headers -->
                <div class="flex items-center gap-2 py-1 border-b border-edge text-[10px] text-fg-dimmed uppercase tracking-wider">
                  <div class="w-32 shrink-0">Name</div>
                  <div class="flex-1">Field</div>
                </div>
                {#each apiState.editedEndpoint.pathParams as param (param.name)}
                  <ParameterEditor
                    paramName={param.name}
                    fieldName={param.field}
                    fieldId={param.fieldId}
                    targetFields={apiState.targetFields}
                    objectFields={endpointObjectFields}
                    validationErrors={apiState.validationErrors.filter(e => (e.rule === 2 || e.rule === 3 || e.rule === 5) && e.param === param.name)}
                    onFieldSelect={(fieldName, fieldId) =>
                      apiState.handlePathParamFieldSelect(param.name, fieldName, fieldId)}
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
            method={apiState.editedEndpoint.method}
          />

        </div>
      {/if}
  {/snippet}

  {#snippet endpointFormFooter(_: { close: () => void })}
    {#if apiState.editedEndpoint}
        {#if apiState.isCreating}
          <div class={drawerFooterSegmentedPanel} role="group" aria-label="Create endpoint actions">
            <button
              type="button"
              onclick={apiState.handleCancelCreate}
              disabled={apiState.isSaving}
              class="{drawerFooterSegmentBtn} {drawerFooterBtnSecondarySegment} {apiState.isSaving ? 'cursor-not-allowed opacity-50' : ''}"
            >
              <span>Cancel</span>
              <i class="fa-solid fa-ban" aria-hidden="true"></i>
            </button>
            <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
            <button
              type="button"
              onclick={apiState.handleCreateEndpoint}
              disabled={!apiState.hasEndpointChanges || apiState.isSaving}
              class="{drawerFooterSegmentBtn} {apiState.hasEndpointChanges && !apiState.isSaving
                ? drawerFooterBtnPrimaryEnabled
                : drawerFooterBtnPrimaryDisabledSegment}"
            >
              {#if apiState.isSaving}
                <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                <span>Creating...</span>
              {:else}
                <span>Create Endpoint</span>
                <i class="fa-solid fa-plus" aria-hidden="true"></i>
              {/if}
            </button>
          </div>
        {:else if !apiState.showEndpointDeleteConfirm}
          <div class={drawerFooterSegmentedPanel} role="group" aria-label="Edit endpoint actions">
            <button
              type="button"
              onclick={apiState.handleDeleteEndpointClick}
              disabled={apiState.isSaving}
              class="{drawerFooterSegmentBtn} font-medium {drawerFooterBtnDestructive} {apiState.isSaving ? 'cursor-not-allowed opacity-50' : ''}"
            >
              <span>Delete</span>
              <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
            </button>
            <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
            <button
              type="button"
              onclick={apiState.handleUndoEndpoint}
              disabled={!apiState.hasEndpointChanges || apiState.isSaving}
              class="{drawerFooterSegmentBtn} {apiState.hasEndpointChanges && !apiState.isSaving
                ? drawerFooterBtnUndoSegment
                : drawerFooterBtnUndoSegmentMuted}"
            >
              <span>Undo</span>
              <i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i>
            </button>
            <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
            <button
              type="button"
              onclick={() => apiState.handleDuplicateEndpoint(apiState.editedEndpoint!.id)}
              disabled={apiState.isSaving}
              class="{drawerFooterSegmentBtn} {apiState.isSaving ? drawerFooterBtnDuplicateSegmentMuted : drawerFooterBtnDuplicateSegment}"
            >
              <span>Duplicate</span>
              <i class="fa-solid fa-copy" aria-hidden="true"></i>
            </button>
            <div class={drawerFooterSegmentDivider} aria-hidden="true"></div>
            <button
              type="button"
              onclick={apiState.handleSaveEndpoint}
              disabled={!apiState.hasEndpointChanges || apiState.isSaving}
              class="{drawerFooterSegmentBtn} {apiState.hasEndpointChanges && !apiState.isSaving
                ? drawerFooterBtnPrimaryEnabled
                : drawerFooterBtnPrimaryDisabledSegment}"
            >
              <span>Save</span>
              <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
            </button>
          </div>
        {:else}
          <DrawerFooterDeleteConfirm
            prompt="Are you sure?"
            promptId="endpoint-delete-confirm-prompt"
            actionsAriaLabel="Confirm or cancel endpoint delete"
            busy={apiState.isSaving}
            onCancel={apiState.cancelDeleteEndpoint}
            onConfirm={apiState.handleDeleteEndpoint}
          />
        {/if}
      {/if}
  {/snippet}

  {#snippet objectFormContent(_: { close: () => void })}
    {#if editedNewObject}
      <ObjectFormContent
        bind:editedItem={editedNewObject}
        mode="creating"
        {availableFields}
        modelValidatorTemplates={$modelValidatorTemplatesStore}
        visibleErrors={objectVisibleErrors}
        onCreateNewField={openFieldCreate}
      />
    {/if}
  {/snippet}

  {#snippet objectFormFooter({ close }: { close: () => void })}
    <CrudDrawerFooter
      mode="creating"
      isSaving={objectSaving}
      isFormValid={objectFormValid}
      onCreate={handleCreateObject}
      onCancel={close}
    />
  {/snippet}

  {#snippet fieldFormContent(_: { close: () => void })}
    {#if editedNewField}
      <FieldFormContent
        bind:editedItem={editedNewField}
        mode="creating"
        selectableTypes={$typesStore}
        fieldConstraintDefinitions={$fieldConstraintsStore}
        fieldValidatorTemplates={$fieldValidatorTemplatesStore}
        visibleErrors={fieldVisibleErrors}
      />
    {/if}
  {/snippet}

  {#snippet fieldFormFooter({ close }: { close: () => void })}
    <CrudDrawerFooter
      mode="creating"
      isSaving={fieldSaving}
      isFormValid={fieldFormValid}
      onCreate={handleCreateField}
      onCancel={close}
    />
  {/snippet}

  <!-- Unified DrawerStack: always mounted, panels array controls visibility -->
  <DrawerStack
    panels={[
      ...(apiState.editDrawerOpen
        ? [{ id: 'edit-api', title: 'Edit API', headerNamespace: namespaceName, width: 520, minWidth: 380, content: editApiFormContent, footer: editApiFormFooter }]
        : []),
      ...(apiState.endpointDrawerOpen
        ? [{ id: 'endpoint', title: apiState.isCreating ? 'Create Endpoint' : 'Edit Endpoint', headerNamespace: namespaceName, width: 1200, minWidth: 700, content: endpointFormContent, footer: endpointFormFooter }]
        : []),
      ...(objectCreateOpen
        ? [{ id: 'object', title: 'Create Object', headerNamespace: namespaceName, width: 800, minWidth: 500, content: objectFormContent, footer: objectFormFooter }]
        : []),
      ...(fieldCreateOpen
        ? [{ id: 'field', title: 'Create Field', headerNamespace: namespaceName, width: 800, minWidth: 500, content: fieldFormContent, footer: fieldFormFooter }]
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
      grid-template-columns: 1fr 3fr;
    }
  }
  .endpoint-method-path {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .endpoint-method-select {
    width: 100%;
    min-width: 7rem;
  }
  @container (min-width: 701px) {
    .endpoint-method-select {
      width: auto;
      flex: 0 0 auto;
    }
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

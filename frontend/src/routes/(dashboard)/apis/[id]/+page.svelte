<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import {
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    Pill,
    FormField,
    FormLabel,
    EndpointItem,
    ParameterEditor,
    QueryParametersEditor,
    RequestBodyEditor,
    ResponseBodyEditor,
    NamespaceSelector
  } from '$lib/components';
  import { createApiDetailState } from '$lib/stores/apiDetailState.svelte';
  import { getApiById } from '$lib/stores/apis';
  import { namespacesStore } from '$lib/stores/namespaces';
  import { fieldsStore } from '$lib/stores/fields';

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
</script>

{#if !apiExists}
  <div class="flex-1 flex items-center justify-center">
    <div class="text-center">
      <i class="fa-solid fa-circle-exclamation text-4xl text-mono-400 mb-4"></i>
      <h2 class="text-xl text-mono-800 mb-2">API Not Found</h2>
      <p class="text-mono-500 mb-4">The API you're looking for doesn't exist or has been deleted.</p>
      <button
        onclick={() => goto('/apis')}
        class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800"
      >
        Back to APIs
      </button>
    </div>
  </div>
{:else}
  <!-- Compact Header -->
  <div class="bg-white border-b border-mono-200 py-4 px-6">
    <div class="flex justify-between items-center">
      <!-- Left side -->
      <div>
        <button
          onclick={() => goto('/apis')}
          class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-2"
        >
          <i class="fa-solid fa-arrow-left text-xs"></i>
          <span>Back to APIs</span>
        </button>

        <div class="flex items-center space-x-3 mb-1">
          <h1 class="text-xl font-semibold text-mono-900">{apiState.api?.title || 'Untitled API'}</h1>
          <Pill>{apiState.api?.version ?? ''}</Pill>
        </div>

        {#if apiState.api?.description}
          <p class="text-sm text-mono-500 mb-2">{apiState.api.description}</p>
        {/if}

        <div class="flex items-center space-x-4 text-xs text-mono-500">
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
          onclick={apiState.handleAddEndpoint}
          class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
        >
          <i class="fa-solid fa-plus"></i>
          <span>Add Endpoint</span>
        </button>
        <button
          onclick={apiState.openEditDrawer}
          class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md flex items-center space-x-2 hover:bg-mono-50 cursor-pointer transition-colors"
        >
          <i class="fa-solid fa-pen-to-square"></i>
          <span>Edit</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="flex-1 overflow-auto">
    <div class="max-w-7xl mx-auto p-6">
      {#if apiState.endpoints.length === 0}
        <div class="bg-white rounded-lg border border-mono-200">
          <div class="text-center py-8 text-mono-500">
            <i class="fa-solid fa-route text-2xl mb-2 text-mono-300"></i>
            <p class="text-sm">No endpoints yet. Create your first API endpoint.</p>
          </div>
        </div>
      {:else}
        <!-- Swagger-style flush tag sections -->
        <div class="rounded-lg overflow-hidden border border-mono-200">
          {#each apiState.allTagSections as section, i (section.tag)}
            {@const isExpanded = apiState.expandedTags.has(section.tag)}
            <div class="{i < apiState.allTagSections.length - 1 ? 'border-b border-mono-200' : ''}">
              <!-- Tag section header -->
              <button
                type="button"
                onclick={() => apiState.toggleTagSection(section.tag)}
                class="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-mono-50 transition-colors text-left"
              >
                <div class="flex items-center space-x-2">
                  <h2 class="text-base font-semibold text-mono-800">{section.tag}</h2>
                  <span class="text-xs text-mono-400">{section.endpoints.length} endpoint{section.endpoints.length !== 1 ? 's' : ''}</span>
                </div>
                <i class="fa-solid fa-chevron-down text-mono-500 text-sm transition-transform {isExpanded ? 'rotate-0' : '-rotate-90'}"></i>
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

  <!-- Edit API Drawer -->
  <Drawer open={apiState.editDrawerOpen} maxWidth={520}>
    <DrawerHeader title="Edit API" onClose={apiState.closeEditDrawer} />

    <DrawerContent>
      <div class="space-y-4">
        <!-- Namespace -->
        <div>
          <FormLabel label="Namespace" forId="edit-namespace" />
          <NamespaceSelector />
        </div>

        <!-- API Title -->
        <FormField
          id="edit-title"
          label="API Title"
          bind:value={apiState.editForm.title}
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
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
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
    </DrawerContent>

    <DrawerFooter>
      {#if !apiState.showEditDeleteConfirm}
        <button
          type="button"
          onclick={apiState.handleEditSave}
          disabled={!apiState.hasEditChanges || apiState.isSaving}
          class="w-full px-4 py-2 rounded-md transition-colors font-medium {apiState.hasEditChanges && !apiState.isSaving ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
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
          class="w-full px-4 py-2 border rounded-md transition-colors font-medium {apiState.hasEditChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
        >
          Undo
        </button>
        <button
          type="button"
          onclick={apiState.handleEditDeleteClick}
          class="w-full px-4 py-2 bg-mono-100 text-red-700 rounded-md hover:bg-red-50 cursor-pointer transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <i class="fa-solid fa-xmark"></i>
          <span>Delete API</span>
        </button>
      {:else}
        <div class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800 mb-2">Delete this API and all its endpoints?</p>
          <div class="flex space-x-2">
            <button
              type="button"
              onclick={apiState.handleDeleteApi}
              disabled={apiState.isSaving}
              class="flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors {apiState.isSaving ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'}"
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
              class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </DrawerFooter>
  </Drawer>

  <!-- Endpoint Drawer -->
  <Drawer open={apiState.endpointDrawerOpen} maxWidth={1200}>
    <DrawerHeader title="Edit Endpoint" onClose={apiState.closeEndpointDrawer} />

    <DrawerContent>
      {#if apiState.editedEndpoint}
        <div class="space-y-6">
          <!-- Tag and Description (same line) -->
          <div class="flex space-x-4">
            <div class="w-56 relative">
              <h3 class="text-sm text-mono-700 mb-2 flex items-center font-medium">
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
                  class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm pr-8"
                />
                {#if apiState.tagInputValue}
                  <button
                    type="button"
                    onclick={() => apiState.handleTagSelect(undefined)}
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-red-700 hover:text-red-600"
                    aria-label="Clear tag"
                  >
                    <i class="fa-solid fa-xmark text-xs"></i>
                  </button>
                {:else}
                  <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
                {/if}
              </div>
              {#if apiState.tagDropdownOpen}
                <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                  {#if apiState.tagInputValue.trim() && !exactTagMatch}
                    <button
                      type="button"
                      onclick={handleTagInputCommit}
                      class="w-full px-3 py-2 text-left text-sm hover:bg-mono-50 flex items-center space-x-2 text-mono-700 border-b border-mono-200"
                    >
                      <i class="fa-solid fa-plus text-xs"></i>
                      <span>Use "<strong>{apiState.tagInputValue.trim()}</strong>"</span>
                    </button>
                  {/if}
                  {#each filteredTags as tag (tag)}
                    <button
                      type="button"
                      onclick={() => apiState.handleTagSelect(tag)}
                      class="w-full px-3 py-2 text-left text-sm text-mono-700 hover:bg-mono-50 {apiState.editedEndpoint?.tagName === tag ? 'bg-mono-100' : ''}"
                    >
                      {tag}
                    </button>
                  {/each}
                  {#if filteredTags.length === 0 && !apiState.tagInputValue.trim()}
                    <div class="px-3 py-2 text-sm text-mono-500">No tags yet</div>
                  {/if}
                </div>
              {/if}
            </div>
            <div class="flex-1">
              <h3 class="text-sm text-mono-700 mb-2 flex items-center font-medium">
                <i class="fa-solid fa-align-left mr-2"></i>
                Description
              </h3>
              <input
                type="text"
                bind:value={apiState.editedEndpoint.description}
                placeholder="Add a description for this endpoint..."
                class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <!-- Method and Path -->
          <div>
            <h3 class="text-sm text-mono-700 mb-2 flex items-center font-medium">
              <i class="fa-solid fa-route mr-2"></i>
              Method & Path
            </h3>
            <div class="flex items-center space-x-2">
              <select
                bind:value={apiState.editedEndpoint.method}
                class="px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
              <div class="flex-1 flex items-center border border-mono-300 rounded-md focus-within:ring-2 focus-within:ring-mono-400 focus-within:border-transparent">
                <span class="px-3 py-1.5 text-sm font-mono text-mono-500 bg-mono-50 border-r border-mono-300">/</span>
                <input
                  type="text"
                  value={apiState.editedEndpoint.path.substring(1)}
                  oninput={(e) => apiState.handlePathChange('/' + e.currentTarget.value)}
                  placeholder="users/{`{user_id}`}"
                  class="flex-1 px-3 py-1.5 text-sm font-mono border-0 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <!-- Path Parameters -->
          <div>
            <h3 class="text-sm text-mono-700 mb-2 flex items-center font-medium">
              <i class="fa-solid fa-link mr-2"></i>
              Path Parameters
            </h3>
            {#if apiState.editedEndpoint.pathParams.length === 0}
              <div class="px-3 py-1 bg-mono-50 rounded border border-mono-200">
                <p class="text-xs text-mono-500">No path parameters. Add parameters to your URL path using <code class="bg-mono-100 px-1 rounded">{`{param_name}`}</code></p>
              </div>
            {:else}
              <div class="px-3 py-1 bg-mono-50 rounded border border-mono-200 space-y-1">
                {#each apiState.editedEndpoint.pathParams as param (param.name)}
                  <ParameterEditor
                    paramName={param.name}
                    fieldId={param.fieldId}
                    {availableFields}
                    onFieldSelect={(fieldId) => apiState.handlePathParamUpdate(param.name, fieldId)}
                  />
                {/each}
              </div>
            {/if}
          </div>

          <!-- Query Parameters -->
          <QueryParametersEditor
            endpointNamespaceId={apiState.apiNamespaceId}
            selectedObjectId={apiState.editedEndpoint.queryParamsObjectId}
            onSelectObject={apiState.handleSelectQueryParamsObject}
          />

          <!-- Request Body Editor -->
          <RequestBodyEditor
            endpointNamespaceId={apiState.apiNamespaceId}
            selectedObjectId={apiState.editedEndpoint.requestBodyObjectId}
            onSelectObject={apiState.handleSelectRequestBodyObject}
          />

          <!-- Response Body Editor -->
          <ResponseBodyEditor
            endpointNamespaceId={apiState.apiNamespaceId}
            selectedObjectId={apiState.editedEndpoint.responseBodyObjectId}
            useEnvelope={apiState.editedEndpoint.useEnvelope}
            responseShape={apiState.editedEndpoint.responseShape}
            onSelectObject={apiState.handleSelectResponseBodyObject}
            onEnvelopeToggle={apiState.handleEnvelopeToggle}
            onSetResponseShape={apiState.handleSetResponseShape}
          />
        </div>
      {/if}
    </DrawerContent>

    <DrawerFooter>
      {#if apiState.editedEndpoint}
        {#if !apiState.showEndpointDeleteConfirm}
          <div class="flex space-x-2">
            <button
              type="button"
              onclick={apiState.handleSaveEndpoint}
              disabled={!apiState.hasEndpointChanges}
              class="flex-1 px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {apiState.hasEndpointChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
            >
              <i class="fa-solid fa-save"></i>
              <span>Save</span>
            </button>
            <button
              type="button"
              onclick={apiState.handleUndoEndpoint}
              disabled={!apiState.hasEndpointChanges}
              class="flex-1 px-4 py-2 border rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {apiState.hasEndpointChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
            >
              <i class="fa-solid fa-undo"></i>
              <span>Undo</span>
            </button>
            <button
              type="button"
              onclick={() => apiState.handleDuplicateEndpoint(apiState.editedEndpoint!.id)}
              class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <i class="fa-solid fa-copy"></i>
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onclick={apiState.handleDeleteEndpointClick}
              class="flex-1 px-4 py-2 border border-mono-300 text-red-700 rounded-md hover:bg-red-50 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <i class="fa-solid fa-xmark"></i>
              <span>Delete</span>
            </button>
          </div>
        {:else}
          <div class="bg-red-50 border border-red-200 rounded-md p-3">
            <p class="text-sm text-red-800 mb-2">Are you sure?</p>
            <div class="flex space-x-2">
              <button
                type="button"
                onclick={apiState.handleDeleteEndpoint}
                class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onclick={apiState.cancelDeleteEndpoint}
                class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      {/if}
    </DrawerFooter>
  </Drawer>
{/if}

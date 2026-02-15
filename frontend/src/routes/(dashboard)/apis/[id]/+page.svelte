<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { untrack } from 'svelte';
  import {
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    ApiMetadataCard,
    EndpointItem,
    ParameterEditor,
    QueryParametersEditor,
    RequestBodyEditor,
    ResponseBodyEditor,
    NamespaceSelector
  } from '$lib/components';
  import { createApiDetailState } from '$lib/stores/apiDetailState.svelte';
  import { getApiById } from '$lib/stores/apis';
  import { deleteApiAction } from '$lib/stores/actions';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import { fieldsStore } from '$lib/stores/fields';
  import { showToast } from '$lib/stores/toasts';

  // Get API ID from URL
  let apiId = $derived(page.params.id ?? '');

  // Check if this is a new API or editing existing
  let isNewRoute = $derived(apiId === 'new');

  // Check if existing API exists (only relevant for non-new routes)
  let apiExists = $derived(isNewRoute || (apiId !== '' && getApiById(apiId) !== undefined));

  // Delete confirmation state
  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);

  // Create state container for this specific API
  // Using untrack() because the apiId is intentionally captured at mount time
  // SvelteKit remounts the component when the route changes
  const apiState = createApiDetailState({
    apiId: untrack(() => apiId),
    namespaceId: untrack(() => $activeNamespaceId),
    onClose: () => goto('/apis'),
    onApiCreated: (newApiId: string) => {
      // Replace /apis/new with /apis/{actualId} in URL without reloading
      goto(`/apis/${newApiId}`, { replaceState: true });
    }
  });

  // Fields filtered by API namespace (for path param field selectors)
  const availableFields = $derived(
    $fieldsStore.filter(f => f.namespaceId === apiState.apiNamespaceId)
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

  function handleDeleteClick() {
    showDeleteConfirm = true;
  }

  async function confirmDelete() {
    if (!apiState.api || isDeleting) return;

    const apiTitle = apiState.api.title;
    isDeleting = true;

    const result = await deleteApiAction(apiState.api.id);

    if (result.success) {
      showToast(`API "${apiTitle}" deleted successfully`, 'success');
      goto('/apis');
    } else {
      showToast(result.error || 'Failed to delete API', 'error');
      isDeleting = false;
    }
    showDeleteConfirm = false;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

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
  <!-- Header -->
    <div class="bg-white border-b border-mono-200 py-4 px-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-xl text-mono-800">{apiState.editedApi?.title || 'Untitled API'}</h1>
          <p class="text-sm text-mono-500 mt-1">
            {#if apiState.isNewApi}
              Create a new API
            {:else}
              Design and configure API endpoints
            {/if}
          </p>
        </div>
        <div class="flex items-center space-x-3">
          <NamespaceSelector />
          <button
            onclick={apiState.handleSaveApi}
            disabled={!apiState.hasApiChanges}
            class="px-4 py-2 rounded-md flex items-center space-x-2 transition-colors {apiState.hasApiChanges ? 'bg-mono-900 text-white hover:bg-mono-800' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
          >
            <i class="fa-solid fa-save"></i>
            <span>Save</span>
          </button>
          <button
            onclick={apiState.handleClose}
            class="px-4 py-2 border border-mono-300 text-mono-700 rounded-md flex items-center space-x-2 hover:bg-mono-50"
          >
            <i class="fa-solid fa-times"></i>
            <span>Close</span>
          </button>
          {#if !apiState.isNewApi}
            <button
              onclick={handleDeleteClick}
              class="px-4 py-2 border border-red-300 text-red-700 rounded-md flex items-center space-x-2 hover:bg-red-50"
            >
              <i class="fa-solid fa-trash"></i>
              <span>Delete</span>
            </button>
          {/if}
          <button
            onclick={apiState.handleGenerateCode}
            class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800"
          >
            <i class="fa-solid fa-code"></i>
            <span>Generate Code</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-auto">
      <div class="max-w-7xl mx-auto p-6 space-y-6">
        <!-- API Metadata Card -->
        {#if apiState.editedApi}
          <ApiMetadataCard metadata={apiState.editedApi} onUpdate={apiState.handleApiUpdate} />
        {/if}

        <!-- API Endpoints Card -->
        <div class="bg-white rounded-lg border border-mono-200">
          <div class="flex items-center justify-between px-4 py-3">
            <h2 class="text-base text-mono-800 flex items-center">
              <i class="fa-solid fa-route mr-2"></i>
              API Endpoints
            </h2>
            <button
              onclick={apiState.handleAddEndpoint}
              class="px-3 py-1.5 bg-mono-900 text-white text-sm rounded-md flex items-center space-x-2 hover:bg-mono-800"
            >
              <i class="fa-solid fa-plus"></i>
              <span>New Endpoint</span>
            </button>
          </div>

          <div class="px-4 pb-4">
            {#if apiState.endpoints.length === 0}
              <div class="text-center py-6 text-mono-500">
                <i class="fa-solid fa-route text-2xl mb-2 text-mono-300"></i>
                <p class="text-sm">No endpoints yet. Create your first API endpoint.</p>
              </div>
            {:else}
              <div class="space-y-2">
                {#each apiState.endpoints as endpoint (endpoint.id)}
                  <EndpointItem
                    {endpoint}
                    onClick={() => apiState.openEndpoint(endpoint)}
                  />
                {/each}
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>

  <!-- Close Confirmation Modal -->
  {#if apiState.showCloseConfirm}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-mono-900 mb-2">Unsaved Changes</h3>
        <p class="text-mono-600 mb-4">You have unsaved changes. What would you like to do?</p>
        <div class="flex flex-col space-y-2">
          <button
            onclick={apiState.handleSaveAndClose}
            class="w-full px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800 flex items-center justify-center space-x-2"
          >
            <i class="fa-solid fa-save"></i>
            <span>Save and Close</span>
          </button>
          <button
            onclick={apiState.handleDiscardAndClose}
            class="w-full px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 flex items-center justify-center space-x-2"
          >
            <i class="fa-solid fa-trash"></i>
            <span>Discard Changes</span>
          </button>
          <button
            onclick={apiState.cancelClose}
            class="w-full px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete API Confirmation Modal -->
  {#if showDeleteConfirm}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-mono-900 mb-2">Delete API</h3>
        <p class="text-mono-600 mb-4">
          Are you sure you want to delete "{apiState.api?.title || 'this API'}"?
          This will also delete all its endpoints. This action cannot be undone.
        </p>
        <div class="flex space-x-2">
          <button
            onclick={confirmDelete}
            disabled={isDeleting}
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isDeleting}
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>Deleting...</span>
            {:else}
              <i class="fa-solid fa-trash"></i>
              <span>Delete</span>
            {/if}
          </button>
          <button
            onclick={cancelDelete}
            disabled={isDeleting}
            class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Edit Drawer -->
  <Drawer open={apiState.drawerOpen} maxWidth={1200}>
    <DrawerHeader title="Edit Endpoint" onClose={apiState.closeDrawer} />

    <DrawerContent>
      {#if apiState.editedEndpoint}
        <div class="space-y-6">
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
            <button
              type="button"
              onclick={apiState.handleCancelEndpoint}
              class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        {:else}
          <div class="bg-red-50 border border-red-200 rounded-md p-3">
            <p class="text-sm text-red-800 mb-2">Are you sure you want to delete this endpoint?</p>
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

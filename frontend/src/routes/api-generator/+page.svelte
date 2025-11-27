<script lang="ts">
  import {
    DashboardLayout,
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    ApiMetadataCard,
    EndpointItem,
    ParameterEditor,
    ResponsePreview
  } from '$lib/components';
  import {
    apiMetadataStore,
    tagsStore,
    endpointsStore,
    updateApiMetadata,
    addTag,
    deleteTag,
    addEndpoint,
    updateEndpoint,
    deleteEndpoint
  } from '$lib/stores/apis';
  import { showToast } from '$lib/stores/toasts';
  import type { ApiMetadata, EndpointTag, ApiEndpoint, EndpointParameter } from '$lib/types';
  import { extractPathParameters } from '$lib/utils/urlParser';

  // Subscribe to stores
  let metadata = $state($apiMetadataStore);
  let tags = $state($tagsStore);
  let endpoints = $state($endpointsStore);

  // Update local state when stores change
  $effect(() => {
    metadata = $apiMetadataStore;
    tags = $tagsStore;
    endpoints = $endpointsStore;
  });

  // Drawer state
  let drawerOpen = $state(false);
  let selectedEndpoint = $state<ApiEndpoint | null>(null);
  let editedEndpoint = $state<ApiEndpoint | null>(null);

  // Track if there are unsaved changes
  let hasChanges = $derived(
    editedEndpoint && selectedEndpoint
      ? JSON.stringify(editedEndpoint) !== JSON.stringify(selectedEndpoint)
      : false
  );

  // Generate unique IDs
  let idCounter = 0;
  function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${idCounter++}`;
  }

  // Generate unique ID for parameters
  function generateParamId(): string {
    return `param-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // Metadata Operations
  // ============================================================================

  function handleMetadataUpdate(updates: Partial<ApiMetadata>) {
    updateApiMetadata(updates);
  }

  // ============================================================================
  // Tag Operations (Inline)
  // ============================================================================

  // Tag input state for combobox
  let tagInputValue = $state('');
  let tagDropdownOpen = $state(false);
  let tagToDelete = $state<EndpointTag | null>(null);

  // Check if input matches an existing tag exactly
  let exactTagMatch = $derived(
    tags.find(t => t.name.toLowerCase() === tagInputValue.toLowerCase().trim())
  );

  // Count endpoints using a tag
  function getEndpointsUsingTag(tagId: string): number {
    return endpoints.filter(e => e.tagId === tagId).length;
  }

  function handleTagSelect(tagId: string | undefined) {
    if (!editedEndpoint) return;
    editedEndpoint = { ...editedEndpoint, tagId };
    tagInputValue = tagId ? (tags.find(t => t.id === tagId)?.name || '') : '';
    tagDropdownOpen = false;
  }

  function handleCreateTag() {
    if (!editedEndpoint || !tagInputValue.trim() || exactTagMatch) return;

    const newTag: EndpointTag = {
      id: generateId('tag'),
      name: tagInputValue.trim(),
      description: ''
    };
    addTag(newTag);
    editedEndpoint = { ...editedEndpoint, tagId: newTag.id };
    tagDropdownOpen = false;
    showToast(`Tag "${newTag.name}" created`, 'success');
  }

  function handleDeleteTagClick(e: Event, tag: EndpointTag) {
    e.stopPropagation();
    tagToDelete = tag;
  }

  function confirmDeleteTag() {
    if (!tagToDelete) return;

    const tagName = tagToDelete.name;
    const affectedCount = getEndpointsUsingTag(tagToDelete.id);

    // Remove tag from all endpoints that use it
    endpoints.forEach(endpoint => {
      if (endpoint.tagId === tagToDelete!.id) {
        updateEndpoint(endpoint.id, { ...endpoint, tagId: undefined });
      }
    });

    // If current endpoint uses this tag, clear it
    if (editedEndpoint?.tagId === tagToDelete.id) {
      editedEndpoint = { ...editedEndpoint, tagId: undefined };
      tagInputValue = '';
    }

    // Delete the tag
    deleteTag(tagToDelete.id);
    tagToDelete = null;

    if (affectedCount > 0) {
      showToast(`Tag "${tagName}" deleted and removed from ${affectedCount} endpoint${affectedCount > 1 ? 's' : ''}`, 'success');
    } else {
      showToast(`Tag "${tagName}" deleted`, 'success');
    }
  }

  function cancelDeleteTag() {
    tagToDelete = null;
  }

  // ============================================================================
  // Endpoint Operations (List Level)
  // ============================================================================

  function handleAddEndpoint() {
    const newEndpoint: ApiEndpoint = {
      id: generateId('endpoint'),
      method: 'GET',
      path: '/',
      description: '',
      tagId: undefined,
      pathParams: [],
      queryParams: [],
      responseBody: '{\n  "message": "Success"\n}',
      useEnvelope: true,
      expanded: false
    };
    addEndpoint(newEndpoint);
    showToast('Endpoint added successfully', 'success');
    // Automatically open the new endpoint in the drawer
    openEndpoint(newEndpoint);
  }

  function handleDeleteEndpoint(endpointId: string) {
    deleteEndpoint(endpointId);
    showToast('Endpoint deleted successfully', 'success');
    // Close drawer if deleting the currently open endpoint
    if (selectedEndpoint?.id === endpointId) {
      closeDrawer();
    }
  }

  function handleDuplicateEndpoint(endpointId: string) {
    const original = endpoints.find(e => e.id === endpointId);
    if (!original) return;

    const duplicated: ApiEndpoint = {
      ...original,
      id: generateId('endpoint'),
      path: `${original.path}-copy`,
      expanded: false,
      pathParams: original.pathParams.map(p => ({ ...p, id: generateParamId() })),
      queryParams: original.queryParams.map(p => ({ ...p, id: generateParamId() }))
    };
    addEndpoint(duplicated);
    showToast('Endpoint duplicated successfully', 'success');
  }

  // ============================================================================
  // Drawer Operations
  // ============================================================================

  function openEndpoint(endpoint: ApiEndpoint) {
    selectedEndpoint = endpoint;
    editedEndpoint = JSON.parse(JSON.stringify(endpoint));
    drawerOpen = true;
    // Initialize tag input
    tagInputValue = endpoint.tagId ? (tags.find(t => t.id === endpoint.tagId)?.name || '') : '';
    tagDropdownOpen = false;
  }

  function closeDrawer() {
    drawerOpen = false;
    setTimeout(() => {
      selectedEndpoint = null;
      editedEndpoint = null;
    }, 300);
  }

  function handleSave() {
    if (!editedEndpoint || !selectedEndpoint) return;

    updateEndpoint(editedEndpoint.id, editedEndpoint);
    selectedEndpoint = editedEndpoint;
    showToast('Endpoint saved successfully', 'success');
  }

  function handleUndo() {
    if (!selectedEndpoint) return;
    editedEndpoint = JSON.parse(JSON.stringify(selectedEndpoint));
  }

  function handleCancel() {
    closeDrawer();
  }

  // ============================================================================
  // Endpoint Editing Operations (Within Drawer)
  // ============================================================================

  function handlePathChange(newPath: string) {
    if (!editedEndpoint) return;

    // Ensure path always starts with '/'
    const pathWithSlash = newPath.startsWith('/') ? newPath : '/' + newPath;

    // Extract parameter names from the path
    const paramNames = extractPathParameters(pathWithSlash);

    // Store current endpoint reference for TypeScript
    const currentEndpoint = editedEndpoint;

    // Create new parameters for newly discovered param names
    const newParams: EndpointParameter[] = [];
    const updatedParams: EndpointParameter[] = [];

    paramNames.forEach(paramName => {
      const existingParam = currentEndpoint.pathParams.find(p => p.name === paramName);
      if (existingParam) {
        // Keep existing parameter
        updatedParams.push(existingParam);
      } else {
        // Create new parameter without a type (user needs to select)
        newParams.push({
          id: generateParamId(),
          name: paramName,
          type: '', // No type selected yet
          description: '',
          required: true // Path parameters are always required
        });
      }
    });

    // Combine existing (updated) and new parameters
    const allParams = [...updatedParams, ...newParams];

    // Update endpoint
    editedEndpoint = {
      ...currentEndpoint,
      path: pathWithSlash,
      pathParams: allParams
    };
  }

  function handlePathParamUpdate(paramId: string, updates: Partial<EndpointParameter>) {
    if (!editedEndpoint) return;

    const updatedParams = editedEndpoint.pathParams.map(p =>
      p.id === paramId ? { ...p, ...updates } : p
    );
    editedEndpoint = { ...editedEndpoint, pathParams: updatedParams };
  }

  function handlePathParamDelete(paramId: string) {
    if (!editedEndpoint) return;

    const updatedParams = editedEndpoint.pathParams.filter(p => p.id !== paramId);
    editedEndpoint = { ...editedEndpoint, pathParams: updatedParams };
  }

  function handleQueryParamUpdate(paramId: string, updates: Partial<EndpointParameter>) {
    if (!editedEndpoint) return;

    const updatedParams = editedEndpoint.queryParams.map(p =>
      p.id === paramId ? { ...p, ...updates } : p
    );
    editedEndpoint = { ...editedEndpoint, queryParams: updatedParams };
  }

  function handleQueryParamDelete(paramId: string) {
    if (!editedEndpoint) return;

    const updatedParams = editedEndpoint.queryParams.filter(p => p.id !== paramId);
    editedEndpoint = { ...editedEndpoint, queryParams: updatedParams };
  }

  function handleAddQueryParam() {
    if (!editedEndpoint) return;

    const newParam: EndpointParameter = {
      id: generateParamId(),
      name: 'new_param',
      type: '',
      description: '',
      required: false
    };
    editedEndpoint = {
      ...editedEndpoint,
      queryParams: [...editedEndpoint.queryParams, newParam]
    };
  }

  // ============================================================================
  // Generate Code
  // ============================================================================

  function handleGenerateCode() {
    showToast('Code generation coming soon', 'info', 3000);
  }
</script>

<DashboardLayout>
  <!-- Header -->
  <div class="bg-white border-b border-mono-200 py-4 px-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl text-mono-800">FastAPI Generator</h1>
        <p class="text-sm text-mono-500 mt-1">Design and configure OpenAPI endpoints</p>
      </div>
      <div class="flex items-center space-x-3">
        <button
          onclick={handleGenerateCode}
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
      <ApiMetadataCard {metadata} onUpdate={handleMetadataUpdate} />

      <!-- API Endpoints Card -->
      <div class="bg-white rounded-lg border border-mono-200">
        <div class="flex items-center justify-between px-4 py-3">
          <h2 class="text-base text-mono-800 flex items-center">
            <i class="fa-solid fa-route mr-2"></i>
            API Endpoints
          </h2>
          <button
            onclick={handleAddEndpoint}
            class="px-3 py-1.5 bg-mono-900 text-white text-sm rounded-md flex items-center space-x-2 hover:bg-mono-800"
          >
            <i class="fa-solid fa-plus"></i>
            <span>New Endpoint</span>
          </button>
        </div>

        <div class="px-4 pb-4">
          {#if endpoints.length === 0}
            <div class="text-center py-6 text-mono-500">
              <i class="fa-solid fa-route text-2xl mb-2 text-mono-300"></i>
              <p class="text-sm">No endpoints yet. Create your first API endpoint.</p>
            </div>
          {:else}
            <div class="space-y-2">
              {#each endpoints as endpoint (endpoint.id)}
                <EndpointItem
                  {endpoint}
                  {tags}
                  onClick={() => openEndpoint(endpoint)}
                />
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</DashboardLayout>

<!-- Edit Drawer (2x wider than v2) -->
<Drawer open={drawerOpen} width="w-[1200px]">
  <DrawerHeader title="Edit Endpoint" onClose={closeDrawer} />

  <DrawerContent>
    {#if editedEndpoint}
      <div class="space-y-6">
        <!-- Method and Path -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 flex items-center font-medium">
            <i class="fa-solid fa-route mr-2"></i>
            Method & Path
          </h3>
          <div class="flex items-center space-x-2">
            <select
              bind:value={editedEndpoint.method}
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
                value={editedEndpoint.path.substring(1)}
                oninput={(e) => handlePathChange('/' + e.currentTarget.value)}
                placeholder="users/{`{user_id}`}"
                class="flex-1 px-3 py-1.5 text-sm font-mono border-0 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>
          <p class="text-xs text-mono-500 mt-1">Use curly braces like <code class="bg-mono-100 px-1 rounded">{`{param_name}`}</code> for path parameters</p>
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
                bind:value={tagInputValue}
                onfocus={() => tagDropdownOpen = true}
                onblur={() => setTimeout(() => tagDropdownOpen = false, 150)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' && tagInputValue.trim() && !exactTagMatch) {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                placeholder="Select or create tag..."
                class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm pr-8"
              />
              {#if tagInputValue}
                <button
                  type="button"
                  onclick={() => handleTagSelect(undefined)}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-mono-400 hover:text-mono-600"
                  aria-label="Clear tag"
                >
                  <i class="fa-solid fa-times text-xs"></i>
                </button>
              {:else}
                <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
              {/if}
            </div>
            {#if tagDropdownOpen && !tagToDelete}
              <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                {#if tagInputValue.trim() && !exactTagMatch}
                  <button
                    type="button"
                    onclick={handleCreateTag}
                    class="w-full px-3 py-2 text-left text-sm hover:bg-mono-50 flex items-center space-x-2 text-mono-700 border-b border-mono-200"
                  >
                    <i class="fa-solid fa-plus text-xs"></i>
                    <span>Create "<strong>{tagInputValue.trim()}</strong>"</span>
                  </button>
                {/if}
                {#each tags as tag (tag.id)}
                  <div class="flex items-center hover:bg-mono-50 {editedEndpoint?.tagId === tag.id ? 'bg-mono-100' : ''}">
                    <button
                      type="button"
                      onclick={() => handleTagSelect(tag.id)}
                      class="flex-1 px-3 py-2 text-left text-sm text-mono-700"
                    >
                      {tag.name}
                    </button>
                    <button
                      type="button"
                      onclick={(e) => handleDeleteTagClick(e, tag)}
                      class="px-3 py-2 text-mono-400 hover:text-red-500 transition-colors"
                      aria-label="Delete tag"
                    >
                      <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                  </div>
                {/each}
                {#if tags.length === 0 && !tagInputValue.trim()}
                  <div class="px-3 py-2 text-sm text-mono-500">No tags yet</div>
                {/if}
              </div>
            {/if}
            {#if tagToDelete}
              <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg p-3">
                <p class="text-sm text-mono-700 mb-2">
                  Delete tag "<strong>{tagToDelete.name}</strong>"?
                </p>
                {#if getEndpointsUsingTag(tagToDelete.id) > 0}
                  <p class="text-xs text-mono-500 mb-3">
                    This tag is used by {getEndpointsUsingTag(tagToDelete.id)} endpoint{getEndpointsUsingTag(tagToDelete.id) > 1 ? 's' : ''}. It will be removed from them.
                  </p>
                {/if}
                <div class="flex space-x-2">
                  <button
                    type="button"
                    onclick={confirmDeleteTag}
                    class="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onclick={cancelDeleteTag}
                    class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 text-sm rounded-md hover:bg-mono-50"
                  >
                    Cancel
                  </button>
                </div>
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
              bind:value={editedEndpoint.description}
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
          {#if editedEndpoint.pathParams.length === 0}
            <div class="p-3 bg-mono-50 rounded border border-mono-200">
              <p class="text-xs text-mono-500">No path parameters. Add parameters to your URL path using <code class="bg-mono-100 px-1 rounded">{`{param_name}`}</code></p>
            </div>
          {:else}
            <div class="space-y-2">
              {#each editedEndpoint.pathParams as param (param.id)}
                <ParameterEditor
                  parameter={param}
                  onUpdate={(updates) => handlePathParamUpdate(param.id, updates)}
                  showRequired={false}
                  nameEditable={false}
                />
              {/each}
            </div>
          {/if}
        </div>

        <!-- Query Parameters -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm text-mono-700 flex items-center font-medium">
              <i class="fa-solid fa-filter mr-2"></i>
              Query Parameters
            </h3>
            <button
              type="button"
              onclick={handleAddQueryParam}
              class="px-3 py-1.5 bg-mono-900 text-white text-sm rounded-md flex items-center space-x-2 hover:bg-mono-800"
            >
              <i class="fa-solid fa-plus"></i>
              <span>Add Parameter</span>
            </button>
          </div>
          {#if editedEndpoint.queryParams.length === 0}
            <div class="p-3 bg-mono-50 rounded border border-mono-200">
              <p class="text-xs text-mono-500">No query parameters</p>
            </div>
          {:else}
            <div class="space-y-2">
              {#each editedEndpoint.queryParams as param (param.id)}
                <ParameterEditor
                  parameter={param}
                  onUpdate={(updates) => handleQueryParamUpdate(param.id, updates)}
                  onDelete={() => handleQueryParamDelete(param.id)}
                />
              {/each}
            </div>
          {/if}
        </div>

        <!-- Request Body -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 flex items-center font-medium">
            <i class="fa-solid fa-arrow-up mr-2"></i>
            Request Body
          </h3>
          <div class="p-3 bg-mono-50 rounded border border-mono-200">
            {#if editedEndpoint.requestBody}
              <pre class="text-xs text-mono-700">{editedEndpoint.requestBody}</pre>
            {:else}
              <p class="text-xs text-mono-500">No request body required</p>
            {/if}
          </div>
        </div>

        <!-- Response Preview -->
        <ResponsePreview responseBody={editedEndpoint.responseBody} />

        <!-- Response Envelope -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 flex items-center font-medium">
            <i class="fa-solid fa-envelope mr-2"></i>
            Response Envelope
          </h3>
          <div class="flex items-center space-x-2">
            <input
              id="envelope-toggle-drawer"
              type="checkbox"
              checked={true}
              disabled
              class="h-4 w-4 text-mono-900 border-mono-300 rounded opacity-60 cursor-not-allowed"
            />
            <label for="envelope-toggle-drawer" class="text-sm text-mono-700">
              Wrap response in standard envelope <span class="text-xs text-mono-500">(always enabled)</span>
            </label>
          </div>
        </div>
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if editedEndpoint}
      <div class="flex space-x-2">
        <button
          type="button"
          onclick={handleSave}
          disabled={!hasChanges}
          class="flex-1 px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {hasChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
        >
          <i class="fa-solid fa-save"></i>
          <span>Save</span>
        </button>
        <button
          type="button"
          onclick={handleUndo}
          disabled={!hasChanges}
          class="flex-1 px-4 py-2 border rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {hasChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
        >
          <i class="fa-solid fa-undo"></i>
          <span>Undo</span>
        </button>
        <button
          type="button"
          onclick={() => handleDuplicateEndpoint(editedEndpoint!.id)}
          class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <i class="fa-solid fa-copy"></i>
          <span>Duplicate</span>
        </button>
        <button
          type="button"
          onclick={() => handleDeleteEndpoint(editedEndpoint!.id)}
          class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <i class="fa-solid fa-trash"></i>
          <span>Delete</span>
        </button>
        <button
          type="button"
          onclick={handleCancel}
          class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    {/if}
  </DrawerFooter>
</Drawer>

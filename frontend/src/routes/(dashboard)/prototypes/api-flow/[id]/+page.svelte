<script lang="ts">
  import { goto } from '$app/navigation';
  import type { ApiEndpoint, HttpMethod, ResponseShape } from '$lib/types';
  import {
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    EndpointItem,
    NamespaceSelector,
    QueryParametersEditor,
    RequestBodyEditor,
    ResponseBodyEditor
  } from '$lib/components';
  import { activeNamespaceId } from '$lib/stores/namespaces';

  // Mock API data
  let api = $state({
    title: 'User Management API',
    version: '1.0.0',
    description: 'CRUD operations for user accounts',
    baseUrl: '/api/v1',
    serverUrl: 'https://api.example.com',
    namespaceName: 'Default'
  });

  // Mock endpoints
  let mockEndpoints = $state<ApiEndpoint[]>([
    {
      id: 'ep-1',
      apiId: 'mock',
      method: 'GET',
      path: '/users',
      description: 'List all users',
      tagName: 'Users',
      pathParams: [],
      useEnvelope: true,
      responseShape: 'list'
    },
    {
      id: 'ep-2',
      apiId: 'mock',
      method: 'POST',
      path: '/users',
      description: 'Create a new user',
      tagName: 'Users',
      pathParams: [],
      useEnvelope: true,
      responseShape: 'object'
    },
    {
      id: 'ep-3',
      apiId: 'mock',
      method: 'GET',
      path: '/users/{user_id}',
      description: 'Get user by ID',
      tagName: 'Users',
      pathParams: [{ name: 'user_id', fieldId: '' }],
      useEnvelope: true,
      responseShape: 'object'
    },
    {
      id: 'ep-4',
      apiId: 'mock',
      method: 'GET',
      path: '/products',
      description: 'List all products',
      tagName: 'Products',
      pathParams: [],
      useEnvelope: true,
      responseShape: 'list'
    },
    {
      id: 'ep-5',
      apiId: 'mock',
      method: 'POST',
      path: '/products',
      description: 'Create a product',
      tagName: 'Products',
      pathParams: [],
      useEnvelope: true,
      responseShape: 'object'
    },
    {
      id: 'ep-6',
      apiId: 'mock',
      method: 'GET',
      path: '/health',
      description: 'Health check endpoint',
      pathParams: [],
      useEnvelope: false,
      responseShape: 'object'
    },
    {
      id: 'ep-7',
      apiId: 'mock',
      method: 'GET',
      path: '/version',
      description: 'Get API version info',
      pathParams: [],
      useEnvelope: false,
      responseShape: 'object'
    }
  ]);

  // Group endpoints by tag for collapsible display
  let taggedGroups = $derived.by(() => {
    const groups = new Map<string, ApiEndpoint[]>();
    for (const ep of mockEndpoints) {
      if (ep.tagName) {
        const existing = groups.get(ep.tagName) ?? [];
        existing.push(ep);
        groups.set(ep.tagName, existing);
      }
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, endpoints]) => ({ tag, endpoints }));
  });

  let untaggedEndpoints = $derived(
    mockEndpoints.filter(ep => !ep.tagName)
  );

  // Unified tag sections: tagged groups + "default" for untagged (Swagger-style)
  let allTagSections = $derived.by(() => {
    const sections = taggedGroups.map(g => ({ tag: g.tag, endpoints: g.endpoints }));
    if (untaggedEndpoints.length > 0) {
      sections.push({ tag: 'default', endpoints: untaggedEndpoints });
    }
    return sections;
  });

  // Track which tag sections are expanded (all expanded by default, like Swagger UI)
  let expandedTags = $state(new Set<string>());
  let expandedTagsInitialized = $state(false);

  $effect(() => {
    const sections = allTagSections;
    if (!expandedTagsInitialized && sections.length > 0) {
      expandedTags = new Set(sections.map(s => s.tag));
      expandedTagsInitialized = true;
    }
  });

  function toggleTagSection(tag: string) {
    const next = new Set(expandedTags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    expandedTags = next;
  }

  // --- Edit API Drawer ---
  let editDrawerOpen = $state(false);
  let editForm = $state({
    title: '',
    version: '',
    description: '',
    serverUrl: '',
    baseUrl: '',
    namespaceName: ''
  });
  let originalForm = $state('');
  let hasEditChanges = $derived(JSON.stringify(editForm) !== originalForm);

  function openEditDrawer() {
    closeEndpointDrawer();
    editForm = {
      title: api.title,
      version: api.version,
      description: api.description,
      serverUrl: api.serverUrl,
      baseUrl: api.baseUrl,
      namespaceName: api.namespaceName
    };
    originalForm = JSON.stringify(editForm);
    editDrawerOpen = true;
  }

  function closeEditDrawer() {
    editDrawerOpen = false;
    showDeleteConfirm = false;
  }

  function handleEditSave() {
    api = { ...editForm };
    originalForm = JSON.stringify(editForm);
    closeEditDrawer();
  }

  function handleEditUndo() {
    editForm = JSON.parse(originalForm);
  }

  // --- Endpoint Drawer ---
  let endpointDrawerOpen = $state(false);
  let editedEndpoint = $state<ApiEndpoint | null>(null);
  let originalEndpoint = $state('');
  let isNewEndpoint = $state(false);
  let showEndpointDeleteConfirm = $state(false);

  // Tag state
  let tagInputValue = $state('');
  let tagDropdownOpen = $state(false);
  let existingTags = $derived([...new Set(mockEndpoints.map(e => e.tagName).filter(Boolean))] as string[]);
  let filteredTags = $derived.by(() => {
    const input = tagInputValue.toLowerCase().trim();
    if (!input) return existingTags;
    return existingTags.filter(t => t.toLowerCase().includes(input));
  });
  let exactTagMatch = $derived(
    existingTags.find(t => t.toLowerCase() === tagInputValue.toLowerCase().trim())
  );

  let hasEndpointChanges = $derived(
    editedEndpoint !== null && JSON.stringify(editedEndpoint) !== originalEndpoint
  );

  function openEndpointDrawer(endpoint: ApiEndpoint, isNew: boolean) {
    closeEditDrawer();
    editedEndpoint = JSON.parse(JSON.stringify(endpoint));
    originalEndpoint = JSON.stringify(endpoint);
    tagInputValue = endpoint.tagName ?? '';
    isNewEndpoint = isNew;
    showEndpointDeleteConfirm = false;
    endpointDrawerOpen = true;
  }

  function closeEndpointDrawer() {
    endpointDrawerOpen = false;
    editedEndpoint = null;
    showEndpointDeleteConfirm = false;
  }

  function handleAddEndpoint() {
    const newEndpoint: ApiEndpoint = {
      id: `ep-${Date.now()}`,
      apiId: 'mock',
      method: 'GET',
      path: '/',
      description: '',
      pathParams: [],
      useEnvelope: true,
      responseShape: 'object'
    };
    openEndpointDrawer(newEndpoint, true);
  }

  function handleEndpointClick(endpoint: ApiEndpoint) {
    openEndpointDrawer(endpoint, false);
  }

  function handlePathChange(newPath: string) {
    if (!editedEndpoint) return;
    // Extract path params from {param} patterns
    const paramNames = [...newPath.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    const existingParams = editedEndpoint.pathParams;
    const updatedParams = paramNames.map(name => {
      const existing = existingParams.find(p => p.name === name);
      return existing ?? { name, fieldId: '' };
    });
    editedEndpoint = { ...editedEndpoint, path: newPath, pathParams: updatedParams };
  }

  function handleTagSelect(tag: string | undefined) {
    if (!editedEndpoint) return;
    tagInputValue = tag ?? '';
    editedEndpoint = { ...editedEndpoint, tagName: tag };
    tagDropdownOpen = false;
  }

  function handleTagInputCommit() {
    const trimmed = tagInputValue.trim();
    if (trimmed) {
      handleTagSelect(trimmed);
    }
  }

  function handleSaveEndpoint() {
    if (!editedEndpoint) return;
    if (isNewEndpoint) {
      mockEndpoints = [...mockEndpoints, editedEndpoint];
    } else {
      mockEndpoints = mockEndpoints.map(ep =>
        ep.id === editedEndpoint!.id ? editedEndpoint! : ep
      );
    }
    closeEndpointDrawer();
  }

  function handleUndoEndpoint() {
    if (!originalEndpoint) return;
    editedEndpoint = JSON.parse(originalEndpoint);
    tagInputValue = editedEndpoint!.tagName ?? '';
  }

  function handleDuplicateEndpoint() {
    if (!editedEndpoint) return;
    const duplicate: ApiEndpoint = {
      ...JSON.parse(JSON.stringify(editedEndpoint)),
      id: `ep-${Date.now()}`
    };
    mockEndpoints = [...mockEndpoints, duplicate];
    closeEndpointDrawer();
  }

  function handleDeleteEndpoint() {
    if (!editedEndpoint) return;
    mockEndpoints = mockEndpoints.filter(ep => ep.id !== editedEndpoint!.id);
    closeEndpointDrawer();
  }

  // --- Delete API Modal ---
  let showDeleteConfirm = $state(false);

  function confirmDelete() {
    showDeleteConfirm = false;
    goto('/prototypes/api-flow');
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }
</script>

<!-- Compact Header -->
<div class="bg-white border-b border-mono-200 py-4 px-6">
  <div class="flex justify-between items-center">
    <!-- Left side -->
    <div>
      <button
        onclick={() => goto('/prototypes/api-flow')}
        class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-2"
      >
        <i class="fa-solid fa-arrow-left text-xs"></i>
        <span>Back to APIs</span>
      </button>

      <div class="flex items-center space-x-3 mb-1">
        <h1 class="text-xl font-semibold text-mono-900">{api.title}</h1>
        <span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">
          {api.version}
        </span>
      </div>

      {#if api.description}
        <p class="text-sm text-mono-500 mb-2">{api.description}</p>
      {/if}

      <div class="flex items-center space-x-4 text-xs text-mono-500">
        {#if api.serverUrl}
          <div class="flex items-center space-x-1.5">
            <i class="fa-solid fa-server"></i>
            <code class="font-mono">{api.serverUrl}</code>
          </div>
        {/if}
        {#if api.baseUrl}
          <div class="flex items-center space-x-1.5">
            <i class="fa-solid fa-link"></i>
            <code class="font-mono">{api.baseUrl}</code>
          </div>
        {/if}
        <div class="flex items-center space-x-1.5">
          <i class="fa-solid fa-layer-group"></i>
          <span>{api.namespaceName}</span>
        </div>
      </div>
    </div>

    <!-- Right side -->
    <div class="flex items-center space-x-2">
      <button
        onclick={handleAddEndpoint}
        class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Add Endpoint</span>
      </button>
      <button
        onclick={openEditDrawer}
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
    {#if mockEndpoints.length === 0}
      <div class="bg-white rounded-lg border border-mono-200">
        <div class="text-center py-8 text-mono-500">
          <i class="fa-solid fa-route text-2xl mb-2 text-mono-300"></i>
          <p class="text-sm">No endpoints yet. Create your first API endpoint.</p>
        </div>
      </div>
    {:else}
      <!-- Swagger-style flush tag sections -->
      <div class="rounded-lg overflow-hidden border border-mono-200">
        {#each allTagSections as section, i (section.tag)}
          {@const isExpanded = expandedTags.has(section.tag)}
          <div class="{i < allTagSections.length - 1 ? 'border-b border-mono-200' : ''}">
            <!-- Tag section header -->
            <button
              type="button"
              onclick={() => toggleTagSection(section.tag)}
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
                      onClick={() => handleEndpointClick(endpoint)}
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
<Drawer open={editDrawerOpen} maxWidth={520}>
  <DrawerHeader title="Edit API" onClose={closeEditDrawer} />

  <DrawerContent>
    <div class="space-y-4">
      <!-- Namespace -->
      <div>
        <label for="edit-namespace" class="block text-sm text-mono-700 mb-1 font-medium">
          Namespace
        </label>
        <NamespaceSelector />
      </div>

      <!-- API Title -->
      <div>
        <label for="edit-title" class="block text-sm text-mono-700 mb-1 font-medium">
          API Title <span class="text-red-500">*</span>
        </label>
        <input
          id="edit-title"
          type="text"
          bind:value={editForm.title}
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>

      <!-- Version -->
      <div>
        <label for="edit-version" class="block text-sm text-mono-700 mb-1 font-medium">
          Version
        </label>
        <input
          id="edit-version"
          type="text"
          bind:value={editForm.version}
          placeholder="1.0.0"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>

      <!-- Description -->
      <div>
        <label for="edit-description" class="block text-sm text-mono-700 mb-1 font-medium">
          Description
        </label>
        <textarea
          id="edit-description"
          bind:value={editForm.description}
          rows="3"
          placeholder="Describe what this API does..."
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        ></textarea>
      </div>

      <!-- Server URL -->
      <div>
        <label for="edit-server-url" class="block text-sm text-mono-700 mb-1 font-medium">
          Server URL
        </label>
        <input
          id="edit-server-url"
          type="text"
          bind:value={editForm.serverUrl}
          placeholder="https://api.example.com"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>

      <!-- Base URL -->
      <div>
        <label for="edit-base-url" class="block text-sm text-mono-700 mb-1 font-medium">
          Base URL
        </label>
        <input
          id="edit-base-url"
          type="text"
          bind:value={editForm.baseUrl}
          placeholder="/api/v1"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>
    </div>
  </DrawerContent>

  <DrawerFooter>
    {#if !showDeleteConfirm}
      <button
        type="button"
        onclick={handleEditSave}
        disabled={!hasEditChanges}
        class="w-full px-4 py-2 rounded-md transition-colors font-medium {hasEditChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
      >
        Save Changes
      </button>
      <button
        type="button"
        onclick={handleEditUndo}
        disabled={!hasEditChanges}
        class="w-full px-4 py-2 border rounded-md transition-colors font-medium {hasEditChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
      >
        Undo
      </button>
      <button
        type="button"
        onclick={() => showDeleteConfirm = true}
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
            onclick={confirmDelete}
            class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
          >
            Yes, Delete
          </button>
          <button
            type="button"
            onclick={() => showDeleteConfirm = false}
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
<Drawer open={endpointDrawerOpen} maxWidth={1200}>
  <DrawerHeader title={isNewEndpoint ? 'New Endpoint' : 'Edit Endpoint'} onClose={closeEndpointDrawer} />

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
                onblur={() => setTimeout(() => { tagDropdownOpen = false; }, 150)}
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTagInputCommit();
                  }
                }}
                placeholder="Type or select tag..."
                class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm pr-8"
              />
              {#if tagInputValue}
                <button
                  type="button"
                  onclick={() => handleTagSelect(undefined)}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-red-700 hover:text-red-600"
                  aria-label="Clear tag"
                >
                  <i class="fa-solid fa-xmark text-xs"></i>
                </button>
              {:else}
                <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
              {/if}
            </div>
            {#if tagDropdownOpen}
              <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                {#if tagInputValue.trim() && !exactTagMatch}
                  <button
                    type="button"
                    onclick={handleTagInputCommit}
                    class="w-full px-3 py-2 text-left text-sm hover:bg-mono-50 flex items-center space-x-2 text-mono-700 border-b border-mono-200"
                  >
                    <i class="fa-solid fa-plus text-xs"></i>
                    <span>Use "<strong>{tagInputValue.trim()}</strong>"</span>
                  </button>
                {/if}
                {#each filteredTags as tag (tag)}
                  <button
                    type="button"
                    onclick={() => handleTagSelect(tag)}
                    class="w-full px-3 py-2 text-left text-sm text-mono-700 hover:bg-mono-50 {editedEndpoint?.tagName === tag ? 'bg-mono-100' : ''}"
                  >
                    {tag}
                  </button>
                {/each}
                {#if filteredTags.length === 0 && !tagInputValue.trim()}
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
            <div class="px-3 py-1 bg-mono-50 rounded border border-mono-200">
              <p class="text-xs text-mono-500">No path parameters. Add parameters to your URL path using <code class="bg-mono-100 px-1 rounded">{`{param_name}`}</code></p>
            </div>
          {:else}
            <div class="px-3 py-2 bg-mono-50 rounded border border-mono-200 space-y-1">
              {#each editedEndpoint.pathParams as param (param.name)}
                <div class="flex items-center space-x-2 text-sm">
                  <code class="font-mono text-mono-700">{`{${param.name}}`}</code>
                  <span class="text-mono-400">—</span>
                  <span class="text-mono-500 italic">field selector available in live mode</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Query Parameters -->
        <QueryParametersEditor
          endpointNamespaceId={$activeNamespaceId}
          selectedObjectId={editedEndpoint.queryParamsObjectId}
          onSelectObject={(objectId) => { if (editedEndpoint) editedEndpoint = { ...editedEndpoint, queryParamsObjectId: objectId }; }}
        />

        <!-- Request Body Editor -->
        <RequestBodyEditor
          endpointNamespaceId={$activeNamespaceId}
          selectedObjectId={editedEndpoint.requestBodyObjectId}
          onSelectObject={(objectId) => { if (editedEndpoint) editedEndpoint = { ...editedEndpoint, requestBodyObjectId: objectId }; }}
        />

        <!-- Response Body Editor -->
        <ResponseBodyEditor
          endpointNamespaceId={$activeNamespaceId}
          selectedObjectId={editedEndpoint.responseBodyObjectId}
          useEnvelope={editedEndpoint.useEnvelope}
          responseShape={editedEndpoint.responseShape}
          onSelectObject={(objectId) => { if (editedEndpoint) editedEndpoint = { ...editedEndpoint, responseBodyObjectId: objectId }; }}
          onEnvelopeToggle={(enabled) => { if (editedEndpoint) editedEndpoint = { ...editedEndpoint, useEnvelope: enabled }; }}
          onSetResponseShape={(shape) => { if (editedEndpoint) editedEndpoint = { ...editedEndpoint, responseShape: shape }; }}
        />
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if editedEndpoint}
      {#if !showEndpointDeleteConfirm}
        <div class="flex space-x-2">
          <button
            type="button"
            onclick={handleSaveEndpoint}
            disabled={!hasEndpointChanges}
            class="flex-1 px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {hasEndpointChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
          >
            <i class="fa-solid fa-save"></i>
            <span>Save</span>
          </button>
          <button
            type="button"
            onclick={handleUndoEndpoint}
            disabled={!hasEndpointChanges}
            class="flex-1 px-4 py-2 border rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {hasEndpointChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
          >
            <i class="fa-solid fa-undo"></i>
            <span>Undo</span>
          </button>
          {#if !isNewEndpoint}
            <button
              type="button"
              onclick={handleDuplicateEndpoint}
              class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <i class="fa-solid fa-copy"></i>
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onclick={() => showEndpointDeleteConfirm = true}
              class="flex-1 px-4 py-2 border border-mono-300 text-red-700 rounded-md hover:bg-red-50 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <i class="fa-solid fa-xmark"></i>
              <span>Delete</span>
            </button>
          {/if}
          <button
            type="button"
            onclick={closeEndpointDrawer}
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
              onclick={handleDeleteEndpoint}
              class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Yes, Delete
            </button>
            <button
              type="button"
              onclick={() => showEndpointDeleteConfirm = false}
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

<script lang="ts">
  import { goto } from '$app/navigation';
  import type { ApiEndpoint } from '$lib/types';
  import {
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    EndpointItem,
    NamespaceSelector
  } from '$lib/components';

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
    }
  ]);

  // Edit drawer state
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

  let hasChanges = $derived(JSON.stringify(editForm) !== originalForm);

  function openEditDrawer() {
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
  }

  function handleSave() {
    api = { ...editForm };
    originalForm = JSON.stringify(editForm);
    closeEditDrawer();
  }

  function handleUndo() {
    editForm = JSON.parse(originalForm);
  }

  // Delete modal state
  let showDeleteConfirm = $state(false);

  function handleDeleteClick() {
    showDeleteConfirm = true;
  }

  function confirmDelete() {
    showDeleteConfirm = false;
    goto('/prototypes/api-flow');
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  function handleAddEndpoint() {
    const newEndpoint: ApiEndpoint = {
      id: `ep-${Date.now()}`,
      apiId: 'mock',
      method: 'GET',
      path: '/new-endpoint',
      description: '',
      pathParams: [],
      useEnvelope: true,
      responseShape: 'object'
    };
    mockEndpoints = [...mockEndpoints, newEndpoint];
  }

  function handleEndpointClick(endpoint: ApiEndpoint) {
    // Placeholder: would open endpoint edit drawer in real implementation
  }
</script>

<!-- Compact Header -->
<div class="bg-white border-b border-mono-200 py-4 px-6">
  <div class="flex justify-between items-start">
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
        class="px-3 py-1.5 bg-mono-900 text-white text-sm rounded-md flex items-center space-x-2 hover:bg-mono-800 transition-colors"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Add Endpoint</span>
      </button>
      <button
        onclick={openEditDrawer}
        class="px-3 py-1.5 border border-mono-300 text-mono-700 text-sm rounded-md flex items-center space-x-2 hover:bg-mono-50 transition-colors"
      >
        <i class="fa-solid fa-pen-to-square"></i>
        <span>Edit</span>
      </button>
      <button
        onclick={handleDeleteClick}
        class="px-3 py-1.5 border border-red-300 text-red-700 text-sm rounded-md flex items-center space-x-2 hover:bg-red-50 transition-colors"
      >
        <i class="fa-solid fa-trash"></i>
        <span>Delete</span>
      </button>
    </div>
  </div>
</div>

<!-- Main Content -->
<div class="flex-1 overflow-auto">
  <div class="max-w-7xl mx-auto p-6">
    <!-- Endpoints Card -->
    <div class="bg-white rounded-lg border border-mono-200">
      <div class="flex items-center justify-between px-4 py-3">
        <h2 class="text-base text-mono-800 flex items-center">
          <i class="fa-solid fa-route mr-2"></i>
          API Endpoints
        </h2>
      </div>

      <div class="px-4 pb-4">
        {#if mockEndpoints.length === 0}
          <div class="text-center py-6 text-mono-500">
            <i class="fa-solid fa-route text-2xl mb-2 text-mono-300"></i>
            <p class="text-sm">No endpoints yet. Create your first API endpoint.</p>
          </div>
        {:else}
          <div class="space-y-2">
            {#each mockEndpoints as endpoint (endpoint.id)}
              <EndpointItem
                {endpoint}
                onClick={() => handleEndpointClick(endpoint)}
              />
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-medium text-mono-900 mb-2">Delete API</h3>
      <p class="text-mono-600 mb-4">
        Are you sure you want to delete "{api.title}"?
        This will also delete all its endpoints. This action cannot be undone.
      </p>
      <div class="flex space-x-2">
        <button
          onclick={confirmDelete}
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center space-x-2"
        >
          <i class="fa-solid fa-trash"></i>
          <span>Delete</span>
        </button>
        <button
          onclick={cancelDelete}
          class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Drawer -->
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
    <div class="flex space-x-2">
      <button
        type="button"
        onclick={handleSave}
        disabled={!hasChanges}
        class="flex-1 px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {hasChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
      >
        <i class="fa-solid fa-save"></i>
        <span>Save Changes</span>
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
        onclick={closeEditDrawer}
        class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium"
      >
        Cancel
      </button>
    </div>
  </DrawerFooter>
</Drawer>

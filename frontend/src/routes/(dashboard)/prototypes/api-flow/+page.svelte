<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    EmptyState,
    Drawer,
    DrawerHeader,
    DrawerContent,
    DrawerFooter,
    CrudDrawerFooter,
    NamespaceSelector
  } from '$lib/components';

  // Mock API type for prototype
  type MockApi = {
    id: string;
    title: string;
    version: string;
    description: string;
    baseUrl: string;
    serverUrl: string;
    endpointCount: number;
    namespaceName: string;
  };

  // Mock data
  let mockApis = $state<MockApi[]>([
    {
      id: 'api-1',
      title: 'User Management API',
      version: '1.0.0',
      description: 'CRUD operations for user accounts',
      baseUrl: '/api/v1',
      serverUrl: 'https://api.example.com',
      endpointCount: 5,
      namespaceName: 'Default'
    },
    {
      id: 'api-2',
      title: 'Payment Gateway',
      version: '2.1.0',
      description: 'Process payments and refunds',
      baseUrl: '/api/v2',
      serverUrl: 'https://payments.example.com',
      endpointCount: 3,
      namespaceName: 'Default'
    },
    {
      id: 'api-3',
      title: 'Inventory Service',
      version: '1.2.0',
      description: 'Track and manage product inventory',
      baseUrl: '/api/v1',
      serverUrl: 'https://inventory.example.com',
      endpointCount: 8,
      namespaceName: 'Default'
    },
    {
      id: 'api-4',
      title: 'Notification API',
      version: '1.0.0',
      description: '',
      baseUrl: '/api/v1',
      serverUrl: 'https://notifications.example.com',
      endpointCount: 2,
      namespaceName: 'Default'
    }
  ]);

  // Search
  let searchQuery = $state('');
  let filteredApis = $derived(
    searchQuery.trim()
      ? mockApis.filter(api =>
          api.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          api.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : mockApis
  );

  // Sort state
  type SortDirection = 'asc' | 'desc' | null;
  let sortColumn = $state<string | null>(null);
  let sortDirection = $state<SortDirection>(null);
  let sorts = $derived(
    sortColumn && sortDirection
      ? [{ column: sortColumn, direction: sortDirection }]
      : []
  );

  function handleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
      if (!sortDirection) sortColumn = null;
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }

  // Drawer state
  let drawerOpen = $state(false);
  let isSaving = $state(false);
  let formTouched = $state(false);

  // Form state for create drawer
  let formData = $state({
    title: '',
    version: '1.0.0',
    description: '',
    serverUrl: '',
    baseUrl: '/api/v1'
  });

  // Validation
  let formErrors = $derived.by(() => {
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) errors.title = 'API title is required';
    return errors;
  });

  let isFormValid = $derived(Object.keys(formErrors).length === 0);
  let visibleErrors = $derived(formTouched ? formErrors : {});

  function openCreateDrawer() {
    formData = {
      title: '',
      version: '1.0.0',
      description: '',
      serverUrl: '',
      baseUrl: '/api/v1'
    };
    formTouched = false;
    drawerOpen = true;
  }

  function closeDrawer() {
    drawerOpen = false;
    formTouched = false;
  }

  function handleCreate() {
    formTouched = true;
    if (!isFormValid) return;

    // Generate a mock ID and navigate to detail page
    const newId = `api-${Date.now()}`;
    const newApi: MockApi = {
      id: newId,
      title: formData.title,
      version: formData.version,
      description: formData.description,
      baseUrl: formData.baseUrl,
      serverUrl: formData.serverUrl,
      endpointCount: 0,
      namespaceName: 'Default'
    };
    mockApis = [...mockApis, newApi];
    closeDrawer();
    goto(`/prototypes/api-flow/${newId}`);
  }

  function handleRowClick(api: MockApi) {
    goto(`/prototypes/api-flow/${api.id}`);
  }
</script>

<PageHeader title="APIs (Prototype)">
  {#snippet actions()}
    <NamespaceSelector />
    <button
      type="button"
      onclick={openCreateDrawer}
      class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
    >
      <i class="fa-solid fa-plus"></i>
      <span>New API</span>
    </button>
  {/snippet}
</PageHeader>

<SearchBar
  bind:searchQuery={searchQuery}
  placeholder="Search APIs..."
  resultsCount={filteredApis.length}
  resultLabel="API"
  showFilter={false}
  active={false}
/>

<Table isEmpty={filteredApis.length === 0}>
  {#snippet header()}
    <tr>
      <SortableColumn
        column="title"
        label="Name"
        {sorts}
        onSort={handleSort}
      />
      <SortableColumn
        column="version"
        label="Version"
        {sorts}
        onSort={handleSort}
      />
      <SortableColumn
        column="baseUrl"
        label="Base URL"
        {sorts}
        onSort={handleSort}
      />
      <SortableColumn
        column="endpointCount"
        label="Endpoints"
        {sorts}
        onSort={handleSort}
      />
      <SortableColumn
        column="namespaceName"
        label="Namespace"
        {sorts}
        onSort={handleSort}
      />
    </tr>
  {/snippet}

  {#snippet body()}
    {#each filteredApis as api}
      <tr
        onclick={() => handleRowClick(api)}
        class="cursor-pointer transition-colors hover:bg-mono-50"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-mono-900 font-medium">{api.title}</div>
          {#if api.description}
            <div class="text-xs text-mono-500 truncate max-w-xs">{api.description}</div>
          {/if}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
            {api.version}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <code class="text-sm text-mono-600 font-mono">{api.baseUrl}</code>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
              {api.endpointCount}
            </span>
            <span class="text-sm text-mono-600">endpoints</span>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm text-mono-600">{api.namespaceName}</span>
        </td>
      </tr>
    {/each}
  {/snippet}

  {#snippet empty()}
    <EmptyState
      title="No APIs found"
      message="Create your first API by clicking the 'New API' button above"
    />
  {/snippet}
</Table>

<Drawer open={drawerOpen} maxWidth={520}>
  <DrawerHeader title="Create API" onClose={closeDrawer} />

  <DrawerContent>
    <div class="space-y-4">
      <!-- API Title -->
      <div>
        <label for="api-title" class="block text-sm text-mono-700 mb-1 font-medium">
          API Title <span class="text-red-500">*</span>
        </label>
        <input
          id="api-title"
          type="text"
          bind:value={formData.title}
          placeholder="My API"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {visibleErrors.title ? 'border-red-500' : ''}"
        />
        {#if visibleErrors.title}
          <p class="text-xs text-red-500 mt-1">{visibleErrors.title}</p>
        {/if}
      </div>

      <!-- Version -->
      <div>
        <label for="api-version" class="block text-sm text-mono-700 mb-1 font-medium">
          Version
        </label>
        <input
          id="api-version"
          type="text"
          bind:value={formData.version}
          placeholder="1.0.0"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>

      <!-- Description -->
      <div>
        <label for="api-description" class="block text-sm text-mono-700 mb-1 font-medium">
          Description
        </label>
        <textarea
          id="api-description"
          bind:value={formData.description}
          rows="3"
          placeholder="Describe what this API does..."
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        ></textarea>
      </div>

      <!-- Server URL -->
      <div>
        <label for="api-server-url" class="block text-sm text-mono-700 mb-1 font-medium">
          Server URL
        </label>
        <input
          id="api-server-url"
          type="text"
          bind:value={formData.serverUrl}
          placeholder="https://api.example.com"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>

      <!-- Base URL -->
      <div>
        <label for="api-base-url" class="block text-sm text-mono-700 mb-1 font-medium">
          Base URL
        </label>
        <input
          id="api-base-url"
          type="text"
          bind:value={formData.baseUrl}
          placeholder="/api/v1"
          class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
      </div>

      <!-- Namespace (read-only) -->
      <div>
        <label for="api-namespace" class="block text-sm text-mono-700 mb-1 font-medium">
          Namespace
        </label>
        <input
          id="api-namespace"
          type="text"
          value="Default"
          disabled
          class="w-full px-3 py-2 border border-mono-300 rounded-md bg-mono-50 text-mono-500 cursor-not-allowed"
        />
        <p class="text-xs text-mono-500 mt-1">Uses the currently active namespace</p>
      </div>
    </div>
  </DrawerContent>

  <DrawerFooter>
    <CrudDrawerFooter
      mode="creating"
      {isSaving}
      {isFormValid}
      hasChanges={false}
      canDelete={false}
      onCreate={handleCreate}
    />
  </DrawerFooter>
</Drawer>

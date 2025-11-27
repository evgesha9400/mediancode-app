<script lang="ts">
  import { DashboardLayout, ApiMetadataCard, TagsCard, EndpointsCard } from '$lib/components';
  import {
    apiMetadataStore,
    tagsStore,
    endpointsStore,
    updateApiMetadata,
    addTag,
    updateTag,
    deleteTag,
    addEndpoint,
    updateEndpoint,
    deleteEndpoint,
    toggleEndpointExpanded,
    getEndpointCountByTag,
    deleteTagAndClearEndpoints
  } from '$lib/stores/apis';
  import { showToast } from '$lib/stores/toasts';
  import type { ApiMetadata, EndpointTag, ApiEndpoint } from '$lib/types';

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

  // Generate unique IDs
  let idCounter = 0;
  function generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${idCounter++}`;
  }

  // Handle metadata updates
  function handleMetadataUpdate(updates: Partial<ApiMetadata>) {
    updateApiMetadata(updates);
  }

  // Handle tag operations
  function handleAddTag(data: { name: string; description: string }) {
    const newTag: EndpointTag = {
      id: generateId('tag'),
      name: data.name,
      description: data.description
    };
    addTag(newTag);
    showToast('Tag created successfully', 'success');
  }

  function handleEditTag(tagId: string, data: { name: string; description: string }) {
    updateTag(tagId, data);
    showToast('Tag updated successfully', 'success');
  }

  function handleDeleteTag(tagId: string) {
    // Delete tag and clear tagId from all endpoints using it
    deleteTagAndClearEndpoints(tagId);

    showToast('Tag deleted successfully', 'success');
  }

  // Handle endpoint operations
  function handleAddEndpoint() {
    const newEndpoint: ApiEndpoint = {
      id: generateId('endpoint'),
      method: 'GET',
      path: '/new-endpoint',
      description: 'New endpoint description',
      tagId: undefined,
      pathParams: [],
      queryParams: [],
      responseBody: '{\n  "message": "Success"\n}',
      useEnvelope: true,
      expanded: true
    };
    addEndpoint(newEndpoint);
    showToast('Endpoint added successfully', 'success');
  }

  function handleToggleEndpoint(endpointId: string) {
    toggleEndpointExpanded(endpointId);
  }

  function handleUpdateEndpoint(endpointId: string, updates: Partial<ApiEndpoint>) {
    updateEndpoint(endpointId, updates);
  }

  function handleDeleteEndpoint(endpointId: string) {
    deleteEndpoint(endpointId);
    showToast('Endpoint deleted successfully', 'success');
  }

  function handleDuplicateEndpoint(endpointId: string) {
    const original = endpoints.find(e => e.id === endpointId);
    if (!original) return;

    const duplicated: ApiEndpoint = {
      ...original,
      id: generateId('endpoint'),
      path: `${original.path}-copy`,
      expanded: false,
      pathParams: original.pathParams.map(p => ({ ...p, id: generateId('param') })),
      queryParams: original.queryParams.map(p => ({ ...p, id: generateId('param') }))
    };
    addEndpoint(duplicated);
    showToast('Endpoint duplicated successfully', 'success');
  }

  // Handle generate code button
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

      <!-- Endpoint Tags Card -->
      <TagsCard
        {tags}
        onAdd={handleAddTag}
        onEdit={handleEditTag}
        onDelete={handleDeleteTag}
        getEndpointCount={getEndpointCountByTag}
      />

      <!-- API Endpoints Card -->
      <EndpointsCard
        {endpoints}
        {tags}
        onAdd={handleAddEndpoint}
        onToggleExpand={handleToggleEndpoint}
        onUpdate={handleUpdateEndpoint}
        onDelete={handleDeleteEndpoint}
        onDuplicate={handleDuplicateEndpoint}
      />
    </div>
  </div>
</DashboardLayout>

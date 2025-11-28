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
    RequestBodyEditor,
    ResponseBodyEditor
  } from '$lib/components';
  import { createApiGeneratorState } from '$lib/stores/apiGeneratorState.svelte';

  // Create state container
  const state = createApiGeneratorState();
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
          onclick={state.handleGenerateCode}
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
      <ApiMetadataCard metadata={state.metadata} onUpdate={state.handleMetadataUpdate} />

      <!-- API Endpoints Card -->
      <div class="bg-white rounded-lg border border-mono-200">
        <div class="flex items-center justify-between px-4 py-3">
          <h2 class="text-base text-mono-800 flex items-center">
            <i class="fa-solid fa-route mr-2"></i>
            API Endpoints
          </h2>
          <button
            onclick={state.handleAddEndpoint}
            class="px-3 py-1.5 bg-mono-900 text-white text-sm rounded-md flex items-center space-x-2 hover:bg-mono-800"
          >
            <i class="fa-solid fa-plus"></i>
            <span>New Endpoint</span>
          </button>
        </div>

        <div class="px-4 pb-4">
          {#if state.endpoints.length === 0}
            <div class="text-center py-6 text-mono-500">
              <i class="fa-solid fa-route text-2xl mb-2 text-mono-300"></i>
              <p class="text-sm">No endpoints yet. Create your first API endpoint.</p>
            </div>
          {:else}
            <div class="space-y-2">
              {#each state.endpoints as endpoint (endpoint.id)}
                <EndpointItem
                  {endpoint}
                  tags={state.tags}
                  onClick={() => state.openEndpoint(endpoint)}
                />
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</DashboardLayout>

<!-- Edit Drawer -->
<Drawer open={state.drawerOpen} maxWidth={1200}>
  <DrawerHeader title="Edit Endpoint" onClose={state.closeDrawer} />

  <DrawerContent>
    {#if state.editedEndpoint}
      <div class="space-y-6">
        <!-- Method and Path -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 flex items-center font-medium">
            <i class="fa-solid fa-route mr-2"></i>
            Method & Path
          </h3>
          <div class="flex items-center space-x-2">
            <select
              bind:value={state.editedEndpoint.method}
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
                value={state.editedEndpoint.path.substring(1)}
                oninput={(e) => state.handlePathChange('/' + e.currentTarget.value)}
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
                bind:value={state.tagInputValue}
                onfocus={() => state.tagDropdownOpen = true}
                onblur={() => setTimeout(() => state.tagDropdownOpen = false, 150)}
                onkeydown={(e) => {
                  if (e.key === 'Enter' && state.tagInputValue.trim() && !state.exactTagMatch) {
                    e.preventDefault();
                    state.handleCreateTag();
                  }
                }}
                placeholder="Select or create tag..."
                class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm pr-8"
              />
              {#if state.tagInputValue}
                <button
                  type="button"
                  onclick={() => state.handleTagSelect(undefined)}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-mono-400 hover:text-mono-600"
                  aria-label="Clear tag"
                >
                  <i class="fa-solid fa-times text-xs"></i>
                </button>
              {:else}
                <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
              {/if}
            </div>
            {#if state.tagDropdownOpen && !state.tagToDelete}
              <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg max-h-48 overflow-auto">
                {#if state.tagInputValue.trim() && !state.exactTagMatch}
                  <button
                    type="button"
                    onclick={state.handleCreateTag}
                    class="w-full px-3 py-2 text-left text-sm hover:bg-mono-50 flex items-center space-x-2 text-mono-700 border-b border-mono-200"
                  >
                    <i class="fa-solid fa-plus text-xs"></i>
                    <span>Create "<strong>{state.tagInputValue.trim()}</strong>"</span>
                  </button>
                {/if}
                {#each state.tags as tag (tag.id)}
                  <div class="flex items-center hover:bg-mono-50 {state.editedEndpoint?.tagId === tag.id ? 'bg-mono-100' : ''}">
                    <button
                      type="button"
                      onclick={() => state.handleTagSelect(tag.id)}
                      class="flex-1 px-3 py-2 text-left text-sm text-mono-700"
                    >
                      {tag.name}
                    </button>
                    <button
                      type="button"
                      onclick={(e) => state.handleDeleteTagClick(e, tag)}
                      class="px-3 py-2 text-mono-400 hover:text-red-500 transition-colors"
                      aria-label="Delete tag"
                    >
                      <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                  </div>
                {/each}
                {#if state.tags.length === 0 && !state.tagInputValue.trim()}
                  <div class="px-3 py-2 text-sm text-mono-500">No tags yet</div>
                {/if}
              </div>
            {/if}
            {#if state.tagToDelete}
              <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg p-3">
                <p class="text-sm text-mono-700 mb-2">
                  Delete tag "<strong>{state.tagToDelete.name}</strong>"?
                </p>
                {#if state.getEndpointsUsingTag(state.tagToDelete.id) > 0}
                  <p class="text-xs text-mono-500 mb-3">
                    This tag is used by {state.getEndpointsUsingTag(state.tagToDelete.id)} endpoint{state.getEndpointsUsingTag(state.tagToDelete.id) > 1 ? 's' : ''}. It will be removed from them.
                  </p>
                {/if}
                <div class="flex space-x-2">
                  <button
                    type="button"
                    onclick={state.confirmDeleteTag}
                    class="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onclick={state.cancelDeleteTag}
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
              bind:value={state.editedEndpoint.description}
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
          {#if state.editedEndpoint.pathParams.length === 0}
            <div class="p-3 bg-mono-50 rounded border border-mono-200">
              <p class="text-xs text-mono-500">No path parameters. Add parameters to your URL path using <code class="bg-mono-100 px-1 rounded">{`{param_name}`}</code></p>
            </div>
          {:else}
            <div class="space-y-2">
              {#each state.editedEndpoint.pathParams as param (param.id)}
                <ParameterEditor
                  parameter={param}
                  onUpdate={(updates) => state.handlePathParamUpdate(param.id, updates)}
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
              onclick={state.handleAddQueryParam}
              class="px-3 py-1.5 bg-mono-900 text-white text-sm rounded-md flex items-center space-x-2 hover:bg-mono-800"
            >
              <i class="fa-solid fa-plus"></i>
              <span>Add Parameter</span>
            </button>
          </div>
          {#if state.editedEndpoint.queryParams.length === 0}
            <div class="p-3 bg-mono-50 rounded border border-mono-200">
              <p class="text-xs text-mono-500">No query parameters</p>
            </div>
          {:else}
            <div class="space-y-2">
              {#each state.editedEndpoint.queryParams as param (param.id)}
                <ParameterEditor
                  parameter={param}
                  onUpdate={(updates) => state.handleQueryParamUpdate(param.id, updates)}
                  onDelete={() => state.handleQueryParamDelete(param.id)}
                />
              {/each}
            </div>
          {/if}
        </div>

        <!-- Request Body Editor -->
        <RequestBodyEditor
          mode={state.editedEndpoint.requestBodyMode}
          fields={state.editedEndpoint.requestBodyFields}
          jsonBody={state.editedEndpoint.requestBodyJson}
          errors={state.requestBodyErrors}
          onModeChange={state.handleRequestBodyModeChange}
          onFieldUpdate={state.handleRequestBodyFieldUpdate}
          onFieldDelete={state.handleRequestBodyFieldDelete}
          onAddField={state.handleAddRequestBodyField}
          onJsonChange={state.handleRequestBodyJsonChange}
        />

        <!-- Response Body Editor -->
        <ResponseBodyEditor
          mode={state.editedEndpoint.responseBodyMode}
          fields={state.editedEndpoint.responseBodyFields}
          jsonBody={state.editedEndpoint.responseBodyJson}
          errors={state.responseBodyErrors}
          useEnvelope={state.editedEndpoint.useEnvelope}
          onModeChange={state.handleResponseBodyModeChange}
          onFieldUpdate={state.handleResponseBodyFieldUpdate}
          onFieldDelete={state.handleResponseBodyFieldDelete}
          onAddField={state.handleAddResponseBodyField}
          onJsonChange={state.handleResponseBodyJsonChange}
          onCopyFromRequest={state.handleCopyRequestToResponse}
          onEnvelopeToggle={state.handleEnvelopeToggle}
        />
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if state.editedEndpoint}
      <div class="flex space-x-2">
        <button
          type="button"
          onclick={state.handleSave}
          disabled={!state.hasChanges}
          class="flex-1 px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {state.hasChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
        >
          <i class="fa-solid fa-save"></i>
          <span>Save</span>
        </button>
        <button
          type="button"
          onclick={state.handleUndo}
          disabled={!state.hasChanges}
          class="flex-1 px-4 py-2 border rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {state.hasChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
        >
          <i class="fa-solid fa-undo"></i>
          <span>Undo</span>
        </button>
        <button
          type="button"
          onclick={() => state.handleDuplicateEndpoint(state.editedEndpoint!.id)}
          class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <i class="fa-solid fa-copy"></i>
          <span>Duplicate</span>
        </button>
        <button
          type="button"
          onclick={() => state.handleDeleteEndpoint(state.editedEndpoint!.id)}
          class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <i class="fa-solid fa-trash"></i>
          <span>Delete</span>
        </button>
        <button
          type="button"
          onclick={state.handleCancel}
          class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    {/if}
  </DrawerFooter>
</Drawer>

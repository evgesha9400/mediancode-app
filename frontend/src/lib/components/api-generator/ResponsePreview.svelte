<script module lang="ts">
  import type { HttpMethod, ResponseShape } from '$lib/types';

  export interface ResponsePreviewProps {
    selectedObjectId?: string;
    responseShape: ResponseShape;
    method: HttpMethod;
  }
</script>

<script lang="ts">
  import type { ScalarMember } from '$lib/types';
  import { objectsStore } from '$lib/stores/objects';
  import { getFieldById } from '$lib/stores/fields';
  import { getObjectById } from '$lib/stores/objects';
  import { buildRequestPreviewFromObject, buildResponsePreviewFromObject } from '$lib/utils/examples';
  import { dashboardTextPrimary, surfaceInsideFrostedPanel } from '$lib/ui/classes';

  interface Props extends ResponsePreviewProps {}

  let { selectedObjectId, responseShape, method }: Props = $props();

  // Methods that include a request body (POST, PUT, PATCH)
  const hasRequestBody = $derived(['POST', 'PUT', 'PATCH'].includes(method));

  // DELETE returns 204 No Content — no response body
  const hasResponseBody = $derived(method !== 'DELETE');

  // Build preview JSON using shared utilities (appears flag filters fields automatically)
  // Response preview always shows without envelope wrapping (envelope is always enabled on the endpoint)
  const requestPreviewJson = $derived(buildRequestPreviewFromObject(selectedObjectId, $objectsStore));
  const responsePreviewJson = $derived(
    buildResponsePreviewFromObject(responseShape, selectedObjectId, false, $objectsStore)
  );

  // Get the selected object for display
  const selectedObject = $derived(
    selectedObjectId ? getObjectById(selectedObjectId) : undefined
  );

  // Use two-column grid only when both request and response are shown
  const showTwoColumns = $derived(hasRequestBody && hasResponseBody);
</script>

<div class="space-y-4">
  <h3 class="text-sm text-mono-300 flex items-center font-medium">
    <i class="fa-solid fa-eye mr-2"></i>
    Request & Response Preview
  </h3>

  <!-- Selected Object Field Summary -->
  {#if selectedObject}
    <div class="p-3 {surfaceInsideFrostedPanel}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2">
          <i class="fa-solid fa-cube text-mono-400 text-sm"></i>
          <span class="font-mono text-sm text-mono-300">{selectedObject.name}</span>
        </div>
        <span class="text-xs text-mono-400">{selectedObject.members.length} members</span>
      </div>

      {#if selectedObject.description}
        <p class="text-xs text-mono-400 mb-2">{selectedObject.description}</p>
      {/if}

      <!-- Field List (scalar members only) -->
      <div class="space-y-1 mt-2">
        <p class="text-xs text-mono-400 font-medium">Fields:</p>
        {#each selectedObject.members.filter(m => m.memberType === 'scalar') as member (member.fieldId)}
          {@const scalarMember = member as ScalarMember}
          {@const field = getFieldById(scalarMember.fieldId)}
          {#if field}
            <div class="flex items-center justify-between text-xs">
              <span class="font-mono text-mono-300">{scalarMember.name}</span>
              <div class="flex items-center space-x-2">
                {#if scalarMember.role !== 'writable'}
                  <span class="text-mono-500 text-[10px] uppercase">{scalarMember.role.replace(/_/g, ' ')}</span>
                {/if}
                <span class="text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded-lg">{field.type}</span>
              </div>
            </div>
          {:else}
            <div class="flex items-center gap-2 text-xs text-red-400">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>Field not found ({scalarMember.fieldId})</span>
            </div>
          {/if}
        {/each}
      </div>

      {#if method === 'DELETE'}
        <p class="text-xs text-mono-500 mt-2 border-t border-mono-700/80 pt-2">
          For DELETE, this object defines path parameter types and which entity is addressed — not a
          response body.
        </p>
      {/if}
    </div>
  {:else}
    <div class="p-3 {surfaceInsideFrostedPanel}">
      <p class="text-xs text-mono-400">No object selected — select an object above to see previews</p>
    </div>
  {/if}

  <!-- Request & Response JSON Previews -->
  {#if hasRequestBody || hasResponseBody}
    <div class={showTwoColumns ? 'response-preview-grid' : ''}>
      {#if hasRequestBody}
        <!-- Request column -->
        <div class="space-y-2">
          <h4 class="text-xs text-mono-400 flex items-center font-medium uppercase tracking-wider">
            <i class="fa-solid fa-arrow-up mr-2"></i>
            Request Body
          </h4>
          <div class="p-3 {surfaceInsideFrostedPanel} {dashboardTextPrimary} text-sm overflow-x-auto">
            <pre>{requestPreviewJson}</pre>
          </div>
        </div>
      {/if}

      {#if hasResponseBody}
        <!-- Response column -->
        <div class="space-y-2">
          <h4 class="text-xs text-mono-400 flex items-center font-medium uppercase tracking-wider">
            <i class="fa-solid fa-arrow-down mr-2"></i>
            Response Body
          </h4>
          <div class="p-3 {surfaceInsideFrostedPanel} {dashboardTextPrimary} text-sm overflow-x-auto">
            <pre>{responsePreviewJson}</pre>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <!-- DELETE: no request or response body -->
    <div class="p-3 {surfaceInsideFrostedPanel}">
      <p class="text-sm text-mono-400">DELETE returns <code class="bg-mono-800 px-1 rounded-lg">204 No Content</code> with no response body.</p>
    </div>
  {/if}
</div>

<style>
  .response-preview-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @container (min-width: 700px) {
    .response-preview-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>

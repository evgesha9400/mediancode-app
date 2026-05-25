<script module lang="ts">
  import type { ResponseShape } from '$lib/types';
  import type { EndpointQueryControls } from '$lib/domain/endpointQuerySemantics';

  export interface ResponsePreviewProps {
    selectedObjectId?: string;
    responseShape: ResponseShape;
    previewControl: EndpointQueryControls['responsePreview'];
  }
</script>

<script lang="ts">
  import type { FieldMember } from '$lib/types';
  import { objectsStore, getFieldById, getObjectById } from '$lib/stores/stores';
  import { buildRequestPreviewFromObject, buildResponsePreviewFromObject } from '$lib/utils/examples';
  import { dashboardTextPrimary, surfaceInsideFrostedPanel } from '$lib/ui/classes';

  interface Props extends ResponsePreviewProps {}

  let { selectedObjectId, responseShape, previewControl }: Props = $props();

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
  const showTwoColumns = $derived(previewControl.requestBodyVisible && previewControl.responseBodyVisible);
</script>

<div class="space-y-4">
  <h3 class="text-sm text-fg-secondary flex items-center font-medium">
    <i class="fa-solid fa-eye mr-2"></i>
    Request & Response Preview
  </h3>

  <!-- Selected Object Field Summary -->
  {#if selectedObject}
    <div class="p-3 {surfaceInsideFrostedPanel}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center space-x-2">
          <i class="fa-solid fa-cube text-fg-muted text-sm"></i>
          <span class="font-mono text-sm text-fg-secondary">{selectedObject.name}</span>
        </div>
        <span class="text-xs text-fg-muted">{selectedObject.members.length} members</span>
      </div>

      {#if selectedObject.description}
        <p class="text-xs text-fg-muted mb-2">{selectedObject.description}</p>
      {/if}

      <!-- Field List (field members only) -->
      <div class="space-y-1 mt-2">
        <p class="text-xs text-fg-muted font-medium">Fields:</p>
        {#each selectedObject.members.filter(m => m.memberType === 'field') as member (member.fieldId)}
          {@const fieldMember = member as FieldMember}
          {@const field = getFieldById(fieldMember.fieldId)}
          {#if field}
            <div class="flex items-center justify-between text-xs">
              <span class="font-mono text-fg-secondary">{fieldMember.name}</span>
              <div class="flex items-center space-x-2">
                {#if fieldMember.role !== 'writable'}
                  <span class="text-fg-dimmed text-[10px] uppercase">{fieldMember.role.replace(/_/g, ' ')}</span>
                {/if}
                <span class="text-fg-muted bg-surface-raised px-1.5 py-0.5 rounded-lg">{field.type}</span>
              </div>
            </div>
          {:else}
            <div class="flex items-center gap-2 text-xs text-red-400">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>Field not found ({fieldMember.fieldId})</span>
            </div>
          {/if}
        {/each}
      </div>

      {#if previewControl.targetNote}
        <p class="text-xs text-fg-dimmed mt-2 border-t border-edge/80 pt-2">
          {previewControl.targetNote}
        </p>
      {/if}
    </div>
  {:else}
    <div class="p-3 {surfaceInsideFrostedPanel}">
      <p class="text-xs text-fg-muted">No object selected — select an object above to see previews</p>
    </div>
  {/if}

  <!-- Request & Response JSON Previews -->
  {#if previewControl.requestBodyVisible || previewControl.responseBodyVisible}
    <div class={showTwoColumns ? 'response-preview-grid' : ''}>
      {#if previewControl.requestBodyVisible}
        <!-- Request column -->
        <div class="space-y-2">
          <h4 class="text-xs text-fg-muted flex items-center font-medium uppercase tracking-wider">
            <i class="fa-solid fa-arrow-up mr-2"></i>
            Request Body
          </h4>
          <div class="p-3 {surfaceInsideFrostedPanel} {dashboardTextPrimary} text-sm overflow-x-auto">
            <pre>{requestPreviewJson}</pre>
          </div>
        </div>
      {/if}

      {#if previewControl.responseBodyVisible}
        <!-- Response column -->
        <div class="space-y-2">
          <h4 class="text-xs text-fg-muted flex items-center font-medium uppercase tracking-wider">
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
    <div class="p-3 {surfaceInsideFrostedPanel}">
      <p class="text-sm text-fg-muted">{previewControl.emptyMessage}</p>
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

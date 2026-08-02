<script module lang="ts">
  import type { ResponseShape } from '$lib/types';
  import type { EndpointQueryControls } from '$lib/domain/endpointQuerySemantics';
  import type { ValidationError } from '$lib/domain/paramInference';

  export interface ObjectSelectorProps {
    endpointNamespaceId: string;
    selectedObjectId?: string;
    responseShape: ResponseShape;
    responseShapeControl?: EndpointQueryControls['responseShape'];
    /** Validation errors to display inline (e.g. rule 1 — no target object) */
    validationErrors?: ValidationError[];
    onSelectObject: (objectDefinitionId: string | undefined) => void;
    onSetResponseShape: (shape: ResponseShape) => void;
    onCreateNewObject?: () => void;
  }
</script>

<script lang="ts">
  import { objectsStore } from '$lib/stores/stores';
  import { Tooltip } from '$lib/components/tooltip';
  import {
    segmentPillBase,
    segmentPillSelected,
    segmentPillUnselected,
    segmentPillUnselectedLocked,
  } from '$lib/ui/classes';
  import ObjectSelectorDropdown from './ObjectSelectorDropdown.svelte';

  const SHAPE_OPTIONS: { value: ResponseShape; label: string }[] = [
    { value: 'object', label: 'Object' },
    { value: 'list', label: 'List' }
  ];

  interface Props extends ObjectSelectorProps {}

  let {
    endpointNamespaceId,
    selectedObjectId,
    responseShape,
    responseShapeControl = { mode: 'editable', value: responseShape, reason: '' },
    validationErrors = [],
    onSelectObject,
    onSetResponseShape,
    onCreateNewObject
  }: Props = $props();

  // Filter objects to only show those in the endpoint's namespace
  const namespacedObjects = $derived($objectsStore.filter(obj => obj.namespaceId === endpointNamespaceId));
  const responseShapeLocked = $derived(responseShapeControl.mode === 'locked');
  const displayedResponseShape = $derived(
    responseShapeLocked ? responseShapeControl.value : responseShape
  );
</script>

<div>
  <h3 class="text-sm text-fg-secondary flex items-center font-medium mb-2">
    <i class="fa-solid fa-cube mr-2"></i>
    Object & Response Shape
  </h3>

  <div class="object-selector-grid">
    <!-- Object dropdown -->
    <div>
      <p class="text-[10px] text-fg-dimmed uppercase tracking-wider mb-1">Object</p>
      <ObjectSelectorDropdown
        availableObjects={namespacedObjects}
        selectedObjectId={selectedObjectId}
        onSelect={onSelectObject}
        onCreateNew={onCreateNewObject}
        placeholder="Select object for endpoint..."
      />
      {#if validationErrors.length > 0}
        <div class="mt-1 space-y-0.5">
          {#each validationErrors as error}
            <p class="text-xs text-red-400 flex items-center gap-1">
              <i class="fa-solid fa-triangle-exclamation"></i>
              {error.message}
            </p>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Response shape toggle -->
    <div>
      <p class="text-[10px] text-fg-dimmed uppercase tracking-wider mb-1">Response Shape</p>
      <Tooltip
        text={responseShapeLocked ? responseShapeControl.reason : ''}
        disabled={!responseShapeLocked}
        position="bottom"
      >
        <div class="flex">
          {#each SHAPE_OPTIONS as option}
            <button
              type="button"
              disabled={responseShapeLocked}
              onclick={() => onSetResponseShape(option.value)}
              class="{segmentPillBase} {responseShapeLocked
                ? 'cursor-not-allowed opacity-50 ' +
                  (displayedResponseShape === option.value ? segmentPillSelected : segmentPillUnselectedLocked)
                : displayedResponseShape === option.value
                  ? segmentPillSelected
                  : segmentPillUnselected}"
            >
              {option.label}
            </button>
          {/each}
        </div>
      </Tooltip>
    </div>
  </div>
</div>

<style>
  .object-selector-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  @container (min-width: 700px) {
    .object-selector-grid {
      grid-template-columns: 1fr auto;
    }
  }
</style>

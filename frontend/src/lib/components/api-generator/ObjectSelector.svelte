<script module lang="ts">
  import type { ResponseShape } from '$lib/types';
  import type { ValidationError } from '$lib/domain/paramInference';

  export interface ObjectSelectorProps {
    endpointNamespaceId: string;
    selectedObjectId?: string;
    responseShape: ResponseShape;
    /** Whether the response shape toggle is locked (e.g. detail endpoint detected) */
    responseShapeLocked?: boolean;
    /** Tooltip text shown when the toggle is locked */
    responseShapeLockedReason?: string;
    /** Validation errors to display inline (e.g. rule 1 — no target object) */
    validationErrors?: ValidationError[];
    onSelectObject: (objectId: string | undefined) => void;
    onSetResponseShape: (shape: ResponseShape) => void;
    onCreateNewObject?: () => void;
  }
</script>

<script lang="ts">
  import { objectsStore } from '$lib/stores/objects';
  import { Tooltip } from '$lib/components/tooltip';
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
    responseShapeLocked = false,
    responseShapeLockedReason = '',
    validationErrors = [],
    onSelectObject,
    onSetResponseShape,
    onCreateNewObject
  }: Props = $props();

  // Filter objects to only show those in the endpoint's namespace
  const namespacedObjects = $derived($objectsStore.filter(obj => obj.namespaceId === endpointNamespaceId));
</script>

<div>
  <h3 class="text-sm text-mono-300 flex items-center font-medium mb-2">
    <i class="fa-solid fa-cube mr-2"></i>
    Object & Response Shape
  </h3>

  <div class="object-selector-grid">
    <!-- Object dropdown -->
    <div>
      <p class="text-[10px] text-mono-500 uppercase tracking-wider mb-1">Object</p>
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
      <p class="text-[10px] text-mono-500 uppercase tracking-wider mb-1">Response Shape</p>
      <Tooltip
        text={responseShapeLocked ? responseShapeLockedReason : ''}
        disabled={!responseShapeLocked}
        position="bottom"
      >
        <div class="flex">
          {#each SHAPE_OPTIONS as option}
            <button
              type="button"
              disabled={responseShapeLocked}
              onclick={() => onSetResponseShape(option.value)}
              class="px-5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors text-center first:rounded-l-xl last:rounded-r-xl
                {responseShapeLocked
                  ? 'cursor-not-allowed opacity-50 ' + (responseShape === option.value
                    ? 'bg-mono-900/50 backdrop-blur-sm text-green-400 border border-green-400/50'
                    : 'bg-mono-900/50 backdrop-blur-sm text-mono-500 border border-mono-700')
                  : responseShape === option.value
                    ? 'bg-mono-900/50 backdrop-blur-sm text-green-400 border border-green-400/50'
                    : 'bg-mono-900/50 backdrop-blur-sm text-mono-400 border border-mono-700 hover:border-mono-500 hover:text-mono-300'}"
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

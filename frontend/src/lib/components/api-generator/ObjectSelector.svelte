<script module lang="ts">
  import type { ResponseShape } from '$lib/types';

  export interface ObjectSelectorProps {
    endpointNamespaceId: string;
    selectedObjectId?: string;
    responseShape: ResponseShape;
    onSelectObject: (objectId: string | undefined) => void;
    onSetResponseShape: (shape: ResponseShape) => void;
    onCreateNewObject?: () => void;
  }
</script>

<script lang="ts">
  import { objectsStore } from '$lib/stores/objects';
  import ObjectSelectorDropdown from './ObjectSelectorDropdown.svelte';

  const SHAPE_OPTIONS: { value: ResponseShape; label: string; icon: string }[] = [
    { value: 'object', label: 'Object', icon: 'fa-solid fa-box' },
    { value: 'list', label: 'List of Objects', icon: 'fa-solid fa-list' }
  ];

  interface Props extends ObjectSelectorProps {}

  let {
    endpointNamespaceId,
    selectedObjectId,
    responseShape,
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
    </div>

    <!-- Response shape toggle -->
    <div>
      <p class="text-[10px] text-mono-500 uppercase tracking-wider mb-1">Response Shape</p>
      <div class="flex gap-1">
        {#each SHAPE_OPTIONS as option}
          <button
            type="button"
            onclick={() => onSetResponseShape(option.value)}
            class="flex-1 px-1.5 py-1.5 text-sm border transition-colors {responseShape === option.value
              ? 'bg-green-400 text-mono-950 border-green-400 font-bold'
              : 'bg-mono-900 text-mono-300 border-mono-600 hover:border-mono-400'}"
          >
            <i class="{option.icon} mr-1.5"></i>
            {option.label}
          </button>
        {/each}
      </div>
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

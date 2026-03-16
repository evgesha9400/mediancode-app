<script module lang="ts">
  import type { ResponseShape } from '$lib/types';

  export interface TargetObjectSelectorProps {
    endpointNamespaceId: string;
    responseShape: ResponseShape;
    objectId?: string;
    targetObjectId?: string;
    onSelectTarget: (objectId: string | undefined) => void;
    onCreateNewObject?: () => void;
  }
</script>

<script lang="ts">
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import ObjectSelectorDropdown from './ObjectSelectorDropdown.svelte';

  interface Props extends TargetObjectSelectorProps {}

  let {
    endpointNamespaceId,
    responseShape,
    objectId,
    targetObjectId,
    onSelectTarget,
    onCreateNewObject
  }: Props = $props();

  const isDetail = $derived(responseShape === 'object');

  // For detail endpoints, target is inferred from the response object
  const effectiveTargetId = $derived(isDetail ? (targetObjectId ?? objectId) : targetObjectId);
  const effectiveTarget = $derived(effectiveTargetId ? getObjectById(effectiveTargetId) : undefined);

  // Filter objects to namespace
  const namespacedObjects = $derived($objectsStore.filter(obj => obj.namespaceId === endpointNamespaceId));
</script>

<div>
  <h3 class="text-sm text-mono-300 mb-2 flex items-center font-medium">
    <i class="fa-solid fa-bullseye mr-2"></i>
    Target Object
  </h3>

  {#if isDetail}
    <!-- Detail: target is inferred from the response object -->
    {#if effectiveTarget}
      <div class="px-3 py-2 bg-mono-800 border border-mono-700 flex items-center space-x-2">
        <i class="fa-solid fa-cube text-mono-400 text-xs"></i>
        <span class="font-mono text-sm text-mono-300">{effectiveTarget.name}</span>
        <span class="text-xs text-mono-400">(inferred from response object)</span>
      </div>
    {:else}
      <div class="px-3 py-2 bg-mono-800 border border-mono-700">
        <p class="text-xs text-mono-400">Select a response object below to set the target</p>
      </div>
    {/if}
  {:else}
    <!-- List: user must explicitly select target -->
    <ObjectSelectorDropdown
      availableObjects={namespacedObjects}
      selectedObjectId={targetObjectId}
      onSelect={onSelectTarget}
      onCreateNew={onCreateNewObject}
      placeholder="Select target object (required for list endpoints)..."
    />
    {#if !targetObjectId}
      <p class="text-xs text-red-400 mt-1">List endpoints require a target object</p>
    {/if}
  {/if}
</div>

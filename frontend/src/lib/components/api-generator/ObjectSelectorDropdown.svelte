<script module lang="ts">
  import type { ObjectDefinition } from '$lib/types';

  export interface ObjectSelectorDropdownProps {
    availableObjects: ObjectDefinition[];
    selectedObjectId?: string;
    onSelect: (objectDefinitionId: string | undefined) => void;
    placeholder?: string;
    onCreateNew?: () => void;
  }
</script>

<script lang="ts">
  import {
    dropdownCreateRow,
    dropdownListScroll,
    dropdownPanel,
    dropdownRow,
    inputGlass,
    inputGlassSearchSuffix,
    listMetaBadge,
    objectSelectorDisplayRow,
  } from '$lib/ui/classes';

  interface Props extends ObjectSelectorDropdownProps {}

  let { availableObjects, selectedObjectId, onSelect, placeholder = 'Select object...', onCreateNew }: Props = $props();

  let searchQuery = $state('');
  let dropdownOpen = $state(false);

  // Get the currently selected object
  const selectedObject = $derived(
    selectedObjectId ? availableObjects.find(obj => obj.id === selectedObjectId) : undefined
  );

  // Filter objects based on search query
  const filteredObjects = $derived.by(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();

    return availableObjects.filter(obj => {
      if (!lowerQuery) return true;
      return (
        obj.name.toLowerCase().includes(lowerQuery) ||
        obj.description?.toLowerCase().includes(lowerQuery)
      );
    });
  });

  function handleSelect(objectDefinitionId: string): void {
    onSelect(objectDefinitionId);
    searchQuery = '';
    dropdownOpen = false;
  }

  function handleClear(): void {
    onSelect(undefined);
    searchQuery = '';
  }

  function handleFocus(): void {
    dropdownOpen = true;
  }

  function handleBlur(): void {
    setTimeout(() => {
      dropdownOpen = false;
    }, 150);
  }
</script>

<div class="relative">
  <div class="relative">
    {#if selectedObject}
      <!-- Display selected object with clear button -->
      <div class={objectSelectorDisplayRow}>
        <div class="flex items-center space-x-2">
          <i class="fa-solid fa-cube text-fg-muted text-xs"></i>
          <span class="font-mono text-sm text-fg-secondary">{selectedObject.name}</span>
          <span class="text-xs text-fg-muted">({selectedObject.members.length} members)</span>
        </div>
        <button
          type="button"
          onclick={handleClear}
          class="text-red-400 hover:text-red-300 transition-colors text-sm"
          title="Clear selection"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    {:else}
      <!-- Search input when no object selected -->
      <input
        type="text"
        bind:value={searchQuery}
        onfocus={handleFocus}
        onblur={handleBlur}
        placeholder={placeholder}
        class="{inputGlass} {inputGlassSearchSuffix}"
      />
      <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted text-xs pointer-events-none"></i>
    {/if}
  </div>

  {#if dropdownOpen}
    <div class={dropdownPanel}>
      <div class={dropdownListScroll}>
        {#if filteredObjects.length > 0}
          {#each filteredObjects as object (object.id)}
            <button
              type="button"
              onclick={() => handleSelect(object.id)}
              class={dropdownRow}
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-cube text-fg-muted text-xs"></i>
                    <span class="font-mono text-sm text-fg-secondary">{object.name}</span>
                    <span class={listMetaBadge}>
                      {object.members.length} members
                    </span>
                  </div>
                  {#if object.description}
                    <p class="text-xs text-fg-muted mt-1">{object.description}</p>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        {:else if searchQuery.trim()}
          <div class="px-3 py-2 text-sm text-fg-muted">
            No objects found matching "{searchQuery}"
          </div>
        {:else}
          <div class="px-3 py-2 text-sm text-fg-muted">
            No objects available in this namespace. Create objects in the same namespace first.
          </div>
        {/if}
      </div>
      {#if onCreateNew}
        <div class="border-t border-edge p-2">
          <button
            type="button"
            class={dropdownCreateRow}
            onmousedown={(e) => { e.preventDefault(); onCreateNew?.(); }}
          >
            <i class="fa-solid fa-plus text-xs"></i>
            <span>Create new object</span>
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<script lang="ts">
  import type { ObjectDefinition } from '$lib/types';

  export interface ObjectSelectorDropdownProps {
    availableObjects: ObjectDefinition[];
    selectedObjectId?: string;
    onSelect: (objectId: string | undefined) => void;
    placeholder?: string;
  }

  interface Props extends ObjectSelectorDropdownProps {}

  let { availableObjects, selectedObjectId, onSelect, placeholder = 'Select object...' }: Props = $props();

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

  function handleSelect(objectId: string): void {
    onSelect(objectId);
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
      <div class="w-full px-3 py-1.5 border border-mono-300 rounded-md bg-white flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <i class="fa-solid fa-cube text-mono-500 text-xs"></i>
          <span class="font-mono text-sm text-mono-700">{selectedObject.name}</span>
          <span class="text-xs text-mono-500">({selectedObject.fields.length} fields)</span>
        </div>
        <button
          type="button"
          onclick={handleClear}
          class="text-red-700 hover:text-red-600 transition-colors"
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
        class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm pr-8"
      />
      <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
    {/if}
  </div>

  {#if dropdownOpen && filteredObjects.length > 0}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg max-h-60 overflow-auto">
      {#each filteredObjects as object (object.id)}
        <button
          type="button"
          onclick={() => handleSelect(object.id)}
          class="w-full px-3 py-2 text-left hover:bg-mono-50 border-b border-mono-100 last:border-b-0 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <i class="fa-solid fa-cube text-mono-500 text-xs"></i>
                <span class="font-mono text-sm text-mono-700">{object.name}</span>
                <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">
                  {object.fields.length} fields
                </span>
              </div>
              {#if object.description}
                <p class="text-xs text-mono-500 mt-1">{object.description}</p>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  {#if dropdownOpen && filteredObjects.length === 0 && searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg">
      <div class="px-3 py-2 text-sm text-mono-500">
        No objects found matching "{searchQuery}"
      </div>
    </div>
  {/if}

  {#if dropdownOpen && filteredObjects.length === 0 && !searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg">
      <div class="px-3 py-2 text-sm text-mono-500">
        No objects available. Create objects in Objects first.
      </div>
    </div>
  {/if}
</div>

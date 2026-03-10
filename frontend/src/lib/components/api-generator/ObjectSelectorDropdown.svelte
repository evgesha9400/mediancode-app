<script module lang="ts">
  import type { ObjectDefinition } from '$lib/types';

  export interface ObjectSelectorDropdownProps {
    availableObjects: ObjectDefinition[];
    selectedObjectId?: string;
    onSelect: (objectId: string | undefined) => void;
    placeholder?: string;
    onCreateNew?: () => void;
  }
</script>

<script lang="ts">
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
      <div class="w-full px-3 py-1.5 border border-mono-600 rounded-md bg-mono-900 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <i class="fa-solid fa-cube text-mono-400 text-xs"></i>
          <span class="font-mono text-sm text-mono-300">{selectedObject.name}</span>
          <span class="text-xs text-mono-400">({selectedObject.fields.length} fields)</span>
        </div>
        <button
          type="button"
          onclick={handleClear}
          class="text-red-400 hover:text-red-300 transition-colors"
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
        class="w-full px-3 py-1.5 border border-mono-600 rounded-md bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm pr-8"
      />
      <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
    {/if}
  </div>

  {#if dropdownOpen}
    <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-700 rounded-md shadow-lg shadow-black/30 max-h-60 overflow-auto">
      {#if filteredObjects.length > 0}
        {#each filteredObjects as object (object.id)}
          <button
            type="button"
            onclick={() => handleSelect(object.id)}
            class="w-full px-3 py-2 text-left hover:bg-mono-800 border-b border-mono-700 last:border-b-0 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <i class="fa-solid fa-cube text-mono-400 text-xs"></i>
                  <span class="font-mono text-sm text-mono-300">{object.name}</span>
                  <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">
                    {object.fields.length} fields
                  </span>
                </div>
                {#if object.description}
                  <p class="text-xs text-mono-400 mt-1">{object.description}</p>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      {:else if searchQuery.trim()}
        <div class="px-3 py-2 text-sm text-mono-400">
          No objects found matching "{searchQuery}"
        </div>
      {:else}
        <div class="px-3 py-2 text-sm text-mono-400">
          No objects available in this namespace. Create objects in the same namespace first.
        </div>
      {/if}
      {#if onCreateNew}
        <div class="border-t border-mono-700 p-2">
          <button
            type="button"
            class="w-full text-left px-3 py-2 text-sm text-mono-400 hover:bg-mono-800 hover:text-mono-100 rounded cursor-pointer flex items-center space-x-2"
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

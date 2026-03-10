<script module lang="ts">
  import type { FieldType } from '$lib/stores/types';

  export interface TypeSelectorDropdownProps {
    availableTypes: FieldType[];
    selectedTypeName: string;
    onSelect: (typeName: string) => void;
    placeholder?: string;
    error?: boolean;
    id?: string;
  }
</script>

<script lang="ts">
  interface Props extends TypeSelectorDropdownProps {}

  let { availableTypes, selectedTypeName, onSelect, placeholder = 'Select type...', error = false, id }: Props = $props();

  let searchQuery = $state('');
  let dropdownOpen = $state(false);
  let blurTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // When dropdown is closed, show the selected type name in the input
  let displayValue = $derived(dropdownOpen ? searchQuery : selectedTypeName);

  // Filter types based on search query
  const filteredTypes = $derived.by(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();

    return availableTypes.filter(t => {
      if (!lowerQuery) return true;
      return (
        t.name.toLowerCase().includes(lowerQuery) ||
        t.pythonType.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
      );
    });
  });

  function handleSelect(typeName: string): void {
    onSelect(typeName);
    searchQuery = '';
    dropdownOpen = false;
  }

  function openDropdown(): void {
    if (blurTimeoutId) {
      clearTimeout(blurTimeoutId);
      blurTimeoutId = null;
    }
    dropdownOpen = true;
  }

  function handleFocus(): void {
    searchQuery = '';
    openDropdown();
  }

  function handleClick(): void {
    if (!dropdownOpen) {
      searchQuery = '';
    }
    openDropdown();
  }

  function handleBlur(): void {
    blurTimeoutId = setTimeout(() => {
      dropdownOpen = false;
      searchQuery = '';
      blurTimeoutId = null;
    }, 150);
  }
</script>

<div class="relative">
  <div class="relative">
    <input
      {id}
      type="text"
      value={displayValue}
      oninput={(e) => { searchQuery = e.currentTarget.value; }}
      onfocus={handleFocus}
      onclick={handleClick}
      onblur={handleBlur}
      placeholder={placeholder}
      class="w-full px-3 py-1.5 border border-mono-600 rounded-md bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm pr-8 {error ? 'border-red-500' : ''}"
    />
    <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
  </div>

  {#if dropdownOpen && filteredTypes.length > 0}
    <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-700 rounded-md shadow-lg shadow-black/30 max-h-60 overflow-auto">
      {#each filteredTypes as type (type.id)}
        <button
          type="button"
          onclick={() => handleSelect(type.name)}
          class="w-full px-3 py-2 text-left hover:bg-mono-800 border-b border-mono-700 last:border-b-0 transition-colors {type.name === selectedTypeName ? 'bg-mono-800' : ''}"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-sm text-mono-300">{type.name}</span>
                <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">{type.pythonType}</span>
              </div>
              {#if type.description}
                <p class="text-xs text-mono-400 mt-1">{type.description}</p>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  {#if dropdownOpen && filteredTypes.length === 0 && searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-700 rounded-md shadow-lg shadow-black/30">
      <div class="px-3 py-2 text-sm text-mono-400">
        No types found matching "{searchQuery}"
      </div>
    </div>
  {/if}
</div>

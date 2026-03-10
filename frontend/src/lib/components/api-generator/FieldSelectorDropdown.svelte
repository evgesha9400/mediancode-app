<script module lang="ts">
  import type { Field } from '$lib/stores/fields';

  export interface FieldSelectorDropdownProps {
    availableFields: Field[];
    selectedFieldIds: string[];
    onSelect: (fieldId: string) => void;
    placeholder?: string;
    onCreateNew?: () => void;
  }
</script>

<script lang="ts">
  interface Props extends FieldSelectorDropdownProps {}

  let { availableFields, selectedFieldIds, onSelect, placeholder = 'Add field...', onCreateNew }: Props = $props();

  let searchQuery = $state('');
  let dropdownOpen = $state(false);

  // Filter fields based on search query and exclude already selected
  const filteredFields = $derived.by(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();

    return availableFields
      .filter(field => !selectedFieldIds.includes(field.id))
      .filter(field => {
        if (!lowerQuery) return true;
        return (
          field.name.toLowerCase().includes(lowerQuery) ||
          field.type.toLowerCase().includes(lowerQuery) ||
          field.description?.toLowerCase().includes(lowerQuery)
        );
      });
  });

  function handleSelect(fieldId: string): void {
    onSelect(fieldId);
    searchQuery = '';
    dropdownOpen = false;
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
    <input
      type="text"
      bind:value={searchQuery}
      onfocus={handleFocus}
      onblur={handleBlur}
      placeholder={placeholder}
      class="w-full px-3 py-1.5 border border-mono-600 bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm pr-8"
    />
    <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
  </div>

  {#if dropdownOpen}
    <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-700 shadow-lg shadow-black/30 max-h-60 overflow-auto">
      {#if filteredFields.length > 0}
        {#each filteredFields as field (field.id)}
          <button
            type="button"
            onclick={() => handleSelect(field.id)}
            class="w-full px-3 py-2 text-left hover:bg-mono-800 border-b border-mono-700 last:border-b-0 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-sm text-mono-300">{field.name}</span>
                  <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">{field.type}</span>
                </div>
                {#if field.description}
                  <p class="text-xs text-mono-400 mt-1">{field.description}</p>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      {:else if searchQuery.trim()}
        <div class="px-3 py-2 text-sm text-mono-400">
          No fields found matching "{searchQuery}" in this namespace
        </div>
      {:else}
        <div class="px-3 py-2 text-sm text-mono-400">
          No fields available in this namespace. Create fields in the same namespace first.
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
            <span>Create new field</span>
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

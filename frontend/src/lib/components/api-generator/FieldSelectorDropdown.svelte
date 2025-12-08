<script lang="ts">
  import type { Field } from '$lib/stores/fields';

  export interface FieldSelectorDropdownProps {
    availableFields: Field[];
    selectedFieldIds: string[];
    onSelect: (fieldId: string) => void;
    placeholder?: string;
  }

  interface Props extends FieldSelectorDropdownProps {}

  let { availableFields, selectedFieldIds, onSelect, placeholder = 'Add field...' }: Props = $props();

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
      class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm pr-8"
    />
    <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
  </div>

  {#if dropdownOpen && filteredFields.length > 0}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg max-h-60 overflow-auto">
      {#each filteredFields as field (field.id)}
        <button
          type="button"
          onclick={() => handleSelect(field.id)}
          class="w-full px-3 py-2 text-left hover:bg-mono-50 border-b border-mono-100 last:border-b-0 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-sm text-mono-700">{field.name}</span>
                <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{field.type}</span>
              </div>
              {#if field.description}
                <p class="text-xs text-mono-500 mt-1">{field.description}</p>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  {#if dropdownOpen && filteredFields.length === 0 && searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg">
      <div class="px-3 py-2 text-sm text-mono-500">
        No fields found matching "{searchQuery}" in this namespace
      </div>
    </div>
  {:else if dropdownOpen && filteredFields.length === 0 && !searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg">
      <div class="px-3 py-2 text-sm text-mono-500">
        No fields available in this namespace. Create fields in the same namespace first.
      </div>
    </div>
  {/if}
</div>

<script module lang="ts">
  import type { Field } from '$lib/types';

  export interface ParameterEditorProps {
    paramName: string;
    fieldId: string;
    availableFields: Field[];
    onFieldSelect: (fieldId: string) => void;
    onCreateNewField?: () => void;
  }
</script>

<script lang="ts">
  interface Props extends ParameterEditorProps {}

  let { paramName, fieldId, availableFields, onFieldSelect, onCreateNewField }: Props = $props();

  let dropdownOpen = $state(false);
  let searchQuery = $state('');

  // Find the currently selected field
  const selectedField = $derived(availableFields.find(f => f.id === fieldId));

  // Filter fields by search query
  const filteredFields = $derived.by(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    if (!lowerQuery) return availableFields;
    return availableFields.filter(field =>
      field.name.toLowerCase().includes(lowerQuery) ||
      field.type.toLowerCase().includes(lowerQuery) ||
      field.description?.toLowerCase().includes(lowerQuery)
    );
  });

  function handleSelect(id: string): void {
    onFieldSelect(id);
    searchQuery = '';
    dropdownOpen = false;
  }

  function handleClear(): void {
    onFieldSelect('');
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

<div class="flex items-center space-x-2 py-1.5">
  <!-- Param name (read-only) -->
  <div class="w-32 px-2 py-1 text-xs bg-mono-800 border border-mono-700 rounded-md text-mono-300 font-mono shrink-0">
    {paramName}
  </div>

  <!-- Field selector -->
  <div class="flex-1 relative">
    {#if selectedField}
      <!-- Show selected field with clear button -->
      <div class="flex items-center space-x-2 px-2 py-1 border border-mono-600 rounded-md bg-mono-900">
        <span class="font-mono text-xs text-mono-300">{selectedField.name}</span>
        <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded">{selectedField.type}</span>
        <button
          type="button"
          onclick={handleClear}
          class="ml-auto text-mono-400 hover:text-mono-300 transition-colors"
          aria-label="Clear field selection"
        >
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
    {:else}
      <!-- Search/select field -->
      <div class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          onfocus={handleFocus}
          onblur={handleBlur}
          placeholder="Select field..."
          class="w-full px-2 py-1 text-xs border border-mono-600 rounded-md bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent pr-7"
        />
        <i class="fa-solid fa-search absolute right-2 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
      </div>

      {#if dropdownOpen}
        <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-700 rounded-md shadow-lg shadow-black/30 max-h-48 overflow-auto">
          {#if filteredFields.length === 0}
            <div class="px-3 py-2 text-xs text-mono-400">
              {searchQuery.trim() ? `No fields matching "${searchQuery}"` : 'No fields available'}
            </div>
          {:else}
            {#each filteredFields as field (field.id)}
              <button
                type="button"
                onclick={() => handleSelect(field.id)}
                class="w-full px-3 py-1.5 text-left hover:bg-mono-800 border-b border-mono-700 last:border-b-0 transition-colors"
              >
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-xs text-mono-300">{field.name}</span>
                  <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded">{field.type}</span>
                </div>
                {#if field.description}
                  <p class="text-xs text-mono-400 mt-0.5">{field.description}</p>
                {/if}
              </button>
            {/each}
          {/if}
          {#if onCreateNewField}
            <div class="border-t border-mono-700 p-1.5">
              <button
                type="button"
                class="w-full text-left px-3 py-1.5 text-xs text-mono-400 hover:bg-mono-800 hover:text-mono-100 rounded cursor-pointer flex items-center space-x-2"
                onmousedown={(e) => { e.preventDefault(); onCreateNewField?.(); }}
              >
                <i class="fa-solid fa-plus text-xs"></i>
                <span>Create new field</span>
              </button>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
</div>

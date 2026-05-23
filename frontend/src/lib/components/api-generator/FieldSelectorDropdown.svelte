<script module lang="ts">
  export interface FieldSelectorOption {
    id: string;
    name: string;
    type: string;
    description?: string;
  }

  export interface FieldSelectorDropdownProps {
    availableFields: FieldSelectorOption[];
    selectedFieldIds: string[];
    onSelect: (fieldId: string) => void;
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
    inputGlassSearch,
    listMetaBadge,
  } from '$lib/ui/classes';

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
      class={inputGlassSearch}
    />
    <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted text-xs pointer-events-none"></i>
  </div>

  {#if dropdownOpen}
    <div class={dropdownPanel}>
      <div class={dropdownListScroll}>
        {#if filteredFields.length > 0}
          {#each filteredFields as field (field.id)}
            <button
              type="button"
              onclick={() => handleSelect(field.id)}
              class={dropdownRow}
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-vector-square text-fg-muted text-xs"></i>
                    <span class="font-mono text-sm text-fg-secondary">{field.name}</span>
                    <span class={listMetaBadge}>{field.type}</span>
                  </div>
                  {#if field.description}
                    <p class="text-xs text-fg-muted mt-1">{field.description}</p>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        {:else if searchQuery.trim()}
          <div class="px-3 py-2 text-sm text-fg-muted">
            No fields found matching "{searchQuery}" in this namespace
          </div>
        {:else}
          <div class="px-3 py-2 text-sm text-fg-muted">
            No fields available in this namespace. Create fields in the same namespace first.
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
            <span>Create new field</span>
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

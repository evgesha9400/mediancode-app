<script module lang="ts">
  import type { FieldType } from '$lib/stores/stores';

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
  import {
    dropdownListScroll,
    dropdownPanel,
    dropdownPanelMessage,
    dropdownRow,
    inputGlassSearch,
    listMetaBadge,
  } from '$lib/ui/classes';
  import { FIELD_TYPE_DROPDOWN_LIST } from '$lib/utils/testIds';

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
      class="{inputGlassSearch} {error ? 'border-red-500' : ''}"
    />
    <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted text-xs pointer-events-none"></i>
  </div>

  {#if dropdownOpen && filteredTypes.length > 0}
    <div class={dropdownPanel} data-testid={FIELD_TYPE_DROPDOWN_LIST}>
      <div class={dropdownListScroll}>
        {#each filteredTypes as type (type.id)}
          <button
            type="button"
            onclick={() => handleSelect(type.name)}
            class="{dropdownRow} {type.name === selectedTypeName ? 'bg-surface-raised' : ''}"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-sm text-fg-secondary">{type.name}</span>
                  <span class={listMetaBadge}>{type.pythonType}</span>
                </div>
                {#if type.description}
                  <p class="text-xs text-fg-muted mt-1">{type.description}</p>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if dropdownOpen && filteredTypes.length === 0 && searchQuery.trim()}
    <div class={dropdownPanelMessage}>
      <div class="px-3 py-2 text-sm text-fg-muted">
        No types found matching "{searchQuery}"
      </div>
    </div>
  {/if}
</div>

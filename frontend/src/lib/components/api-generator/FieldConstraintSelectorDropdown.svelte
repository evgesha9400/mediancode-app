<script module lang="ts">
  import type { FieldConstraint } from '$lib/stores/fieldConstraints';

  export interface FieldConstraintSelectorDropdownProps {
    availableFieldConstraints: FieldConstraint[];
    selectedFieldConstraintNames: string[];
    onSelect: (fieldConstraintName: string) => void;
    placeholder?: string;
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

  interface Props extends FieldConstraintSelectorDropdownProps {}

  let { availableFieldConstraints, selectedFieldConstraintNames, onSelect, placeholder = 'Add constraint...' }: Props = $props();

  let searchQuery = $state('');
  let dropdownOpen = $state(false);
  let blurTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Filter field constraints based on search query and exclude already selected
  const filteredFieldConstraints = $derived.by(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();

    return availableFieldConstraints
      .filter(fc => !selectedFieldConstraintNames.includes(fc.name))
      .filter(fc => {
        if (!lowerQuery) return true;
        return (
          fc.name.toLowerCase().includes(lowerQuery) ||
          fc.parameterTypes.some(t => t.toLowerCase().includes(lowerQuery)) ||
          fc.description?.toLowerCase().includes(lowerQuery)
        );
      });
  });

  function handleSelect(fieldConstraintName: string): void {
    onSelect(fieldConstraintName);
    searchQuery = '';
    dropdownOpen = false;
  }

  function openDropdown(): void {
    // Cancel any pending blur timeout to prevent race conditions
    if (blurTimeoutId) {
      clearTimeout(blurTimeoutId);
      blurTimeoutId = null;
    }
    dropdownOpen = true;
  }

  function handleFocus(): void {
    openDropdown();
  }

  function handleClick(): void {
    // Also open on click in case input is already focused
    openDropdown();
  }

  function handleBlur(): void {
    blurTimeoutId = setTimeout(() => {
      dropdownOpen = false;
      blurTimeoutId = null;
    }, 150);
  }
</script>

<div class="relative">
  <div class="relative">
    <input
      type="text"
      bind:value={searchQuery}
      onfocus={handleFocus}
      onclick={handleClick}
      onblur={handleBlur}
      placeholder={placeholder}
      class={inputGlassSearch}
    />
    <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
  </div>

  {#if dropdownOpen && filteredFieldConstraints.length > 0}
    <div class={dropdownPanel}>
      <div class={dropdownListScroll}>
        {#each filteredFieldConstraints as fc (fc.name)}
          <button
            type="button"
            onclick={() => handleSelect(fc.name)}
            class={dropdownRow}
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-sm text-mono-300">{fc.name}</span>
                  <span class={listMetaBadge}>{fc.parameterTypes.join(', ')}</span>
                </div>
                {#if fc.description}
                  <p class="text-xs text-mono-400 mt-1">{fc.description}</p>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if dropdownOpen && filteredFieldConstraints.length === 0 && searchQuery.trim()}
    <div class={dropdownPanelMessage}>
      <div class="px-3 py-2 text-sm text-mono-400">
        No field constraints found matching "{searchQuery}"
      </div>
    </div>
  {:else if dropdownOpen && filteredFieldConstraints.length === 0 && !searchQuery.trim()}
    <div class={dropdownPanelMessage}>
      <div class="px-3 py-2 text-sm text-mono-400">
        All available field constraints are already selected
      </div>
    </div>
  {/if}
</div>

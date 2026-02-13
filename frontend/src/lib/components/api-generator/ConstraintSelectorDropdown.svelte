<script module lang="ts">
  import type { Constraint } from '$lib/stores/constraints';

  export interface ConstraintSelectorDropdownProps {
    availableConstraints: Constraint[];
    selectedConstraintNames: string[];
    onSelect: (constraintName: string) => void;
    placeholder?: string;
  }
</script>

<script lang="ts">
  interface Props extends ConstraintSelectorDropdownProps {}

  let { availableConstraints, selectedConstraintNames, onSelect, placeholder = 'Add constraint...' }: Props = $props();

  let searchQuery = $state('');
  let dropdownOpen = $state(false);
  let blurTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Filter constraints based on search query and exclude already selected
  const filteredConstraints = $derived.by(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();

    return availableConstraints
      .filter(constraint => !selectedConstraintNames.includes(constraint.name))
      .filter(constraint => {
        if (!lowerQuery) return true;
        return (
          constraint.name.toLowerCase().includes(lowerQuery) ||
          constraint.parameterType.toLowerCase().includes(lowerQuery) ||
          constraint.description?.toLowerCase().includes(lowerQuery)
        );
      });
  });

  function handleSelect(constraintName: string): void {
    onSelect(constraintName);
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
      class="w-full px-3 py-1.5 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent text-sm pr-8"
    />
    <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
  </div>

  {#if dropdownOpen && filteredConstraints.length > 0}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg max-h-60 overflow-auto">
      {#each filteredConstraints as constraint (constraint.name)}
        <button
          type="button"
          onclick={() => handleSelect(constraint.name)}
          class="w-full px-3 py-2 text-left hover:bg-mono-50 border-b border-mono-100 last:border-b-0 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-sm text-mono-700">{constraint.name}</span>
                <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{constraint.parameterType}</span>
              </div>
              {#if constraint.description}
                <p class="text-xs text-mono-500 mt-1">{constraint.description}</p>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  {#if dropdownOpen && filteredConstraints.length === 0 && searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg">
      <div class="px-3 py-2 text-sm text-mono-500">
        No constraints found matching "{searchQuery}"
      </div>
    </div>
  {:else if dropdownOpen && filteredConstraints.length === 0 && !searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg">
      <div class="px-3 py-2 text-sm text-mono-500">
        All available constraints are already selected
      </div>
    </div>
  {/if}
</div>

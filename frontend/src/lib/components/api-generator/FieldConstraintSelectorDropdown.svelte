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
      class="w-full px-3 py-1.5 border border-mono-600 bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent text-sm pr-8"
    />
    <i class="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-mono-400 text-xs pointer-events-none"></i>
  </div>

  {#if dropdownOpen && filteredFieldConstraints.length > 0}
    <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-700 shadow-lg shadow-black/30 max-h-60 overflow-auto">
      {#each filteredFieldConstraints as fc (fc.name)}
        <button
          type="button"
          onclick={() => handleSelect(fc.name)}
          class="w-full px-3 py-2 text-left hover:bg-mono-800 border-b border-mono-700 last:border-b-0 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-sm text-mono-300">{fc.name}</span>
                <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">{fc.parameterTypes.join(', ')}</span>
              </div>
              {#if fc.description}
                <p class="text-xs text-mono-400 mt-1">{fc.description}</p>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  {#if dropdownOpen && filteredFieldConstraints.length === 0 && searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-700 shadow-lg shadow-black/30">
      <div class="px-3 py-2 text-sm text-mono-400">
        No field constraints found matching "{searchQuery}"
      </div>
    </div>
  {:else if dropdownOpen && filteredFieldConstraints.length === 0 && !searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-mono-900 border border-mono-700 shadow-lg shadow-black/30">
      <div class="px-3 py-2 text-sm text-mono-400">
        All available field constraints are already selected
      </div>
    </div>
  {/if}
</div>

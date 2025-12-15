<script lang="ts">
  import type { Validator } from '$lib/stores/validators';

  export interface ValidatorSelectorDropdownProps {
    availableValidators: Validator[];
    selectedValidatorNames: string[];
    onSelect: (validatorName: string) => void;
    placeholder?: string;
  }

  interface Props extends ValidatorSelectorDropdownProps {}

  let { availableValidators, selectedValidatorNames, onSelect, placeholder = 'Add validator...' }: Props = $props();

  let searchQuery = $state('');
  let dropdownOpen = $state(false);
  let blurTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Filter validators based on search query and exclude already selected
  const filteredValidators = $derived.by(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();

    return availableValidators
      .filter(validator => !selectedValidatorNames.includes(validator.name))
      .filter(validator => {
        if (!lowerQuery) return true;
        return (
          validator.name.toLowerCase().includes(lowerQuery) ||
          validator.type.toLowerCase().includes(lowerQuery) ||
          validator.description?.toLowerCase().includes(lowerQuery)
        );
      });
  });

  function handleSelect(validatorName: string): void {
    onSelect(validatorName);
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

  {#if dropdownOpen && filteredValidators.length > 0}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg max-h-60 overflow-auto">
      {#each filteredValidators as validator (validator.name)}
        <button
          type="button"
          onclick={() => handleSelect(validator.name)}
          class="w-full px-3 py-2 text-left hover:bg-mono-50 border-b border-mono-100 last:border-b-0 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-sm text-mono-700">{validator.name}</span>
                <span class="text-xs text-mono-500 bg-mono-100 px-2 py-0.5 rounded">{validator.type}</span>
              </div>
              {#if validator.description}
                <p class="text-xs text-mono-500 mt-1">{validator.description}</p>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}

  {#if dropdownOpen && filteredValidators.length === 0 && searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg">
      <div class="px-3 py-2 text-sm text-mono-500">
        No validators found matching "{searchQuery}" in this namespace
      </div>
    </div>
  {:else if dropdownOpen && filteredValidators.length === 0 && !searchQuery.trim()}
    <div class="absolute z-10 w-full mt-1 bg-white border border-mono-300 rounded-md shadow-lg">
      <div class="px-3 py-2 text-sm text-mono-500">
        All available validators are already selected
      </div>
    </div>
  {/if}
</div>

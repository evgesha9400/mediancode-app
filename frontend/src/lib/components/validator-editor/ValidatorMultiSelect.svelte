<script lang="ts" module>
  export interface ValidatorMultiSelectProps {
    /** Label displayed above the multi-select */
    label: string;
    /** Currently selected items (bindable) */
    selectedItems: string[];
    /** Available options to choose from */
    options: string[];
    /** Placeholder text when no items are selected */
    placeholder: string;
    /** Unique HTML id for the search input element */
    inputId: string;
    /** Optional dimming callback — returns true if the option should appear dimmed */
    isDimmed?: (item: string) => boolean;
    /**
     * Optional custom toggle callback. When provided, this is called instead of
     * the default add/remove behavior. The parent is responsible for updating
     * `selectedItems` through binding.
     */
    onToggle?: (item: string) => void;
  }
</script>

<script lang="ts">
  let {
    label,
    selectedItems = $bindable(),
    options,
    placeholder,
    inputId,
    isDimmed,
    onToggle,
  }: ValidatorMultiSelectProps = $props();

  // Dropdown state
  let dropdownOpen = $state(false);
  let searchQuery = $state('');
  let highlightIndex = $state(0);
  let blurTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Filtered options based on search query
  let filteredOptions = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return options;
    return options.filter(t => t.toLowerCase().includes(q));
  });

  function openDropdown() {
    if (blurTimeoutId) {
      clearTimeout(blurTimeoutId);
      blurTimeoutId = null;
    }
    dropdownOpen = true;
    highlightIndex = 0;
  }

  function closeDropdown() {
    dropdownOpen = false;
    searchQuery = '';
    highlightIndex = 0;
  }

  function handleBlur() {
    blurTimeoutId = setTimeout(() => {
      closeDropdown();
      blurTimeoutId = null;
    }, 150);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!dropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightIndex = Math.min(highlightIndex + 1, filteredOptions.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlightIndex = Math.max(highlightIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightIndex]) {
          toggleItem(filteredOptions[highlightIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
    }
  }

  function toggleItem(item: string) {
    if (onToggle) {
      onToggle(item);
    } else {
      // Default toggle behavior: simple add/remove
      if (selectedItems.includes(item)) {
        selectedItems = selectedItems.filter(i => i !== item);
      } else {
        selectedItems = [...selectedItems, item];
      }
    }
  }

  function removeItem(item: string) {
    selectedItems = selectedItems.filter(i => i !== item);
  }
</script>

<div class="col-span-4 relative">
  <label for={inputId} class="block text-xs font-medium text-mono-500 mb-1">{label}</label>
  <!-- Trigger area: chips + search input -->
  <div
    class="flex flex-wrap items-center gap-1 min-h-[34px] px-2 py-1 border border-mono-200 rounded-md
           bg-white cursor-text
           {dropdownOpen ? 'ring-1 ring-mono-400 border-mono-400' : ''}"
    onclick={() => { openDropdown(); document.getElementById(inputId)?.focus(); }}
    role="presentation"
  >
    {#each selectedItems as item}
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono rounded bg-mono-800 text-white">
        {item}
        <button
          type="button"
          onclick={(e) => { e.stopPropagation(); removeItem(item); }}
          class="hover:text-mono-300 transition-colors leading-none"
          aria-label="Remove {item}"
        >
          <i class="fa-solid fa-xmark text-[9px]"></i>
        </button>
      </span>
    {/each}
    <input
      id={inputId}
      type="text"
      bind:value={searchQuery}
      onfocus={openDropdown}
      onblur={handleBlur}
      onkeydown={handleKeydown}
      placeholder={selectedItems.length === 0 ? placeholder : ''}
      class="flex-1 min-w-[60px] text-xs font-mono bg-transparent border-none outline-none
             placeholder:text-mono-300 py-0.5"
    />
  </div>
  <!-- Dropdown panel -->
  {#if dropdownOpen}
    <div class="absolute z-20 w-full mt-1 bg-white border border-mono-200 rounded-md shadow-lg max-h-48 overflow-auto">
      {#if filteredOptions.length === 0}
        <div class="px-3 py-2 text-xs text-mono-400">No matches for "{searchQuery}"</div>
      {:else}
        {#each filteredOptions as option, i (option)}
          <button
            type="button"
            onmousedown={(e) => { e.preventDefault(); toggleItem(option); }}
            class="w-full px-3 py-1.5 text-left text-xs font-mono flex items-center justify-between
                   transition-colors border-b border-mono-100 last:border-b-0
                   {i === highlightIndex ? 'bg-mono-50' : 'hover:bg-mono-50'}
                   {isDimmed?.(option) ? 'text-mono-300' : 'text-mono-700'}"
          >
            <span>{option}</span>
            {#if selectedItems.includes(option)}
              <i class="fa-solid fa-check text-[10px] text-mono-500"></i>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>

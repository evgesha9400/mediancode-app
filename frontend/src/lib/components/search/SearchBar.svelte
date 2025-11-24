<!--
  SearchBar - Search input with filter button and results count

  Provides a search input field with optional filter button and results display.
  The filter button can show an active state indicator when filters are applied.
  Uses callback props instead of event dispatching for Svelte 5 compatibility.

  @component
  @example
  <SearchBar
    bind:searchQuery={query}
    placeholder="Search fields..."
    resultsCount={10}
    resultLabel="field"
    showFilter={true}
    active={filtersActive}
    onFilterClick={() => toggleFilters()}
  />
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * The current search query value (bindable)
     */
    searchQuery: string;

    /**
     * Placeholder text for the search input
     * @default 'Search...'
     */
    placeholder?: string;

    /**
     * Number of results to display
     */
    resultsCount: number;

    /**
     * Singular label for results (e.g., 'result', 'field', 'validator')
     * @default 'result'
     */
    resultLabel?: string;

    /**
     * Whether to show the filter button
     * @default false
     */
    showFilter?: boolean;

    /**
     * Whether filters are currently active (shows indicator)
     * @default false
     */
    active?: boolean;

    /**
     * Callback triggered when the filter button is clicked
     */
    onFilterClick?: () => void;

    /**
     * Optional snippet for filter panel content
     */
    filterPanel?: Snippet;
  }

  let {
    searchQuery = $bindable(),
    placeholder = 'Search...',
    resultsCount,
    resultLabel = 'result',
    showFilter = false,
    active = false,
    onFilterClick,
    filterPanel
  }: Props = $props();

  let pluralLabel = $derived(resultsCount !== 1 ? `${resultLabel}s` : resultLabel);
</script>

<div class="bg-white border-b border-mono-200 py-3 px-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4 flex-1">
      <div class="relative flex-1 max-w-md">
        <input
          type="text"
          {placeholder}
          bind:value={searchQuery}
          class="w-full pl-10 pr-4 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
        <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-mono-400"></i>
      </div>
      <div class="relative">
        <button
          type="button"
          onclick={() => onFilterClick?.()}
          class="flex items-center space-x-2 px-3 py-2 border rounded-md transition-colors {showFilter ? (active ? 'bg-mono-100 border-mono-400 text-mono-900' : 'bg-white border-mono-300 text-mono-700 hover:bg-mono-50') : 'hidden'}"
        >
          <i class="fa-solid fa-filter {active ? 'text-mono-900' : 'text-mono-500'}"></i>
          <span>Filter</span>
          {#if active}
            <span class="ml-1 w-2 h-2 bg-mono-900 rounded-full"></span>
          {/if}
        </button>
        {@render filterPanel?.()}
      </div>
    </div>
    <div class="flex items-center text-sm text-mono-500">
      <span>{resultsCount} {pluralLabel}</span>
    </div>
  </div>
</div>

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
<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface SearchBarProps {
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
     * Singular label for results (e.g., 'result', 'field', 'field constraint')
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
</script>

<script lang="ts">
  import {
    dashboardControlTextMutedHoverPrimary,
    dashboardSearchToolbarShell,
    dashboardTextPrimary,
    mainColumnChromePaddingX,
    searchBarInput,
    themeAccentFill,
    themeAccentText
  } from '$lib/ui/classes';
  import { SEARCH_INPUT_ID, FILTER_TOGGLE_ID } from '$lib/utils/testIds';

  interface Props extends SearchBarProps {}

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

<div class="{dashboardSearchToolbarShell} {mainColumnChromePaddingX}">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4 flex-1">
      <div class="relative flex-1 max-w-md">
        <input
          type="text"
          {placeholder}
          bind:value={searchQuery}
          data-testid={SEARCH_INPUT_ID}
          class={searchBarInput}
        />
        <i class="fa-solid fa-search absolute left-3.5 top-1/2 transform -translate-y-1/2 text-mono-400 text-sm"></i>
      </div>
      <div class="relative">
        <button
          type="button"
          onclick={() => onFilterClick?.()}
          data-testid={FILTER_TOGGLE_ID}
          class="flex items-center space-x-2 px-4 py-2 text-sm font-inter rounded-xl transition-all shadow-sm {showFilter ? (active ? `bg-mono-700/80 border border-transparent ${dashboardTextPrimary}` : `bg-mono-800/40 border border-mono-700/80 hover:bg-mono-800/80 ${dashboardControlTextMutedHoverPrimary}`) : 'hidden'}"
        >
          <i class="fa-solid fa-filter text-xs {active ? themeAccentText : 'text-mono-400'}"></i>
          <span>Filter</span>
          {#if active}
            <span class={`ml-1 w-2 h-2 rounded-full ${themeAccentFill}`}></span>
          {/if}
        </button>
        {@render filterPanel?.()}
      </div>
    </div>
    <div class="flex items-center text-sm font-inter font-medium text-mono-400">
      <span>{resultsCount} {pluralLabel}</span>
    </div>
  </div>
</div>

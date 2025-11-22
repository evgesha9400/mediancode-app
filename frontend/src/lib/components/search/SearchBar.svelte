<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let searchQuery: string;
  export let placeholder: string = 'Search...';
  export let resultsCount: number;
  export let resultLabel: string = 'result';
  export let showFilter: boolean = false;
  export let active: boolean = false;

  const dispatch = createEventDispatcher<{
    filterClick: void;
  }>();

  $: pluralLabel = resultsCount !== 1 ? `${resultLabel}s` : resultLabel;
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
          on:click={() => dispatch('filterClick')}
          class="flex items-center space-x-2 px-3 py-2 border rounded-md transition-colors {showFilter ? (active ? 'bg-mono-100 border-mono-400 text-mono-900' : 'bg-white border-mono-300 text-mono-700 hover:bg-mono-50') : 'hidden'}"
        >
          <i class="fa-solid fa-filter {active ? 'text-mono-900' : 'text-mono-500'}"></i>
          <span>Filter</span>
          {#if active}
            <span class="ml-1 w-2 h-2 bg-mono-900 rounded-full"></span>
          {/if}
        </button>
        <slot name="filter-panel" />
      </div>
    </div>
    <div class="flex items-center text-sm text-mono-500">
      <span>{resultsCount} {pluralLabel}</span>
    </div>
  </div>
</div>

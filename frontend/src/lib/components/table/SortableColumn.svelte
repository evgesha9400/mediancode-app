<script lang="ts">
  import { getMultiSortIcon, getSortPriority, getMultiSortAriaLabel, type MultiSortState } from '$lib/utils/sorting';

  export let column: string;
  export let label: string;
  export let sorts: MultiSortState;
  export let onSort: (columnKey: string, shiftKey: boolean) => void;

  function handleClick(event: MouseEvent) {
    onSort(column, event.shiftKey);
  }

  $: priority = getSortPriority(column, sorts);
  $: icon = getMultiSortIcon(column, sorts);
  $: ariaLabel = getMultiSortAriaLabel(column, label, sorts);
</script>

<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
  <button
    type="button"
    on:click={handleClick}
    class="flex items-center space-x-1 hover:text-mono-700 transition-colors"
    aria-label={ariaLabel}
    title="Click to sort, Shift+Click to add to sort"
  >
    <span>{label}</span>
    <i class="fa-solid {icon}"></i>
    {#if priority !== null}
      <span class="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold rounded-full bg-mono-800 text-white">
        {priority}
      </span>
    {/if}
  </button>
</th>

<script lang="ts">
  import { getMultiSortIcon, getSortPriority, getMultiSortAriaLabel, type MultiSortState } from '$lib/utils/sorting';

  export interface SortableColumnProps {
    column: string;
    label: string;
    sorts: MultiSortState;
    onSort: (columnKey: string, shiftKey: boolean) => void;
  }

  interface Props extends SortableColumnProps {}

  let { column, label, sorts, onSort }: Props = $props();

  function handleClick(event: MouseEvent) {
    onSort(column, event.shiftKey);
  }

  let priority = $derived(getSortPriority(column, sorts));
  let icon = $derived(getMultiSortIcon(column, sorts));
  let ariaLabel = $derived(getMultiSortAriaLabel(column, label, sorts));
</script>

<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
  <button
    type="button"
    onclick={handleClick}
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

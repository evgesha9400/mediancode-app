<script module lang="ts">
  import type { MultiSortState } from '$lib/utils/sorting';

  export interface SortableColumnProps {
    column: string;
    label: string;
    sorts: MultiSortState;
    onSort: (columnKey: string, shiftKey: boolean) => void;
  }
</script>

<script lang="ts">
  import { getMultiSortIcon, getSortPriority, getMultiSortAriaLabel } from '$lib/utils/sorting';

  interface Props extends SortableColumnProps {}

  let { column, label, sorts, onSort }: Props = $props();

  function handleClick(event: MouseEvent) {
    onSort(column, event.shiftKey);
  }

  let priority = $derived(getSortPriority(column, sorts));
  let icon = $derived(getMultiSortIcon(column, sorts));
  let ariaLabel = $derived(getMultiSortAriaLabel(column, label, sorts));
</script>

<th scope="col" class="px-6 py-4 text-left text-xs uppercase font-inter text-mono-400 tracking-wider font-bold">
  <button
    type="button"
    onclick={handleClick}
    class="flex items-center space-x-1 hover:text-mono-200 transition-colors"
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

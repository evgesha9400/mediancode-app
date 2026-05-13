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
  import { dashboardTextPrimary, tableListCell, tableListHeaderSortable } from '$lib/ui/classes';
  import { getMultiSortIcon, getSortPriority, getMultiSortAriaLabel } from '$lib/utils/sorting';
  import { getSortColumnId } from '$lib/utils/testIds';

  interface Props extends SortableColumnProps {}

  let { column, label, sorts, onSort }: Props = $props();

  function handleClick(event: MouseEvent) {
    onSort(column, event.shiftKey);
  }

  let priority = $derived(getSortPriority(column, sorts));
  let icon = $derived(getMultiSortIcon(column, sorts));
  let ariaLabel = $derived(getMultiSortAriaLabel(column, label, sorts));
</script>

<th
  scope="col"
  data-testid={getSortColumnId(column)}
  class="{tableListCell} text-left {tableListHeaderSortable}"
>
  <button
    type="button"
    onclick={handleClick}
    class="flex items-center space-x-1 hover:text-fg transition-colors"
    aria-label={ariaLabel}
    title="Click to sort, Shift+Click to add to sort"
  >
    <span>{label}</span>
    <i class="fa-solid {icon}"></i>
    {#if priority !== null}
      <span class="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold rounded-full bg-surface-raised {dashboardTextPrimary}">
        {priority}
      </span>
    {/if}
  </button>
</th>

<!--
  TableListTextCell — standard body copy column for entity list tables.

  Sets `data-col` for E2E; value must match `SortableColumn` `column` key.
-->
<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface TableListTextCellProps {
    col: string;
    nowrap?: boolean;
    class?: string;
    children: Snippet;
  }
</script>

<script lang="ts">
  import { tableListBodyCell, tableListCell } from '$lib/ui/classes';
  import { TABLE_COL_ATTR } from '$lib/utils/testIds';

  interface Props extends TableListTextCellProps {}

  let { col, nowrap = false, class: extraClass = '', children }: Props = $props();
</script>

<td
  class="{tableListCell} {nowrap ? 'whitespace-nowrap' : ''} {tableListBodyCell} {extraClass}"
  {...{ [TABLE_COL_ATTR]: col }}
>
  {@render children()}
</td>

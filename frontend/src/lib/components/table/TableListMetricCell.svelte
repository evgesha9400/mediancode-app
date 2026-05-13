<!--
  TableListMetricCell — pill + unit label (e.g. count + "APIs") for list tables.

  Sets `data-col` for E2E; value must match `SortableColumn` `column` key.
-->
<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface TableListMetricCellProps {
    col: string;
    label: string;
    class?: string;
    pill: Snippet;
  }
</script>

<script lang="ts">
  import { tableListBodyCell, tableListCell } from '$lib/ui/classes';
  import { TABLE_COL_ATTR } from '$lib/utils/testIds';

  interface Props extends TableListMetricCellProps {}

  let { col, label, class: extraClass = '', pill }: Props = $props();
</script>

<td
  class="{tableListCell} whitespace-nowrap {extraClass}"
  {...{ [TABLE_COL_ATTR]: col }}
>
  <div class="flex items-center space-x-2">
    {@render pill()}
    <span class={tableListBodyCell}>{label}</span>
  </div>
</td>

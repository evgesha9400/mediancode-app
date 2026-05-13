<!--
  TableListNameCell — primary name/title column for entity list tables.

  Sets `data-col` for E2E; value must match `SortableColumn` `column` key.
-->
<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface TableListNameCellProps {
    col: string;
    /** Extra classes on `<td>` */
    class?: string;
    /** Optional secondary line (e.g. API description); muted caption styling */
    captionText?: string;
    children: Snippet;
  }
</script>

<script lang="ts">
  import { tableListBodyCaption, tableListBodyPrimary, tableListCell } from '$lib/ui/classes';
  import { TABLE_COL_ATTR } from '$lib/utils/testIds';

  interface Props extends TableListNameCellProps {}

  let { col, class: extraClass = '', captionText, children }: Props = $props();
</script>

<td
  class="{tableListCell} whitespace-nowrap {extraClass}"
  {...{ [TABLE_COL_ATTR]: col }}
>
  <div class={tableListBodyPrimary}>
    {@render children()}
  </div>
  {#if captionText?.trim()}
    <div class="{tableListBodyCaption} truncate max-w-xs">
      {captionText.trim()}
    </div>
  {/if}
</td>

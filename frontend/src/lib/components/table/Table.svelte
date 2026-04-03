<!--
  Table - Responsive table wrapper with empty state support

  Provides a styled table container with three snippets: header, body, and empty.
  Conditionally displays either the table content or an empty state based on the isEmpty prop.

  @component
  @example
  <Table isEmpty={items.length === 0}>
    {#snippet header()}
      <tr><th>Name</th><th>Type</th></tr>
    {/snippet}
    {#snippet body()}
      <tr><td>item.name</td><td>item.type</td></tr>
    {/snippet}
    {#snippet empty()}
      <EmptyState title="No items" message="Add your first item" />
    {/snippet}
  </Table>
-->
<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface TableProps {
    /**
     * Whether the table is empty (no data to display)
     * When true, shows the "empty" snippet instead of header/body
     * @default false
     */
    isEmpty?: boolean;

    /**
     * Snippet for table header row
     */
    header?: Snippet;

    /**
     * Snippet for table body rows
     */
    body?: Snippet;

    /**
     * Snippet to render when table is empty
     */
    empty?: Snippet;
  }
</script>

<script lang="ts">
  import { TABLE_ID, EMPTY_STATE_ID } from '$lib/utils/testIds';

  interface Props extends TableProps {}

  let { isEmpty = false, header, body, empty }: Props = $props();
</script>

<div class="flex-1 overflow-auto">
  {#if !isEmpty}
    <table data-testid={TABLE_ID} class="min-w-full bg-mono-900/50 backdrop-blur-sm/40">
      <thead class="bg-mono-800/50 sticky top-0 backdrop-blur-sm shadow-sm ring-1 ring-white/5">
        {@render header?.()}
      </thead>
      <tbody class="divide-y divide-mono-800/50">
        {@render body?.()}
      </tbody>
    </table>
  {:else}
    {@render empty?.()}
  {/if}
</div>

<!--
  Table - Responsive table wrapper with empty state support

  Provides a styled table container with three named slots: header, body, and empty.
  Conditionally displays either the table content or an empty state based on the isEmpty prop.

  @component
  @example
  <Table isEmpty={items.length === 0}>
    <svelte:fragment slot="header">
      <tr><th>Name</th><th>Type</th></tr>
    </svelte:fragment>
    <svelte:fragment slot="body">
      <tr><td>item.name</td><td>item.type</td></tr>
    </svelte:fragment>
    <svelte:fragment slot="empty">
      <EmptyState title="No items" message="Add your first item" />
    </svelte:fragment>
  </Table>
-->
<script lang="ts">
  interface Props {
    /**
     * Whether the table is empty (no data to display)
     * When true, shows the "empty" slot instead of header/body
     * @default false
     */
    isEmpty?: boolean;
  }

  let { isEmpty = false }: Props = $props();
</script>

<div class="flex-1 overflow-auto">
  {#if !isEmpty}
    <table class="min-w-full bg-white">
      <thead class="bg-mono-50 sticky top-0">
        <slot name="header" />
      </thead>
      <tbody class="divide-y divide-mono-200">
        <slot name="body" />
      </tbody>
    </table>
  {:else}
    <slot name="empty" />
  {/if}
</div>

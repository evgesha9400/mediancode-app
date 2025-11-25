<!--
  TableTestWrapper - Test wrapper for Table component

  This wrapper component passes snippets to the Table component
  to enable testing with @testing-library/svelte.
-->
<script lang="ts">
  import { Table } from '$lib/components';

  interface Item {
    id: string;
    name: string;
  }

  interface Props {
    isEmpty?: boolean;
    items?: Item[];
  }

  let { isEmpty = false, items = [] }: Props = $props();
</script>

<Table {isEmpty}>
  {#snippet header()}
    <tr>
      <th class="px-6 py-3 text-left text-xs font-medium text-mono-500 uppercase tracking-wider">
        Name
      </th>
    </tr>
  {/snippet}
  {#snippet body()}
    {#each items as item (item.id)}
      <tr>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-mono-900">
          {item.name}
        </td>
      </tr>
    {/each}
  {/snippet}
  {#snippet empty()}
    <p class="text-mono-500 text-center py-8">No items found</p>
  {/snippet}
</Table>

<script lang="ts">
  import { objectsStore } from '$lib/stores/objects';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import {
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    Drawer,
    DrawerHeader,
    DrawerContent,
    DetailField,
    Pill,
    TableEmptyState
  } from '$lib/components';
  import type { InlineModelValidator } from '$lib/types';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Flattened view: one row per validator with parent object info
  interface ModelValidatorRow {
    id: string;
    name: string;
    validator: InlineModelValidator;
    parentObjectName: string;
    parentObjectId: string;
  }

  // Derive all model validators from the objects store, filtered by namespace
  let allRows = $derived.by((): ModelValidatorRow[] => {
    const objects = $objectsStore.filter(o => o.namespaceId === $activeNamespaceId);
    const rows: ModelValidatorRow[] = [];
    for (const obj of objects) {
      for (const v of obj.validators) {
        rows.push({
          id: `${obj.id}-${v.functionName}`,
          name: v.functionName,
          validator: v,
          parentObjectName: obj.name,
          parentObjectId: obj.id
        });
      }
    }
    return rows;
  });

  // Search function
  function searchValidators(items: ModelValidatorRow[], query: string): ModelValidatorRow[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(r =>
      r.validator.functionName.toLowerCase().includes(q) ||
      r.parentObjectName.toLowerCase().includes(q) ||
      (r.validator.description ?? '').toLowerCase().includes(q)
    );
  }

  // Create list view state
  const state = createListViewState<ModelValidatorRow, Record<string, never>>({
    itemsStore: () => allRows,
    searchFn: searchValidators,
    filterSections: [],
    numericColumns: new Set(),
    urlScope: { page, goto },
    getItemId: (row) => row.id,
    drawerConfig: {
      trackEdits: false,
      allowDelete: false,
      closeDelay: 300
    }
  });

  let filteredRows = $derived(state.results);
  let sorts = $derived(state.sorts);

  function navigateToObject(objectId: string) {
    goto(`/objects?highlight=${objectId}`);
  }
</script>

<PageHeader title="Model Validators" />

<SearchBar
  bind:searchQuery={state.query}
  placeholder="Search model validators..."
  resultsCount={filteredRows.length}
  resultLabel="model validator"
  showFilter={false}
  active={false}
/>

<Table isEmpty={filteredRows.length === 0}>
  {#snippet header()}
    <tr>
      <SortableColumn
        column="name"
        label="Validator Name"
        {sorts}
        onSort={state.handleSort}
      />
      <SortableColumn
        column="parentObjectName"
        label="Parent Object"
        {sorts}
        onSort={state.handleSort}
      />
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
        Mode
      </th>
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
        Description
      </th>
    </tr>
  {/snippet}

  {#snippet body()}
    {#each filteredRows as row}
      <tr
        onclick={() => state.selectItem(row)}
        class="cursor-pointer transition-colors {state.selectedItem?.id === row.id ? 'bg-mono-100' : 'hover:bg-mono-50'}"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm text-mono-900 font-medium">{row.validator.functionName}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm text-mono-600">{row.parentObjectName}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <Pill variant="light">{row.validator.mode}</Pill>
        </td>
        <td class="px-6 py-4 text-sm text-mono-500 max-w-xs truncate">
          {row.validator.description || '-'}
        </td>
      </tr>
    {/each}
  {/snippet}

  {#snippet empty()}
    <TableEmptyState
      entityName="model validators"
      storeKey={STORE_NAMES.OBJECTS}
      noResultsMessage="Add validators to objects from the Objects page"
    />
  {/snippet}
</Table>

<Drawer open={state.drawerOpen}>
  <DrawerHeader title="Model Validator Details" onClose={state.closeDrawer} />

  <DrawerContent>
    {#if state.selectedItem}
      <div class="space-y-6">
        <DetailField label="Function Name">
          <p class="font-mono text-mono-900">{state.selectedItem.validator.functionName}</p>
        </DetailField>

        <DetailField label="Mode">
          <Pill variant="light">{state.selectedItem.validator.mode}</Pill>
        </DetailField>

        <DetailField label="Description" value={state.selectedItem.validator.description || 'No description'} />

        <DetailField label="Parent Object">
          <button
            type="button"
            onclick={() => navigateToObject(state.selectedItem!.parentObjectId)}
            class="flex items-center space-x-2 p-3 bg-mono-50 rounded-md hover:bg-mono-100 cursor-pointer transition-colors group w-full"
          >
            <i class="fa-solid fa-cube text-mono-400 group-hover:text-mono-600 transition-colors"></i>
            <span class="text-sm text-mono-900 group-hover:text-mono-700 transition-colors">{state.selectedItem.parentObjectName}</span>
            <i class="fa-solid fa-arrow-right text-mono-400 group-hover:text-mono-600 transition-colors text-xs ml-auto"></i>
          </button>
        </DetailField>

        <DetailField label="Function Body">
          <pre class="p-3 bg-mono-900 text-mono-100 rounded-md text-xs overflow-x-auto whitespace-pre font-mono">{state.selectedItem.validator.functionBody}</pre>
        </DetailField>
      </div>
    {/if}
  </DrawerContent>
</Drawer>

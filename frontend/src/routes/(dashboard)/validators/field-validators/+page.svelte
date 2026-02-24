<script lang="ts">
  import { fieldsStore } from '$lib/stores/fields';
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
  import type { InlineFieldValidator } from '$lib/types';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  // Flattened view: one row per validator with parent field info
  interface FieldValidatorRow {
    id: string;
    name: string;
    validator: InlineFieldValidator;
    parentFieldName: string;
    parentFieldId: string;
  }

  // Derive all field validators from the fields store, filtered by namespace
  let allRows = $derived.by((): FieldValidatorRow[] => {
    const fields = $fieldsStore.filter(f => f.namespaceId === $activeNamespaceId);
    const rows: FieldValidatorRow[] = [];
    for (const field of fields) {
      for (const v of field.validators) {
        rows.push({
          id: `${field.id}-${v.functionName}`,
          name: v.functionName,
          validator: v,
          parentFieldName: field.name,
          parentFieldId: field.id
        });
      }
    }
    return rows;
  });

  // Search function
  function searchValidators(items: FieldValidatorRow[], query: string): FieldValidatorRow[] {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(r =>
      r.validator.functionName.toLowerCase().includes(q) ||
      r.parentFieldName.toLowerCase().includes(q) ||
      (r.validator.description ?? '').toLowerCase().includes(q)
    );
  }

  // Create list view state
  const state = createListViewState<FieldValidatorRow, Record<string, never>>({
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

  function navigateToField(fieldId: string) {
    goto(`/fields?highlight=${fieldId}`);
  }
</script>

<PageHeader title="Field Validators" />

<SearchBar
  bind:searchQuery={state.query}
  placeholder="Search field validators..."
  resultsCount={filteredRows.length}
  resultLabel="field validator"
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
        column="parentFieldName"
        label="Parent Field"
        {sorts}
        onSort={state.handleSort}
      />
      <SortableColumn
        column="mode"
        label="Mode"
        {sorts}
        onSort={state.handleSort}
      />
      <SortableColumn
        column="description"
        label="Description"
        {sorts}
        onSort={state.handleSort}
      />
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
          <span class="text-sm text-mono-600">{row.parentFieldName}</span>
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
      entityName="field validators"
      storeKey={STORE_NAMES.FIELDS}
      noResultsMessage="Add validators to fields from the Fields page"
    />
  {/snippet}
</Table>

<Drawer open={state.drawerOpen}>
  <DrawerHeader title="Field Validator Details" onClose={state.closeDrawer} />

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

        <DetailField label="Parent Field">
          <button
            type="button"
            onclick={() => navigateToField(state.selectedItem!.parentFieldId)}
            class="flex items-center space-x-2 p-3 bg-mono-50 rounded-md hover:bg-mono-100 cursor-pointer transition-colors group w-full"
          >
            <i class="fa-solid fa-table-list text-mono-400 group-hover:text-mono-600 transition-colors"></i>
            <span class="text-sm text-mono-900 group-hover:text-mono-700 transition-colors">{state.selectedItem.parentFieldName}</span>
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

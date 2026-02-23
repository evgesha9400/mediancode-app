<script lang="ts">
  import { fieldsStore } from '$lib/stores/fields';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import {
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    EmptyState,
    Drawer,
    DrawerHeader,
    DrawerContent
  } from '$lib/components';
  import type { InlineFieldValidator } from '$lib/types';
  import { storeLoadingState, reloadStores, STORE_NAMES } from '$lib/stores/loader';
  import { goto } from '$app/navigation';

  // Flattened view: one row per validator with parent field info
  interface FieldValidatorRow {
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
          validator: v,
          parentFieldName: field.name,
          parentFieldId: field.id
        });
      }
    }
    return rows;
  });

  // Search
  let searchQuery = $state('');
  let filteredRows = $derived(
    searchQuery.trim()
      ? allRows.filter(r =>
          r.validator.functionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.parentFieldName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.validator.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allRows
  );

  // Selected row for detail drawer
  let selectedRow = $state<FieldValidatorRow | null>(null);
  let drawerOpen = $derived(selectedRow !== null);

  function selectRow(row: FieldValidatorRow) {
    selectedRow = row;
  }

  function closeDrawer() {
    selectedRow = null;
  }

  function navigateToField(fieldId: string) {
    goto(`/fields?highlight=${fieldId}`);
  }

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes(STORE_NAMES.FIELDS));
</script>

<PageHeader title="Field Validators" />

<SearchBar
  bind:searchQuery={searchQuery}
  placeholder="Search field validators..."
  resultsCount={filteredRows.length}
  resultLabel="field validator"
  showFilter={false}
  active={false}
/>

<Table isEmpty={filteredRows.length === 0}>
  {#snippet header()}
    <tr>
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
        Validator Name
      </th>
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">
        Parent Field
      </th>
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
        onclick={() => selectRow(row)}
        class="cursor-pointer transition-colors {selectedRow?.validator.id === row.validator.id && selectedRow?.parentFieldId === row.parentFieldId ? 'bg-mono-100' : 'hover:bg-mono-50'}"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm text-mono-900 font-medium">{row.validator.functionName}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm text-mono-600">{row.parentFieldName}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-0.5 text-xs rounded-full bg-mono-100 text-mono-600">{row.validator.mode}</span>
        </td>
        <td class="px-6 py-4 text-sm text-mono-500 max-w-xs truncate">
          {row.validator.description || '-'}
        </td>
      </tr>
    {/each}
  {/snippet}

  {#snippet empty()}
    {#if hasLoadError}
      <EmptyState
        icon="fa-circle-exclamation"
        variant="error"
        title="Failed to load fields"
        message="Something went wrong while fetching field data"
        actionLabel="Retry"
        onAction={reloadStores}
      />
    {:else}
      <EmptyState
        title="No field validators found"
        message="Add validators to fields from the Fields page"
      />
    {/if}
  {/snippet}
</Table>

<Drawer open={drawerOpen}>
  <DrawerHeader title="Field Validator Details" onClose={closeDrawer} />

  <DrawerContent>
    {#if selectedRow}
      <div class="space-y-6">
        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Function Name</h3>
          <p class="font-mono text-mono-900">{selectedRow.validator.functionName}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Mode</h3>
          <span class="px-2 py-0.5 text-xs rounded-full bg-mono-100 text-mono-600">{selectedRow.validator.mode}</span>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Description</h3>
          <p class="text-mono-900">{selectedRow.validator.description || 'No description'}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Parent Field</h3>
          <button
            type="button"
            onclick={() => navigateToField(selectedRow!.parentFieldId)}
            class="flex items-center space-x-2 p-3 bg-mono-50 rounded-md hover:bg-mono-100 cursor-pointer transition-colors group w-full"
          >
            <i class="fa-solid fa-table-list text-mono-400 group-hover:text-mono-600 transition-colors"></i>
            <span class="text-sm text-mono-900 group-hover:text-mono-700 transition-colors">{selectedRow.parentFieldName}</span>
            <i class="fa-solid fa-arrow-right text-mono-400 group-hover:text-mono-600 transition-colors text-xs ml-auto"></i>
          </button>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Function Body</h3>
          <pre class="p-3 bg-mono-900 text-mono-100 rounded-md text-xs overflow-x-auto whitespace-pre font-mono">{selectedRow.validator.functionBody}</pre>
        </div>
      </div>
    {/if}
  </DrawerContent>
</Drawer>

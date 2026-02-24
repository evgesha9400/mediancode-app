<script lang="ts">
  import { fieldValidatorTemplatesStore, searchFieldValidatorTemplates } from '$lib/stores/fieldValidatorTemplates';
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
  import type { FieldValidatorTemplate } from '$lib/types';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  let allTemplates = $derived($fieldValidatorTemplatesStore);

  const state = createListViewState<FieldValidatorTemplate, Record<string, never>>({
    itemsStore: () => allTemplates,
    searchFn: searchFieldValidatorTemplates,
    filterSections: [],
    numericColumns: new Set(),
    urlScope: { page, goto },
    getItemId: (t) => t.id,
    drawerConfig: {
      trackEdits: false,
      allowDelete: false,
      closeDelay: 300
    }
  });

  let filteredTemplates = $derived(state.results);
  let sorts = $derived(state.sorts);
</script>

<PageHeader title="Field Validators" />

<SearchBar
  bind:searchQuery={state.query}
  placeholder="Search field validator templates..."
  resultsCount={filteredTemplates.length}
  resultLabel="template"
  showFilter={false}
  active={false}
/>

<Table isEmpty={filteredTemplates.length === 0}>
  {#snippet header()}
    <tr>
      <SortableColumn
        column="name"
        label="Template Name"
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
        column="compatibleTypes"
        label="Compatible Types"
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
    {#each filteredTemplates as template}
      <tr
        onclick={() => state.selectItem(template)}
        class="cursor-pointer transition-colors {state.selectedItem?.id === template.id ? 'bg-mono-100' : 'hover:bg-mono-50'}"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="text-sm text-mono-900 font-medium">{template.name}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <Pill variant="light">{template.mode}</Pill>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-wrap gap-1">
            {#each template.compatibleTypes as ctype}
              <span class="px-2 py-0.5 text-xs rounded-full bg-mono-100 text-mono-600">{ctype}</span>
            {/each}
          </div>
        </td>
        <td class="px-6 py-4 text-sm text-mono-500 max-w-xs truncate">
          {template.description}
        </td>
      </tr>
    {/each}
  {/snippet}

  {#snippet empty()}
    <TableEmptyState
      entityName="field validator templates"
      storeKey={STORE_NAMES.FIELD_VALIDATOR_TEMPLATES}
      noResultsMessage="No field validator templates available"
    />
  {/snippet}
</Table>

<Drawer open={state.drawerOpen}>
  <DrawerHeader title="Field Validator Template" onClose={state.closeDrawer} />

  <DrawerContent>
    {#if state.selectedItem}
      <div class="space-y-6">
        <DetailField label="Name">
          <p class="text-mono-900 font-medium">{state.selectedItem.name}</p>
        </DetailField>

        <DetailField label="Description" value={state.selectedItem.description} />

        <DetailField label="Mode">
          <Pill variant="light">{state.selectedItem.mode}</Pill>
        </DetailField>

        <DetailField label="Compatible Types">
          <div class="flex flex-wrap gap-1">
            {#each state.selectedItem.compatibleTypes as ctype}
              <span class="px-2 py-0.5 text-xs rounded-full bg-mono-900 text-white">{ctype}</span>
            {/each}
          </div>
        </DetailField>

        {#if state.selectedItem.parameters.length > 0}
          <DetailField label="Parameters">
            <div class="space-y-2">
              {#each state.selectedItem.parameters as param}
                <div class="p-2 bg-mono-50 rounded border border-mono-200">
                  <div class="flex items-center space-x-2">
                    <span class="text-sm text-mono-700 font-medium">{param.label}</span>
                    <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{param.type}</span>
                    {#if param.required}
                      <span class="text-red-500 text-xs">required</span>
                    {/if}
                  </div>
                  {#if param.placeholder}
                    <p class="text-xs text-mono-500 mt-1">e.g. {param.placeholder}</p>
                  {/if}
                </div>
              {/each}
            </div>
          </DetailField>
        {/if}

        <DetailField label="Code Template">
          <pre class="p-3 bg-mono-900 text-mono-100 rounded-md text-xs overflow-x-auto whitespace-pre font-mono">{state.selectedItem.bodyTemplate}</pre>
        </DetailField>
      </div>
    {/if}
  </DrawerContent>
</Drawer>

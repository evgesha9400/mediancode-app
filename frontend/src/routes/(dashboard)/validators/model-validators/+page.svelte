<script lang="ts">
  import { modelValidatorTemplatesStore, searchModelValidatorTemplates } from '$lib/stores/modelValidatorTemplates';
  import {
    MainColumnFrame,
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    DrawerStack,
    DetailField,
    Pill,
    TableListNameCell,
    TableListTextCell,
    TableEmptyState
  } from '$lib/components';
  import type { ModelValidatorTemplate } from '$lib/types';
  import {
    surfaceInsideFrostedPanel,
    tableListAuxiliaryLabel,
    tableListCell,
    tableListDetailTitle,
    tableListRowHover,
    tableListRowInteractive,
    tableListRowSelected
  } from '$lib/ui/classes';
  import { getTableRowId, TABLE_COL_ATTR } from '$lib/utils/testIds';
  import { STORE_NAMES } from '$lib/stores/loader';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { createListViewState } from '$lib/stores/listViewState.svelte';

  let allTemplates = $derived($modelValidatorTemplatesStore);

  const state = createListViewState<ModelValidatorTemplate, Record<string, never>>({
    itemsStore: () => allTemplates,
    searchFn: searchModelValidatorTemplates,
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

<MainColumnFrame bodyClass="">
  {#snippet header()}
    <PageHeader title="Model Validators" />

    <SearchBar
      bind:searchQuery={state.query}
      placeholder="Search model validator templates..."
      resultsCount={filteredTemplates.length}
      resultLabel="template"
      showFilter={false}
      active={false}
    />
  {/snippet}

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
        column="fieldMappings"
        label="Field Mappings"
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
        data-testid={getTableRowId(template.id)}
        onclick={() => state.selectItem(template)}
        class="{tableListRowInteractive} {state.selectedItem?.id === template.id
          ? tableListRowSelected
          : tableListRowHover}"
      >
        <TableListNameCell col="name">
          {#snippet children()}
            {template.name}
          {/snippet}
        </TableListNameCell>
        <td class="{tableListCell} whitespace-nowrap" {...{ [TABLE_COL_ATTR]: 'mode' }}>
          <Pill>{template.mode}</Pill>
        </td>
        <td class="{tableListCell}" {...{ [TABLE_COL_ATTR]: 'fieldMappings' }}>
          <div class="flex flex-wrap gap-1">
            {#each template.fieldMappings as fm}
              <Pill>{fm.label}</Pill>
            {/each}
          </div>
        </td>
        <TableListTextCell col="description" class="max-w-xs truncate">
          {#snippet children()}
            {template.description}
          {/snippet}
        </TableListTextCell>
      </tr>
    {/each}
  {/snippet}

  {#snippet empty()}
    <TableEmptyState
      entityName="model validator templates"
      storeKey={STORE_NAMES.MODEL_VALIDATOR_TEMPLATES}
      noResultsMessage="No model validator templates available"
    />
  {/snippet}
  </Table>
</MainColumnFrame>

{#snippet modelValidatorDetailContent(_: { close: () => void })}
  {#if state.selectedItem}
    <div class="space-y-6">
      <DetailField label="Name">
        <p class={tableListDetailTitle}>{state.selectedItem.name}</p>
      </DetailField>

      <DetailField label="Description" value={state.selectedItem.description} />

      <DetailField label="Mode">
        <Pill>{state.selectedItem.mode}</Pill>
      </DetailField>

      <DetailField label="Field Mappings">
        <div class="space-y-2">
          {#each state.selectedItem.fieldMappings as fm}
            <div class="p-3 {surfaceInsideFrostedPanel}">
              <div class="flex items-center space-x-2">
                <span class={tableListAuxiliaryLabel}>{fm.label}</span>
                {#if fm.required}
                  <span class="text-red-500 text-xs">required</span>
                {/if}
              </div>
              {#if fm.compatibleTypes.length > 0}
                <div class="flex flex-wrap gap-1 mt-1">
                  {#each fm.compatibleTypes as ctype}
                    <Pill size="sm">{ctype}</Pill>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </DetailField>

      {#if state.selectedItem.parameters.length > 0}
        <DetailField label="Parameters">
          <div class="space-y-2">
            {#each state.selectedItem.parameters as param}
              <div class="p-3 {surfaceInsideFrostedPanel}">
                <div class="flex items-center space-x-2">
                  <span class={tableListAuxiliaryLabel}>{param.label}</span>
                  <Pill size="sm">{param.type}</Pill>
                  {#if param.required}
                    <span class="text-red-500 text-xs">required</span>
                  {/if}
                </div>
                {#if param.placeholder}
                  <p class="text-xs text-mono-400 mt-1">e.g. {param.placeholder}</p>
                {/if}
              </div>
            {/each}
          </div>
        </DetailField>
      {/if}
    </div>
  {/if}
{/snippet}

<DrawerStack
  panels={state.drawerOpen
    ? [{
        id: 'model-validator',
        title: 'Model Validator Details',
        headerSystem: true,
        width: 520,
        minWidth: 320,
        content: modelValidatorDetailContent
      }]
    : []}
  onPopPanel={state.closeDrawer}
/>

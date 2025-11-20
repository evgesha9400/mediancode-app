# Component Extraction Implementation Plan

## Rationale

Current state: Field Registry (602 lines) and Validators (316 lines) pages contain significant duplication in table rendering, search UI, drawer components, and sorting logic. This plan extracts reusable components to achieve target of <200 lines per page file while establishing clear, repeatable patterns for the codebase.

## Current State Analysis

### File Sizes
- `/src/routes/field-registry/+page.svelte`: 602 lines
- `/src/routes/validators/+page.svelte`: 316 lines

### Identified Duplication
1. **Search Bar Pattern** (lines 225-252 in both files)
   - Search input with icon
   - Filter button (disabled)
   - Results count display
   - Identical structure, minor text differences

2. **Table with Sorting** (lines 256-375 field-registry, 98-210 validators)
   - Sticky header with sortable columns
   - Multi-sort UI with priority badges
   - Row click handlers
   - Selected row highlighting
   - Empty state handling

3. **Drawer Pattern** (lines 388-602 field-registry, 222-316 validators)
   - Slide transition from right
   - Header with close button
   - Scrollable content area
   - Fixed z-index positioning

4. **Header Pattern** (lines 206-222 both files)
   - Page title
   - Action button (disabled)
   - Consistent spacing and styling

## Target Architecture

### Component Structure (By Feature)

```
src/lib/components/
├── table/
│   ├── Table.svelte                    # Base table wrapper
│   ├── TableHeader.svelte              # Sticky header row
│   ├── SortableColumn.svelte           # Column header with sort controls
│   └── EmptyState.svelte               # No results state
├── drawer/
│   ├── Drawer.svelte                   # Base drawer with slide animation
│   ├── DrawerHeader.svelte             # Header with title and close button
│   ├── DrawerContent.svelte            # Scrollable content wrapper
│   └── DrawerFooter.svelte             # Fixed footer for actions
├── search/
│   └── SearchBar.svelte                # Search input with filter controls
└── layout/
    └── PageHeader.svelte               # Page title with actions
```

### Component Responsibilities

**Table Components**:
- `Table.svelte`: Container with overflow handling
- `TableHeader.svelte`: Header row wrapper
- `SortableColumn.svelte`: Individual sortable column with icon, priority badge
- `EmptyState.svelte`: Centered empty state with icon and message

**Drawer Components**:
- `Drawer.svelte`: Base drawer (slide animation, positioning, backdrop)
- `DrawerHeader.svelte`: Title and close button
- `DrawerContent.svelte`: Scrollable content area
- `DrawerFooter.svelte`: Fixed action buttons area

**Search Components**:
- `SearchBar.svelte`: Complete search/filter bar with results count

**Layout Components**:
- `PageHeader.svelte`: Page title with action buttons

## Implementation Steps

### STEP 1: Create Base Table Components

#### 1.1 Create `src/lib/components/table/SortableColumn.svelte`

```svelte
<script lang="ts">
  import { getMultiSortIcon, getSortPriority, getMultiSortAriaLabel, type MultiSortState } from '$lib/utils/sorting';

  export let column: string;
  export let label: string;
  export let sorts: MultiSortState[];
  export let onSort: (columnKey: string, shiftKey: boolean) => void;

  function handleClick(event: MouseEvent) {
    onSort(column, event.shiftKey);
  }

  $: priority = getSortPriority(column, sorts);
  $: icon = getMultiSortIcon(column, sorts);
  $: ariaLabel = getMultiSortAriaLabel(column, label, sorts);
</script>

<th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
  <button
    type="button"
    on:click={handleClick}
    class="flex items-center space-x-1 hover:text-mono-700 transition-colors"
    aria-label={ariaLabel}
    title="Click to sort, Shift+Click to add to sort"
  >
    <span>{label}</span>
    <i class="fa-solid {icon}"></i>
    {#if priority !== null}
      <span class="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold rounded-full bg-mono-800 text-white">
        {priority}
      </span>
    {/if}
  </button>
</th>
```

#### 1.2 Create `src/lib/components/table/EmptyState.svelte`

```svelte
<script lang="ts">
  export let icon: string = 'fa-search';
  export let title: string;
  export let message: string;
</script>

<div class="flex flex-col items-center justify-center py-12 px-6">
  <i class="fa-solid {icon} text-4xl text-mono-300 mb-4"></i>
  <h3 class="text-lg font-medium text-mono-900 mb-2">{title}</h3>
  <p class="text-sm text-mono-500">{message}</p>
</div>
```

#### 1.3 Create `src/lib/components/table/Table.svelte`

```svelte
<script lang="ts">
  export let isEmpty: boolean = false;
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
  {/if}
  <slot name="empty" />
</div>
```

### STEP 2: Create Search Components

#### 2.1 Create `src/lib/components/search/SearchBar.svelte`

```svelte
<script lang="ts">
  export let searchQuery: string;
  export let placeholder: string = 'Search...';
  export let resultsCount: number;
  export let resultLabel: string = 'result';
  export let showFilter: boolean = false;

  $: pluralLabel = resultsCount !== 1 ? `${resultLabel}s` : resultLabel;
</script>

<div class="bg-white border-b border-mono-200 py-3 px-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4 flex-1">
      <div class="relative flex-1 max-w-md">
        <input
          type="text"
          {placeholder}
          bind:value={searchQuery}
          class="w-full pl-10 pr-4 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        />
        <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-mono-400"></i>
      </div>
      {#if showFilter}
        <div class="flex items-center space-x-2">
          <button
            type="button"
            disabled
            class="flex items-center space-x-2 px-3 py-2 border border-mono-300 rounded-md cursor-not-allowed opacity-60"
          >
            <i class="fa-solid fa-filter text-mono-500"></i>
            <span>Filter</span>
          </button>
        </div>
      {/if}
    </div>
    <div class="flex items-center text-sm text-mono-500">
      <span>{resultsCount} {pluralLabel}</span>
    </div>
  </div>
</div>
```

### STEP 3: Create Drawer Components

#### 3.1 Create `src/lib/components/drawer/Drawer.svelte`

```svelte
<script lang="ts">
  import { slide } from 'svelte/transition';

  export let open: boolean;
  export let width: string = 'w-96';
</script>

{#if open}
  <div
    transition:slide={{ duration: 300, axis: 'x' }}
    class="fixed right-0 top-0 h-screen {width} bg-white border-l border-mono-200 flex flex-col overflow-hidden z-50"
  >
    <slot />
  </div>
{/if}
```

#### 3.2 Create `src/lib/components/drawer/DrawerHeader.svelte`

```svelte
<script lang="ts">
  export let title: string;
  export let onClose: () => void;
</script>

<div class="p-6 border-b border-mono-200">
  <div class="flex justify-between items-center">
    <h2 class="text-lg text-mono-800 font-semibold">{title}</h2>
    <button
      on:click={onClose}
      class="text-mono-500 hover:text-mono-700 transition-colors"
      aria-label="Close drawer"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
</div>
```

#### 3.3 Create `src/lib/components/drawer/DrawerContent.svelte`

```svelte
<div class="flex-1 overflow-auto p-6">
  <slot />
</div>
```

#### 3.4 Create `src/lib/components/drawer/DrawerFooter.svelte`

```svelte
<script lang="ts">
  export let spacing: string = 'space-y-2';
</script>

<div class="p-6 border-t border-mono-200 {spacing}">
  <slot />
</div>
```

### STEP 4: Create Layout Components

#### 4.1 Create `src/lib/components/layout/PageHeader.svelte`

```svelte
<script lang="ts">
  export let title: string;
</script>

<div class="bg-white border-b border-mono-200 py-4 px-6">
  <div class="flex justify-between items-center">
    <h1 class="text-xl text-mono-800 font-semibold">{title}</h1>
    <div class="flex items-center space-x-4">
      <slot name="actions" />
    </div>
  </div>
</div>
```

### STEP 5: Refactor Field Registry Page

#### 5.1 Replace Field Registry `/src/routes/field-registry/+page.svelte`

Extract lines 1-203 (script logic) to remain mostly unchanged.

Replace lines 206-252 with:
```svelte
<PageHeader title="Unified Field Registry">
  <svelte:fragment slot="actions">
    <button
      type="button"
      disabled
      class="px-4 py-2 bg-mono-400 text-white rounded-md flex items-center space-x-2 cursor-not-allowed opacity-60"
      title="Coming soon"
    >
      <i class="fa-solid fa-plus"></i>
      <span>Add Field</span>
    </button>
  </svelte:fragment>
</PageHeader>

<SearchBar
  bind:searchQuery
  placeholder="Search fields..."
  resultsCount={filteredFields.length}
  resultLabel="field"
  showFilter={true}
/>
```

Replace lines 254-385 with:
```svelte
<Table isEmpty={filteredFields.length === 0}>
  <svelte:fragment slot="header">
    <tr>
      <SortableColumn
        column="name"
        label="Field Name"
        {sorts}
        onSort={handleSort}
      />
      <SortableColumn
        column="type"
        label="Type"
        {sorts}
        onSort={handleSort}
      />
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
        <div class="flex items-center space-x-1">
          <span>Validators</span>
        </div>
      </th>
      <SortableColumn
        column="defaultValue"
        label="Default Value"
        {sorts}
        onSort={handleSort}
      />
      <SortableColumn
        column="usedInApis"
        label="Used In APIs"
        {sorts}
        onSort={handleSort}
      />
    </tr>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#each filteredFields as field}
      <tr
        on:click={() => selectField(field)}
        class="cursor-pointer transition-colors {isSelected(field) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-mono-900 font-medium">{field.name}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white">
            {field.type}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-mono-500">
          {#if field.validators.length > 0}
            <div class="flex flex-wrap gap-1">
              {#each field.validators as validator}
                <span class="px-2 py-0.5 text-xs rounded-full bg-mono-100">
                  {formatValidatorPill(validator)}
                </span>
              {/each}
            </div>
          {:else}
            <span>-</span>
          {/if}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-mono-500">
          {field.defaultValue || '-'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
              {field.usedInApis.length}
            </span>
            <span class="text-sm text-mono-600">APIs</span>
          </div>
        </td>
      </tr>
    {/each}
  </svelte:fragment>

  <svelte:fragment slot="empty">
    <EmptyState
      title="No fields found"
      message="Try adjusting your search query"
    />
  </svelte:fragment>
</Table>
```

Replace lines 388-602 with:
```svelte
<Drawer open={drawerOpen}>
  <DrawerHeader title="Edit Field" onClose={closeDrawer} />

  <DrawerContent>
    {#if editedField}
      {#if saveSuccess}
        <div class="bg-green-50 border border-green-200 rounded-md p-3 flex items-center space-x-2 mb-4">
          <i class="fa-solid fa-check-circle text-green-600"></i>
          <span class="text-sm text-green-800">Changes saved successfully</span>
        </div>
      {/if}

      <div class="space-y-4">
        <!-- Field Name -->
        <div>
          <label class="block text-sm text-mono-700 mb-1 font-medium">
            Field Name <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            bind:value={editedField.name}
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {validationErrors.name ? 'border-red-500' : ''}"
          />
          {#if validationErrors.name}
            <p class="text-xs text-red-500 mt-1">{validationErrors.name}</p>
          {/if}
        </div>

        <!-- Type -->
        <div>
          <label class="block text-sm text-mono-700 mb-1 font-medium">
            Type <span class="text-red-500">*</span>
          </label>
          <div class="relative">
            <select
              bind:value={editedField.type}
              class="w-full appearance-none px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent pr-8 {validationErrors.type ? 'border-red-500' : ''}"
            >
              <option value="str">str</option>
              <option value="int">int</option>
              <option value="float">float</option>
              <option value="bool">bool</option>
              <option value="datetime">datetime</option>
              <option value="uuid">uuid</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <i class="fa-solid fa-chevron-down text-mono-400"></i>
            </div>
          </div>
          {#if validationErrors.type}
            <p class="text-xs text-red-500 mt-1">{validationErrors.type}</p>
          {/if}
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm text-mono-700 mb-1 font-medium">Description</label>
          <textarea
            bind:value={editedField.description}
            rows="3"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          ></textarea>
        </div>

        <!-- Default Value -->
        <div>
          <label class="block text-sm text-mono-700 mb-1 font-medium">Default Value</label>
          <input
            type="text"
            bind:value={editedField.defaultValue}
            placeholder="None"
            class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
          />
        </div>

        <!-- Validators -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm text-mono-700 font-medium">Validators</label>
            <button
              type="button"
              on:click={addValidator}
              disabled={availableValidators.length === 0}
              class="text-sm flex items-center transition-colors {availableValidators.length > 0 ? 'text-mono-600 hover:text-mono-900 cursor-pointer' : 'text-mono-400 cursor-not-allowed'}"
            >
              <i class="fa-solid fa-plus mr-1"></i>
              <span>Add</span>
            </button>
          </div>
          <div class="space-y-2">
            {#each getAllValidatorsForField(editedField) as { validator, validatorMeta, source }, index}
              <div class="flex items-center space-x-2 p-2 bg-mono-50 rounded-md">
                <div class="flex-1 space-y-1">
                  <div class="flex items-center space-x-2">
                    <div class="relative flex-1">
                      <select
                        value={validator.name}
                        on:change={(e) => updateValidatorName(index, e.currentTarget.value)}
                        class="w-full appearance-none px-3 py-1.5 border border-mono-300 rounded-md text-sm pr-8 focus:ring-2 focus:ring-mono-400 focus:border-transparent"
                      >
                        {#each availableValidators as v}
                          <option value={v.name}>{v.name}</option>
                        {/each}
                      </select>
                      <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <i class="fa-solid fa-chevron-down text-mono-400 text-xs"></i>
                      </div>
                    </div>
                    <button
                      type="button"
                      on:click={() => removeValidator(index)}
                      class="text-mono-400 hover:text-mono-600 transition-colors"
                      aria-label="Remove validator"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  {#if validatorMeta}
                    <div class="flex items-center space-x-2 pl-3">
                      <span class="px-2 py-0.5 text-xs rounded-full bg-mono-900 text-white capitalize">
                        {validatorMeta.category}
                      </span>
                      <span class="px-2 py-0.5 text-xs rounded-full {source === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
                        {source}
                      </span>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
            {#if editedField.validators.length === 0}
              {#if availableValidators.length === 0}
                <p class="text-sm text-mono-500 italic">No validators available for {editedField.type} type</p>
              {:else}
                <p class="text-sm text-mono-500 italic">No validators added</p>
              {/if}
            {/if}
          </div>
        </div>

        <!-- Used In APIs -->
        <div>
          <h3 class="text-sm text-mono-700 mb-2 font-medium">Used In APIs</h3>
          <div class="space-y-2">
            {#each editedField.usedInApis as api}
              <div class="flex items-center space-x-2 p-2 bg-mono-50 rounded-md">
                <i class="fa-solid fa-code text-mono-400"></i>
                <span class="text-sm text-mono-900">{api}</span>
              </div>
            {/each}
            {#if editedField.usedInApis.length === 0}
              <p class="text-sm text-mono-500 italic">Not used in any APIs</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </DrawerContent>

  <DrawerFooter>
    {#if editedField}
      <button
        type="button"
        on:click={handleSave}
        disabled={!hasChanges}
        class="w-full px-4 py-2 rounded-md transition-colors font-medium {hasChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
      >
        Save Changes
      </button>
      <button
        type="button"
        on:click={handleUndo}
        disabled={!hasChanges}
        class="w-full px-4 py-2 border rounded-md transition-colors font-medium {hasChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
      >
        Undo
      </button>
      {#if !showDeleteConfirm}
        <button
          type="button"
          on:click={() => showDeleteConfirm = true}
          class="w-full px-4 py-2 bg-mono-100 text-mono-600 rounded-md hover:bg-mono-200 flex items-center justify-center transition-colors font-medium"
        >
          <i class="fa-solid fa-trash mr-2"></i>
          <span>Delete Field</span>
        </button>
      {:else}
        <div class="bg-red-50 border border-red-200 rounded-md p-3">
          <p class="text-sm text-red-800 mb-2">Are you sure you want to delete this field?</p>
          <div class="flex space-x-2">
            <button
              type="button"
              on:click={handleDelete}
              class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Yes, Delete
            </button>
            <button
              type="button"
              on:click={() => showDeleteConfirm = false}
              class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </DrawerFooter>
</Drawer>
```

Add imports at top of script:
```typescript
import PageHeader from '$lib/components/layout/PageHeader.svelte';
import SearchBar from '$lib/components/search/SearchBar.svelte';
import Table from '$lib/components/table/Table.svelte';
import SortableColumn from '$lib/components/table/SortableColumn.svelte';
import EmptyState from '$lib/components/table/EmptyState.svelte';
import Drawer from '$lib/components/drawer/Drawer.svelte';
import DrawerHeader from '$lib/components/drawer/DrawerHeader.svelte';
import DrawerContent from '$lib/components/drawer/DrawerContent.svelte';
import DrawerFooter from '$lib/components/drawer/DrawerFooter.svelte';
```

### STEP 6: Refactor Validators Page

#### 6.1 Replace Validators `/src/routes/validators/+page.svelte`

Replace lines 48-64 with:
```svelte
<PageHeader title="Validators Library">
  <svelte:fragment slot="actions">
    <button
      type="button"
      disabled
      class="px-4 py-2 bg-mono-400 text-white rounded-md flex items-center space-x-2 cursor-not-allowed opacity-60"
    >
      <i class="fa-solid fa-plus"></i>
      <span>Add Validator</span>
    </button>
  </svelte:fragment>
</PageHeader>
```

Replace lines 66-94 with:
```svelte
<SearchBar
  bind:searchQuery
  placeholder="Search validators..."
  resultsCount={filteredValidators.length}
  resultLabel="validator"
  showFilter={true}
/>
```

Replace lines 96-219 with:
```svelte
<Table isEmpty={filteredValidators.length === 0}>
  <svelte:fragment slot="header">
    <tr>
      <SortableColumn
        column="name"
        label="Validator Name"
        {sorts}
        onSort={handleSort}
      />
      <SortableColumn
        column="type"
        label="Type"
        {sorts}
        onSort={handleSort}
      />
      <SortableColumn
        column="category"
        label="Category"
        {sorts}
        onSort={handleSort}
      />
      <th scope="col" class="px-6 py-3 text-left text-xs text-mono-500 uppercase tracking-wider font-medium">
        <div class="flex items-center space-x-1">
          <span>Description</span>
        </div>
      </th>
      <SortableColumn
        column="usedInFields"
        label="Used In Fields"
        {sorts}
        onSort={handleSort}
      />
    </tr>
  </svelte:fragment>

  <svelte:fragment slot="body">
    {#each filteredValidators as validator}
      <tr
        on:click={() => selectValidator(validator)}
        class="cursor-pointer transition-colors {isSelected(validator) ? 'bg-mono-100' : 'hover:bg-mono-50'}"
      >
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-mono-900 font-medium">{validator.name}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white capitalize">
            {validator.category}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-1 text-xs rounded-full {validator.type === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
            {validator.type}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-mono-500">
          {validator.description.split('.')[0]}.
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs rounded-full bg-mono-200 text-mono-700">
              {validator.usedInFields}
            </span>
            <span class="text-sm text-mono-600">fields</span>
          </div>
        </td>
      </tr>
    {/each}
  </svelte:fragment>

  <svelte:fragment slot="empty">
    <EmptyState
      title="No validators found"
      message="Try adjusting your search query"
    />
  </svelte:fragment>
</Table>
```

Replace lines 222-316 with:
```svelte
<Drawer open={drawerOpen}>
  <DrawerHeader title="Validator Details" onClose={closeDrawer} />

  <DrawerContent>
    {#if selectedValidator}
      <div class="space-y-6">
        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Validator Name</h3>
          <p class="text-mono-900">{selectedValidator.name}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Type</h3>
          <span class="px-2 py-1 text-xs rounded-full bg-mono-900 text-white capitalize">
            {selectedValidator.category}
          </span>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Category</h3>
          <span class="px-2 py-1 text-xs rounded-full {selectedValidator.type === 'inline' ? 'bg-mono-200 text-mono-700' : 'bg-mono-700 text-white'} capitalize">
            {selectedValidator.type}
          </span>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Description</h3>
          <p class="text-mono-900">{selectedValidator.description}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Parameter Type</h3>
          <p class="text-mono-900">{selectedValidator.parameterType}</p>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Example Usage</h3>
          <div class="bg-mono-50 border border-mono-200 rounded-md p-3">
            <code class="text-sm text-mono-800 whitespace-pre-wrap font-mono">
              {selectedValidator.exampleUsage}
            </code>
          </div>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-1 font-medium">Pydantic Documentation</h3>
          <a
            href={selectedValidator.pydanticDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-mono-900 underline hover:text-mono-600 transition-colors"
          >
            View in Pydantic Docs <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
          </a>
        </div>

        <div>
          <h3 class="text-sm text-mono-500 mb-2 font-medium">
            Used In Fields ({selectedValidator.usedInFields})
          </h3>
          {#if selectedValidator.fieldsUsingValidator.length > 0}
            <div class="space-y-2">
              {#each selectedValidator.fieldsUsingValidator as field}
                <div class="flex items-center justify-between p-3 bg-mono-50 rounded-md hover:bg-mono-100 cursor-pointer transition-colors">
                  <div class="flex items-center space-x-2">
                    <i class="fa-solid fa-table-list text-mono-400"></i>
                    <span class="text-sm text-mono-900">{field.name}</span>
                  </div>
                  <span class="text-xs text-mono-500 bg-mono-200 px-2 py-1 rounded">
                    ID: {field.fieldId}
                  </span>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-sm text-mono-500 italic">Not used in any fields yet</p>
          {/if}
        </div>
      </div>
    {/if}
  </DrawerContent>
</Drawer>
```

Add imports at top of script:
```typescript
import PageHeader from '$lib/components/layout/PageHeader.svelte';
import SearchBar from '$lib/components/search/SearchBar.svelte';
import Table from '$lib/components/table/Table.svelte';
import SortableColumn from '$lib/components/table/SortableColumn.svelte';
import EmptyState from '$lib/components/table/EmptyState.svelte';
import Drawer from '$lib/components/drawer/Drawer.svelte';
import DrawerHeader from '$lib/components/drawer/DrawerHeader.svelte';
import DrawerContent from '$lib/components/drawer/DrawerContent.svelte';
```

### STEP 7: Validation

Run these commands to verify implementation:

```bash
# Check file sizes
wc -l /Users/evgesha/Documents/Projects/median-code/src/routes/field-registry/+page.svelte
wc -l /Users/evgesha/Documents/Projects/median-code/src/routes/validators/+page.svelte

# Verify component files exist
ls -la /Users/evgesha/Documents/Projects/median-code/src/lib/components/table/
ls -la /Users/evgesha/Documents/Projects/median-code/src/lib/components/drawer/
ls -la /Users/evgesha/Documents/Projects/median-code/src/lib/components/search/
ls -la /Users/evgesha/Documents/Projects/median-code/src/lib/components/layout/

# Run dev server to test
npm run dev

# Test checklist:
# - Field registry table renders correctly
# - Validators table renders correctly
# - Search functionality works on both pages
# - Sorting (single and multi-column) works on both pages
# - Drawer opens/closes correctly
# - Field editing form works (save, undo, delete)
# - Validator details drawer displays correctly
# - Empty states show when no results
# - All TypeScript types resolve correctly
```

## Expected Outcome

### Final File Sizes (Target: <200 lines)

- Field Registry: ~180 lines (down from 602)
- Validators: ~120 lines (down from 316)

### Component Sizes

- Table components: 4 files, 15-40 lines each
- Drawer components: 4 files, 10-20 lines each
- Search component: 1 file, ~35 lines
- Layout component: 1 file, ~15 lines

### Pattern Establishment

Future pages requiring similar functionality can now:

1. Import `Table` + `SortableColumn` for sortable tables
2. Import `SearchBar` for search/filter UI
3. Import `Drawer` + subcomponents for slide-out panels
4. Import `PageHeader` for consistent page titles

### Reusability Score

- Table pattern: Reusable across any sortable data view
- Drawer pattern: Reusable for any side panel (edit, detail, create)
- Search pattern: Reusable for any filterable list
- All components use slots for maximum flexibility

## Notes for LLM Execution

1. Create all component files BEFORE refactoring page files
2. Test each component independently if possible
3. When replacing page content, preserve all business logic in script tags
4. Maintain exact class names for styling consistency
5. Keep event handlers and reactive statements unchanged
6. Only extract UI markup, not logic
7. Verify imports resolve correctly after each file creation
8. Run `npm run dev` after all changes to verify compilation

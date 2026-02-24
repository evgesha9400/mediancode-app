# Pattern Normalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Normalize all dashboard list pages to two strict archetypes (Read-Only, CRUD) with shared components and a generic entity model factory.

**Architecture:** Two composable state layers — `createListViewState` (base: search/filter/sort/drawer) composed by `createEntityModel` (CRUD: validate/save/delete/undo). Four new shared components (`Pill`, `FormField`, `DetailField`, `TableEmptyState`) replace copy-pasted markup across all pages.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Tailwind CSS, Vitest, Playwright

---

## Phase 1: Shared Components

Create the four shared UI components that will be used across all subsequent phases. No page changes yet.

### Task 1.1: Create Pill Component

**Files:**
- Create: `src/lib/components/pill/Pill.svelte`
- Create: `src/lib/components/pill/index.ts`
- Test: `tests/unit/lib/components/pill/Pill.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/lib/components/pill/Pill.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Pill from '$lib/components/pill/Pill.svelte';

describe('Pill', () => {
  it('renders children content', () => {
    // Svelte 5 snippet children require a wrapper — test via innerHTML
    const { container } = render(Pill, { props: {} });
    // Component exists and renders
    expect(container.querySelector('span')).toBeTruthy();
  });

  it('applies default variant classes', () => {
    const { container } = render(Pill);
    const span = container.querySelector('span');
    expect(span?.className).toContain('bg-mono-200');
    expect(span?.className).toContain('text-mono-700');
  });

  it('applies light variant classes', () => {
    const { container } = render(Pill, { props: { variant: 'light' } });
    const span = container.querySelector('span');
    expect(span?.className).toContain('bg-mono-100');
    expect(span?.className).toContain('text-mono-600');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/lib/components/pill/Pill.test.ts`
Expected: FAIL — module not found

**Step 3: Write the component**

```svelte
<!-- src/lib/components/pill/Pill.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface PillProps {
    variant?: 'default' | 'light';
    children?: Snippet;
  }

  let { variant = 'default', children }: PillProps = $props();

  const classes = {
    default: 'bg-mono-200 text-mono-700',
    light: 'bg-mono-100 text-mono-600'
  };
</script>

<span class="px-2 py-0.5 text-xs rounded-full {classes[variant]}">
  {#if children}
    {@render children()}
  {/if}
</span>
```

```typescript
// src/lib/components/pill/index.ts
export { default as Pill } from './Pill.svelte';
export type { PillProps } from './Pill.svelte';
```

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/lib/components/pill/Pill.test.ts`
Expected: PASS

**Step 5: No commit yet** — continue to next task in this phase.

---

### Task 1.2: Create FormField Component

**Files:**
- Create: `src/lib/components/form/FormField.svelte`
- Test: `tests/unit/lib/components/form/FormField.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/lib/components/form/FormField.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import FormField from '$lib/components/form/FormField.svelte';

describe('FormField', () => {
  it('renders label text', () => {
    const { getByText } = render(FormField, { props: { label: 'Name', value: '' } });
    expect(getByText('Name')).toBeTruthy();
  });

  it('renders required asterisk when required', () => {
    const { container } = render(FormField, { props: { label: 'Name', value: '', required: true } });
    expect(container.querySelector('.text-red-500')).toBeTruthy();
  });

  it('does not render asterisk when not required', () => {
    const { container } = render(FormField, { props: { label: 'Name', value: '' } });
    // No red asterisk span inside label
    const label = container.querySelector('label');
    expect(label?.querySelector('.text-red-500')).toBeNull();
  });

  it('renders error message when provided', () => {
    const { getByText } = render(FormField, {
      props: { label: 'Name', value: '', error: 'Required field' }
    });
    expect(getByText('Required field')).toBeTruthy();
  });

  it('applies error border class when error present', () => {
    const { container } = render(FormField, {
      props: { label: 'Name', value: '', error: 'Required' }
    });
    const input = container.querySelector('input');
    expect(input?.className).toContain('border-red-500');
  });

  it('renders with disabled state', () => {
    const { container } = render(FormField, {
      props: { label: 'Name', value: '', disabled: true }
    });
    const input = container.querySelector('input');
    expect(input?.disabled).toBe(true);
  });

  it('auto-generates id from label', () => {
    const { container } = render(FormField, { props: { label: 'API Title', value: '' } });
    const input = container.querySelector('input');
    expect(input?.id).toBe('api-title');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/lib/components/form/FormField.test.ts`
Expected: FAIL — module not found

**Step 3: Write the component**

The component must match the exact existing pattern from `src/routes/(dashboard)/apis/+page.svelte:272-286`:

```svelte
<!-- src/lib/components/form/FormField.svelte -->
<script lang="ts">
  interface FormFieldProps {
    label: string;
    value: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    type?: 'text' | 'number';
    id?: string;
  }

  let {
    label,
    value = $bindable(''),
    error,
    required = false,
    disabled = false,
    placeholder = '',
    type = 'text',
    id
  }: FormFieldProps = $props();

  let computedId = $derived(id ?? label.toLowerCase().replace(/\s+/g, '-'));
</script>

<div>
  <label for={computedId} class="block text-sm text-mono-700 mb-1 font-medium">
    {label} {#if required}<span class="text-red-500">*</span>{/if}
  </label>
  <input
    id={computedId}
    {type}
    bind:value
    {placeholder}
    {disabled}
    class="w-full px-3 py-2 border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {error ? 'border-red-500' : ''} {disabled ? 'bg-mono-100 cursor-not-allowed' : ''}"
  />
  {#if error}
    <p class="text-xs text-red-500 mt-1">{error}</p>
  {/if}
</div>
```

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/lib/components/form/FormField.test.ts`
Expected: PASS

---

### Task 1.3: Create DetailField Component

**Files:**
- Create: `src/lib/components/form/DetailField.svelte`
- Test: `tests/unit/lib/components/form/DetailField.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/lib/components/form/DetailField.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import DetailField from '$lib/components/form/DetailField.svelte';

describe('DetailField', () => {
  it('renders label', () => {
    const { getByText } = render(DetailField, { props: { label: 'Name' } });
    expect(getByText('Name')).toBeTruthy();
  });

  it('renders value when provided', () => {
    const { getByText } = render(DetailField, { props: { label: 'Name', value: 'test-field' } });
    expect(getByText('test-field')).toBeTruthy();
  });

  it('renders label with correct styling', () => {
    const { container } = render(DetailField, { props: { label: 'Name', value: 'x' } });
    const h3 = container.querySelector('h3');
    expect(h3?.className).toContain('text-sm');
    expect(h3?.className).toContain('text-mono-500');
    expect(h3?.className).toContain('font-medium');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/lib/components/form/DetailField.test.ts`
Expected: FAIL — module not found

**Step 3: Write the component**

Must match the existing pattern from `src/routes/(dashboard)/validators/field-constraints/+page.svelte:254-262`:

```svelte
<!-- src/lib/components/form/DetailField.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface DetailFieldProps {
    label: string;
    value?: string;
    children?: Snippet;
  }

  let { label, value, children }: DetailFieldProps = $props();
</script>

<div>
  <h3 class="text-sm text-mono-500 mb-1 font-medium">{label}</h3>
  {#if children}
    {@render children()}
  {:else if value !== undefined}
    <p class="text-mono-900">{value}</p>
  {/if}
</div>
```

```typescript
// src/lib/components/form/index.ts
export { default as FormField } from './FormField.svelte';
export { default as DetailField } from './DetailField.svelte';
export type { FormFieldProps } from './FormField.svelte';
export type { DetailFieldProps } from './DetailField.svelte';
```

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/lib/components/form/DetailField.test.ts`
Expected: PASS

---

### Task 1.4: Create TableEmptyState Component

**Files:**
- Create: `src/lib/components/table/TableEmptyState.svelte`
- Test: `tests/unit/lib/components/table/TableEmptyState.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/lib/components/table/TableEmptyState.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';

// Mock the store loader
vi.mock('$lib/stores/loader', () => ({
  storeLoadingState: { subscribe: vi.fn((cb: any) => { cb({ storeErrors: ['FIELDS'] }); return () => {}; }) },
  reloadStores: vi.fn(),
  STORE_NAMES: { FIELDS: 'FIELDS', TYPES: 'TYPES' }
}));

import TableEmptyState from '$lib/components/table/TableEmptyState.svelte';

describe('TableEmptyState', () => {
  it('renders error state when store key is in error list', () => {
    const { getByText } = render(TableEmptyState, {
      props: { entityName: 'fields', storeKey: 'FIELDS' }
    });
    expect(getByText('Failed to load fields')).toBeTruthy();
  });

  it('renders no-results state when no error', () => {
    const { getByText } = render(TableEmptyState, {
      props: { entityName: 'types', storeKey: 'TYPES' }
    });
    expect(getByText('No types found')).toBeTruthy();
  });

  it('renders custom no-results message', () => {
    const { getByText } = render(TableEmptyState, {
      props: { entityName: 'validators', storeKey: 'TYPES', noResultsMessage: 'Add from Fields page' }
    });
    expect(getByText('Add from Fields page')).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/lib/components/table/TableEmptyState.test.ts`
Expected: FAIL — module not found

**Step 3: Write the component**

Must match the existing pattern from every page (e.g., `src/routes/(dashboard)/fields/+page.svelte` empty snippet):

```svelte
<!-- src/lib/components/table/TableEmptyState.svelte -->
<script lang="ts">
  import { EmptyState } from '$lib/components/table';
  import { storeLoadingState, reloadStores } from '$lib/stores/loader';

  interface TableEmptyStateProps {
    entityName: string;
    storeKey: string;
    noResultsMessage?: string;
  }

  let {
    entityName,
    storeKey,
    noResultsMessage = 'Try adjusting your search query'
  }: TableEmptyStateProps = $props();

  let hasLoadError = $derived($storeLoadingState.storeErrors.includes(storeKey));
</script>

{#if hasLoadError}
  <EmptyState
    icon="fa-circle-exclamation"
    variant="error"
    title="Failed to load {entityName}"
    message="Something went wrong while fetching {entityName} data"
    actionLabel="Retry"
    onAction={reloadStores}
  />
{:else}
  <EmptyState
    title="No {entityName} found"
    message={noResultsMessage}
  />
{/if}
```

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/lib/components/table/TableEmptyState.test.ts`
Expected: PASS

---

### Task 1.5: Update Barrel Exports

**Files:**
- Modify: `src/lib/components/table/index.ts`
- Modify: `src/lib/components/index.ts`

**Step 1: Update table barrel export**

Add to `src/lib/components/table/index.ts`:

```typescript
export { default as TableEmptyState } from './TableEmptyState.svelte';
export type { TableEmptyStateProps } from './TableEmptyState.svelte';
```

**Step 2: Update main barrel export**

Add to `src/lib/components/index.ts` (after the `./tooltip` line):

```typescript
// Form components
export * from './form';

// Pill component
export * from './pill';
```

**Step 3: Run all component tests**

Run: `bunx vitest run tests/unit/lib/components/`
Expected: ALL PASS

**Step 4: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/lib/components/pill/ src/lib/components/form/ src/lib/components/table/TableEmptyState.svelte src/lib/components/table/index.ts src/lib/components/index.ts tests/unit/lib/components/pill/ tests/unit/lib/components/form/ tests/unit/lib/components/table/TableEmptyState.test.ts
git commit -m "feat(components): add Pill, FormField, DetailField, TableEmptyState shared components"
```

---

## Phase 2: Generic Entity Model Factory

Extract the shared CRUD orchestration from the three existing entity model factories into a single generic `createEntityModel()`.

### Task 2.1: Create Entity Contracts

**Files:**
- Create: `src/lib/domain/contracts/fieldContract.ts`
- Create: `src/lib/domain/contracts/objectContract.ts`
- Create: `src/lib/domain/contracts/namespaceContract.ts`

**Step 1: Extract field contract**

Move the entity-specific functions from `src/lib/stores/fieldsModel.svelte.ts:163-229` into a pure TypeScript module:

```typescript
// src/lib/domain/contracts/fieldContract.ts
import type { Field } from '$lib/types';
import type { CreateFieldRequest, UpdateFieldRequest } from '$lib/api/fields';
import { buildDeletionTooltip } from '$lib/utils/references';

export interface FieldContractDeps {
  getActiveNamespaceId: () => string;
  getDefaultType: () => string;
  getTypeIdByName: (name: string) => string | undefined;
}

export type FieldPayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function fieldValidate(item: Field): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!item.name.trim()) errors.name = 'Field name is required';
  if (!item.type) errors.type = 'Type is required';
  const emptyParam = item.constraints.find(c => c.value === null || c.value === '');
  if (emptyParam) errors.constraints = `Constraint "${emptyParam.name}" requires a value`;
  return errors;
}

export function fieldCreateDraft(deps: FieldContractDeps): Field {
  return {
    id: '',
    namespaceId: deps.getActiveNamespaceId(),
    name: '',
    type: deps.getDefaultType(),
    constraints: [],
    validators: [],
    usedInApis: [],
    description: '',
    defaultValue: ''
  };
}

export function fieldToCreatePayload(item: Field, deps: FieldContractDeps): FieldPayloadResult<CreateFieldRequest> {
  const typeId = deps.getTypeIdByName(item.type);
  if (!typeId) return { ok: false, error: `Unknown type "${item.type}"` };
  return {
    ok: true,
    data: {
      namespaceId: item.namespaceId,
      name: item.name,
      typeId,
      description: item.description,
      defaultValue: item.defaultValue,
      constraints: item.constraints.map(c => ({ constraintId: c.constraintId, value: c.value })),
      validators: item.validators.length > 0
        ? item.validators.map(v => ({ functionName: v.functionName, mode: v.mode, functionBody: v.functionBody, description: v.description }))
        : undefined
    }
  };
}

export function fieldToUpdatePayload(item: Field, deps: FieldContractDeps): FieldPayloadResult<UpdateFieldRequest> {
  const typeId = deps.getTypeIdByName(item.type);
  if (!typeId) return { ok: false, error: `Unknown type "${item.type}"` };
  return {
    ok: true,
    data: {
      name: item.name,
      typeId,
      description: item.description,
      defaultValue: item.defaultValue,
      constraints: item.constraints.map(c => ({ constraintId: c.constraintId, value: c.value })),
      validators: item.validators.map(v => ({ functionName: v.functionName, mode: v.mode, functionBody: v.functionBody, description: v.description }))
    }
  };
}

export function fieldDeletionGuard(item: Field): { canDelete: boolean; tooltip: string } {
  const hasRefs = item.usedInApis.length > 0;
  return {
    canDelete: !hasRefs,
    tooltip: hasRefs
      ? buildDeletionTooltip('field', 'API', item.usedInApis.map(api => ({ name: api })))
      : ''
  };
}
```

**Step 2: Extract object contract**

Move entity-specific functions from `src/lib/stores/objectsModel.svelte.ts:161-216`:

```typescript
// src/lib/domain/contracts/objectContract.ts
import type { ObjectDefinition } from '$lib/types';
import type { CreateObjectRequest, UpdateObjectRequest } from '$lib/api/objects';
import { buildDeletionTooltip } from '$lib/utils/references';

export interface ObjectContractDeps {
  getActiveNamespaceId: () => string;
}

export type ObjectPayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function objectValidate(item: ObjectDefinition): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!item.name.trim()) errors.name = 'Object name is required';
  return errors;
}

export function objectCreateDraft(deps: ObjectContractDeps): ObjectDefinition {
  return {
    id: '',
    namespaceId: deps.getActiveNamespaceId(),
    name: '',
    description: '',
    fields: [],
    validators: [],
    usedInApis: []
  };
}

export function objectToCreatePayload(item: ObjectDefinition): ObjectPayloadResult<CreateObjectRequest> {
  return {
    ok: true,
    data: {
      namespaceId: item.namespaceId,
      name: item.name,
      description: item.description,
      fields: item.fields,
      validators: item.validators.length > 0
        ? item.validators.map(v => ({ functionName: v.functionName, mode: v.mode, functionBody: v.functionBody, description: v.description }))
        : undefined
    }
  };
}

export function objectToUpdatePayload(item: ObjectDefinition): ObjectPayloadResult<UpdateObjectRequest> {
  // Strip derived properties that may have been added by deriveExtra
  const { fieldCount, usedInApisCount, namespaceName, ...clean } = item as any;
  return {
    ok: true,
    data: {
      name: clean.name,
      description: clean.description,
      fields: clean.fields,
      validators: clean.validators.map((v: any) => ({ functionName: v.functionName, mode: v.mode, functionBody: v.functionBody, description: v.description }))
    }
  };
}

export function objectDeletionGuard(item: ObjectDefinition): { canDelete: boolean; tooltip: string } {
  const hasRefs = item.usedInApis.length > 0;
  return {
    canDelete: !hasRefs,
    tooltip: hasRefs
      ? buildDeletionTooltip('object', 'API', item.usedInApis.map(api => ({ name: api })))
      : ''
  };
}
```

**Step 3: Extract namespace contract**

Move entity-specific functions from `src/lib/stores/namespacesModel.svelte.ts:155-180`:

```typescript
// src/lib/domain/contracts/namespaceContract.ts
import type { Namespace } from '$lib/types';
import type { UpdateNamespaceRequest, CreateNamespaceRequest } from '$lib/api/namespaces';

export interface NamespaceContractDeps {
  getNamespaceEntityDetails: (id: string) => { total: number; fields: number; fieldConstraints: number; objects: number; endpoints: number };
}

export type NamespacePayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function namespaceValidate(item: Namespace): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!item.name.trim()) errors.name = 'Namespace name is required';
  return errors;
}

export function namespaceCreateDraft(): Namespace {
  return {
    id: '',
    name: '',
    description: '',
    locked: false,
    isDefault: false
  };
}

export function namespaceToCreatePayload(item: Namespace): NamespacePayloadResult<CreateNamespaceRequest> {
  return {
    ok: true,
    data: {
      name: item.name.trim(),
      description: item.description?.trim() || undefined
    }
  };
}

export function namespaceToUpdatePayload(item: Namespace): NamespacePayloadResult<UpdateNamespaceRequest> {
  return {
    ok: true,
    data: {
      name: item.name,
      description: item.description
    }
  };
}

export function namespaceDeletionGuard(item: Namespace, deps: NamespaceContractDeps): { canDelete: boolean; tooltip: string } {
  if (item.locked) {
    return { canDelete: false, tooltip: 'Cannot delete locked namespaces' };
  }
  const details = deps.getNamespaceEntityDetails(item.id);
  if (details.total > 0) {
    return { canDelete: false, tooltip: `Cannot delete: Contains ${details.total} entities` };
  }
  return { canDelete: true, tooltip: '' };
}
```

---

### Task 2.2: Create Generic Entity Model Factory

**Files:**
- Create: `src/lib/stores/entityModel.svelte.ts`
- Test: `tests/unit/lib/stores/entityModel.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/lib/stores/entityModel.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
  page: { url: new URL('http://localhost/test'), params: {}, route: { id: '/test' }, status: 200, error: null, data: {}, form: null, state: {} }
}));
vi.mock('$lib/stores/toasts', () => ({ showToast: vi.fn() }));

import { createEntityModel } from '$lib/stores/entityModel.svelte';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { showToast } from '$lib/stores/toasts';
import { effect_root } from 'svelte/internal/client';

interface TestItem { id: string; name: string; }

describe('createEntityModel', () => {
  const items: TestItem[] = [{ id: '1', name: 'foo' }, { id: '2', name: 'bar' }];

  function createTestModel() {
    return createEntityModel<TestItem, Record<string, never>, { name: string }, { name: string }>({
      listConfig: {
        itemsStore: () => items,
        searchFn: (items, q) => items.filter(i => i.name.includes(q)),
        filterSections: [],
        numericColumns: new Set(),
        urlScope: { page, goto }
      },
      contracts: {
        validate: (item) => item.name.trim() ? {} : { name: 'Required' },
        createDraft: () => ({ id: '', name: '' }),
        toCreatePayload: (item) => ({ ok: true, data: { name: item.name } }),
        toUpdatePayload: (item) => ({ ok: true, data: { name: item.name } }),
        deletionGuard: () => ({ canDelete: true, tooltip: '' })
      },
      mutations: {
        create: vi.fn().mockResolvedValue({ success: true, data: { id: '3', name: 'new' } }),
        update: vi.fn().mockResolvedValue({ success: true, data: { id: '1', name: 'updated' } }),
        delete: vi.fn().mockResolvedValue({ success: true })
      },
      entityLabel: 'item'
    });
  }

  it('exposes list view state properties', () => {
    let model: any;
    const cleanup = effect_root(() => { model = createTestModel(); });
    expect(model.results).toHaveLength(2);
    expect(model.query).toBe('');
    cleanup();
  });

  it('exposes CRUD state properties', () => {
    let model: any;
    const cleanup = effect_root(() => { model = createTestModel(); });
    expect(model.isSaving).toBe(false);
    expect(model.isDeleting).toBe(false);
    expect(model.isFormValid).toBe(false); // no editedItem
    cleanup();
  });

  it('openCreate sets mode to creating', () => {
    let model: any;
    const cleanup = effect_root(() => {
      model = createTestModel();
      model.openCreate();
    });
    expect(model.mode).toBe('creating');
    expect(model.editedItem).toEqual({ id: '', name: '' });
    cleanup();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bunx vitest run tests/unit/lib/stores/entityModel.test.ts`
Expected: FAIL — module not found

**Step 3: Write the generic factory**

```typescript
// src/lib/stores/entityModel.svelte.ts
//
// Generic CRUD entity model factory.
// Composes createListViewState for search/filter/sort/drawer, adds
// generic CRUD orchestration (validate, save, create, delete, undo).

import type { ListViewConfig } from './listViewState.svelte';
import type { DrawerMode } from './listViewState.svelte';
import type { MultiSortState } from '$lib/utils/sorting';
import type { ActionResult } from '$lib/domain/mutations';
import { createListViewState } from './listViewState.svelte';
import { composeState } from '$lib/utils/compose';
import { showToast } from './toasts';

// ============================================================================
// Types
// ============================================================================

export type PayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface EntityContracts<Item, CreatePayload, UpdatePayload> {
  validate: (item: Item) => Record<string, string>;
  createDraft: () => Item;
  toCreatePayload: (item: Item) => PayloadResult<CreatePayload>;
  toUpdatePayload: (item: Item) => PayloadResult<UpdatePayload>;
  deletionGuard: (item: Item) => { canDelete: boolean; tooltip: string };
  /** Optional pre-save guard. Return error message to block, undefined to proceed. */
  preSaveGuard?: (item: Item) => string | undefined;
}

export interface MutationActions<Item, CreatePayload, UpdatePayload> {
  create: (payload: CreatePayload) => Promise<ActionResult<Item>>;
  update: (id: string, payload: UpdatePayload) => Promise<ActionResult<Item>>;
  delete: (id: string) => Promise<ActionResult<void>>;
}

export interface EntityModelConfig<Item, FilterState, CreatePayload, UpdatePayload> {
  listConfig: Omit<ListViewConfig<Item>, 'drawerConfig'> & {
    drawerConfig?: ListViewConfig<Item>['drawerConfig'];
  };
  contracts: EntityContracts<Item, CreatePayload, UpdatePayload>;
  mutations: MutationActions<Item, CreatePayload, UpdatePayload>;
  entityLabel: string;
}

export interface EntityModelState<Item, FilterState> {
  // List view state
  query: string;
  filters: FilterState;
  filtersOpen: boolean;
  drawerOpen: boolean;
  selectedItem: Item | null;
  editedItem: Item | null;
  originalItem: Item | null;
  showDeleteConfirm: boolean;
  readonly mode: DrawerMode;
  readonly results: Item[];
  readonly sorts: MultiSortState;
  readonly activeFiltersCount: number;
  readonly hasChanges: boolean;
  readonly highlightedId: string | null;
  handleSort: (columnKey: string, shiftKey: boolean) => void;
  selectItem: (item: Item) => void;
  resetFilters: () => void;
  toggleFilters: () => void;
  // CRUD state
  readonly isSaving: boolean;
  readonly isDeleting: boolean;
  readonly isFormValid: boolean;
  readonly visibleErrors: Record<string, string>;
  readonly canDelete: boolean;
  readonly deleteTooltip: string;
  // CRUD actions
  openCreate: () => void;
  closeDrawer: () => void;
  handleSave: () => Promise<void>;
  handleCreate: () => Promise<void>;
  handleUndo: () => void;
  handleDelete: () => Promise<void>;
  isSelected: (item: Item) => boolean;
}

// ============================================================================
// Factory
// ============================================================================

export function createEntityModel<
  Item extends { id: string; name: string },
  FilterState extends Record<string, any>,
  CreatePayload,
  UpdatePayload
>(
  config: EntityModelConfig<Item, FilterState, CreatePayload, UpdatePayload>
): EntityModelState<Item, FilterState> {
  const { listConfig, contracts, mutations, entityLabel } = config;

  // --- Create list view state (shared utility) ---
  const listState = createListViewState<Item, FilterState>({
    ...listConfig,
    drawerConfig: {
      trackEdits: true,
      allowDelete: true,
      closeDelay: 300,
      ...listConfig.drawerConfig
    }
  });

  // --- CRUD-specific state ---
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let formTouched = $state(false);
  let serverErrors = $state<Record<string, string>>({});

  // --- Derived validation ---
  let formErrors = $derived.by(() => {
    if (!listState.editedItem) return {};
    return contracts.validate(listState.editedItem);
  });

  let isFormValid = $derived(listState.editedItem !== null && Object.keys(formErrors).length === 0);
  let visibleErrors = $derived({ ...(formTouched ? formErrors : {}), ...serverErrors });

  // --- Derived deletion guard ---
  let deletionGuardResult = $derived.by(() => {
    if (!listState.editedItem) return { canDelete: true, tooltip: '' };
    return contracts.deletionGuard(listState.editedItem);
  });

  let canDelete = $derived(deletionGuardResult.canDelete);
  let deleteTooltip = $derived(deletionGuardResult.tooltip);

  // --- Internal helpers ---

  function resetFormState() {
    formTouched = false;
    serverErrors = {};
  }

  function closeDrawer() {
    listState.closeDrawer();
    resetFormState();
  }

  function openCreate() {
    listState.openCreate(contracts.createDraft());
    resetFormState();
  }

  function isSelected(item: Item): boolean {
    return listState.selectedItem?.id === item.id;
  }

  function handleUndo() {
    if (listState.originalItem) {
      listState.editedItem = JSON.parse(JSON.stringify(listState.originalItem));
      resetFormState();
    }
  }

  // --- Save (update existing) ---
  async function handleSave() {
    if (!listState.editedItem || isSaving) return;

    // Optional pre-save guard
    if (contracts.preSaveGuard) {
      const guardError = contracts.preSaveGuard(listState.editedItem);
      if (guardError) {
        showToast(guardError, 'error', 3000);
        return;
      }
    }

    formTouched = true;
    if (!isFormValid) return;

    const entityName = listState.editedItem.name;
    isSaving = true;

    const payloadResult = contracts.toUpdatePayload(listState.editedItem);
    if (!payloadResult.ok) {
      showToast(payloadResult.error, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await mutations.update(listState.editedItem.id, payloadResult.data);

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { name: result.error };
      } else {
        showToast(result.error || `Failed to update ${entityLabel}`, 'error', 5000);
      }
      return;
    }

    listState.selectedItem = result.data!;
    listState.originalItem = JSON.parse(JSON.stringify(result.data!));
    showToast(`${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} "${entityName}" updated successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  // --- Create (new entity) ---
  async function handleCreate() {
    if (!listState.editedItem || isSaving) return;

    formTouched = true;
    if (!isFormValid) return;

    isSaving = true;

    const payloadResult = contracts.toCreatePayload(listState.editedItem);
    if (!payloadResult.ok) {
      showToast(payloadResult.error, 'error', 5000);
      isSaving = false;
      return;
    }

    const result = await mutations.create(payloadResult.data);

    if (!result.success) {
      isSaving = false;
      if (result.error?.includes('already exists')) {
        serverErrors = { name: result.error };
      } else {
        showToast(result.error || `Failed to create ${entityLabel}`, 'error', 5000);
      }
      return;
    }

    showToast(`${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} "${result.data!.name}" created successfully`, 'success', 3000);
    closeDrawer();
    isSaving = false;
  }

  // --- Delete ---
  async function handleDelete() {
    if (!listState.editedItem || isDeleting) return;

    const entityName = listState.editedItem.name;
    isDeleting = true;

    const result = await mutations.delete(listState.editedItem.id);

    if (result.success) {
      closeDrawer();
      isDeleting = false;
      showToast(`${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} "${entityName}" deleted successfully`, 'success', 3000);
    } else {
      isDeleting = false;
      showToast(result.error || `Failed to delete ${entityLabel}`, 'error', 5000);
    }
  }

  // --- Compose and return ---
  return composeState(listState, {
    get isSaving() { return isSaving; },
    get isDeleting() { return isDeleting; },
    get isFormValid() { return isFormValid; },
    get visibleErrors() { return visibleErrors; },
    get canDelete() { return canDelete; },
    get deleteTooltip() { return deleteTooltip; },
    openCreate,
    closeDrawer,
    handleSave,
    handleCreate,
    handleUndo,
    handleDelete,
    isSelected
  }) as EntityModelState<Item, FilterState>;
}
```

**Step 4: Run test to verify it passes**

Run: `bunx vitest run tests/unit/lib/stores/entityModel.test.ts`
Expected: PASS

---

### Task 2.3: Rewrite Entity Model Wrappers

**Files:**
- Modify: `src/lib/stores/fieldsModel.svelte.ts` (367 → ~40 lines)
- Modify: `src/lib/stores/objectsModel.svelte.ts` (354 → ~40 lines)
- Modify: `src/lib/stores/namespacesModel.svelte.ts` (284 → ~45 lines)

**Step 1: Rewrite fieldsModel as thin wrapper**

Replace `src/lib/stores/fieldsModel.svelte.ts` entirely. Preserve the exported `FieldsModelConfig` and `FieldsModelState` interfaces:

```typescript
// src/lib/stores/fieldsModel.svelte.ts
import type { Page } from '@sveltejs/kit';
import type { Field, FilterConfig } from '$lib/types';
import { createEntityModel, type EntityModelState } from './entityModel.svelte';
import { createFieldAction, updateFieldAction, deleteFieldAction } from '$lib/domain/mutations';
import { fieldValidate, fieldCreateDraft, fieldToCreatePayload, fieldToUpdatePayload, fieldDeletionGuard, type FieldContractDeps } from '$lib/domain/contracts/fieldContract';

export interface FieldsModelConfig {
  itemsStore: () => Field[];
  searchFn: (items: Field[], query: string) => Field[];
  filterSections: () => FilterConfig;
  urlScope: { page: Page; goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>; };
  getActiveNamespaceId: () => string;
  getDefaultType: () => string;
  getTypeIdByName: (name: string) => string | undefined;
  getNamespaceName: (namespaceId: string) => string;
}

type FieldFilterState = { selectedTypes: string[]; onlyUsedInApis: boolean; onlyHasConstraints: boolean; };

export type FieldsModelState = EntityModelState<Field, FieldFilterState>;

export function createFieldsModel(config: FieldsModelConfig): FieldsModelState {
  const deps: FieldContractDeps = {
    getActiveNamespaceId: config.getActiveNamespaceId,
    getDefaultType: config.getDefaultType,
    getTypeIdByName: config.getTypeIdByName
  };

  return createEntityModel<Field, FieldFilterState, any, any>({
    listConfig: {
      itemsStore: config.itemsStore,
      searchFn: config.searchFn,
      filterSections: config.filterSections,
      numericColumns: new Set(['usedInApisCount']),
      urlScope: config.urlScope,
      highlightParamKey: 'highlight',
      getItemId: (field) => field.id,
      deriveExtra: (field) => ({
        usedInApisCount: field.usedInApis.length,
        namespaceName: config.getNamespaceName(field.namespaceId)
      }),
      sortColumnMap: { 'usedInApis': 'usedInApisCount', 'namespace': 'namespaceName' }
    },
    contracts: {
      validate: fieldValidate,
      createDraft: () => fieldCreateDraft(deps),
      toCreatePayload: (item) => fieldToCreatePayload(item, deps),
      toUpdatePayload: (item) => fieldToUpdatePayload(item, deps),
      deletionGuard: fieldDeletionGuard
    },
    mutations: {
      create: createFieldAction,
      update: updateFieldAction,
      delete: deleteFieldAction
    },
    entityLabel: 'field'
  });
}
```

**Step 2: Rewrite objectsModel as thin wrapper**

Same pattern — replace `src/lib/stores/objectsModel.svelte.ts` entirely. Uses `objectValidate`, `objectCreateDraft`, etc. from `objectContract.ts`.

**Step 3: Rewrite namespacesModel as thin wrapper**

Same pattern — replace `src/lib/stores/namespacesModel.svelte.ts` entirely. Key difference: uses `preSaveGuard` for the locked namespace check, and now includes `openCreate` + `handleCreate` (enabling Phase 4).

**Step 4: Run existing model tests**

Run: `bunx vitest run tests/unit/lib/stores/fieldsModel.test.ts tests/unit/lib/stores/objectsModel.test.ts tests/unit/lib/stores/namespacesModel.test.ts`
Expected: ALL PASS (tests verify behavior, not implementation)

**Step 5: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/lib/stores/entityModel.svelte.ts src/lib/domain/contracts/ src/lib/stores/fieldsModel.svelte.ts src/lib/stores/objectsModel.svelte.ts src/lib/stores/namespacesModel.svelte.ts tests/unit/lib/stores/entityModel.test.ts
git commit -m "refactor(stores): extract generic createEntityModel factory"
```

---

## Phase 3: APIs List Page → CRUD Archetype

### Task 3.1: Create API Contract and Model

**Files:**
- Create: `src/lib/domain/contracts/apiContract.ts`
- Create: `src/lib/stores/apiModel.svelte.ts`
- Test: `tests/unit/lib/stores/apiModel.test.ts`

**Step 1: Create API contract**

```typescript
// src/lib/domain/contracts/apiContract.ts
import type { Api } from '$lib/types';
import type { CreateApiRequest, UpdateApiRequest } from '$lib/api/apis';

export interface ApiContractDeps {
  getActiveNamespaceId: () => string;
}

export type ApiPayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function apiValidate(item: Api): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!item.title.trim()) errors.title = 'API title is required';
  return errors;
}

export function apiCreateDraft(deps: ApiContractDeps): Api {
  return {
    id: '',
    namespaceId: deps.getActiveNamespaceId(),
    title: '',
    version: '1.0.0',
    description: '',
    baseUrl: '/api/v1',
    serverUrl: '',
    createdAt: '',
    updatedAt: ''
  };
}

export function apiToCreatePayload(item: Api): ApiPayloadResult<CreateApiRequest> {
  return {
    ok: true,
    data: {
      namespaceId: item.namespaceId,
      title: item.title,
      version: item.version,
      description: item.description,
      serverUrl: item.serverUrl,
      baseUrl: item.baseUrl
    }
  };
}

export function apiToUpdatePayload(item: Api): ApiPayloadResult<UpdateApiRequest> {
  return {
    ok: true,
    data: {
      title: item.title,
      version: item.version,
      description: item.description,
      serverUrl: item.serverUrl,
      baseUrl: item.baseUrl
    }
  };
}

export function apiDeletionGuard(_item: Api): { canDelete: boolean; tooltip: string } {
  return { canDelete: true, tooltip: '' };
}
```

**Step 2: Create API model wrapper**

```typescript
// src/lib/stores/apiModel.svelte.ts
import type { Page } from '@sveltejs/kit';
import type { Api, FilterConfig } from '$lib/types';
import { createEntityModel, type EntityModelState } from './entityModel.svelte';
import { createApiAction, updateApiAction, deleteApiAction } from '$lib/domain/mutations';
import { apiValidate, apiCreateDraft, apiToCreatePayload, apiToUpdatePayload, apiDeletionGuard, type ApiContractDeps } from '$lib/domain/contracts/apiContract';

export interface ApiModelConfig {
  itemsStore: () => Api[];
  searchFn: (items: Api[], query: string) => Api[];
  filterSections: () => FilterConfig;
  urlScope: { page: Page; goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>; };
  getActiveNamespaceId: () => string;
  getNamespaceName: (namespaceId: string) => string;
  getEndpointCount: (apiId: string) => number;
}

type ApiFilterState = Record<string, never>;
export type ApiModelState = EntityModelState<Api, ApiFilterState>;

export function createApiModel(config: ApiModelConfig): ApiModelState {
  const deps: ApiContractDeps = { getActiveNamespaceId: config.getActiveNamespaceId };

  return createEntityModel<Api, ApiFilterState, any, any>({
    listConfig: {
      itemsStore: config.itemsStore,
      searchFn: config.searchFn,
      filterSections: config.filterSections,
      numericColumns: new Set(['endpointCount']),
      urlScope: config.urlScope,
      getItemId: (api) => api.id,
      deriveExtra: (api) => ({
        endpointCount: config.getEndpointCount(api.id),
        namespaceName: config.getNamespaceName(api.namespaceId)
      }),
      sortColumnMap: { 'endpoints': 'endpointCount', 'namespace': 'namespaceName' }
    },
    contracts: {
      validate: apiValidate,
      createDraft: () => apiCreateDraft(deps),
      toCreatePayload: apiToCreatePayload,
      toUpdatePayload: apiToUpdatePayload,
      deletionGuard: apiDeletionGuard
    },
    mutations: {
      create: createApiAction,
      update: updateApiAction,
      delete: deleteApiAction
    },
    entityLabel: 'API'
  });
}
```

**Step 3: Rewrite APIs page to use the model**

Rewrite `src/routes/(dashboard)/apis/+page.svelte` to replace the inline `createListViewState` + custom drawer state (lines 49-149) with `createApiModel()`. The template markup stays largely the same but binds to `workflow.*` instead of `listState.*` and `formData.*`.

**Step 4: Run tests**

Run: `bunx vitest run && bun run svelte-check --tsconfig ./tsconfig.json`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/lib/domain/contracts/apiContract.ts src/lib/stores/apiModel.svelte.ts src/routes/\(dashboard\)/apis/+page.svelte tests/unit/lib/stores/apiModel.test.ts
git commit -m "refactor(apis): normalize APIs list page to CRUD archetype"
```

---

## Phase 4: Namespaces → Drawer-Only Creation

### Task 4.1: Enable Create in Namespaces Model

The generic `createEntityModel` already provides `openCreate` and `handleCreate`. The namespace contract in Task 2.1 already defines `namespaceCreateDraft` and `namespaceToCreatePayload`. The thin wrapper from Task 2.3 already wires them.

**Files:**
- Modify: `src/routes/(dashboard)/namespaces/+page.svelte`

**Step 1: Delete modal state and markup**

Remove from the `<script>` section (lines 62-109):
- `showCreateModal`, `newNamespaceName`, `newNamespaceDescription`, `createErrors`, `isCreating`
- `openCreateModal()`, `closeCreateModal()`, `handleCreate()`

Remove from the template (lines 356-417):
- The entire `{#if showCreateModal}` block

**Step 2: Wire create button to drawer**

Change `onclick={openCreateModal}` to `onclick={workflow.openCreate}` on the PageHeader create button (line 119).

**Step 3: Add create mode to the drawer**

The existing drawer (lines 236-354) already handles `workflow.editedItem`. Add a conditional for `workflow.mode === 'creating'` to show the `CrudDrawerFooter` in create mode (with `onCreate={workflow.handleCreate}`).

**Step 4: Run tests**

Run: `bunx vitest run && bun run svelte-check --tsconfig ./tsconfig.json`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/routes/\(dashboard\)/namespaces/+page.svelte
git commit -m "refactor(namespaces): replace create modal with drawer"
```

---

## Phase 5: Read-Only Pages Normalization

### Task 5.1: Add Detail Drawer to Types Page

**Files:**
- Modify: `src/routes/(dashboard)/types/+page.svelte`

**Step 1: Add drawer config to createListViewState**

Add `drawerConfig: { trackEdits: false, allowDelete: false, closeDelay: 300 }` to the existing `createListViewState` call (line 34).

**Step 2: Add row click handler**

Change `<tr class="hover:bg-mono-50 transition-colors">` (line 103) to:
```svelte
<tr onclick={() => state.selectItem(type)} class="cursor-pointer transition-colors {state.selectedItem?.name === type.name ? 'bg-mono-100' : 'hover:bg-mono-50'}">
```

**Step 3: Add drawer markup**

Add after the closing `</Table>` tag:
```svelte
<Drawer open={state.drawerOpen}>
  <DrawerHeader title="Type Details" onClose={state.closeDrawer} />
  <DrawerContent>
    {#if state.selectedItem}
      <div class="space-y-6">
        <DetailField label="Name" value={state.selectedItem.name} />
        <DetailField label="Python Type" value={state.selectedItem.pythonType} />
        <DetailField label="Description" value={state.selectedItem.description} />
        <DetailField label="Used In Fields ({state.selectedItem.usedInFields})">
          <!-- Cross-reference links to fields using this type -->
        </DetailField>
      </div>
    {/if}
  </DrawerContent>
</Drawer>
```

**Step 4: Add necessary imports**

Add `Drawer`, `DrawerHeader`, `DrawerContent`, `DetailField` to the component imports.

---

### Task 5.2: Normalize Field Validators Page

**Files:**
- Modify: `src/routes/(dashboard)/validators/field-validators/+page.svelte`

**Step 1: Replace hand-rolled state with createListViewState**

Replace the entire `<script>` section. The flattening `$derived.by` stays as the `itemsStore` function, but search, drawer, and sorting are now handled by the factory.

Key changes:
- Import `createListViewState`, `SortableColumn`, `page`, `goto`
- Create a search function for `FieldValidatorRow`
- Call `createListViewState<FieldValidatorRow, {}>({ ... })`
- Remove `searchQuery`, `selectedRow`, `drawerOpen`, `selectRow`, `closeDrawer`

**Step 2: Replace plain `<th>` with SortableColumn**

Replace all 4 `<th scope="col">` elements with `<SortableColumn>` components.

**Step 3: Update template bindings**

Replace `searchQuery` with `state.query`, `selectedRow` with `state.selectedItem`, etc.

---

### Task 5.3: Normalize Model Validators Page

Same as Task 5.2, for `src/routes/(dashboard)/validators/model-validators/+page.svelte`. Identical pattern, different entity references (`objectsStore` instead of `fieldsStore`, `parentObjectName` instead of `parentFieldName`).

**Step 4: Run tests**

Run: `bunx vitest run && bun run svelte-check --tsconfig ./tsconfig.json`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/routes/\(dashboard\)/types/+page.svelte src/routes/\(dashboard\)/validators/field-validators/+page.svelte src/routes/\(dashboard\)/validators/model-validators/+page.svelte
git commit -m "refactor(pages): normalize all read-only pages to shared archetype"
```

---

## Phase 6: Replace Inline Markup with Shared Components

Sweep all dashboard pages to replace copy-pasted HTML with the new shared components.

### Task 6.1: Replace Pill Markup

**Files to modify:** All pages containing `rounded-full bg-mono-200 text-mono-700` or `rounded-full bg-mono-100 text-mono-600` in `src/routes/(dashboard)/`.

For each occurrence, replace:
```svelte
<span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">{value}</span>
```
With:
```svelte
<Pill>{value}</Pill>
```

---

### Task 6.2: Replace FormField Markup

**Files to modify:** All CRUD pages with editable inputs in drawers (`fields/`, `objects/`, `namespaces/`, `apis/`).

For each form input group, replace the label + input + error block with `<FormField>`.

---

### Task 6.3: Replace DetailField Markup

**Files to modify:** All read-only drawers (`field-constraints/`, `field-validators/`, `model-validators/`, `types/`).

For each read-only display group, replace the `<h3>` + `<p>` block with `<DetailField>`.

---

### Task 6.4: Replace TableEmptyState Markup

**Files to modify:** All pages with the `{#snippet empty()}` pattern.

For each page, replace the `{#if hasLoadError}` conditional with `<TableEmptyState>`.

**Step 5: Run full validation**

Run: `bunx vitest run && bun run svelte-check --tsconfig ./tsconfig.json`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/routes/\(dashboard\)/
git commit -m "refactor(pages): replace inline markup with shared components"
```

---

## Phase 7: Verification

### Task 7.1: Run Full Test Suite

**Step 1: Type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 2: Unit tests**

Run: `bunx vitest run`
Expected: ALL PASS

**Step 3: E2E smoke tests**

Run: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
Expected: ALL PASS

**Step 4: E2E CRUD tests**

Run: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
Expected: ALL PASS

---

### Task 7.2: Orphan Pattern Grep

Verify no old patterns remain in route files:

```bash
# No hand-rolled search state on any page
grep -r 'let searchQuery = \$state' src/routes/

# No plain <th> in table headers (should all be SortableColumn)
grep -r '<th scope="col"' src/routes/

# No raw pill markup
grep -r 'rounded-full bg-mono-200 text-mono-700' src/routes/

# No raw form field label markup
grep -r 'block text-sm text-mono-700 mb-1 font-medium' src/routes/

# No raw detail field label markup
grep -r 'text-sm text-mono-500 mb-1 font-medium' src/routes/
```

Expected: **Zero hits** for all patterns.

**Step 3: Commit**

```bash
git commit --allow-empty -m "test(patterns): verify pattern normalization complete"
```

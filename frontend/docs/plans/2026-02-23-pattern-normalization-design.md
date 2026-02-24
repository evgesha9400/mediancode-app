# Pattern Normalization Design

## Date: 2026-02-23

## Context

The dashboard codebase has grown organically across 9 list pages, 3 entity model factories, and ~15 shared components. While the foundations are solid, the pages implement the same concepts using different mechanisms: some use `createListViewState()`, some use entity model factories, some use hand-rolled `$state`/`$derived`. Form fields, pills, empty states, and detail displays are copy-pasted rather than componentized.

This design normalizes the codebase to two strict page archetypes, extracts repeated markup into shared components, and consolidates the entity model layer into a generic factory.

## Goals

1. Every dashboard list page follows one of exactly two archetypes
2. Identical markup patterns become shared components
3. The CRUD state layer is a single generic factory with thin entity-specific wrappers
4. No hand-rolled state management on any page — every page uses a factory

## Non-Goals

- Changing the `/apis/[id]` detail page (unique editor, left as-is)
- Changing backend API contracts
- Adding new features or pages
- Redesigning component visual appearance

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Page archetypes | 2: Read-Only + CRUD | View-Only Derived (validators) was just a hand-rolled Read-Only. Consolidate. |
| APIs list page | Full CRUD archetype | Create `createApiModel()` factory, same as Fields/Objects/Namespaces |
| Namespaces create modal | Convert to drawer | Only page using modal for creation. Factory already supports drawer-based create. |
| Types page | Add detail drawer | Only read-only page without row click + drawer. Normalize for consistency. |
| Validator pages | Use `createListViewState` | Replace hand-rolled state with factory. Add `SortableColumn` and optional filters. |
| Entity model factories | Extract generic `createEntityModel` | 3 existing factories share ~70% identical code. Generic factory + thin wrappers. |
| State layers | Keep two composable layers | `createListViewState` (base) composed by `createEntityModel` (CRUD). Clear contract. |
| Form fields | Extract `FormField` component | Label + input + error markup repeated ~40 times across pages. |
| Detail fields | Extract `DetailField` component | Label + value markup repeated ~30 times across read-only drawers. |
| Pills/badges | Extract `Pill` component | Badge markup repeated ~20 times across tables and drawers. |
| Empty states | Extract `TableEmptyState` component | Error/no-results conditional repeated identically in every page. |

---

## Architecture

### Two Page Archetypes

Every dashboard list page maps to exactly one of these:

```
Read-Only Archetype                    CRUD Archetype
─────────────────                      ──────────────
PageHeader                             PageHeader + create button
SearchBar (+ optional FilterPanel)     SearchBar (+ optional FilterPanel)
Table with SortableColumn headers      Table with SortableColumn headers
  Row click → detail Drawer              Row click → edit Drawer
Drawer (read-only DetailFields)        Drawer (editable FormFields + CrudDrawerFooter)

State: createListViewState()           State: createEntityModel() → composes createListViewState()
```

### Page-to-Archetype Mapping

| Page | Current | Target | Change Required |
|---|---|---|---|
| Types | Read-Only (no drawer) | Read-Only | Add detail drawer + row click |
| Field Constraints | Read-Only | Read-Only | None (already correct) |
| Field Validators | Hand-rolled | Read-Only | Rewrite to use `createListViewState` + `SortableColumn` |
| Model Validators | Hand-rolled | Read-Only | Rewrite to use `createListViewState` + `SortableColumn` |
| Fields | CRUD | CRUD | None (already correct, will benefit from generic factory) |
| Objects | CRUD | CRUD | None (already correct, will benefit from generic factory) |
| Namespaces | CRUD + modal | CRUD | Convert create modal to drawer |
| APIs (list) | Hybrid | CRUD | Create `createApiModel()`, replace inline drawer state |

### State Layer Architecture

```
Layer 1: createListViewState<Item, FilterState>()
├── Search (query binding, search function)
├── Filter (FilterPanel state, predicate application)
├── Sort (SortableColumn state, multi-column sorting)
├── URL sync (highlight param, filter persistence)
├── Optional read-only drawer (select/close, no edits)
└── Used by: Types, Field Constraints, Field Validators, Model Validators

Layer 2: createEntityModel<Item, FilterState, CreatePayload, UpdatePayload>()
├── Composes createListViewState internally
├── CRUD lifecycle (create draft, edit, save, delete, undo)
├── Validation (form errors, server errors, visible errors, touched state)
├── Dirty tracking (hasChanges, originalItem vs editedItem)
├── Deletion guards (canDelete, deleteTooltip)
├── Save/delete loading state (isSaving, isDeleting)
└── Used by: Fields, Objects, Namespaces, APIs
```

### Generic Entity Model Factory

The existing three factories (`createFieldsModel`, `createObjectsModel`, `createNamespacesModel`) share ~70% identical code. Extract the shared orchestration into `createEntityModel()`.

**Entity-specific contracts passed to the generic factory:**

```typescript
interface EntityContracts<Item, CreatePayload, UpdatePayload> {
  validate: (item: Item) => Record<string, string>;
  createDraft: () => Item;
  toCreatePayload: (item: Item) => CreatePayload;
  toUpdatePayload: (item: Item) => UpdatePayload;
  deletionGuard: (item: Item) => { canDelete: boolean; tooltip: string };
}

interface MutationActions<Item, CreatePayload, UpdatePayload> {
  create: (namespaceId: string, payload: CreatePayload) => Promise<ActionResult<Item>>;
  update: (id: string, payload: UpdatePayload) => Promise<ActionResult<Item>>;
  delete: (id: string) => Promise<ActionResult<void>>;
}
```

**Entity-specific wrappers become thin (~25-30 lines each):**

```typescript
// fieldsModel.svelte.ts (after refactor)
export function createFieldsModel(deps: FieldsModelDeps) {
  return createEntityModel<Field, FieldFilterState, CreateFieldPayload, UpdateFieldPayload>({
    listConfig: { /* itemsStore, searchFn, filterSections, etc. */ },
    contracts: fieldContracts(deps),
    mutations: { create: createFieldAction, update: updateFieldAction, delete: deleteFieldAction },
    entityLabel: 'field'
  });
}
```

**Estimated impact:** ~1,005 lines across 3 factories → ~390 lines across generic factory + 3 thin wrappers + 3 contract modules (~62% reduction).

---

## New Shared Components

### 1. `Pill` — Badge/tag display

```svelte
<!-- Usage: -->
<Pill>{type}</Pill>
<Pill variant="light">{mode}</Pill>

<!-- Replaces ~20 instances of: -->
<span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">{value}</span>
```

**Props:**
- `variant`: `'default'` (bg-mono-200) | `'light'` (bg-mono-100) — optional, defaults to `'default'`
- Children slot for content

**Location:** `src/lib/components/pill/Pill.svelte`

### 2. `FormField` — Editable input with label and error

```svelte
<!-- Usage: -->
<FormField label="Name" required bind:value={name} error={errors.name} />
<FormField label="Description" bind:value={description} />

<!-- Replaces ~40 instances of label + input + error markup -->
```

**Props:**
- `label`: string
- `value`: string (bindable)
- `error`: string | undefined — optional
- `required`: boolean — optional, shows red asterisk
- `disabled`: boolean — optional
- `placeholder`: string — optional
- `type`: `'text'` | `'number'` — optional, defaults to `'text'`
- `id`: string — optional, auto-generated from label if not provided

**Location:** `src/lib/components/form/FormField.svelte`

### 3. `DetailField` — Read-only label + value display

```svelte
<!-- Simple usage: -->
<DetailField label="Name" value={item.name} />

<!-- With custom content (pills, links, etc.): -->
<DetailField label="Compatible Types">
  {#snippet children()}
    {#each item.types as t}
      <Pill>{t}</Pill>
    {/each}
  {/snippet}
</DetailField>
```

**Props:**
- `label`: string
- `value`: string — optional (use children snippet for complex content)
- Children snippet — optional, overrides value

**Location:** `src/lib/components/form/DetailField.svelte`

### 4. `TableEmptyState` — Standardized table empty/error state

```svelte
<!-- Usage: -->
<TableEmptyState entityName="fields" storeKey={STORE_NAMES.FIELDS} />

<!-- With custom no-results message: -->
<TableEmptyState
  entityName="field validators"
  storeKey={STORE_NAMES.FIELDS}
  noResultsMessage="Add validators to fields from the Fields page"
/>

<!-- Replaces ~15 lines of identical conditional markup per page -->
```

**Props:**
- `entityName`: string — used in "Failed to load {entityName}" and "No {entityName} found"
- `storeKey`: string — checks against `$storeLoadingState.storeErrors`
- `noResultsMessage`: string — optional, defaults to "Try adjusting your search query"

**Location:** `src/lib/components/table/TableEmptyState.svelte`

### Barrel Export Updates

All new components added to:
- Their category barrel export (`pill/index.ts`, `form/index.ts`, `table/index.ts`)
- Main barrel export (`src/lib/components/index.ts`)

New directory structure additions:

```
src/lib/components/
├── pill/
│   ├── Pill.svelte
│   └── index.ts
├── form/
│   ├── FormField.svelte
│   ├── DetailField.svelte
│   └── index.ts
└── table/
    ├── TableEmptyState.svelte    (new, alongside existing Table.svelte etc.)
    └── index.ts                  (updated)
```

---

## Page-Specific Changes

### Types Page → Add Detail Drawer

**Current:** Table-only, no row interaction.
**Target:** Row click opens read-only drawer with Name, Python Type, Description, Used In Fields (count + navigable links).

Changes:
- Add `drawerConfig` to `createListViewState` call
- Add row `onclick` handler
- Add `Drawer` + `DrawerHeader` + `DrawerContent` with `DetailField` components
- Add `fieldsStore` import for "Used In Fields" cross-reference

### Validator Pages → Use `createListViewState`

**Current:** Hand-rolled `$state`/`$derived`, manual search, plain `<th>` headers, no sorting, no filters.
**Target:** Use `createListViewState`, `SortableColumn` headers, optional `FilterPanel`.

Changes for both Field Validators and Model Validators:
- Replace `$state('searchQuery')` + manual `.filter()` with `createListViewState` search
- Replace `$state<Row | null>` + manual drawer with `createListViewState` drawer config
- Replace plain `<th>` with `SortableColumn`
- Keep the flattening `$derived.by()` as the `itemsStore` function
- Add `page` and `goto` imports for URL sync

### Namespaces Page → Convert Create Modal to Drawer

**Current:** Create via modal with custom state (`showCreateModal`, `newNamespaceName`, etc.). Edit via drawer.
**Target:** Create and edit both via drawer, managed by `createNamespacesModel()`.

Changes:
- Delete modal markup and modal state variables (`showCreateModal`, `newNamespaceName`, `newNamespaceDescription`, `createErrors`, `isCreating`)
- Delete `createNamespaceAction()` inline handler
- Add `openCreate()` to the model factory (currently missing for Namespaces)
- Wire PageHeader "Create" button to `workflow.openCreate()`

### APIs List Page → Full CRUD Archetype

**Current:** Uses `createListViewState` + inline create drawer state (`createDrawerOpen`, `isSaving`, `formData`, etc.).
**Target:** Uses `createApiModel()` factory, same pattern as Fields/Objects/Namespaces.

Changes:
- Create `src/lib/stores/apiModel.svelte.ts` (thin wrapper over `createEntityModel`)
- Create `src/lib/domain/contracts/apiContract.ts` (validate, createDraft, toPayload, deletionGuard)
- Rewrite `/apis/+page.svelte` to use `createApiModel()` instead of inline state
- Delete inline drawer state variables and validation logic

---

## File Inventory

### Files to Create (~12 files)

| File | Purpose |
|---|---|
| `src/lib/components/pill/Pill.svelte` | Badge/tag component |
| `src/lib/components/pill/index.ts` | Barrel export |
| `src/lib/components/form/FormField.svelte` | Editable form field |
| `src/lib/components/form/DetailField.svelte` | Read-only detail field |
| `src/lib/components/form/index.ts` | Barrel export |
| `src/lib/components/table/TableEmptyState.svelte` | Standardized empty/error state |
| `src/lib/stores/entityModel.svelte.ts` | Generic `createEntityModel` factory |
| `src/lib/stores/apiModel.svelte.ts` | APIs entity model (thin wrapper) |
| `src/lib/domain/contracts/fieldContract.ts` | Field validation, payload, deletion guard |
| `src/lib/domain/contracts/objectContract.ts` | Object validation, payload, deletion guard |
| `src/lib/domain/contracts/namespaceContract.ts` | Namespace validation, payload, deletion guard |
| `src/lib/domain/contracts/apiContract.ts` | API validation, payload, deletion guard |

### Files to Modify (~15 files)

| File | Change |
|---|---|
| `src/lib/components/index.ts` | Add exports for Pill, FormField, DetailField, TableEmptyState |
| `src/lib/components/table/index.ts` | Add TableEmptyState export |
| `src/lib/stores/fieldsModel.svelte.ts` | Thin wrapper over createEntityModel |
| `src/lib/stores/objectsModel.svelte.ts` | Thin wrapper over createEntityModel |
| `src/lib/stores/namespacesModel.svelte.ts` | Thin wrapper over createEntityModel + add openCreate |
| `src/routes/(dashboard)/types/+page.svelte` | Add detail drawer, row click |
| `src/routes/(dashboard)/validators/field-validators/+page.svelte` | Rewrite to use createListViewState + SortableColumn |
| `src/routes/(dashboard)/validators/model-validators/+page.svelte` | Rewrite to use createListViewState + SortableColumn |
| `src/routes/(dashboard)/namespaces/+page.svelte` | Remove create modal, use drawer for creation |
| `src/routes/(dashboard)/apis/+page.svelte` | Rewrite to use createApiModel |
| `src/routes/(dashboard)/fields/+page.svelte` | Replace inline markup with FormField, DetailField, Pill, TableEmptyState |
| `src/routes/(dashboard)/objects/+page.svelte` | Replace inline markup with FormField, DetailField, Pill, TableEmptyState |
| `src/routes/(dashboard)/validators/field-constraints/+page.svelte` | Replace inline markup with DetailField, Pill, TableEmptyState |

### Files to Delete (~3 files)

| File | Reason |
|---|---|
| `src/lib/stores/fieldsModel.svelte.ts` (original) | Replaced by thin wrapper + generic factory |
| `src/lib/stores/objectsModel.svelte.ts` (original) | Replaced by thin wrapper + generic factory |
| `src/lib/stores/namespacesModel.svelte.ts` (original) | Replaced by thin wrapper + generic factory |

Note: These aren't deleted in the filesystem sense — they're rewritten from ~300 lines to ~30 lines each. The bulk of their logic moves to `entityModel.svelte.ts` and contract files.

---

## Execution Order

Phases must execute in order. Within each phase, tasks can be parallelized.

### Phase 1: Shared Components

Create `Pill`, `FormField`, `DetailField`, `TableEmptyState`. Update barrel exports. No page changes yet — just the building blocks.

**Commit:** `feat(components): add Pill, FormField, DetailField, TableEmptyState shared components`

### Phase 2: Generic Entity Model Factory

Extract `createEntityModel()` from the three existing factories. Create contract modules. Rewrite factories as thin wrappers. Verify all existing CRUD pages still work identically.

**Commit:** `refactor(stores): extract generic createEntityModel factory`

### Phase 3: APIs List Page → CRUD Archetype

Create `createApiModel()` and `apiContract.ts`. Rewrite `/apis/+page.svelte` to use the factory.

**Commit:** `refactor(apis): normalize APIs list page to CRUD archetype`

### Phase 4: Namespaces → Drawer-Only Creation

Remove create modal from Namespaces. Add `openCreate` support to the Namespaces model. Wire create button to drawer.

**Commit:** `refactor(namespaces): replace create modal with drawer`

### Phase 5: Read-Only Pages Normalization

- Types: add detail drawer + row click
- Field Validators: rewrite with `createListViewState` + `SortableColumn`
- Model Validators: rewrite with `createListViewState` + `SortableColumn`

**Commit:** `refactor(pages): normalize all read-only pages to shared archetype`

### Phase 6: Replace Inline Markup with Shared Components

Sweep all pages to replace copy-pasted markup with `Pill`, `FormField`, `DetailField`, `TableEmptyState`. This is the high-volume, low-risk phase.

**Commit:** `refactor(pages): replace inline markup with shared components`

### Phase 7: Verification

Run all validation:

```bash
bun run svelte-check --tsconfig ./tsconfig.json
bunx vitest run
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke
pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

Grep for orphaned patterns:

```bash
# No hand-rolled search state on any page
grep -r 'let searchQuery = \$state' src/routes/

# No plain <th> in table headers (all should be SortableColumn or documented exception)
grep -r '<th scope="col"' src/routes/

# No raw pill markup (all should use Pill component)
grep -r 'rounded-full bg-mono-200 text-mono-700' src/routes/

# No raw form field markup (all should use FormField)
grep -r 'block text-sm text-mono-700 mb-1 font-medium' src/routes/

# No raw detail field markup (all should use DetailField)
grep -r 'text-sm text-mono-500 mb-1 font-medium' src/routes/
```

Zero hits expected for all patterns.

**Commit:** `test(patterns): verify pattern normalization complete`

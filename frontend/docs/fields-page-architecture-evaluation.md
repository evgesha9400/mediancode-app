# Fields Page Architecture Evaluation

**Date:** 2026-02-15
**Scope:** `src/routes/(dashboard)/fields/+page.svelte` (~780 lines) and supporting infrastructure
**Purpose:** Evaluate whether the Create/Edit Field form aligns with Svelte 5 / SvelteKit philosophy, identify hacks/anti-patterns, and propose optimal UI design

---

## Files Analyzed

| File | Role |
|---|---|
| `src/routes/(dashboard)/fields/+page.svelte` | Main Fields page: list view, table, drawer form, constraints, validation, CRUD |
| `src/lib/stores/listViewState.svelte.ts` | Shared list view state factory (search, filter, sort, drawer state) |
| `src/lib/stores/fields.ts` | Fields store and types (`Field`, `FieldConstraintValue`) |
| `src/lib/stores/fieldConstraints.ts` | Field constraints store (`FieldConstraint`) |
| `src/lib/stores/actions.ts` | CRUD action functions (`createFieldAction`, `updateFieldAction`, `deleteFieldAction`) |
| `src/lib/components/drawer/` | Drawer compound components (Drawer, DrawerHeader, DrawerContent, DrawerFooter) |
| `src/lib/components/FieldConstraintSelectorDropdown.svelte` | Dropdown for selecting field constraints |
| `src/lib/components/TypeSelectorDropdown.svelte` | Dropdown for selecting types |
| `src/routes/(dashboard)/objects/+page.svelte` | Objects page (cross-compared for duplication) |

---

## What Works Well

### 1. `createListViewState` Factory (Idiomatic Svelte 5)

The factory in `listViewState.svelte.ts` encapsulates search, filter, sort, and drawer state using runes internally and exposes a clean API via getters/setters. The getter/setter proxy pattern (lines 356-398) correctly enables Svelte's reactivity tracking on a plain object.

### 2. Actions Layer (Clean Separation)

`src/lib/stores/actions.ts` wraps API calls with optimistic update + rollback logic, returning `ActionResult<T>` for consistent error handling. The page handles the result without knowing about HTTP or store mutation internals.

### 3. Compound Drawer Components

`Drawer > DrawerHeader + DrawerContent + DrawerFooter` follows the compound component pattern well. The Drawer component handles its own animation and layout concerns.

### 4. `deriveExtra` Pattern

The factory's `deriveExtra` option adds computed sort columns (e.g., `usedInApisCount`, `namespaceName`) to items without polluting the domain type. Pragmatic solution for sorting by computed values.

### 5. Declarative Filter Config

`$derived.by` correctly recomputes the filter config when store data changes (lines 50-74). The filter configuration is cleanly separated from filter execution.

---

## Critical Issues

### CRITICAL-1: `previousFieldType` Manual State Tracking

**Location:** Lines 42, 122-135, 138-140, 143-146, 169, 275-278

**Problem:** A `let previousFieldType = $state<string | null>(null)` variable manually tracks the last-known field type to detect when the type changes and reset constraints. This variable must be synchronized across **5 separate functions**:

1. `handleTypeChange()` — checks against it, then updates it
2. `selectField()` — sets it to the selected field's type
3. `closeDrawer()` — resets it to null
4. `openCreateDrawer()` — sets it to the default type
5. `handleUndo()` — sets it back to originalField's type

If any one of them forgets to update `previousFieldType`, the constraint-clearing logic silently breaks. This is the textbook anti-pattern of "manual effect tracking" -- exactly what Svelte 5's reactive system was designed to eliminate.

**Compounding issue:** The TypeSelectorDropdown's `onSelect` callback performs a **two-step update**:

```typescript
onSelect={(typeName) => {
  if (!editedField) return;
  listState.editedItem = { ...editedField, type: typeName };  // Step 1: set type
  handleTypeChange(typeName);                                   // Step 2: maybe clear constraints
}}
```

Between Step 1 and Step 2, there is a frame where `editedField` has the **new type** but **old (incompatible) constraints**. Any `$derived` computation that depends on both `editedField.type` and `editedField.constraints` (like `availableFieldConstraints`) will see an inconsistent state.

**Fix:** Make `handleTypeChange` the single, atomic mutation point:

```typescript
function handleTypeChange(newType: string) {
  if (!editedField || editedField.type === newType) return;
  listState.editedItem = {
    ...editedField,
    type: newType,
    constraints: [],
    defaultValue: ''
  };
}
```

Then the TypeSelectorDropdown callback becomes simply `onSelect={handleTypeChange}`. Remove `previousFieldType` from all 5 functions. No previous-type tracking needed.

---

### CRITICAL-2: `$derived` Alias Read/Write Asymmetry

**Location:** Lines 101-109

**Problem:** Convenience aliases are all declared with `$derived`:

```typescript
let selectedField = $derived(listState.selectedItem);
let editedField = $derived(listState.editedItem);
let originalField = $derived(listState.originalItem);
let validationErrors = $derived(listState.validationErrors);
let showDeleteConfirm = $derived(listState.showDeleteConfirm);
let filteredFields = $derived(listState.results as FieldWithApiCount[]);
let sorts = $derived(listState.sorts);
let activeFiltersCount = $derived(listState.activeFiltersCount);
let hasChanges = $derived(listState.hasChanges);
```

`$derived` creates **read-only** bindings. But the page frequently **writes** to the same state through `listState.editedItem = ...`. The template reads from the alias (`editedField.name`, `validationErrors.name`) while functions write through the full path (`listState.editedItem = {...}`, `listState.validationErrors = {...}`).

This creates a confusing dual identity:
- `editedField` in templates = the read alias
- `listState.editedItem` in functions = the write target
- They reference the same reactive value but through different access paths

Furthermore, `bind:value={editedField.name}` works for reading but the mutation it performs goes through the alias's proxied getter -- it does NOT trigger `listState`'s setter. This means `bind:value` on `editedField.name` mutates the internal state directly (via rune proxy), bypassing the explicit setter path. While it works due to Svelte 5's proxy system, it creates an invisible dependency on implementation details.

**Impact:** A developer reading the code cannot easily trace where state changes originate. The `hasChanges` derivation (which compares `originalItem` vs `editedItem` via JSON stringify) works because Svelte 5's proxy tracks deep mutations, but this is subtle and undocumented.

**Fix (Option A — recommended for simplicity):** Remove the mutable aliases and use `listState.` directly everywhere. Keep only truly derived (computed, non-mutable) aliases:

```typescript
// Keep these (read-only computations)
let filteredFields = $derived(listState.results as FieldWithApiCount[]);
let hasChanges = $derived(listState.hasChanges);

// Remove these (use listState.editedItem, listState.validationErrors, etc. directly)
```

**Fix (Option B):** In the factory, expose a `form` sub-object with both read and write access, so pages can do `listState.form.name` instead of `listState.editedItem.name`.

---

### CRITICAL-3: `isCreating` Flag Bypasses Factory State Machine

**Location:** Lines 43, 162-170, 242-279, 690-712

**Problem:** `createListViewState` was designed for a "select item from list -> inspect/edit -> close" flow. It provides `selectItem(item)` which sets `selectedItem`, `editedItem`, and `originalItem` together. But creation mode requires `editedItem` WITHOUT a `selectedItem`, which the factory doesn't support.

The page works around this by directly reaching into `listState` to set individual properties:

```typescript
function openCreateDrawer() {
  isCreating = true;
  listState.editedItem = createFieldDraft();     // Set edited item
  listState.selectedItem = null;                  // Explicitly null (no selection)
  listState.originalItem = null;                  // No original
  listState.validationErrors = {};                // Clear errors
  listState.drawerOpen = true;                    // Force drawer open
  previousFieldType = selectableTypes[0]?.name ?? 'str';
}
```

This is **6 lines of manual state orchestration** that replaces what should be a single factory method call. It is fragile -- if the factory adds new internal state (like a `mode` property), this function would not know to set it. This exact pattern is duplicated in the Objects page (lines 109-116 of `objects/+page.svelte`) and the Namespaces page.

**Fix:** Add `mode` and `openCreate()` to the factory:

```typescript
type DrawerMode = 'closed' | 'editing' | 'creating';

// In the factory:
let mode = $state<DrawerMode>('closed');

function openCreate(draft: Item): void {
  mode = 'creating';
  editedItem = draft;
  selectedItem = null;
  originalItem = null;
  validationErrors = {};
  showDeleteConfirm = false;
  drawerOpen = true;
}

// In selectItem:
function selectItem(item: Item): void {
  mode = 'editing';
  // ... existing logic ...
}

// In closeDrawer:
function closeDrawer(): void {
  mode = 'closed';
  drawerOpen = false;
  // ... existing cleanup ...
}
```

This eliminates `isCreating` from all page files and gives the factory awareness of its own state machine.

---

## High-Severity Problems

### HIGH-1: DrawerFooter 90-Line Conditional Block Duplicated Across Pages

**Location:** Lines 689-778 in `fields/+page.svelte`, lines 525-615 in `objects/+page.svelte`

**Problem:** The DrawerFooter contains three visual states:
1. **Creating mode** — create button + cancel button
2. **Editing mode** — save + undo + delete buttons
3. **Delete confirmation mode** — confirm/cancel prompt (nested inside editing mode)

This is ~90 lines of deeply nested conditionals with identical structure across pages.

| Pattern | Fields Lines | Objects Lines | Identical? |
|---|---|---|---|
| Create mode buttons | 690-712 | 526-548 | Yes (except entity name) |
| Edit mode save/undo | 713-736 | 549-572 | Yes |
| Delete with tooltip | 737-748 | 573-584 | Yes |
| Delete confirmation | 749-776 | 585-612 | Yes |

This is approximately **180 lines** of duplicated template code across just two pages, with only the entity name ("Field" vs "Object") differing. Including Namespaces brings it to ~270 lines.

**Fix:** Extract a `CrudDrawerFooter.svelte` component into `src/lib/components/drawer/CrudDrawerFooter.svelte`.

Props:
- `mode: 'creating' | 'editing'`
- `isSaving: boolean`
- `isDeleting: boolean`
- `hasChanges: boolean`
- `isFormValid: boolean`
- `hasReferences: boolean`
- `deleteTooltip: string`
- `showDeleteConfirm: boolean`
- `entityName: string`
- Callbacks: `onSave`, `onCreate`, `onUndo`, `onDelete`, `onCancel`, `onConfirmDelete`, `onCancelDelete`

This reduces ~90 lines per page to ~15 lines of component invocation.

---

### HIGH-2: Imperative Validation with Side-Effect Mutation

**Location:** Lines 176-202

**Problem:** `validateForm()` is an imperative function that:
1. Builds an errors object
2. Mutates `listState.validationErrors` as a side effect
3. Returns a boolean

Issues:
- Validation only runs on submit attempt. The user sees no feedback while typing.
- After fixing an error and re-submitting, the old error string persists until the next `validateForm()` call.
- The constraint validation (checking for empty params) is only checked on submit, not when the user adds a constraint without filling its value.
- The function has two responsibilities: computing errors AND persisting them.

**Fix (Svelte 5 reactive approach):**

```typescript
let formErrors = $derived.by(() => {
  if (!editedField) return {};
  const errors: Record<string, string> = {};
  if (!editedField.name.trim()) errors.name = 'Field name is required';
  if (!editedField.type) errors.type = 'Type is required';
  const emptyParam = editedField.constraints.find(
    c => !c.params || c.params.value === undefined || c.params.value === ''
  );
  if (emptyParam) errors.constraints = `"${emptyParam.name}" requires a value`;
  return errors;
});

let isFormValid = $derived(editedField !== null && Object.keys(formErrors).length === 0);
let formTouched = $state(false);
let visibleErrors = $derived(formTouched ? formErrors : {});
```

Save/create handlers set `formTouched = true` before checking `isFormValid`, giving immediate reactive feedback after first submit attempt.

---

### HIGH-3: `updateConstraintParam` Manual Array Reconstruction

**Location:** Lines 327-349

**Problem:** Every keystroke in a constraint parameter input triggers a full reconstruction of the constraints array, the editedField object, and a setter call to `listState.editedItem`:

```typescript
function updateConstraintParam(index: number, rawValue: string, parameterType: string) {
  // ... parse value based on parameterType ...
  const updatedConstraints = editedField.constraints.map((c, i) => {
    if (i !== index) return c;
    return { ...c, params: parsedValue !== undefined ? { value: parsedValue } : {} };
  });
  listState.editedItem = { ...editedField, constraints: updatedConstraints };
}
```

This is **3 levels of object copying** (constraint -> constraints array -> field object) on every keypress. While not a performance issue at current scale, it is unnecessarily complex. The type-parsing logic (`str` vs `int` vs `float`) is hardcoded rather than being derived from the constraint definition.

Additionally, the `oninput` handler in the template (line 625) passes `constraintMeta.parameterType` as a third argument -- a value that could be derived from the constraint's own data rather than threaded through as a parameter.

**Fix:** Extract constraint editing into a `FieldConstraintEditor.svelte` sub-component that encapsulates the constraint list, add/remove logic, inline parameter editing, and the missing-constraint fallback UI. The Fields page would pass constraints and callbacks:

```svelte
<FieldConstraintEditor
  constraints={editedField.constraints}
  availableConstraints={availableFieldConstraints}
  allConstraintMeta={fieldConstraints}
  onAdd={addFieldConstraint}
  onRemove={removeFieldConstraint}
  onParamChange={updateConstraintParam}
  error={visibleErrors.constraints}
/>
```

---

## Moderate Concerns

### MODERATE-1: `as FieldWithApiCount[]` Type Cast

**Location:** Line 106

The `deriveExtra` option adds `usedInApisCount` and `namespaceName` to items, but the factory's return type is `Item[]`, not `Item & DerivedProps[]`. The page casts with `as FieldWithApiCount[]`, losing type safety. If `deriveExtra` stops providing one of the expected properties, TypeScript will not catch it.

**Fix:** The factory could accept a generic for derived properties: `createListViewState<Item, FilterState, DerivedProps>` and return `(Item & DerivedProps)[]`.

### MODERATE-2: Mixed Store Paradigms

`fieldsStore` uses Svelte 4's `writable()` while `listViewState` uses Svelte 5's `$state` runes. The page bridges these with `$fieldsStore` (auto-subscribe) feeding into the rune-based `namespacedFields`. This is a transitional pattern that works correctly but creates two reactive systems that must stay in sync.

### MODERATE-3: Page File Size (780 Lines)

The single `+page.svelte` contains:
- List view setup (~100 lines)
- Filter/search config (~30 lines)
- Form state and tracking (~10 lines)
- All CRUD handlers (~150 lines)
- Constraint management (~60 lines)
- Validation (~30 lines)
- Table template (~100 lines)
- Drawer form template (~170 lines)
- Drawer footer (~90 lines)

While not egregiously large, it exceeds the point where a developer can hold the full file in context. Phase 2 extractions would reduce it to ~400 lines.

---

## Recommended Implementation Plan

### Phase 1: Fix Critical Data-Flow Issues (Minimal Changes, High Impact)

| Change | Eliminates | Risk |
|---|---|---|
| Atomic `handleTypeChange` (set type + clear constraints in one mutation) | `previousFieldType` variable, temporal inconsistency | Low |
| Add `mode` and `openCreate(draft)` to `listViewState.svelte.ts` factory | `isCreating` flag from all pages | Medium (touches shared factory) |
| Update Fields, Objects, Namespaces pages to use `listState.mode` and `listState.openCreate()` | 6-line manual orchestration blocks | Low |

### Phase 2: Extract Reusable Components (Reduce Duplication)

| Component | Lines Saved (per page) | Pages Affected |
|---|---|---|
| `CrudDrawerFooter.svelte` | ~75 lines | Fields, Objects, Namespaces (3 pages) |
| `FieldConstraintEditor.svelte` | ~50 lines | Fields (1 page) |

### Phase 3: Reactive Validation

| Change | Benefit |
|---|---|
| Replace `validateForm()` with `$derived` error computation | Automatic reactive feedback, no side effects |
| Add `formTouched` flag for display gating | Errors only shown after first submit attempt |
| Apply pattern across Fields, Objects, Namespaces | Consistent validation UX |

### Phase 4: Resolve Alias Asymmetry

| Change | Benefit |
|---|---|
| Remove mutable `$derived` aliases (`editedField`, `validationErrors`, etc.) | Single access path for all state |
| Use `listState.editedItem`, `listState.validationErrors` directly in templates | Eliminates read/write confusion |
| Keep truly computed aliases (`filteredFields`, `hasChanges`) | These are genuinely derived values |

---

## Summary Table

| Issue | Severity | Category | Proposed Fix |
|---|---|---|---|
| `previousFieldType` manual tracking | CRITICAL | Framework anti-pattern | Atomic `handleTypeChange`, remove tracking |
| Two-step type update in onSelect | CRITICAL | Temporal inconsistency | Single callback to `handleTypeChange` |
| `$derived` alias read/write split | CRITICAL | Confusing data flow | Remove mutable aliases, use `listState.` directly |
| `isCreating` outside factory | HIGH | Manual state orchestration | Add `mode` and `openCreate()` to factory |
| DrawerFooter duplication (~90 lines x 3 pages) | HIGH | Code duplication | Extract `CrudDrawerFooter.svelte` |
| Imperative validation | HIGH | Side-effect mutation | `$derived` error computation |
| `updateConstraintParam` complexity | HIGH | Unnecessary reconstruction | Extract `FieldConstraintEditor.svelte` |
| Type cast for derived properties | MODERATE | Lost type safety | Generic `DerivedProps` type parameter |
| Mixed store paradigms (Svelte 4 + 5) | MODERATE | Transitional complexity | Gradual migration (low priority) |
| 780-line page file | MODERATE | Cognitive load | Phase 2 extractions reduce to ~400 lines |

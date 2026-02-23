# Frontend: Parameterized Validators Implementation Plan

## Date: 2026-02-23

## Context

### What Changed on the Backend

The backend has been refactored (already deployed):

- **Field validators** are now 1:many child rows of `fields` (not standalone M2M entities)
- **Model validators** are now 1:many child rows of `objects` (not standalone M2M entities)
- Standalone CRUD endpoints (`/v1/field-validators`, `/v1/model-validators`) are removed
- Validators are created/updated/deleted inline through the parent entity's endpoints (`/v1/fields`, `/v1/objects`)

### What the Frontend Must Do

Two concurrent changes:

1. **Delete** all standalone validator infrastructure (pages, stores, API clients, code editor, CodeMirror)
2. **Build** parameterized template-based validator creation inline on Fields and Objects pages

### Design Decisions Made

| Decision | Choice |
|---|---|
| Validator authoring | Parameterized templates with field-mapping forms — NO code editor |
| Sidebar structure | Flatten "Validators" group → top-level "Field Constraints" item |
| Creation flow | Inline on Field/Object edit pages ("Add Validator" button) |
| Table pages | Keep Field Validators and Model Validators as view + limited edit (no create) |
| Edit scope | Name and description only. Template and field mappings are locked. Delete and recreate to change. |
| Template metadata persistence | Not persisted. Backend stores raw `functionBody`. Template is a creation-time concept only. |
| CodeMirror | Remove entirely (3 npm packages) |
| Field Constraints | Unchanged, stays as-is |

---

## New API Contract (Backend Already Implemented)

### Field Validators (inline on `/v1/fields`)

**Request body** (`POST /v1/fields`, `PUT /v1/fields/{id}`):

```jsonc
{
  "namespaceId": "uuid",
  "name": "email",
  "typeId": "uuid",
  "constraints": [/* unchanged */],
  "validators": [
    {
      "functionName": "validate_email_format",
      "mode": "after",
      "functionBody": "    if not re.match(...):\n        raise ValueError('Invalid')\n    return v",
      "description": "Validates email format"
    }
  ]
}
```

**Response body** (`GET /v1/fields`, `GET /v1/fields/{id}`):

```jsonc
{
  "id": "uuid",
  "namespaceId": "uuid",
  "name": "email",
  "typeId": "uuid",
  "constraints": [/* unchanged */],
  "validators": [
    {
      "id": "uuid",
      "functionName": "validate_email_format",
      "mode": "after",
      "functionBody": "    if not re.match(...):\n        raise ValueError('Invalid')\n    return v",
      "description": "Validates email format"
    }
  ],
  "usedInApis": []
}
```

### Model Validators (inline on `/v1/objects`)

**Request body** (`POST /v1/objects`, `PUT /v1/objects/{id}`):

```jsonc
{
  "namespaceId": "uuid",
  "name": "User",
  "fields": [{ "fieldId": "uuid", "required": true }],
  "validators": [
    {
      "functionName": "validate_date_range",
      "mode": "after",
      "functionBody": "    if self.end_date <= self.start_date:\n        raise ValueError(...)\n    return self",
      "description": "Ensures end_date is after start_date"
    }
  ]
}
```

**Response body** mirrors the request with an added `id` on each validator.

### Update Semantics (both fields and objects)

| `validators` in PUT body | Behavior |
|---|---|
| `[{...}, {...}]` | Full replacement — delete all existing, insert new list |
| `[]` | Clear all validators |
| omitted / not sent | Leave validators unchanged |

### Endpoints Removed (404 now)

```
/v1/field-validators (all methods)
/v1/model-validators (all methods)
```

---

## Phase 1: Delete Standalone Infrastructure

This phase is pure deletion. After completion, the app should build with zero validator pages/stores/API clients.

### Task 1.1: Delete standalone route pages

**Delete these directories entirely:**

- `src/routes/(dashboard)/validators/field-validators/` (3 files: list, new, [id])
- `src/routes/(dashboard)/validators/model-validators/` (3 files: list, new, [id])

**Delete entire prototypes directory** (all prototypes are validator-related):

- `src/routes/(dashboard)/prototypes/` (4 files across field-validators/ and model-validators/)

**Keep:** `src/routes/(dashboard)/validators/field-constraints/` — unchanged.

### Task 1.2: Delete standalone stores

**Delete entirely:**

- `src/lib/stores/fieldValidators.ts`
- `src/lib/stores/modelValidators.ts`

### Task 1.3: Delete standalone API clients

**Delete entirely:**

- `src/lib/api/fieldValidators.ts`
- `src/lib/api/modelValidators.ts`

### Task 1.4: Delete code editor components and utilities

**Delete entire directory:**

- `src/lib/components/validator-editor/` (ValidatorCodeEditor.svelte, ValidatorMultiSelect.svelte, index.ts)

**Delete utility files:**

- `src/lib/utils/codemirror.ts`
- `src/lib/utils/validatorTemplates.ts` (will be replaced with parameterized templates in Phase 3)

### Task 1.5: Remove CodeMirror npm dependencies

**Remove from `package.json`:**

- `codemirror`
- `@codemirror/lang-python`
- `@codemirror/theme-one-dark`

Run `bun install` after removal.

### Task 1.6: Update types

**File:** `src/lib/types/index.ts`

**Delete** the standalone types (lines ~196-222):

```typescript
// DELETE entirely
export interface FieldValidator { ... }
export interface ModelValidator { ... }
```

**Add** inline validator types:

```typescript
export interface InlineFieldValidator {
  id: string;
  functionName: string;
  mode: 'before' | 'after';  // NOTE: Backend only supports before/after for field validators
  functionBody: string;
  description?: string;
}

export interface InlineModelValidator {
  id: string;
  functionName: string;
  mode: 'before' | 'after';
  functionBody: string;
  description?: string;
}
```

**Update** `Field` interface — add `validators: InlineFieldValidator[]`

**Update** `ObjectDefinition` interface — add `validators: InlineModelValidator[]`

### Task 1.7: Update API clients

**File:** `src/lib/api/fields.ts`

- Add `FieldValidatorResponse` interface (matches API response shape)
- Add `validators` to `FieldResponse` interface
- Update `transformField()` to map validators
- Add optional `validators` to `CreateFieldRequest` and `UpdateFieldRequest`

**File:** `src/lib/api/objects.ts`

- Add `ModelValidatorResponse` interface
- Add `validators` to `ObjectResponse` interface
- Update `transformObject()` to map validators
- Add optional `validators` to `CreateObjectRequest` and `UpdateObjectRequest`

### Task 1.8: Update store loader

**File:** `src/lib/stores/loader.ts`

- Remove imports: `listFieldValidators`, `listModelValidators`, `fieldValidatorsStore`, `modelValidatorsStore`
- Remove `FIELD_VALIDATORS` and `MODEL_VALIDATORS` from `STORE_NAMES`
- Remove from `PHASE2_STORE_NAMES`
- Remove validator API calls from `Promise.allSettled`
- Remove validator result handling and store population
- Remove from `resetStores()`

### Task 1.9: Update mutations

**File:** `src/lib/domain/mutations.ts`

- Delete all imports from `$lib/api/fieldValidators`, `$lib/api/modelValidators`
- Delete imports of `fieldValidatorsStore`, `modelValidatorsStore`
- Delete `FieldValidator`, `ModelValidator` from type imports
- Delete all 6 standalone action functions: `createFieldValidatorAction`, `updateFieldValidatorAction`, `deleteFieldValidatorAction`, `createModelValidatorAction`, `updateModelValidatorAction`, `deleteModelValidatorAction`
- Delete re-exports of `CreateFieldValidatorRequest`, `UpdateFieldValidatorRequest`, `CreateModelValidatorRequest`, `UpdateModelValidatorRequest`
- Remove validator lines from namespace deletion guard message builder

### Task 1.10: Update namespace store

**File:** `src/lib/stores/namespaces.ts`

- Remove imports of `fieldValidatorsStore`, `modelValidatorsStore`
- Remove validator filtering and counting from `getNamespaceEntityCount()`
- Remove validator properties from `getNamespaceEntityDetails()` return type and computation
- Remove validators from `total` calculation

### Task 1.11: Update sidebar

**File:** `src/lib/components/Sidebar.svelte`

Replace the `Validators` parent group with a flat `Field Constraints` item:

```typescript
// BEFORE:
{
  href: '/validators',
  label: 'Validators',
  icon: 'fa-check-circle',
  children: [
    { href: '/validators/field-constraints', label: 'Field Constraints', icon: 'fa-shield-halved' },
    { href: '/validators/field-validators', label: 'Field Validators', icon: 'fa-input-text' },
    { href: '/validators/model-validators', label: 'Model Validators', icon: 'fa-diagram-project' }
  ]
}

// AFTER:
{ href: '/validators/field-constraints', label: 'Field Constraints', icon: 'fa-shield-halved' }
```

Remove all prototype nav items for field-validators and model-validators.

### Task 1.12: Update barrel exports

**File:** `src/lib/components/index.ts`

- Remove `export * from './validator-editor'`

**File:** `src/lib/components/index.typecheck.ts` (if it exists)

- Remove `ValidatorMultiSelect`, `ValidatorCodeEditor` and their Props types

### Task 1.13: Delete test files

**Delete entirely:**

- `tests/unit/lib/stores/fieldValidators.test.ts`
- `tests/unit/lib/stores/modelValidators.test.ts`
- `tests/unit/lib/api/fieldValidators.test.ts`
- `tests/unit/lib/api/modelValidators.test.ts`
- `tests/unit/lib/utils/validatorTemplates.test.ts`
- `tests/unit/lib/utils/codemirror.test.ts`
- `tests/unit/lib/components/validator-editor/ValidatorCodeEditor.test.ts`
- `tests/unit/lib/components/validator-editor/ValidatorMultiSelect.test.ts`
- `tests/fixtures/validators.ts`
- `tests/page-objects/ValidatorsPage.ts`

**Edit:**

- `tests/unit/lib/domain/mutations.test.ts` — remove all validator-related mocks, imports, describe blocks
- `tests/unit/lib/stores/loader.test.ts` — remove validator-related mocks, imports, assertions
- `tests/fixtures/validate.ts` — remove `validateFieldValidators()`, `validateModelValidators()` and their calls
- `tests/fixtures/index.ts` — remove `export * from './validators'`

### Task 1.14: Update documentation

**File:** `CLAUDE.md`

- Remove field-validators and model-validators from Project Structure
- Remove their routes from Route Structure
- Update any references to standalone validator pages

**File:** `README.md`

- Remove field-validators and model-validators from route listings

**File:** `docs/endpoint-query-params.md`

- Remove references to `fieldValidators.ts`, `modelValidators.ts`

**File:** `tests/fixtures/SCHEMA.md`

- Remove standalone `FieldValidator` and `ModelValidator` entity schema sections (lines ~131-189)
- Remove validators from relationship diagrams (lines ~25-33)
- Update to reflect that validators are now inline children of Fields and Objects

### Task 1.15: Review Sidebar test

**File:** `tests/unit/lib/components/Sidebar.test.ts`

- Review after sidebar restructuring (Task 1.11). The test references `/validators/field-constraints` which is being kept, but verify no expectations break when the nav group structure changes.

### Task 1.16: Verify Phase 1

Run all validation:

```bash
bun install
bun run svelte-check --tsconfig ./tsconfig.json
bunx vitest run
```

Grep for orphaned references:

```bash
grep -r "fieldValidators" src/ tests/
grep -r "modelValidators" src/ tests/
grep -r "FieldValidator" src/ tests/  # (keep InlineFieldValidator)
grep -r "ModelValidator" src/ tests/  # (keep InlineModelValidator)
grep -r "field-validators" src/       # (should find nothing in src/)
grep -r "model-validators" src/       # (should find nothing in src/)
grep -r "codemirror" src/ tests/
grep -r "ValidatorCodeEditor" src/ tests/
grep -r "ValidatorMultiSelect" src/ tests/
grep -r "validatorTemplates" src/ tests/
```

Zero hits expected (except `InlineFieldValidator`/`InlineModelValidator` types).

---

## Phase 2: Build Parameterized Template System

### Task 2.1: Create template definitions

**New file:** `src/lib/utils/validatorTemplates.ts` (replaces the deleted file with a new structure)

Define parameterized templates for both field and model validators:

```typescript
// Field validator templates — operate on a single value, no field mapping needed
export interface FieldValidatorTemplate {
  id: string;
  name: string;
  description: string;
  compatibleTypes: string[];  // which field types this applies to
  mode: 'before' | 'after';
  parameters?: TemplateParameter[];  // optional form inputs (e.g., regex pattern)
  generateFunctionName: (fieldName: string) => string;
  generateFunctionBody: (params?: Record<string, string>) => string;
}

export interface TemplateParameter {
  key: string;
  label: string;
  type: 'text' | 'number';
  placeholder: string;
  required: boolean;
}

// Model validator templates — operate on multiple fields, need role-to-field mapping
export interface ModelValidatorTemplate {
  id: string;
  name: string;
  description: string;
  mode: 'before' | 'after';
  roles: TemplateRole[];  // fields the user must map
  generateFunctionName: () => string;
  generateFunctionBody: (mappings: Record<string, string>) => string;
}

export interface TemplateRole {
  key: string;
  label: string;  // shown in the dropdown label, e.g., "Start date field"
  compatibleTypes: string[];  // filter: only show fields of these types
  required: boolean;
}
```

**Field validator templates to include:**

| ID | Name | Compatible Types | Parameters | Mode |
|---|---|---|---|---|
| `strip_lowercase` | Strip & Lowercase | string | none | before |
| `email_format` | Email Format | string | none | after |
| `url_format` | URL Format | string | none | after |
| `slug_format` | Slug Format | string | none | after |
| `regex_match` | Regex Match | string | `pattern: text` | after |
| `string_length` | String Length Check | string | `min?: number`, `max?: number` | after |
| `number_range` | Number Range | int, float | `min?: number`, `max?: number` | after |
| `must_be_positive` | Must Be Positive | int, float | none | after |
| `future_date` | Future Date Only | date, datetime | none | after |
| `not_empty` | Not Empty / Whitespace | string | none | after |

**Model validator templates to include:**

| ID | Name | Roles | Mode |
|---|---|---|---|
| `password_confirm` | Password Confirmation | password_field (string), confirm_field (string) | after |
| `date_range` | Date Range | start_field (date/datetime), end_field (date/datetime) | after |
| `mutual_exclusivity` | Mutual Exclusivity | field_a (any), field_b (any) | after |
| `conditional_required` | Conditional Required | trigger_field (any), required_field (any) + trigger_value (text input) | after |
| `numeric_comparison` | Numeric Comparison | lesser_field (int/float), greater_field (int/float) | after |
| `at_least_one` | At Least One Required | field_a (any), field_b (any) | before |

Each template's `generateFunctionBody()` produces valid Python code with the mapped field names substituted in.

### Task 2.2: Build template gallery component

**New file:** `src/lib/components/validator-templates/TemplateGallery.svelte`

A modal or panel showing available templates filtered by context:

- For field validators: filter by the parent field's type
- For model validators: show all templates, roles will be filled from the object's fields
- Each template card shows: name, description, mode badge
- Clicking a template opens the parameter/mapping form (Task 2.3)

### Task 2.3: Build parameter/mapping form component

**New file:** `src/lib/components/validator-templates/TemplateForm.svelte`

After selecting a template, show a form:

**For field validators with parameters:**
- Template name and description (read-only)
- Parameter inputs (e.g., regex pattern text field, min/max number fields)
- Optional: custom name and description overrides
- "Add" button → calls template's `generateFunctionBody()` and `generateFunctionName()`, adds to parent's validators list

**For model validators with role mappings:**
- Template name and description (read-only)
- One dropdown per role, filtered by compatible types, populated with the object's fields
- Optional: custom name and description overrides
- "Add" button → calls template's `generateFunctionBody(mappings)` and `generateFunctionName()`, adds to parent's validators list

### Task 2.4: Build barrel export for template components

**New file:** `src/lib/components/validator-templates/index.ts`

Export `TemplateGallery` and `TemplateForm`.

Update `src/lib/components/index.ts` to include `export * from './validator-templates'`.

---

## Phase 3: Inline Validator UI on Entity Pages

### Task 3.1: Add validators section to Field edit/create

The field create/edit forms (likely drawer-based) need a "Validators" section:

- List of current validators: name, mode badge, description (one-liner)
- "Add Validator" button → opens TemplateGallery filtered by this field's type
- Remove button (x) on each validator row
- Validators stored as local component state
- On save: included in the create/update request as `validators: [...]`

Follow the existing constraints UI pattern on the field form for consistency.

### Task 3.2: Add validators section to Object edit/create

Same pattern as Task 3.1 but for objects:

- List of current model validators: name, mode badge, description
- "Add Validator" button → opens TemplateGallery for model validators
- TemplateForm role dropdowns populated with the object's attached fields
- On save: included in the create/update request as `validators: [...]`

### Task 3.3: Update field/object mutations if needed

The existing `createFieldAction`, `updateFieldAction`, `createObjectAction`, `updateObjectAction` in `mutations.ts` should already pass through the `validators` field since it's part of the request body. Verify this works end-to-end. If the mutations serialize the request body, ensure `validators` is included.

---

## Phase 4: Validator Table Pages (View + Edit)

### Task 4.1: Build Field Validators table page

**New file:** `src/routes/(dashboard)/validators/field-validators/+page.svelte`

A read-only table showing all field validators across the active namespace:

- **Data source:** Derived from the fields store — iterate all fields, flatten their `validators` arrays, include parent field name
- **Columns:** Validator Name (`functionName`), Parent Field, Mode, Description
- **Filters:** Mode (before/after), search by name
- **Row click:** Opens an edit drawer/modal
- **No create button** — creation is inline on the Field page

### Task 4.2: Build Model Validators table page

**New file:** `src/routes/(dashboard)/validators/model-validators/+page.svelte`

Same pattern as Task 4.1 but for model validators:

- **Data source:** Derived from the objects store — iterate all objects, flatten their `validators` arrays
- **Columns:** Validator Name (`functionName`), Parent Object, Mode, Description
- **Row click:** Opens an edit drawer/modal
- **No create button**

### Task 4.3: Build validator edit drawer

A shared drawer component for editing a validator from the table pages:

- **Editable fields:** `description` only (name displayed but not editable since it's `functionName`)
- **Read-only display:** Template-generated code (`functionBody`) shown as a read-only code block (plain `<pre>` with syntax highlighting via CSS, NOT CodeMirror)
- **Delete button:** Removes the validator from its parent entity (triggers a field/object update with the validator removed from the list)
- **Save:** Triggers a PUT to the parent entity (`/v1/fields/{id}` or `/v1/objects/{id}`) with updated validators list

### Task 4.4: Update sidebar with validator table page links

Add Field Validators and Model Validators back to the sidebar as view-only pages.

Final sidebar structure for validators section:

```typescript
// Option A: Flat items (simpler)
{ href: '/validators/field-constraints', label: 'Field Constraints', icon: 'fa-shield-halved' },
{ href: '/validators/field-validators', label: 'Field Validators', icon: 'fa-input-text' },
{ href: '/validators/model-validators', label: 'Model Validators', icon: 'fa-diagram-project' },

// Option B: Keep group if it looks better in the UI
{
  href: '/validators',
  label: 'Validators',
  icon: 'fa-check-circle',
  children: [
    { href: '/validators/field-constraints', label: 'Field Constraints', icon: 'fa-shield-halved' },
    { href: '/validators/field-validators', label: 'Field Validators', icon: 'fa-input-text' },
    { href: '/validators/model-validators', label: 'Model Validators', icon: 'fa-diagram-project' }
  ]
}
```

Use judgment based on how the UI looks. The key change is that these pages are view+edit only, not create.

---

## Phase 5: Tests and Cleanup

### Task 5.1: Write unit tests for template system

- Test each template's `generateFunctionBody()` produces valid Python
- Test `generateFunctionName()` produces valid Python identifiers
- Test field type filtering for template compatibility
- Test role mapping substitution for model validator templates

### Task 5.2: Update E2E tests

- Update field CRUD tests to include inline validators
- Update object CRUD tests to include inline model validators
- Add smoke tests for validator table pages
- Verify old validator endpoints return 404

### Task 5.3: Final orphan grep

Search entire codebase for any remaining references to deleted code. Zero hits expected.

### Task 5.4: Full validation

```bash
bun run svelte-check --tsconfig ./tsconfig.json
bunx vitest run
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke
pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

All four must pass before this work is considered complete.

---

## File Inventory Summary

### Files to Delete (~28 files)

| Category | Files |
|---|---|
| Route pages | 10 (6 active + 4 prototype) |
| Stores | 2 |
| API clients | 2 |
| Components | 3 (validator-editor/) |
| Utils | 2 (codemirror.ts, validatorTemplates.ts) |
| Test files | 10 |

### Files to Modify (~16 files)

| File | Change |
|---|---|
| `src/lib/types/index.ts` | Delete standalone types, add inline types, extend Field + ObjectDefinition |
| `src/lib/api/fields.ts` | Add validators to response/request types and transform |
| `src/lib/api/objects.ts` | Add validators to response/request types and transform |
| `src/lib/stores/loader.ts` | Remove validator API calls, stores, constants |
| `src/lib/stores/namespaces.ts` | Remove validator store imports and counting |
| `src/lib/domain/mutations.ts` | Remove standalone validator actions and imports |
| `src/lib/components/Sidebar.svelte` | Restructure nav items |
| `src/lib/components/index.ts` | Update exports |
| `src/lib/components/index.typecheck.ts` | Remove validator component types |
| `tests/unit/lib/domain/mutations.test.ts` | Remove validator test blocks |
| `tests/unit/lib/stores/loader.test.ts` | Remove validator test blocks |
| `tests/fixtures/validate.ts` | Remove validator functions |
| `tests/fixtures/index.ts` | Remove validators export |
| `tests/fixtures/SCHEMA.md` | Remove standalone validator schemas, update relationship diagrams |
| `CLAUDE.md` | Remove validator routes from structure |
| `README.md` | Remove validator routes from listings |
| `package.json` | Remove 3 CodeMirror dependencies |

### Files to Create (~6 files)

| File | Purpose |
|---|---|
| `src/lib/utils/validatorTemplates.ts` | Parameterized template definitions (new structure) |
| `src/lib/components/validator-templates/TemplateGallery.svelte` | Template picker gallery |
| `src/lib/components/validator-templates/TemplateForm.svelte` | Parameter/mapping form |
| `src/lib/components/validator-templates/index.ts` | Barrel export |
| `src/routes/(dashboard)/validators/field-validators/+page.svelte` | View-only table page (rebuilt) |
| `src/routes/(dashboard)/validators/model-validators/+page.svelte` | View-only table page (rebuilt) |

---

## Execution Order

Phases should be executed in order. Within each phase, tasks can be parallelized where they don't depend on each other.

**Commit strategy:** One commit per phase on the same branch.

1. **Phase 1** (Tasks 1.1–1.16): Delete everything, update types/API clients, verify build → `refactor(validators): delete standalone validator infrastructure`
2. **Phase 2** (Tasks 2.1–2.4): Build template system and components → `feat(validators): build parameterized template system`
3. **Phase 3** (Tasks 3.1–3.3): Wire templates into Field and Object pages → `feat(validators): wire inline validators into entity pages`
4. **Phase 4** (Tasks 4.1–4.4): Build validator table pages → `feat(validators): build validator table pages`
5. **Phase 5** (Tasks 5.1–5.4): Tests and final validation → `feat(validators): add E2E tests and final validation`

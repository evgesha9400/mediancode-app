# Frontend Migration Plan: Align with Backend Schema Changes

This document describes the complete migration plan for the Median Code frontend to align with backend schema changes. The migration is split into three sequential phases, each building on the previous.

**Key backend changes driving this migration:**
1. "Validators" are renamed to "Constraints" (the entity concept, API endpoints, and all references)
2. Types lose `category` and `compatibleTypes` (already removed in commit `8d34a75`); types and constraints become "reference data" (read-only, no namespace scoping)
3. Fields gain `constraints` (renamed from `validators`) and become a full CRUD entity with constraint integration
4. Objects remain a CRUD entity with field references (minor naming updates only)

---

## Table of Contents

- [Phase 1: Types + Constraints (Reference Data)](#phase-1-types--constraints-reference-data)
- [Phase 2: Fields (CRUD with Constraints)](#phase-2-fields-crud-with-constraints)
- [Phase 3: Objects (CRUD with Field References)](#phase-3-objects-crud-with-field-references)
- [Cross-Cutting Concerns](#cross-cutting-concerns)
- [File Impact Summary](#file-impact-summary)

---

## Phase 1: Types + Constraints (Reference Data)

### Overview

Phase 1 renames the "validators" entity to "constraints" throughout the entire codebase, merges the separate `/types` and `/validators` (now `/constraints`) pages into a single "Reference Data" page, and removes namespace scoping from both entities (they are global/read-only).

### 1.1 Rename: Validators to Constraints

Every occurrence of "validator" in code identifiers, API paths, UI labels, file names, and comments must change to "constraint". This is the single largest rename in the migration.

#### 1.1.1 Type/Interface Definitions

**File: `src/lib/stores/initialData.ts`**
- Rename `ValidatorBase` interface to `ConstraintBase`
- Rename fields inside `ConstraintBase`:
  - `type: 'string' | 'numeric'` stays (constraint type is still string/numeric)
  - `category: 'inline' | 'custom'` stays (constraint category is still inline/custom)
  - `exampleUsage: string` stays
- Rename exported constants:
  - `BUILTIN_VALIDATOR_IDS` -> `BUILTIN_CONSTRAINT_IDS`
  - `initialInlineValidators` -> `initialInlineConstraints`
  - `initialCustomValidators` -> `initialCustomConstraints`
- Rename functions:
  - `cloneValidatorBases()` -> `cloneConstraintBases()`
- Rename `FieldValidator` interface to `FieldConstraint`
  - Inside `Field` interface: `validators: FieldValidator[]` -> `constraints: FieldConstraint[]`
- Update all seed field data: `validators: [...]` -> `constraints: [...]`

**File: `src/lib/stores/validators.ts` -> RENAME to `src/lib/stores/constraints.ts`**
- Rename entire file
- Rename `Validator` interface to `Constraint` (extends `ConstraintBase`)
  - `usedInFields: number` stays
  - `fieldsUsingValidator` -> `fieldsUsingConstraint`
- Rename store: `validatorsStore` -> `constraintsStore`
- Rename all exported functions:
  - `getTotalValidatorCount()` -> `getTotalConstraintCount()`
  - `getValidatorsByNamespace()` -> `getConstraintsByNamespace()`
  - `getValidatorCountByNamespace()` -> `getConstraintCountByNamespace()`
  - `searchValidators()` -> `searchConstraints()`
  - `getValidatorsByFieldType()` -> `getConstraintsByFieldType()`
  - `getValidatorsByFieldTypeAndNamespace()` -> `getConstraintsByFieldTypeAndNamespace()`
  - `deleteValidator()` -> `deleteConstraint()`
  - `createValidator()` -> `createConstraint()`
  - `addValidator()` -> `addConstraint()`
- Update internal references (the `category === 'inline'` check in deleteConstraint, etc.)

**File: `src/lib/types/index.ts`**
- In `Reference` interface: update `type: 'field' | 'api' | 'validator'` -> `type: 'field' | 'api' | 'constraint'`

**File: `src/lib/stores/types.ts`**
- Rename `VALIDATOR_COMPATIBILITY` -> `CONSTRAINT_COMPATIBILITY`
- Rename `getValidatorCategoriesForType()` -> `getConstraintCategoriesForType()`
- All comments referencing "validator" -> "constraint"

#### 1.1.2 API Client Layer

**File: `src/lib/api/validators.ts` -> RENAME to `src/lib/api/constraints.ts`**
- Rename file
- Rename `ValidatorResponse` interface to `ConstraintResponse`
- Rename `FieldReferenceResponse` fields: `fieldsUsingValidator` -> `fieldsUsingConstraint`
- Rename `transformValidator()` -> `transformConstraint()`
- Rename `listValidators()` -> `listConstraints()`
- Change API endpoint: `/validators` -> `/constraints`
- Update import of `Validator` to `Constraint` from store

**File: `src/lib/api/index.ts`**
- Change `export * from './validators'` -> `export * from './constraints'`

**File: `src/lib/api/fields.ts`**
- Rename `FieldValidatorResponse` -> `FieldConstraintResponse`
- Rename `transformFieldValidator()` -> `transformFieldConstraint()`
- In `FieldResponse`: `validators` -> `constraints`
- In `transformField()`: `validators: response.validators.map(...)` -> `constraints: response.constraints.map(...)`
- In `CreateFieldRequest`: `validators` -> `constraints`
- In `UpdateFieldRequest`: `validators` -> `constraints`

#### 1.1.3 Store Layer

**File: `src/lib/stores/loader.ts`**
- Change import: `listValidators` -> `listConstraints` (from `$lib/api/constraints`)
- Change import: `validatorsStore` -> `constraintsStore` (from `./constraints`)
- In `loadStoresFromApi()`: rename `validators` variable in destructuring and `.set()` call
- In `resetStores()`: `validatorsStore.set([])` -> `constraintsStore.set([])`

**File: `src/lib/stores/fields.ts`**
- Update re-export: `export type { Field, FieldValidator }` -> `export type { Field, FieldConstraint }`
- The `searchFields()` function references `field.validators.some(v => ...)` -> `field.constraints.some(c => ...)`

**File: `src/lib/stores/namespaces.ts`**
- Change import: `validatorsStore` -> `constraintsStore` (from `./constraints`)
- In `getNamespaceEntityCount()`: `validators` -> `constraints`
- In `getNamespaceEntityDetails()`: rename return field `validators` -> `constraints`
- In `deleteNamespace()`: update error message string `validator` -> `constraint`

**File: `src/lib/stores/actions.ts`**
- No direct validator actions exist yet (validators are read-only), but update any re-exports
- In `CreateFieldRequest` and `UpdateFieldRequest` re-exports: field already references these from `$lib/api/fields` which will be updated

**File: `src/lib/stores/apiGeneratorState.svelte.ts`**
- Change import: `validatorsStore` -> `constraintsStore` (from `./constraints`)
- In `generatePayload()` or wherever validators store is read: update variable name

**File: `src/lib/stores/apiDetailState.svelte.ts`**
- Change import: `validatorsStore` -> `constraintsStore` (from `./constraints`)
- Update any references to the validators store

#### 1.1.4 Utility Layer

**File: `src/lib/utils/references.ts`**
- Rename `checkValidatorDeletion()` -> `checkConstraintDeletion()`
- Update all internal string literals: `"validator"` -> `"constraint"`, `"Validator"` -> `"Constraint"`
- Update parameter names: `validatorName` -> `constraintName`, `fieldsUsingValidator` -> `fieldsUsingConstraint`
- In `buildDeletionTooltip()`: the function is generic, no rename needed for the function itself, but callers will pass different strings

#### 1.1.5 Component Layer

**File: `src/lib/components/api-generator/ValidatorSelectorDropdown.svelte` -> RENAME to `ConstraintSelectorDropdown.svelte`**
- Rename file
- Rename `ValidatorSelectorDropdownProps` -> `ConstraintSelectorDropdownProps`
- Change import: `type Validator` -> `type Constraint` (from `$lib/stores/constraints`)
- Rename props:
  - `availableValidators` -> `availableConstraints`
  - `selectedValidatorNames` -> `selectedConstraintNames`
- Rename internal variables: `filteredValidators` -> `filteredConstraints`
- Update all UI text: "validator" -> "constraint", "No validators found" -> "No constraints found"

**File: `src/lib/components/api-generator/index.ts`**
- Rename export: `ValidatorSelectorDropdown` -> `ConstraintSelectorDropdown`
- Rename type export: `ValidatorSelectorDropdownProps` -> `ConstraintSelectorDropdownProps`

**File: `src/lib/components/index.ts`**
- No direct change needed (re-exports from `./api-generator` which handles it)

**File: `src/lib/components/Sidebar.svelte`**
- Change nav item: `{ href: '/validators', label: 'Validators', icon: 'fa-check-circle' }`
  -> This will change based on the merged page design (see section 1.2)

#### 1.1.6 Route Pages

**File: `src/routes/(dashboard)/validators/+page.svelte` -> This entire route is DELETED**
- The standalone validators page is removed and replaced by the combined Reference Data page (see section 1.2)

**File: `src/routes/(dashboard)/field-registry/+page.svelte`**
- All imports referencing validators -> constraints:
  - `validatorsStore` -> `constraintsStore`
  - `getValidatorsByFieldType` -> `getConstraintsByFieldType`
  - `getValidatorsByFieldTypeAndNamespace` -> `getConstraintsByFieldTypeAndNamespace`
  - `type Validator` -> `type Constraint`
  - `type FieldValidator` -> `type FieldConstraint`
  - `ValidatorSelectorDropdown` -> `ConstraintSelectorDropdown`
- Rename all template variables:
  - `validators` -> `constraints`
  - `availableValidators` -> `availableConstraints`
  - `selectedValidatorNames` -> `selectedConstraintNames`
  - `addValidator()` -> `addConstraint()`
  - `removeValidator()` -> `removeConstraint()`
  - `formatValidatorPill()` -> `formatConstraintPill()`
- Update all UI labels: "Validators" -> "Constraints", "validator" -> "constraint"
- Update filter config: `onlyHasValidators` -> `onlyHasConstraints`
- Update `editedField.validators` -> `editedField.constraints` throughout template

**File: `src/routes/(dashboard)/dashboard/+page.svelte`**
- Change import: `getTotalValidatorCount` -> `getTotalConstraintCount` (from `$lib/stores/constraints`)
- Rename variable: `totalValidators` -> `totalConstraints`
- Update StatCard: `title="Validators"` -> `title="Constraints"`

**File: `src/routes/(dashboard)/namespaces/+page.svelte`**
- Rename derived property: `validatorCount` -> `constraintCount`
- Update label in drawer details: "Validators" -> "Constraints"

### 1.2 Merge Types + Constraints into "Reference Data" Page

Currently, Types and Constraints (formerly Validators) are on separate routes (`/types` and `/validators`). They are both read-only reference data with no namespace scoping. They should be merged into a single page.

#### 1.2.1 Route Changes

**DELETE: `src/routes/(dashboard)/types/+page.svelte`** (entire route directory)
**DELETE: `src/routes/(dashboard)/validators/+page.svelte`** (entire route directory)
**CREATE: `src/routes/(dashboard)/reference-data/+page.svelte`** (new combined page)

The new Reference Data page will have:
- A tabbed interface (or a toggle/segmented control) to switch between "Types" and "Constraints" views
- Each tab shows its own table with search, filter, sort, and (for constraints) a detail drawer
- Types tab: same columns as current types page (Type Name, Python Type, Description, Used In Fields)
- Constraints tab: same columns as current validators page minus "Namespace" column (Name, Type, Category, Description, Used In Fields)
- No namespace selector on this page (reference data is global)
- No create/edit/delete for types (read-only table)
- Constraints: read-only detail drawer, delete only for custom constraints (same behavior as current validators page)

#### 1.2.2 Sidebar Navigation Changes

**File: `src/lib/components/Sidebar.svelte`**

Current `coreComponentItems`:
```typescript
const coreComponentItems: NavItem[] = [
  { href: '/types', label: 'Types', icon: 'fa-shapes' },
  { href: '/validators', label: 'Validators', icon: 'fa-check-circle' },
  { href: '/field-registry', label: 'Fields', icon: 'fa-table-list' },
  { href: '/object-builder', label: 'Objects', icon: 'fa-cubes' },
  { href: '/apis', label: 'APIs', icon: 'fa-code' }
];
```

New `coreComponentItems`:
```typescript
const coreComponentItems: NavItem[] = [
  { href: '/reference-data', label: 'Reference Data', icon: 'fa-book' },
  { href: '/field-registry', label: 'Fields', icon: 'fa-table-list' },
  { href: '/object-builder', label: 'Objects', icon: 'fa-cubes' },
  { href: '/apis', label: 'APIs', icon: 'fa-code' }
];
```

Two nav items collapse into one. Icon choice TBD (`fa-book`, `fa-database`, or `fa-layer-group`).

#### 1.2.3 Dashboard Stat Card Changes

**File: `src/routes/(dashboard)/dashboard/+page.svelte`**

Currently shows separate "Types" and "Constraints" stat cards. Options:
- **Option A**: Keep both stat cards but relabel "Validators" -> "Constraints"
- **Option B**: Merge into a single "Reference Data" stat card showing combined count

Recommended: **Option A** -- keep separate stat cards for Types and Constraints. They are distinct entity counts. Just rename "Validators" to "Constraints".

### 1.3 Remove Namespace Scoping from Types and Constraints

Types and constraints are global reference data. They should not be filtered by namespace.

#### 1.3.1 Store Changes

**File: `src/lib/stores/constraints.ts` (formerly validators.ts)**
- Remove `getConstraintsByNamespace()` function (or keep but deprecate)
- Remove `getConstraintCountByNamespace()` function
- `getConstraintsByFieldTypeAndNamespace()` -> simplify to `getConstraintsByFieldType()` (remove namespace filter)
  - Or keep both but the page will not pass namespaceId

**File: `src/lib/stores/types.ts`**
- Types have no namespace concept currently (they are hardcoded). No change needed.

#### 1.3.2 Page Changes

**File: `src/routes/(dashboard)/reference-data/+page.svelte`** (the new merged page)
- No `NamespaceSelector` component
- No namespace filtering on the data
- Display all constraints regardless of namespace

#### 1.3.3 Namespace Entity Counting

**File: `src/lib/stores/namespaces.ts`**
- Remove constraints from `getNamespaceEntityCount()` and `getNamespaceEntityDetails()`
- These functions should no longer count constraints as namespace-scoped entities
- Update the return type of `getNamespaceEntityDetails()` to remove the `constraints` field

**File: `src/routes/(dashboard)/namespaces/+page.svelte`**
- Remove the constraints count display from namespace detail drawer
- Remove `constraintCount` from the derived namespace data

### 1.4 API Endpoint Changes

**File: `src/lib/api/constraints.ts` (formerly validators.ts)**
- Endpoint path changes: `/validators` -> `/constraints`
- Response shape may change (confirm with backend):
  - `ValidatorResponse.category` field: confirm if still present or renamed
  - `ValidatorResponse.fieldsUsingValidator` -> `fieldsUsingConstraint`

**File: `src/lib/api/types.ts`**
- No endpoint change (still `/types`)
- `TypeResponse` may lose fields (confirm with backend): `category`, `compatibleTypes` are already removed per commit `8d34a75`

### 1.5 Test Changes for Phase 1

#### Test Fixtures

**File: `tests/fixtures/validators.ts` -> RENAME to `tests/fixtures/constraints.ts`**
- Rename `ValidatorBase` -> `ConstraintBase`
- Rename `Validator` -> `Constraint`
- Rename all exports: `mockValidators` -> `mockConstraints`, `mockInlineValidators` -> `mockInlineConstraints`, etc.
- Rename functions: `getValidatorByName` -> `getConstraintByName`, `getValidatorsByType` -> `getConstraintsByType`, `getValidatorsByCategory` -> `getConstraintsByCategory`
- Update `fieldsUsingValidator` -> `fieldsUsingConstraint` in mock data

**File: `tests/fixtures/index.ts`**
- Update all imports and re-exports from `./constraints` instead of `./validators`
- Rename all exported names accordingly

**File: `tests/fixtures/types.ts`**
- No rename needed. May need to remove `category`/`compatibleTypes` if they were present (they are not currently).

**File: `tests/fixtures/fields.ts`**
- Update mock field data: `validators` -> `constraints` in the `Field` interface references
- Re-export `FieldConstraint` instead of `FieldValidator`

**File: `tests/fixtures/validate.ts`**
- Rename all `mockValidators` -> `mockConstraints`
- Rename `validatorCompatibility` -> `constraintCompatibility`
- Update all validation logic to use constraint naming

#### Page Objects

**File: `tests/page-objects/ValidatorsPage.ts` -> RENAME to `tests/page-objects/ConstraintsPage.ts`**
- Rename class: `ValidatorsPage` -> `ConstraintsPage`
- Update `goto()`: `/validators` -> `/reference-data` (with constraints tab active)
- Update all selectors referencing "Validators" text -> "Constraints"
- Rename all properties: `validatorNameDisplay` -> `constraintNameDisplay`, etc.

**File: `tests/page-objects/TypesPage.ts`**
- Update `goto()`: `/types` -> `/reference-data` (with types tab active)
- May need to adjust selectors for the tabbed interface

**File: `tests/page-objects/DashboardPage.ts`**
- Rename `validatorsCard` -> `constraintsCard`
- Rename `validatorsNavLink` -> `referenceDataNavLink`
- Update `STAT_CARD_TITLES.validators` -> `STAT_CARD_TITLES.constraints`
- Update `navigateTo()` map: remove `'validators'` and `'types'`, add `'reference-data'`
- Update `href` selectors: `/validators` -> `/reference-data`, `/types` -> `/reference-data`

**File: `tests/page-objects/index.ts`**
- Remove `ValidatorsPage` export, add `ConstraintsPage`
- Keep `TypesPage` (may still be needed for the types tab)

#### Test Files

**File: `tests/shared/msw/handlers.ts`**
- Rename all `mockValidators` imports -> `mockConstraints`
- Rename `getValidatorByName` -> `getConstraintByName`
- Update endpoint paths: `/api/validators` -> `/api/constraints`
- Rename handler comments

**File: `tests/integration/routes/dashboard/page.test.ts`**
- Change import: `validatorsStore, getTotalValidatorCount` -> `constraintsStore, getTotalConstraintCount`
- Rename: `initialInlineValidators` -> `initialInlineConstraints`, `initialCustomValidators` -> `initialCustomConstraints`
- Rename helper: `createValidatorWithUsage()` -> `createConstraintWithUsage()`
- Update all test descriptions: "validator" -> "constraint"
- Update property assertions: `'category'`, `'validators'` -> `'constraints'`
- Update expected values: validator count test

**File: `tests/unit/lib/stores/fields.test.ts`**
- Update any references to `validators` property on fields -> `constraints`

**File: `tests/unit/lib/stores/namespaces.test.ts`**
- Update `validatorsStore` import -> `constraintsStore`
- Update entity count assertions

**File: `tests/smoke/dashboard.spec.ts`**
- Update: `dashboardPage.validatorsCard` -> `dashboardPage.constraintsCard`
- Update: `dashboardPage.validatorsNavLink` -> `dashboardPage.referenceDataNavLink`

**File: `tests/helpers/api-client.ts`**
- In `ApiField` interface: `validators?: string[]` -> `constraints?: string[]`

---

## Phase 2: Fields (CRUD with Constraints)

### Overview

Phase 2 updates the Fields entity to use "constraints" (renamed from "validators") and ensures the full CRUD lifecycle works with the renamed constraint integration. The route stays at `/field-registry` but internal naming is fully updated.

### 2.1 Field Interface Updates

These changes were partially initiated in Phase 1 (renaming `validators` to `constraints` on the `Field` type). Phase 2 ensures the full CRUD flow works end-to-end.

#### 2.1.1 Type Definitions (completed in Phase 1, verified here)

**File: `src/lib/stores/initialData.ts`**
- `Field.validators` -> `Field.constraints` (done in Phase 1)
- `FieldValidator` -> `FieldConstraint` (done in Phase 1)

**File: `src/lib/stores/fields.ts`**
- Re-export: `export type { Field, FieldConstraint }` (done in Phase 1)
- `searchFields()`: update `field.validators.some(...)` -> `field.constraints.some(...)` (done in Phase 1)
- `createField()`: update `validators: options.validators ?? []` -> `constraints: options.constraints ?? []`

#### 2.1.2 API Client (completed in Phase 1, verified here)

**File: `src/lib/api/fields.ts`**
- `FieldValidatorResponse` -> `FieldConstraintResponse` (done in Phase 1)
- `FieldResponse.validators` -> `FieldResponse.constraints` (done in Phase 1)
- `CreateFieldRequest.validators` -> `CreateFieldRequest.constraints` (done in Phase 1)
- `UpdateFieldRequest.validators` -> `UpdateFieldRequest.constraints` (done in Phase 1)

#### 2.1.3 Actions Layer

**File: `src/lib/stores/actions.ts`**
- `CreateFieldRequest` and `UpdateFieldRequest` type re-exports will automatically pick up the constraint rename from `$lib/api/fields`
- No additional changes needed beyond what Phase 1 already handles

### 2.2 Field Registry Page Updates

**File: `src/routes/(dashboard)/field-registry/+page.svelte`**

All the import and variable renames were done in Phase 1. Phase 2 focuses on verifying the full CRUD flow:

**Create flow:**
- `createFieldDraft()` returns `{ ...constraints: [] }` instead of `{ ...validators: [] }`
- `handleCreate()` sends `constraints: editedField.constraints` instead of `validators: editedField.validators`

**Edit flow:**
- `handleSave()` sends `constraints: editedField.constraints` instead of `validators: editedField.validators`
- `handleTypeChange()` resets `constraints: []` instead of `validators: []`

**Drawer template:**
- Section header: "Constraints (N)" instead of "Validators (N)"
- `ConstraintSelectorDropdown` component with renamed props
- Constraint pills display using `formatConstraintPill()` instead of `formatValidatorPill()`
- "No constraints selected" instead of "No validators selected"
- Remove constraint button label: "Remove constraint" instead of "Remove validator"
- Missing constraint fallback: "Constraint not found" instead of "Validator not found"

**Filter config:**
- `onlyHasConstraints` filter key (renamed in Phase 1)
- Toggle label: "Has constraints only" instead of "Has validators only"

**Table columns:**
- Column header: "Constraints" instead of "Validators"
- The constraint pill rendering in the table body uses `field.constraints` instead of `field.validators`

### 2.3 Constraint Selector Dropdown Component

**File: `src/lib/components/api-generator/ConstraintSelectorDropdown.svelte` (renamed in Phase 1)**

Verify all internal logic works:
- Filtering constraints by search query
- Excluding already-selected constraints
- Displaying constraint name, type, and description in dropdown
- Empty state messages reference "constraints"

### 2.4 Test Changes for Phase 2

**File: `tests/page-objects/FieldRegistryPage.ts`**
- Rename properties:
  - `validatorSelectorInput` -> `constraintSelectorInput`
  - `validatorDropdownOptions` -> `constraintDropdownOptions`
  - `validatorRows` -> `constraintRows`
- Update selectors referencing "validator" text -> "constraint"
- Update `goto()` URL: stays at `/field-registry` (no route change)

**File: `tests/e2e/crud/fields.spec.ts`**
- Update any test assertions referencing "validators" -> "constraints"
- Update any test data creation using `validators` field -> `constraints` field

**File: `tests/unit/lib/stores/fields.test.ts`**
- Update all `validators` property references -> `constraints`
- Update `FieldValidator` type references -> `FieldConstraint`

**File: `tests/integration/routes/dashboard/page.test.ts`**
- Field structure assertions: `expect(field).toHaveProperty('validators')` -> `expect(field).toHaveProperty('constraints')`

---

## Phase 3: Objects (CRUD with Field References)

### Overview

Phase 3 covers the Objects entity. The Objects page and store are already well-structured with full CRUD support. The main changes in Phase 3 are minimal since the object entity itself is not being renamed. The key integration point is that objects reference fields (which now have `constraints` instead of `validators`), so any code that reads through from objects to field details needs to use the updated field interface.

### 3.1 Object Interface -- No Changes Required

**File: `src/lib/types/index.ts`**
- `ObjectDefinition` interface: no changes needed
- `ObjectFieldReference` interface: no changes needed

**File: `src/lib/stores/objects.ts`**
- No interface changes needed
- No function rename needed

**File: `src/lib/api/objects.ts`**
- No changes needed (endpoints stay at `/objects`, response shape unchanged)

### 3.2 Object Builder Page -- Minor Updates

**File: `src/routes/(dashboard)/object-builder/+page.svelte`**

The object builder page references `fieldsStore` and `getFieldById()` to display field details in the drawer. Since the `Field` interface now has `constraints` instead of `validators`, any place in the object builder that displays field details must use the updated property name.

**Specific changes:**
- In the drawer field list, if field type/description is shown, no change needed (these properties are unchanged)
- If the field's constraints are displayed anywhere in the object builder (currently they are NOT -- the object builder only shows field name, type, description, and required toggle), no change needed
- The `FieldSelectorDropdown` component displays field name, type, and description -- no constraint references

**Conclusion: No code changes needed in the object builder page for Phase 3.** The object builder does not display field constraints directly. It only references `fieldId` and `required`.

### 3.3 Object Builder -- Verify CRUD Flow

Verify the following still works with the updated field interface:
1. **Create object**: Select fields from the namespace-scoped field dropdown. Fields now have `constraints` instead of `validators` but the dropdown only uses `field.name`, `field.type`, `field.description`.
2. **Edit object**: Same field dropdown behavior.
3. **Delete object**: Reference checking uses `usedInApis` which is unchanged.

### 3.4 API Generator Integration

Objects are referenced by the API generator for request/response body selection. These references use `objectId` and do not traverse into field constraints.

**Files that reference objects and fields together:**

**File: `src/lib/components/api-generator/ResponseBodyEditor.svelte`**
- References `objectsStore`, `getObjectById()`, `getFieldById()`
- Displays field names and types from objects
- Does NOT display field constraints -- no changes needed

**File: `src/lib/components/api-generator/RequestBodyEditor.svelte`**
- Same pattern as ResponseBodyEditor -- no changes needed

**File: `src/lib/components/api-generator/QueryParametersEditor.svelte`**
- Same pattern -- no changes needed

**File: `src/lib/utils/examples.ts`**
- Generates example JSON from objects and fields
- References `getFieldById()` and uses `field.type` -- does NOT use `field.validators`/`field.constraints`
- No changes needed

### 3.5 Test Changes for Phase 3

**File: `tests/page-objects/ObjectBuilderPage.ts`**
- No changes needed (object builder does not reference validators/constraints directly)

**File: `tests/unit/lib/stores/objects.test.ts`**
- No changes needed (object store tests do not reference validators/constraints)

**File: `tests/fixtures/index.ts`**
- Already updated in Phase 1 to export `FieldConstraint` instead of `FieldValidator`

---

## Cross-Cutting Concerns

### CC.1 CLAUDE.md Updates

**File: `CLAUDE.md`**
- Update project structure section:
  - Remove `/types/` and `/validators/` route entries
  - Add `/reference-data/` route entry
- Update route list:
  - Remove `/types` and `/validators`
  - Add `/reference-data` (Reference Data: types and constraints)
- Update "Dashboard Routes" section
- Update all mentions of "validators" -> "constraints" in the document
- Update store file references: `validators.ts` -> `constraints.ts`
- Update component references: `ValidatorSelectorDropdown` -> `ConstraintSelectorDropdown`
- Update the Directory Structure Reference to reflect file renames

### CC.2 API Spec

**File: `api-spec.yaml`** (if maintained in this repo)
- Update endpoint paths: `/validators` -> `/constraints`
- Update schema names: `ValidatorResponse` -> `ConstraintResponse`
- Update field names in schemas

### CC.3 Prototypes Page

**File: `src/routes/(dashboard)/prototypes/response-body/+page.svelte`**
- References `fieldsStore` and `objectsStore` but does NOT reference validators/constraints
- No changes needed

### CC.4 Fixtures Schema Documentation

**File: `tests/fixtures/SCHEMA.md`**
- Update entity names: validators -> constraints
- Update field property names

---

## File Impact Summary

### Files to RENAME

| Current Path | New Path |
|---|---|
| `src/lib/stores/validators.ts` | `src/lib/stores/constraints.ts` |
| `src/lib/api/validators.ts` | `src/lib/api/constraints.ts` |
| `src/lib/components/api-generator/ValidatorSelectorDropdown.svelte` | `src/lib/components/api-generator/ConstraintSelectorDropdown.svelte` |
| `tests/fixtures/validators.ts` | `tests/fixtures/constraints.ts` |
| `tests/page-objects/ValidatorsPage.ts` | `tests/page-objects/ConstraintsPage.ts` |

### Files to DELETE

| Path | Reason |
|---|---|
| `src/routes/(dashboard)/validators/+page.svelte` | Replaced by `/reference-data` combined page |
| `src/routes/(dashboard)/types/+page.svelte` | Replaced by `/reference-data` combined page |

### Files to CREATE

| Path | Description |
|---|---|
| `src/routes/(dashboard)/reference-data/+page.svelte` | New combined Types + Constraints page with tab interface |

### Files to MODIFY (by phase)

#### Phase 1 Modifications (30+ files)

**Source files:**
1. `src/lib/types/index.ts` -- Reference type rename
2. `src/lib/stores/initialData.ts` -- All validator->constraint renames, Field.validators->constraints
3. `src/lib/stores/constraints.ts` (after rename) -- All internal renames
4. `src/lib/stores/types.ts` -- VALIDATOR_COMPATIBILITY -> CONSTRAINT_COMPATIBILITY
5. `src/lib/stores/fields.ts` -- Re-export rename, searchFields update
6. `src/lib/stores/loader.ts` -- Import/usage renames
7. `src/lib/stores/namespaces.ts` -- Import/count renames, remove constraint from entity counts
8. `src/lib/stores/apiGeneratorState.svelte.ts` -- Import rename
9. `src/lib/stores/apiDetailState.svelte.ts` -- Import rename
10. `src/lib/api/constraints.ts` (after rename) -- All internal renames, endpoint path
11. `src/lib/api/fields.ts` -- FieldValidatorResponse, CreateFieldRequest, UpdateFieldRequest renames
12. `src/lib/api/index.ts` -- Export path
13. `src/lib/utils/references.ts` -- Function rename, string literals
14. `src/lib/components/api-generator/ConstraintSelectorDropdown.svelte` (after rename) -- All internal renames
15. `src/lib/components/api-generator/index.ts` -- Export rename
16. `src/lib/components/Sidebar.svelte` -- Nav items restructure
17. `src/routes/(dashboard)/field-registry/+page.svelte` -- All validator->constraint renames
18. `src/routes/(dashboard)/dashboard/+page.svelte` -- Import/label renames
19. `src/routes/(dashboard)/namespaces/+page.svelte` -- Count/label renames

**Test files:**
20. `tests/fixtures/constraints.ts` (after rename) -- All renames
21. `tests/fixtures/index.ts` -- Import/export renames
22. `tests/fixtures/fields.ts` -- Type re-exports
23. `tests/fixtures/validate.ts` -- All validator->constraint renames
24. `tests/page-objects/ConstraintsPage.ts` (after rename) -- Class/selector renames
25. `tests/page-objects/TypesPage.ts` -- goto() URL update
26. `tests/page-objects/DashboardPage.ts` -- Property/selector renames
27. `tests/page-objects/index.ts` -- Export renames
28. `tests/shared/msw/handlers.ts` -- Import/endpoint renames
29. `tests/integration/routes/dashboard/page.test.ts` -- All renames
30. `tests/unit/lib/stores/fields.test.ts` -- Property renames
31. `tests/unit/lib/stores/namespaces.test.ts` -- Import/assertion renames
32. `tests/smoke/dashboard.spec.ts` -- Selector renames
33. `tests/helpers/api-client.ts` -- ApiField.validators -> constraints

**Documentation:**
34. `CLAUDE.md` -- Route/file/naming updates

#### Phase 2 Modifications (5 files, mostly verification)

1. `src/routes/(dashboard)/field-registry/+page.svelte` -- Verify CRUD flow with constraints
2. `src/lib/stores/fields.ts` -- Verify createField uses constraints
3. `tests/page-objects/FieldRegistryPage.ts` -- Selector renames
4. `tests/e2e/crud/fields.spec.ts` -- Assertion updates
5. `tests/unit/lib/stores/fields.test.ts` -- Property assertion updates

#### Phase 3 Modifications (0-2 files, verification only)

1. Verify `src/routes/(dashboard)/object-builder/+page.svelte` -- no code changes expected
2. Verify `src/lib/components/api-generator/ResponseBodyEditor.svelte` -- no code changes expected

---

## Execution Order

### Phase 1 (estimated: large)
1. Rename files (stores, API, component, test fixtures, page objects)
2. Update all type/interface definitions
3. Update store implementations
4. Update API client layer
5. Update utility functions
6. Update component internals
7. Create new `/reference-data` route page
8. Delete old `/types` and `/validators` route pages
9. Update Sidebar navigation
10. Update Dashboard stat cards
11. Remove namespace scoping from constraints
12. Update all test files
13. Update CLAUDE.md
14. Run `bun run svelte-check --tsconfig ./tsconfig.json`
15. Run `bun run test` (unit/integration)
16. Run `bunx playwright test` (E2E)

### Phase 2 (estimated: small)
1. Verify field CRUD with constraints (create, edit, delete flows)
2. Update remaining test assertions
3. Run full test suite

### Phase 3 (estimated: minimal)
1. Verify object CRUD with updated field interface
2. Verify API generator integration
3. Run full test suite

---

## Open Questions for Backend Confirmation

1. **Constraint API response shape**: Does the `/constraints` endpoint return the same fields as `/validators` (just renamed)?  Specifically:
   - Is `category: 'inline' | 'custom'` still present?
   - Is `fieldsUsingConstraint` (renamed from `fieldsUsingValidator`) still present?
   - Is `exampleUsage` still present?
   - Is `parameterType` still present?

2. **Field API request shape**: Does `CreateFieldRequest` now use `constraints` instead of `validators` as the field name?

3. **Types API**: Are there any additional changes to the `/types` endpoint response beyond the already-removed `category` and `compatibleTypes`?

4. **Namespace scoping**: Confirm that constraints are NOT namespace-scoped (no `namespaceId` filter on the `/constraints` endpoint).

5. **Constraint CRUD**: Are constraints still read-only from the frontend perspective? Or will the backend support full CRUD for constraints in the future?

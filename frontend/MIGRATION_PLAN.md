# Frontend Migration Plan: Align with Backend Schema Changes

This document describes the migration plan for the Median Code frontend to align with backend schema changes. The migration is split into three sequential phases, each building on the previous.

**Key backend changes driving this migration:**
1. "Validators" are renamed to "Field Constraints" (the entity concept, API endpoints, and all references)
2. Types lose `category` and `compatibleTypes` (already removed in commit `8d34a75`); types and field constraints become "reference data" (read-only, no namespace scoping)
3. Fields gain `constraints` (renamed from `validators`) and become a full CRUD entity with constraint integration
4. Objects remain a CRUD entity with field references (minor naming updates only)

**Naming convention (deviation from original plan):**
The original plan specified `Constraint` / `constraintsStore`. The actual implementation uses `FieldConstraint` / `fieldConstraintsStore` throughout. This is intentional -- it distinguishes field-level constraints from future model-level constraints and aligns with the backend API endpoint `/field-constraints`. The generic `'constraint'` string is only used in the `Reference` type union (`'field' | 'api' | 'constraint'`).

---

## Table of Contents

- [Phase 1: Types + Field Constraints (Reference Data)](#phase-1-types--field-constraints-reference-data) -- **COMPLETED**
- [Phase 2: Fields (CRUD with Constraints)](#phase-2-fields-crud-with-constraints) -- **COMPLETED**
- [Phase 3: Objects (CRUD with Field References)](#phase-3-objects-crud-with-field-references) -- **COMPLETED**
- [Cross-Cutting Concerns](#cross-cutting-concerns) -- **PARTIALLY COMPLETE**
- [Follow-Up: Remove initialData Hardcoded Lookups](#follow-up-remove-initialdata-hardcoded-lookups) -- **NOT STARTED**

---

## Phase 1: Types + Field Constraints (Reference Data) -- COMPLETED

### Overview

Phase 1 renamed the "validators" entity to "field constraints" throughout the entire codebase, organized the `/validators` section with nested sidebar navigation (Field Constraints, Field Validators, Model Validators), and updated all references.

### 1.1 Rename: Validators to Field Constraints -- COMPLETED

All occurrences of "validator" in code identifiers, API paths, UI labels, file names, and comments have been changed to "fieldConstraint" / "field constraint".

#### Files Renamed

| Original Path | New Path |
|---|---|
| `src/lib/stores/validators.ts` | `src/lib/stores/fieldConstraints.ts` |
| `src/lib/api/validators.ts` | `src/lib/api/fieldConstraints.ts` |
| `src/lib/components/api-generator/ValidatorSelectorDropdown.svelte` | `src/lib/components/api-generator/FieldConstraintSelectorDropdown.svelte` |
| `tests/fixtures/validators.ts` | `tests/fixtures/constraints.ts` |
| `tests/page-objects/ValidatorsPage.ts` | `tests/page-objects/ConstraintsPage.ts` (class: `FieldConstraintsPage`) |
| `src/routes/(dashboard)/validators/constraints/+page.svelte` | `src/routes/(dashboard)/validators/field-constraints/+page.svelte` |

#### Files Deleted

| Path | Reason |
|---|---|
| `src/routes/(dashboard)/validators/+page.svelte` | Removed redirect hack |
| `src/routes/(dashboard)/validators/+layout.svelte` | Removed tab layout (navigation moved to Sidebar) |

#### Key Naming Mappings (all completed)

| Original | New |
|---|---|
| `ValidatorBase` | `FieldConstraintBase` |
| `Validator` | `FieldConstraint` |
| `FieldValidator` (value type) | `FieldConstraintValue` |
| `validatorsStore` | `fieldConstraintsStore` |
| `BUILTIN_VALIDATOR_IDS` | `BUILTIN_FIELD_CONSTRAINT_IDS` |
| `VALIDATOR_COMPATIBILITY` | `FIELD_CONSTRAINT_COMPATIBILITY` |
| `ValidatorSelectorDropdown` | `FieldConstraintSelectorDropdown` |
| `listValidators()` | `listFieldConstraints()` |
| `getTotalValidatorCount()` | `getTotalFieldConstraintCount()` |
| `getValidatorsByFieldType()` | `getFieldConstraintsByFieldType()` |
| `checkValidatorDeletion()` | `checkFieldConstraintDeletion()` |
| API endpoint `/validators` | `/field-constraints` |
| Reference type `'validator'` | `'constraint'` |

#### All Modified Source Files (completed)

1. `src/lib/types/index.ts` -- Reference type: `'constraint'`
2. `src/lib/stores/initialData.ts` -- All validator->fieldConstraint renames
3. `src/lib/stores/fieldConstraints.ts` -- All internal renames
4. `src/lib/stores/types.ts` -- `FIELD_CONSTRAINT_COMPATIBILITY`, `getFieldConstraintCategoriesForType()`
5. `src/lib/stores/fields.ts` -- Re-exports `Field`, `FieldConstraintValue`; `searchFields()` uses `field.constraints`
6. `src/lib/stores/loader.ts` -- Imports `listFieldConstraints`, `fieldConstraintsStore`
7. `src/lib/stores/namespaces.ts` -- `fieldConstraintsStore`, entity details return `fieldConstraints`
8. `src/lib/stores/apiGeneratorState.svelte.ts` -- Imports `fieldConstraintsStore`
9. `src/lib/stores/apiDetailState.svelte.ts` -- Imports `fieldConstraintsStore`
10. `src/lib/api/fieldConstraints.ts` -- `FieldConstraintResponse`, endpoint `/field-constraints`
11. `src/lib/api/fields.ts` -- `FieldConstraintValueResponse`, `field.constraints`
12. `src/lib/api/index.ts` -- Exports from `./fieldConstraints`
13. `src/lib/utils/references.ts` -- `checkFieldConstraintDeletion()`
14. `src/lib/components/api-generator/FieldConstraintSelectorDropdown.svelte` -- All internal renames
15. `src/lib/components/api-generator/index.ts` -- Exports `FieldConstraintSelectorDropdown`
16. `src/lib/components/Sidebar.svelte` -- Nested navigation with "Field Constraints" child item

#### All Modified Route Pages (completed)

17. `src/routes/(dashboard)/validators/field-constraints/+page.svelte` -- Field Constraints page
18. `src/routes/(dashboard)/field-registry/+page.svelte` -- All fieldConstraint references
19. `src/routes/(dashboard)/dashboard/+page.svelte` -- Stat card: "Field Constraints"
20. `src/routes/(dashboard)/namespaces/+page.svelte` -- `fieldConstraintCount`, "Field Constraints" label

#### All Modified Test Files (completed)

21. `tests/fixtures/constraints.ts` -- `FieldConstraint`, `mockFieldConstraints`, `getFieldConstraintByName()`
22. `tests/fixtures/index.ts` -- Updated imports/exports
23. `tests/fixtures/fields.ts` -- Re-exports `FieldConstraintValue`
24. `tests/fixtures/validate.ts` -- Uses `mockFieldConstraints`
25. `tests/page-objects/ConstraintsPage.ts` -- Class `FieldConstraintsPage`, navigates to `/validators/field-constraints`
26. `tests/page-objects/DashboardPage.ts` -- `fieldConstraintsCard`, `fieldConstraintsNavLink`
27. `tests/page-objects/FieldRegistryPage.ts` -- `constraintSelectorInput`, `constraintDropdownOptions`
28. `tests/page-objects/index.ts` -- Exports `FieldConstraintsPage`, `ConstraintsPage`
29. `tests/shared/msw/handlers.ts` -- `mockFieldConstraints`, endpoint `/field-constraints`
30. `tests/integration/routes/dashboard/page.test.ts` -- All fieldConstraint references
31. `tests/unit/lib/stores/namespaces.test.ts` -- `fieldConstraintsStore`
32. `tests/smoke/dashboard.spec.ts` -- Updated selectors

### 1.2 Sidebar Navigation -- COMPLETED

The Sidebar uses nested `NavItem` children:

```typescript
const coreComponentItems: NavItem[] = [
  { href: '/types', label: 'Types', icon: 'fa-shapes' },
  {
    href: '/validators',
    label: 'Validators',
    icon: 'fa-check-circle',
    children: [
      { href: '/validators/field-constraints', label: 'Field Constraints', icon: 'fa-shield-halved' },
      { href: '/validators/field-validators', label: 'Field Validators', icon: 'fa-input-text', disabled: true },
      { href: '/validators/model-validators', label: 'Model Validators', icon: 'fa-diagram-project', disabled: true }
    ]
  },
  { href: '/field-registry', label: 'Fields', icon: 'fa-table-list' },
  { href: '/object-builder', label: 'Objects', icon: 'fa-cubes' },
  { href: '/apis', label: 'APIs', icon: 'fa-code' }
];
```

### 1.3 Route Structure -- COMPLETED

```
src/routes/(dashboard)/
├── types/+page.svelte                              # Types page (standalone)
└── validators/
    ├── field-constraints/+page.svelte               # Field Constraints page
    ├── field-validators/+page.svelte                # Field Validators (under construction)
    └── model-validators/+page.svelte                # Model Validators (under construction)
```

---

## Phase 2: Fields (CRUD with Constraints) -- COMPLETED

All field CRUD flows use `constraints` property (renamed from `validators`). The `FieldConstraintSelectorDropdown` component works correctly with the renamed props. Field Registry page fully updated with:
- `field.constraints` property throughout
- `FieldConstraintSelectorDropdown` component
- Filter key `onlyHasConstraints`
- UI labels: "Field Constraints" in table columns, drawer sections, and pills

---

## Phase 3: Objects (CRUD with Field References) -- COMPLETED

No code changes were needed. The object builder does not reference field constraints directly -- it only uses `fieldId` and `required`. API generator components reference fields by name/type/description without traversing into constraints.

---

## Cross-Cutting Concerns

### CC.1 CLAUDE.md Updates -- NOT DONE

**File: `CLAUDE.md`**
- [ ] Update project structure section: show nested routes under `validators/` (`field-constraints/`, `field-validators/`, `model-validators/`)
- [ ] Update "Dashboard Routes" section to list nested validator routes
- [ ] Update store file references: `validators.ts` -> `fieldConstraints.ts`
- [ ] Update component references: `ValidatorSelectorDropdown` -> `FieldConstraintSelectorDropdown`
- [ ] Update the Directory Structure Reference to show `fieldConstraints.ts` instead of `validators.ts`

### CC.2 Test Fixtures Schema Documentation -- NOT DONE

**File: `tests/fixtures/SCHEMA.md`**
- [ ] Update all "validator" references to "field constraint" (~30 occurrences)
- [ ] Update type/interface names: `ValidatorBase` -> `FieldConstraintBase`, `Validator` -> `FieldConstraint`
- [ ] Update property names: `fieldsUsingValidator` -> `fieldsUsingFieldConstraint`
- [ ] Update `FieldValidator` -> `FieldConstraintValue`
- [ ] Update `Field.validators` -> `Field.constraints`
- [ ] Update seed data descriptions
- [ ] Update fixture import examples at bottom

### CC.3 API Spec -- DEFERRED

**File: `api-spec.yaml`** (if maintained in this repo)
- Endpoint and schema updates will be done when the backend API spec is finalized

### CC.4 Prototypes Page -- NO CHANGES NEEDED

`src/routes/(dashboard)/prototypes/response-body/+page.svelte` does not reference validators/constraints.

---

## Follow-Up: Remove initialData Hardcoded Lookups -- NOT STARTED

A separate implementation plan exists at `docs/remove-initialData-hardcoded-lookups.md`. This is a follow-up task that eliminates `src/lib/stores/initialData.ts` as a production dependency by:

1. Making types load before fields (sequential loading in `loader.ts`)
2. Removing hardcoded type definitions from `types.ts`
3. Resolving `typeId` from the types store instead of `BUILTIN_TYPE_IDS` map
4. Moving `GLOBAL_NAMESPACE_ID` to `src/lib/constants.ts`
5. Moving `Field`, `FieldConstraintValue`, `FieldConstraintBase` type definitions to `src/lib/types/index.ts`
6. Moving seed data and clone helpers to `tests/fixtures/seedData.ts`
7. Deleting `src/lib/stores/initialData.ts`

This is independent of the validator-to-constraint rename and can be done at any time.

---

## Validation -- NOT YET RUN

Before committing the migration changes, run:

1. `bun run svelte-check --tsconfig ./tsconfig.json` -- must pass with 0 errors
2. `bun run test` -- all unit/integration tests must pass
3. `pkill -f "vite" 2>/dev/null && bunx playwright test --project=smoke` -- smoke tests pass

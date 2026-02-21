# Field Validators — Implementation Audit

_Audited: 2026-02-21. Based on [field-validators-implementation-plan.md](field-validators-implementation-plan.md)._

---

## What IS Implemented

**Phase 1B: Frontend Types, Store, API Client, Mutations**
- `src/lib/types/index.ts` — `FieldValidator` interface exists (flat shape; no `FieldValidatorBase` / `FieldValidatorReference` split as the plan specified)
- `src/lib/stores/fieldValidators.ts` — Full store with `fieldValidatorsStore`, `searchFieldValidators`, `getFieldValidatorsByNamespace`, `getFieldValidatorById`
- `src/lib/api/fieldValidators.ts` — All 5 CRUD functions (`listFieldValidators`, `getFieldValidator`, `createFieldValidatorApi`, `updateFieldValidatorApi`, `deleteFieldValidatorApi`)
- `src/lib/stores/loader.ts` — `listFieldValidators` integrated (in phase 2 loading, not phase 1 as the plan specified)
- `src/lib/domain/mutations.ts` — All 3 mutation actions (`createFieldValidatorAction`, `updateFieldValidatorAction`, `deleteFieldValidatorAction`)
- `src/lib/components/Sidebar.svelte` — "Field Validators" nav item present with `fa-input-text` icon

**Phase 1C: List Page** — `src/routes/(dashboard)/validators/field-validators/+page.svelte` is a real implementation with search, filter, sort, and a table. However, the plan called for a Drawer with an inline edit form; the actual implementation uses separate routes for create (`/new`) and edit (`/[id]`).

**Phase 2A (partial): Template Gallery** — The `/new` route includes a template gallery and a CodeMirror-based editor, covering the creation flow. The edit `[id]` route also has CodeMirror.

**Tests (partial):**
- `tests/fixtures/validators.ts` — Mock field validators fixture exists
- `tests/unit/lib/api/fieldValidators.test.ts` — Unit tests for API client
- `tests/unit/lib/stores/fieldValidators.test.ts` — Unit tests for store
- `tests/page-objects/ValidatorsPage.ts` — Page object exists

---

## What is MISSING or INCOMPLETE

### Phase 1B gaps

| Gap | Detail |
|-----|--------|
| `Field` interface missing `validators` | `src/lib/types/index.ts` — `Field` has no `validators: FieldValidatorReference[]` field |
| No `FieldValidatorBase` / `FieldValidatorReference` types | Plan called for a two-type split mirroring constraints; only the flat `FieldValidator` type exists |
| No `src/lib/api/index.ts` barrel export | Field validators not re-exported from a central API barrel |
| `checkFieldValidatorDeletion` not in `references.ts` | Deletion guard is inlined in `mutations.ts` instead of `src/lib/utils/references.ts` |

### Phase 1C gaps

| Gap | Detail |
|-----|--------|
| No `fieldValidatorsModel.svelte.ts` | All other entities (fields, objects, namespaces) have a `.svelte.ts` model file; field validators do not |
| List page uses separate routes, not a Drawer | Plan specifies a Drawer with inline create/edit (matching the field-constraints pattern); actual implementation uses `/new` and `/[id]` sub-pages |

### Phase 1D — Not Started

| Gap | Detail |
|-----|--------|
| `Field` type missing `validators` array | Prerequisite for attachment |
| `src/routes/(dashboard)/fields/+page.svelte` has no validator section | Fields drawer has no validator attachment UI |
| No `FieldValidatorEditor.svelte` component | Attachment component (mirroring `FieldConstraintEditor.svelte`) doesn't exist |
| Fields API client not updated | `src/lib/api/fields.ts` doesn't include `validators` in request/response types |

### Phase 2B — Not Started

| Gap | Detail |
|-----|--------|
| No `src/lib/utils/pythonHighlight.ts` | Syntax highlighting is duplicated across prototypes; shared utility never extracted |

### Phase 3 (AI Builder) — Not Started

No `AiBuilder.svelte`, no `/generate` endpoint, no `generateFieldValidator` API function.

### Phase 4 (Testing/Debugging Tools) — Not Started

| Gap | Detail |
|-----|--------|
| No `src/lib/components/field-validator/TestTable.svelte` | |
| No `src/lib/components/field-validator/ReplEditor.svelte` | |
| No `src/lib/utils/validatorExecutor.ts` | |
| Prototype `repl/` and `test-driven/` routes still exist | Stale prototypes should be promoted into real components or deleted |
| Prototype `gallery/` directory is empty | Directory exists with no `+page.svelte` |

### Phase 5 (Code Generation) — Not Started (backend)

Backend code generator needs to be updated to emit `@field_validator` decorators.

### API Spec — Not Documented

`api-spec.yaml` has no `/v1/field-validators` endpoints and no `FieldValidator*` schemas.

### E2E CRUD Tests — Missing

Every other entity (fields, objects, APIs, namespaces) has an E2E CRUD spec under `tests/e2e/crud/`. Field validators have no such test.

---

## Summary Table

| Phase | Item | Status |
|-------|------|--------|
| 1A | Backend DB, API, seeded system validators | Unknown (backend repo not audited) |
| 1B | Types, store, API client, loader, mutations | **Mostly done** — `Field.validators` and `FieldValidatorReference` missing |
| 1C | List page + model file | **Partial** — list page exists but uses different UX pattern; no `.svelte.ts` model |
| 1D | Field-validator attachment in Fields page | **Not started** |
| 2A | Template gallery creation flow | **Partial** — exists in `/new` route, not extracted into reusable components |
| 2B | `pythonHighlight.ts` shared utility | **Not started** |
| 3A/3B | AI builder (backend + frontend) | **Not started** |
| 4A/4B | Test table + REPL editor components | **Not started** (prototypes still exist as raw routes) |
| 5A | Code generation integration (backend) | **Not started** |
| — | API spec (`api-spec.yaml`) | **Not documented** |
| — | E2E CRUD tests | **Missing** |

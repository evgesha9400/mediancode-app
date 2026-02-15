# Frontend-Backend Inconsistency Report

Generated: 2026-02-15
Updated: 2026-02-15

## CRITICAL Issues (will break API calls)

### 1. Field `constraints` request format — Wrong schema
**Backend**: Create/update expects `constraints: [{constraintId: string, value: string|null}]`
**Frontend**: Sends `constraints: [{name: string, constraintId: string, params?: Record<string, unknown>}]`

**Files to fix:**
- `src/lib/api/fields.ts:114,125` — Change `CreateFieldRequest`/`UpdateFieldRequest` constraints to `{constraintId: string, value: string|null}[]`

### 2. Field `constraints` response format — Wrong field name
**Backend**: Returns `constraints: [{constraintId, name, value: string|null}]`
**Frontend**: `FieldConstraintValue` uses `params?: Record<string, any>` instead of `value: string|null`

**Files to fix:**
- `src/lib/types/index.ts:190-194` — Change `FieldConstraintValue.params` to `value: string | null`
- `src/lib/api/fields.ts:15-19,50-56` — Update `FieldConstraintValueResponse` to use `value` not `params`

---

## MODERATE Issues (incorrect data handling)

### 3. Field Constraint API response expects `fieldsUsingConstraint` — Not in OpenAPI spec
**Backend OpenAPI**: `FieldConstraintResponse` only has `usedInFields: integer` — no `fieldsUsingConstraint` array
**Frontend**: API client expects `fieldsUsingConstraint: Array<{name: string, fieldId: string}>` in the response

**Files to check:**
- `src/lib/api/fieldConstraints.ts:12-16,30` — `fieldsUsingConstraint` may not exist in actual backend response (or it's an undocumented field)
- `src/lib/stores/fieldConstraints.ts:11` — Store interface includes `fieldsUsingConstraint`

### 4. Types store missing `namespaceId`
**Backend**: `TypeResponse` includes `namespaceId`
**Frontend**: `TypeBase` interface has no `namespaceId`; `transformType()` in `api/types.ts` drops it

**Files to fix:**
- `src/lib/stores/types.ts:8-15` — Add `namespaceId: string` to `TypeBase`
- `src/lib/api/types.ts:28-37` — Include `namespaceId` in transform

### 5. `ApiMetadata` legacy interface still exists
**Frontend**: `ApiMetadata`, `apiMetadataStore`, `initialApiMetadata`, `migrateToMultipleApis()` — all legacy code that should be cleaned up

**Files to fix:**
- `src/lib/types/index.ts:137-145` — Delete `ApiMetadata`
- `src/lib/stores/apis.ts:14-27,161-166,581-616` — Delete legacy store and migration code

---

## LOW Issues (cosmetic/cleanup)

### 6. `ResponseItemShape` type unused
- `src/lib/types/index.ts:112` — `ResponseItemShape = 'object'` appears unused

### 7. `expanded` property on `ApiEndpoint` — Frontend-only
- `src/lib/types/index.ts:170` — `expanded?: boolean` not in backend, purely UI state. This is fine but worth noting.

### 8. Test files still reference old tag patterns
- `tests/shared/testUtils.ts:43-68` — `createMockTag()`, `tags: []` in `createMockApi()`
- `tests/unit/lib/stores/apis.test.ts` — Multiple references to `tags: []`
- `tests/integration/routes/api-generator/page.test.ts` — `ApiTag` import, `tags: []`
- `tests/page-objects/ApisPage.ts:283` — Tags column selector

---

## Resolved Issues

| # | Issue | Status |
|---|-------|--------|
| ~~1~~ | Remove `tags` from APIs entirely | RESOLVED |
| ~~2~~ | Remove `namespaceId` from endpoints | RESOLVED |
| ~~3~~ | Rewrite `pathParams` to `{name, fieldId}` | RESOLVED |

---

## Summary by Priority

| # | Issue | Severity | Scope |
|---|-------|----------|-------|
| 1 | Field constraints request: `params` → `value` | CRITICAL | 2 files |
| 2 | Field constraints response: `params` → `value` | CRITICAL | 3 files |
| 3 | `fieldsUsingConstraint` — verify backend support | MODERATE | 2 files |
| 4 | Add `namespaceId` to `TypeBase` | MODERATE | 2 files |
| 5 | Remove `ApiMetadata` legacy code | MODERATE | 2 files |
| 6-8 | Cleanup & tests | LOW | Multiple files |

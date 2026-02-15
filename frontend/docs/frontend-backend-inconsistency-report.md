# Frontend-Backend Inconsistency Report

Generated: 2026-02-15
Updated: 2026-02-15

## Open Issues

### 5. `ApiMetadata` legacy interface still exists (MODERATE)
**Frontend**: `ApiMetadata`, `apiMetadataStore`, `initialApiMetadata`, `migrateToMultipleApis()` — all legacy code that should be cleaned up

**Files to fix:**
- `src/lib/types/index.ts:137-145` — Delete `ApiMetadata`
- `src/lib/stores/apis.ts:14-27,161-166,581-616` — Delete legacy store and migration code

---

## LOW Issues (cosmetic/cleanup)

### 7. `expanded` property on `ApiEndpoint` — Frontend-only
- `src/lib/types/index.ts:170` — `expanded?: boolean` not in backend, purely UI state. This is intentional.

---

## Resolved Issues

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 1 | Field constraints request: `params` → `{constraintId, value}` | RESOLVED | Types aligned directly, bridge layer removed |
| 2 | Field constraints response: `params` → `value` | RESOLVED | `FieldConstraintValue.value: string \| null` matches backend |
| 3 | `fieldsUsingConstraint` — not in backend spec | RESOLVED | Removed from store/API; field refs computed reactively from `fieldsStore` |
| 4 | Add `namespaceId` to `TypeBase` | RESOLVED | Added to interface and `transformType()` |
| 5 | Remove `ApiMetadata` legacy code | OPEN | Not yet addressed |
| 6 | `ResponseItemShape` type unused | FALSE POSITIVE | Used in `src/lib/utils/examples.ts` |
| 7 | `expanded` on `ApiEndpoint` — frontend-only | INTENTIONAL | UI state only, not sent to backend |
| 8 | Test files reference old tag patterns | RESOLVED | Previously cleaned up |

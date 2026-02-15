# Single Mutation Architecture (Big-Bang) for Simplicity + AI Reliability

## Summary
Replace the current multi-path mutation model with one canonical, schema-driven mutation pipeline.  
Today the same concerns are implemented in three places (`src/lib/api/*`, `src/lib/stores/actions.ts`, and store-local CRUD in `src/lib/stores/*.ts`, plus local duplication in `src/lib/stores/apiDetailState.svelte.ts`).  
The highest-impact improvement is to centralize all entity mutations in one domain layer and make stores selector-only. This removes ambiguity for engineers and AI agents, while preserving all behavior.

## Scope
1. In scope: fields, objects, namespaces, apis, endpoints, tags mutation flows.
2. In scope: route pages under `src/routes/(dashboard)/**` that currently call mixed mutation APIs.
3. In scope: test architecture for mutation behavior, not implementation details.
4. Out of scope: UI redesign, backend API contract changes, auth changes.

## Architecture Decision (Final)
1. **Canonical write path**: `route/page -> domain action -> repository -> api client -> store commit`.
2. **Stores become read/query-only**: no `create*`, `update*`, `delete*` exports in entity store files.
3. **Entity behavior defined once** via manifest/config and reused by generic action/repository builders.
4. **API detail editor** (`src/lib/stores/apiDetailState.svelte.ts`) uses the same canonical mutation utilities; no local duplicate endpoint/tag mutation algorithms.

## Implementation Plan (Decision Complete)

### 1. Create canonical domain layer
1. Add `src/lib/domain/entityManifest.ts` with one manifest per entity:
- `key`, `endpoint`, `idField`, `listQueryParams`, `transformIn`, `transformOut`, `optimisticPolicy`.
2. Add `src/lib/domain/repository.ts`:
- Generic `list/get/create/update/delete` using existing `apiClient`.
- Strong typed signatures keyed by manifest entries.
3. Add `src/lib/domain/mutations.ts`:
- Generic action factory for create/update/delete with consistent optimistic/pessimistic handling, rollback, and error mapping.
4. Add `src/lib/domain/errorMap.ts`:
- Move `handleApiError` logic from `src/lib/stores/actions.ts` into one reusable mapper.

### 2. Remove duplicate mutation code
1. Replace `src/lib/stores/actions.ts` with thin exports generated from `domain/mutations.ts`.
2. Remove local CRUD exports from:
- `src/lib/stores/fields.ts`
- `src/lib/stores/objects.ts`
- `src/lib/stores/namespaces.ts`
- `src/lib/stores/apis.ts` (except pure selectors/query helpers)
3. Move endpoint/tag mutation algorithms from `src/lib/stores/apis.ts` and local duplicates in `src/lib/stores/apiDetailState.svelte.ts` into:
- `src/lib/domain/endpointReducer.ts`
- `src/lib/domain/tagReducer.ts`
4. Update `src/lib/stores/apiDetailState.svelte.ts` to call domain reducers + canonical mutations only.

### 3. Replace API module duplication with manifest-backed repositories
1. Keep `src/lib/api/client.ts` as transport.
2. Replace repetitive CRUD modules (`fields.ts`, `objects.ts`, `namespaces.ts`, `apis.ts`, `endpoints.ts`) with manifest-backed wrappers.
3. Preserve existing exported function names temporarily only if required by current route imports during the same PR; remove wrappers before merge to enforce one implementation per concern.

### 4. Route migration
1. Update all dashboard routes to import only canonical actions.
2. Ensure no route imports store-local mutation helpers.
3. Confirm `src/routes/(dashboard)/apis/[id]/+page.svelte` and `src/lib/stores/apiDetailState.svelte.ts` use identical endpoint/tag mutation semantics.

### 5. Test redesign for AI-followable invariants
1. Replace implementation-coupled unit tests that call removed store-local CRUD directly with behavior tests against canonical actions and store state outcomes.
2. Add `tests/unit/lib/domain/mutations.test.ts` for generic mutation engine.
3. Add `tests/unit/lib/domain/endpointReducer.test.ts` and `tests/unit/lib/domain/tagReducer.test.ts`.
4. Add parity integration tests for each entity route flow:
- create
- edit
- delete
- duplicate/conflict errors
- rollback on failed optimistic update
5. Keep e2e smoke + CRUD intact and require no baseline feature regression.

### 6. Enforce architecture in CI (strict)
1. Add script `scripts/check-architecture.ts` with hard rules:
- Fail if `src/lib/stores/*.ts` exports `create*|update*|delete*` for domain entities.
- Fail if non-domain files implement duplicate path-param reconciliation/tag deletion logic.
- Fail if route files import mutation helpers from anywhere except canonical actions module.
2. Add CI job step to run architecture check before tests.
3. Update docs:
- `README.md` architecture section.
- `CLAUDE.md` coding rules to state single mutation path.
- `tests/README.md` to reflect actual test layout and canonical behavior-testing strategy.

## Public API / Interface Changes
1. Removed from store public interfaces:
- `createField`, `updateField`, `deleteField`
- `createObject`, `updateObject`, `deleteObject`
- `createNamespace`, `updateNamespace`, `deleteNamespace`
- direct mutation helpers in `apis.ts` that overlap canonical path
2. Added public interfaces:
- `src/lib/domain/entityManifest.ts` typed entity registry
- `src/lib/domain/mutations.ts` canonical create/update/delete actions
- `src/lib/domain/endpointReducer.ts` and `src/lib/domain/tagReducer.ts` pure shared logic
3. Preserved behavior:
- Same route-level features and UX outcomes.
- Same backend request/response contract.

## Strict Success Criteria (must all pass)
1. **Single write path proof**: architecture check reports zero violations.
2. **Feature parity proof**: all existing dashboard CRUD user flows pass unchanged in smoke/e2e.
3. **No lost functionality**:
- API detail page still supports endpoint add/edit/delete/duplicate.
- Tag create/select/delete still updates affected endpoints correctly.
- Namespace deletion safeguards remain intact.
4. **Regression gates**:
- `bun run check` passes.
- `bun run test:unit` passes.
- `bun run test:integration` passes.
- `bun run test:e2e:smoke` passes.
- `bun run test:e2e:crud` passes in configured environment.
5. **Complexity reduction target**:
- Remove at least 60% of duplicated mutation function bodies across store/action/api layers.
- Remove all store-local entity CRUD exports for canonical entities.

## Test Cases and Scenarios
1. Entity mutation contract tests:
- create success
- update optimistic success
- update optimistic rollback on API error
- delete pessimistic success
- duplicate-name conflict (409) error mapping
2. API detail reducer tests:
- path param reconciliation on path edits
- tag deletion clears endpoint references
- endpoint duplication creates fresh ids for endpoint and path params
3. Route integration tests:
- fields page create/update/delete
- objects page create/update/delete
- namespaces page create/update/delete with lock/entity guards
- apis list and detail delete behavior
4. End-to-end smoke parity:
- auth + navigation + dashboard load
- CRUD critical path unchanged

## Assumptions and Defaults
1. Rollout strategy selected: **Big-Bang Refactor**.
2. Backend API endpoints and payload schema remain unchanged during this refactor.
3. No feature additions are introduced; this is architecture-only simplification.
4. Existing UI copy/toast wording may change only when required by centralized error mapping consistency.
5. If any entity-specific behavior cannot fit generic mutation policy, it is implemented as explicit per-entity hook inside the canonical domain layer (not in routes/stores).

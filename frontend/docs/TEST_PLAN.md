# Frontend Test Plan

Execution guide for a Claude Code agent. Every file path, command, and constraint below is validated against the codebase as of 2026-02-18.

---

## 1. Architecture Overview

### Current State

The project has three test layers run by two tools:

| Tool | Layer | Directory | Config | Runner command |
|---|---|---|---|---|
| Vitest 4 + jsdom | Unit | `tests/unit/` | `vitest.config.ts` | `bunx vitest run tests/unit` |
| Vitest 4 + jsdom | Integration | `tests/integration/` | `vitest.config.ts` | `bunx vitest run tests/integration` |
| Playwright | Smoke E2E | `tests/smoke/` | `playwright.config.ts` (project `smoke`) | `bunx playwright test --project=smoke` |
| Playwright | Setup E2E | `tests/e2e/setup/` | `playwright.config.ts` (project `setup`) | `bunx playwright test --project=setup` |
| Playwright | CRUD E2E | `tests/e2e/crud/` | `playwright.config.ts` (project `crud`) | `PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud` |

Vitest config (`vitest.config.ts`) uses `jsdom` environment and excludes `tests/e2e/**` and `tests/smoke/**`. Coverage thresholds are all zero.

### Existing Test Infrastructure

**Shared utilities:**
- `tests/shared/testUtils.ts` — `createMockEndpoint()`, `createMockApi()`, `setupUserEvent()`, `clearAndType()`, `clickByText()`, `waitForElementToBeRemoved()`, `delay()`
- `tests/shared/msw/handlers.ts` — MSW handlers using fixtures (users, fields, fieldConstraints, types, permissions)
- `tests/shared/msw/server.ts` — MSW server for Vitest
- `tests/shared/msw/browser.ts` — MSW browser worker for E2E

**Fixtures (`tests/fixtures/`):**
- `fields.ts`, `types.ts`, `fieldConstraints.ts`, `permissions.ts`, `users.ts` — mock data
- `seedData.ts` — combined initial data sets (`initialFields`, `initialFieldConstraints`)
- `index.ts` — barrel re-export with lookup helpers (`getFieldById`, `getFieldConstraintByName`, etc.)
- `validate.ts` — fixture validation script

**Vitest setup (`tests/setup/vitestSetup.ts`):**
- Imports `@testing-library/jest-dom/vitest` matchers
- Imports `whatwg-fetch` polyfill
- Starts MSW server (`beforeAll` / `afterEach` / `afterAll`)
- Mocks `$env/dynamic/public` and `$env/static/public`
- Mocks `window.matchMedia`, `IntersectionObserver`, `ResizeObserver`

**Page objects (`tests/page-objects/`):**
- `FieldsPage.ts`, `ObjectsPage.ts`, `ApisPage.ts`, `TypesPage.ts`, `FieldConstraintsPage.ts`
- `DashboardPage.ts`, `LandingPage.ts`, `AuthPage.ts`, `MobileBlockedPage.ts`
- `index.ts` — barrel re-export
- No `NamespacesPage.ts` exists

**E2E helpers (`tests/helpers/`):**
- `clerk-admin.ts` — Clerk backend API helpers
- `e2e-delays.ts` — centralized delay constants (exports `ACTION_DELAY_MS`)
- `api-client.ts` — `E2EApiClient` using Node.js `fetch`
- `health-check.ts`, `frontend-check.ts` — pre-flight checks
- `failure-reporter.ts` — custom Playwright reporter
- `test-data.ts` — test data generators

**Test ID utility (`src/lib/utils/testIds.ts`):**
- Currently exports only `getStatCardTestId(title: string): string`
- Only 8 source files use `data-testid` attributes (Clerk components, `StatCard`, `Sidebar`)

### Source Code Under Test

**Stores (`src/lib/stores/`):**

| File | Type | Has unit test |
|---|---|---|
| `fields.ts` | Writable store + selectors | Yes (`tests/unit/lib/stores/fields.test.ts`) |
| `objects.ts` | Writable store + selectors | Yes (`tests/unit/lib/stores/objects.test.ts`) |
| `apis.ts` | Writable store + selectors | Yes (`tests/unit/lib/stores/apis.test.ts`) |
| `namespaces.ts` | Writable store + selectors | Yes (`tests/unit/lib/stores/namespaces.test.ts`) |
| `fieldConstraints.ts` | Writable store + selectors | No |
| `types.ts` | Writable store + selectors | No |
| `toasts.ts` | Toast notification store | No |
| `organization.ts` | Clerk org state | No |
| `loader.ts` | Data loading orchestrator | No |
| `fieldsModel.svelte.ts` | CRUD model (composes `listViewState`) | Yes (`tests/unit/lib/stores/fieldsModel.test.ts`) |
| `objectsModel.svelte.ts` | CRUD model (composes `listViewState`) | Yes (`tests/unit/lib/stores/objectsModel.test.ts`) |
| `namespacesModel.svelte.ts` | CRUD model (composes `listViewState`) | Yes (`tests/unit/lib/stores/namespacesModel.test.ts`) |
| `listViewState.svelte.ts` | Generic list view state factory | No |
| `apiDetailState.svelte.ts` | API detail page state machine | No |

**Domain logic (`src/lib/domain/`):**

| File | Description | Has unit test |
|---|---|---|
| `mutations.ts` | Canonical mutation pipeline for all entities (field, object, API, endpoint, namespace). Uses optimistic updates, deletion guards, error mapping. | No (mocked by model tests) |
| `errorMap.ts` | `mapApiError()` — maps `ApiError` to user-friendly messages by status code | No |
| `endpointReducer.ts` | `reconcilePathParams()`, `normalizeEndpoint()` — endpoint state reduction | No |

**Utilities (`src/lib/utils/`):**

| File | Description | Has unit test |
|---|---|---|
| `ids.ts` | `generateId()`, `deepClone()` | Yes |
| `sorting.ts` | Multi-column sorting, URL sort state parsing | Yes |
| `examples.ts` | Example data generators | Yes |
| `urlParser.ts` | `extractPathParameters()` from URL paths | No |
| `namespace.ts` | Namespace utility functions | No |
| `references.ts` | `checkFieldDeletion()`, `checkObjectDeletion()`, `checkFieldConstraintDeletion()`, `buildDeletionTooltip()` | No |
| `compose.ts` | `composeState()` — preserves getter/setter descriptors for Svelte 5 reactivity | No |
| `testIds.ts` | `getStatCardTestId()` — test ID generators | No (used by tests, not tested itself) |

**API client (`src/lib/api/`):**

| File | Description | Has unit test |
|---|---|---|
| `client.ts` | Base `ApiError` class, authenticated fetch wrapper | No |
| `fields.ts` | Field CRUD API functions | No |
| `objects.ts` | Object CRUD API functions | No |
| `apis.ts` | API CRUD API functions | No |
| `endpoints.ts` | Endpoint CRUD API functions | No |
| `namespaces.ts` | Namespace CRUD API functions | No |
| `types.ts` | Types API functions | No |
| `fieldConstraints.ts` | Field constraints API functions | No |
| `index.ts` | Barrel export | No |

**Routes (`src/routes/(dashboard)/`):**
- `dashboard/+page.svelte`
- `fields/+page.svelte`
- `objects/+page.svelte`
- `apis/+page.svelte` and `apis/[id]/+page.svelte`
- `types/+page.svelte`
- `validators/field-constraints/+page.svelte`
- `validators/field-validators/+page.svelte`
- `validators/model-validators/+page.svelte`
- `namespaces/+page.svelte` (no page object exists for this)
- `prototypes/response-body/+page.svelte`

### Known Issues in Current Tests

1. **Misaligned integration test**: `tests/integration/routes/api-generator/page.test.ts` has comment `Location mirrors: src/routes/api-generator/+page.svelte` but this route does NOT exist. The actual route is `src/routes/(dashboard)/prototypes/response-body/+page.svelte`. The test itself tests `apisStore` / `endpointsStore` selectors — it is actually a unit test, not an integration test.

2. **Dashboard "integration" test is a unit test**: `tests/integration/routes/dashboard/page.test.ts` imports stores directly and calls `get()`. No component rendering. It should be in `tests/unit/`.

3. **28 `waitForTimeout` calls across page objects**: `FieldConstraintsPage` (7), `ObjectsPage` (11), `ApisPage` (4), `TypesPage` (4), `FieldsPage` (1), plus `e2e-delays.ts` already defines `ACTION_DELAY_MS`.

---

## 2. Target Test Matrix

### Layer Assignment Rules

| Concern | Primary Layer | Secondary Layer | E2E |
|---|---|---|---|
| Pure utilities (`ids`, `sorting`, `examples`, `urlParser`, `namespace`, `references`, `compose`) | Unit | — | No |
| Domain logic (`errorMap`, `endpointReducer`) | Unit | — | No |
| Domain mutations (`mutations.ts`) | Unit (mock API layer) | — | No |
| Store selectors and derived counts | Unit | — | No |
| CRUD model state machines (`fieldsModel`, `objectsModel`, `namespacesModel`) | Unit | — | Thin happy-path only |
| `listViewState` factory (search/filter/sort/drawer state machine) | Unit | — | No |
| `apiDetailState` state machine | Unit | — | No |
| Route rendering and user interactions | Integration (`@testing-library/svelte` + jsdom) | — | Thin smoke |
| Auth/provider boundaries | E2E smoke | — | Yes |
| Cross-system flows (auth + real backend CRUD) | E2E CRUD | — | Yes |

### File-by-File Target

#### New Unit Tests to Create

| Test file to create | Source under test | What to test |
|---|---|---|
| `tests/unit/lib/utils/urlParser.test.ts` | `src/lib/utils/urlParser.ts` | `extractPathParameters()` — standard paths, nested params, no params, edge cases (empty, double slashes) |
| `tests/unit/lib/utils/namespace.test.ts` | `src/lib/utils/namespace.ts` | All exported functions — verify with actual function signatures before writing tests |
| `tests/unit/lib/utils/references.test.ts` | `src/lib/utils/references.ts` | `checkFieldDeletion()` — no refs returns `{success:true}`, with refs returns error with API names, namespace filtering; `checkObjectDeletion()` — same pattern; `checkFieldConstraintDeletion()` — zero usedInFields passes, nonzero blocks; `buildDeletionTooltip()` — single ref, multiple refs up to 5, more than 5 refs |
| `tests/unit/lib/utils/compose.test.ts` | `src/lib/utils/compose.ts` | `composeState()` — preserves getter descriptors, extension overrides base keys, works with plain values |
| `tests/unit/lib/domain/errorMap.test.ts` | `src/lib/domain/errorMap.ts` | `mapApiError()` — 401 returns session expired, 403 returns permission denied, 404 returns not found, 409 returns detail or default, 500+ returns server error, `TypeError` with fetch returns network error, unknown error returns fallback |
| `tests/unit/lib/domain/endpointReducer.test.ts` | `src/lib/domain/endpointReducer.ts` | `reconcilePathParams()` — extracts params from path, preserves existing params, matches fields by name; `normalizeEndpoint()` — adds missing response shape fields |
| `tests/unit/lib/domain/mutations.test.ts` | `src/lib/domain/mutations.ts` | All 15 action functions. Mock `$lib/api/*` modules. Verify: store updates on success, store rollback on failure (for update actions), deletion guard enforcement (fields, objects, namespaces), error message mapping |
| `tests/unit/lib/stores/fieldConstraints.test.ts` | `src/lib/stores/fieldConstraints.ts` | Store selectors and derived counts — read actual exports before writing |
| `tests/unit/lib/stores/types.test.ts` | `src/lib/stores/types.ts` | Store selectors and derived counts — read actual exports before writing |

**IMPORTANT for `mutations.test.ts`**: This file must mock ALL `$lib/api/*` modules (fields, objects, apis, endpoints, namespaces) and `$lib/domain/errorMap`. Test each action function independently:
- `createFieldAction` — calls `createFieldApi`, updates `fieldsStore`, returns `{success: true, data}`
- `updateFieldAction` — optimistic update, calls `updateFieldApi`, on error rolls back to `previousFields`
- `deleteFieldAction` — calls `checkFieldDeletion` guard first, then `deleteFieldApi`
- Same pattern for object, API, endpoint, namespace actions
- `deleteNamespaceAction` — tests locked namespace guard, entity count guard, active namespace reset

**IMPORTANT for `references.test.ts`**: The `checkFieldDeletion` and `checkObjectDeletion` functions call `get(apisStore)` internally when `namespaceId` is provided. Mock `$lib/stores/apis` with `apisStore` writable store in these tests.

#### Existing Unit Tests to Keep (no changes)

| Test file | Source | Status |
|---|---|---|
| `tests/unit/lib/utils/sorting.test.ts` | `src/lib/utils/sorting.ts` | Keep |
| `tests/unit/lib/utils/ids.test.ts` | `src/lib/utils/ids.ts` | Keep |
| `tests/unit/lib/utils/examples.test.ts` | `src/lib/utils/examples.ts` | Keep |
| `tests/unit/lib/stores/fields.test.ts` | `src/lib/stores/fields.ts` | Keep |
| `tests/unit/lib/stores/objects.test.ts` | `src/lib/stores/objects.ts` | Keep |
| `tests/unit/lib/stores/namespaces.test.ts` | `src/lib/stores/namespaces.ts` | Keep |
| `tests/unit/lib/stores/apis.test.ts` | `src/lib/stores/apis.ts` | Keep |
| `tests/unit/lib/stores/fieldsModel.test.ts` | `src/lib/stores/fieldsModel.svelte.ts` | Keep |
| `tests/unit/lib/stores/objectsModel.test.ts` | `src/lib/stores/objectsModel.svelte.ts` | Keep |
| `tests/unit/lib/stores/namespacesModel.test.ts` | `src/lib/stores/namespacesModel.svelte.ts` | Keep |
| `tests/unit/lib/components/table/Table.test.ts` | `src/lib/components/table/Table.svelte` | Keep |

#### Integration Tests to Reclassify

| Current location | Action | New location |
|---|---|---|
| `tests/integration/routes/dashboard/page.test.ts` | Move to unit (it only calls `get(store)`, no component rendering) | `tests/unit/lib/stores/dashboard-selectors.test.ts` |
| `tests/integration/routes/api-generator/page.test.ts` | Move to unit (it only tests `apisStore`/`endpointsStore` selectors) | `tests/unit/lib/stores/apis-endpoints.test.ts` |

**How to move**: Use `git mv` to preserve history. Update any relative import paths (e.g., `../../../fixtures/seedData` → adjust depth). Run `bunx vitest run` to confirm tests still pass after move.

#### Integration Tests to Create (Phase 3)

These tests use `@testing-library/svelte` with `render()` in the existing jsdom environment. They do NOT need a new browser-backed runner. The existing `vitest.config.ts` already includes `@testing-library/svelte` (v5.2.0) and `@testing-library/user-event` (v14.5.0) as devDependencies.

**Critical constraint**: SvelteKit route components (`+page.svelte`) import from `$app/*` modules and use layout data. Rendering them directly with `@testing-library/svelte` requires mocking these SvelteKit internals. The setup file already mocks `$env/dynamic/public` and `$env/static/public`. Additional mocks needed per component:
- `$app/navigation` (`goto`)
- `$app/environment` (`browser`)
- `$app/state` (`page`)
- Clerk modules (already handled in some test files)
- Store state (set stores to known fixture data before render)

| Test file to create | Route under test | Key assertions |
|---|---|---|
| `tests/integration/routes/fields/page.test.ts` | `src/routes/(dashboard)/fields/+page.svelte` | Renders table with field data, search filters fields, empty state shown when no results, drawer opens on row click, sort toggles update URL params |
| `tests/integration/routes/objects/page.test.ts` | `src/routes/(dashboard)/objects/+page.svelte` | Same pattern as fields |
| `tests/integration/routes/apis/page.test.ts` | `src/routes/(dashboard)/apis/+page.svelte` | Same pattern as fields |
| `tests/integration/routes/types/page.test.ts` | `src/routes/(dashboard)/types/+page.svelte` | Renders type list, read-only (no create drawer) |
| `tests/integration/routes/validators/field-constraints/page.test.ts` | `src/routes/(dashboard)/validators/field-constraints/+page.svelte` | Renders constraints list, search, drawer |

**IMPORTANT**: Before creating each integration test, READ the actual `+page.svelte` file first to understand its exact imports, props, and behavior. Do NOT guess component structure. Each route page composes a model (e.g., `fieldsModel.svelte.ts`) and renders shared components (`Table`, `SearchBar`, `FilterPanel`, `Drawer`). The integration test should verify these compositions work together.

**If a route page is too tightly coupled to SvelteKit internals to render in jsdom** (e.g., uses `$app/state` rune that can't be mocked), document the blocker and skip that integration test. Do not waste time fighting framework limitations.

#### E2E Tests to Keep (no changes)

| Test file | Project | Status |
|---|---|---|
| `tests/smoke/landing.spec.ts` | smoke | Keep |
| `tests/smoke/dashboard.spec.ts` | smoke | Keep |
| `tests/smoke/auth.spec.ts` | smoke | Keep |
| `tests/smoke/mobile-blocked.spec.ts` | smoke | Keep |
| `tests/e2e/setup/authenticate.spec.ts` | setup | Keep |
| `tests/e2e/crud/fields.spec.ts` | crud | Keep |

---

## 3. Implementation Phases

### Phase 1: Baseline and Reclassification

**Goal**: Measure current coverage, fix misclassified tests, clean up stale references.

**Steps**:

1. **Measure baseline coverage** (do not save, just record numbers):
   ```bash
   bunx vitest run --coverage
   ```
   Record the output values for lines, functions, branches, statements. These become the floor for Phase 6 gates.

2. **Move misclassified integration tests to unit**:
   ```bash
   mkdir -p tests/unit/lib/stores
   git mv tests/integration/routes/dashboard/page.test.ts tests/unit/lib/stores/dashboard-selectors.test.ts
   git mv tests/integration/routes/api-generator/page.test.ts tests/unit/lib/stores/apis-endpoints.test.ts
   ```

3. **Fix import paths in moved files**: Both files use relative imports to `../../../fixtures/seedData` and `../../../shared/testUtils`. After moving:
   - `dashboard-selectors.test.ts`: Change `../../../fixtures/seedData` to `../../../fixtures/seedData` (verify correct depth — from `tests/unit/lib/stores/` to `tests/fixtures/` is `../../../fixtures/`)
   - `apis-endpoints.test.ts`: Change `../../../shared/testUtils` to `../../../shared/testUtils` (same depth check)

4. **Remove empty directories** if they become empty after the move:
   ```bash
   rmdir tests/integration/routes/api-generator 2>/dev/null
   rmdir tests/integration/routes/dashboard 2>/dev/null
   rmdir tests/integration/routes 2>/dev/null
   rmdir tests/integration 2>/dev/null
   ```
   Only remove if truly empty.

5. **Verify all tests still pass**:
   ```bash
   bunx vitest run
   ```

### Phase 2: Expand Test ID Contract

**Goal**: Add `data-testid` attributes to shared components used across CRUD pages, and centralize ID generation in `testIds.ts`.

**Steps**:

1. **Read `src/lib/utils/testIds.ts`** and extend it with functions for:
   ```typescript
   // Search
   export const SEARCH_INPUT_ID = 'search-input';
   export const SEARCH_CLEAR_ID = 'search-clear';

   // Filters
   export const FILTER_TOGGLE_ID = 'filter-toggle';
   export const FILTER_PANEL_ID = 'filter-panel';
   export function getFilterCheckboxId(section: string, value: string): string {
     return `filter-${section}-${value}`.toLowerCase().replace(/\s+/g, '-');
   }

   // Table
   export const TABLE_ID = 'data-table';
   export function getTableRowId(id: string): string {
     return `table-row-${id}`;
   }
   export function getSortColumnId(column: string): string {
     return `sort-${column}`;
   }

   // Drawer
   export const DRAWER_ID = 'drawer';
   export const DRAWER_SAVE_ID = 'drawer-save';
   export const DRAWER_CANCEL_ID = 'drawer-cancel';
   export const DRAWER_DELETE_ID = 'drawer-delete';

   // Empty state
   export const EMPTY_STATE_ID = 'empty-state';

   // Error / retry
   export const ERROR_STATE_ID = 'error-state';
   export const RETRY_BUTTON_ID = 'retry-button';
   ```

2. **Add `data-testid` attributes to shared components**: Read each component first, then add the attribute using the constants from `testIds.ts`. Components to update:
   - `src/lib/components/search/SearchBar.svelte` — add `data-testid={SEARCH_INPUT_ID}` to the input, `data-testid={SEARCH_CLEAR_ID}` to clear button
   - `src/lib/components/search/FilterPanel.svelte` — add `data-testid={FILTER_PANEL_ID}` to panel wrapper
   - `src/lib/components/table/Table.svelte` — add `data-testid={TABLE_ID}` to table element
   - `src/lib/components/table/EmptyState.svelte` — add `data-testid={EMPTY_STATE_ID}` to wrapper
   - `src/lib/components/drawer/Drawer.svelte` — add `data-testid={DRAWER_ID}` to drawer wrapper
   - `src/lib/components/drawer/DrawerFooter.svelte` — add test IDs to save/cancel/delete buttons

   **IMPORTANT**: Read each component file before editing. Find the correct element to attach the test ID to. Do not blindly add attributes without understanding the component structure.

3. **Verify no regressions**:
   ```bash
   bun run svelte-check --tsconfig ./tsconfig.json
   bunx vitest run
   pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke
   ```

### Phase 3: New Unit Tests

**Goal**: Cover untested utilities, domain logic, and store gaps.

**Priority order** (implement in this order):

1. `tests/unit/lib/domain/errorMap.test.ts`
2. `tests/unit/lib/utils/references.test.ts`
3. `tests/unit/lib/utils/urlParser.test.ts`
4. `tests/unit/lib/utils/compose.test.ts`
5. `tests/unit/lib/utils/namespace.test.ts`
6. `tests/unit/lib/domain/endpointReducer.test.ts`
7. `tests/unit/lib/domain/mutations.test.ts`
8. `tests/unit/lib/stores/fieldConstraints.test.ts`
9. `tests/unit/lib/stores/types.test.ts`

**General rules for writing each test file**:
- **Always read the source file first** before writing the test
- Use the same mock setup patterns as existing test files (check `fieldsModel.test.ts` for mocking `$app/*`, `$lib/domain/mutations`, etc.)
- Import from `vitest` directly: `import { describe, it, expect, vi, beforeEach } from 'vitest'`
- Do NOT use `@testing-library/svelte` in unit tests — these are pure logic tests
- For files that import from `$lib/*`, those aliases are resolved by the vitest config through sveltekit plugin
- When mocking stores, use the writable store API: `import { writable } from 'svelte/store'`
- Each test file must be self-contained with its own mocks declared before imports

**Specific instructions per file**:

**`errorMap.test.ts`**: Create `ApiError` instances with different status codes. The `ApiError` class is in `src/lib/api/client.ts` — read it first to understand the constructor signature. Test each status code branch and the `TypeError` catch-all.

**`references.test.ts`**: Must mock `$lib/stores/apis` because `checkFieldDeletion` and `checkObjectDeletion` call `get(apisStore)` when `namespaceId` is provided. Use:
```typescript
vi.mock('$lib/stores/apis', () => {
  const { writable } = require('svelte/store');
  return { apisStore: writable([]) };
});
```
Then set `apisStore` state in `beforeEach` for namespace-filtered tests.

**`mutations.test.ts`**: This is the most complex test file. Mock all 5 API modules (`$lib/api/fields`, `$lib/api/objects`, `$lib/api/apis`, `$lib/api/endpoints`, `$lib/api/namespaces`). Mock `$lib/domain/errorMap`. Mock `$lib/utils/references`. Import the real stores and verify their state changes. Test pattern for each action:
```typescript
it('createFieldAction updates store on success', async () => {
  const mockField = { id: '1', name: 'test', ... };
  (createFieldApi as Mock).mockResolvedValue(mockField);

  const result = await createFieldAction({ name: 'test', ... });

  expect(result.success).toBe(true);
  expect(get(fieldsStore)).toContainEqual(mockField);
});
```

**After creating all unit tests, verify**:
```bash
bunx vitest run
```

### Phase 4: Integration Tests (Component Rendering)

**Goal**: Add route-level integration tests that render components with `@testing-library/svelte`.

**IMPORTANT CONSTRAINTS**:
- Use the existing jsdom environment — do NOT add a browser-backed runner
- `@testing-library/svelte` v5.2.0 and `@testing-library/user-event` v14.5.0 are already installed
- Route `+page.svelte` components will need SvelteKit module mocks — follow the pattern in `tests/setup/vitestSetup.ts`
- If a component uses Svelte 5 runes (`$state`, `$derived`, `$effect`) that fail in jsdom, document the failure and skip that test

**Before starting**: Read the target `+page.svelte` component to understand its imports and structure. Each CRUD page typically:
1. Creates a model instance (e.g., `const model = createFieldsModel(config)`)
2. Binds model state to shared components (`Table`, `SearchBar`, `FilterPanel`, `Drawer`)
3. Uses `$effect` for lifecycle management

**If the `.svelte.ts` model factory pattern prevents jsdom rendering** (because `$state`/`$derived` runes require Svelte compiler context), the integration test should:
1. Mock the model module to return a plain object with the expected state shape
2. Render the page component with that mocked state
3. Assert that the template correctly renders based on state

**Create integration tests in this order**:
1. `tests/integration/routes/fields/page.test.ts`
2. `tests/integration/routes/objects/page.test.ts`
3. `tests/integration/routes/apis/page.test.ts`
4. `tests/integration/routes/types/page.test.ts`
5. `tests/integration/routes/validators/field-constraints/page.test.ts`

**Each integration test should cover**:
- Component renders without errors
- Table displays correct number of rows from fixture data
- Search input filters displayed rows
- Sort column click updates displayed order
- Empty state shown when search returns no results
- Drawer opens on row click (where applicable)

**After creating integration tests, verify**:
```bash
bunx vitest run
```

### Phase 5: Fragility Reduction (E2E Page Objects)

**Goal**: Replace `waitForTimeout` calls with explicit state waits in page objects.

**Files to update** (in priority order by number of `waitForTimeout` calls):

| Page object | Count | File |
|---|---|---|
| `ObjectsPage.ts` | 11 | `tests/page-objects/ObjectsPage.ts` |
| `FieldConstraintsPage.ts` | 7 | `tests/page-objects/FieldConstraintsPage.ts` |
| `ApisPage.ts` | 4 | `tests/page-objects/ApisPage.ts` |
| `TypesPage.ts` | 4 | `tests/page-objects/TypesPage.ts` |
| `FieldsPage.ts` | 1 | `tests/page-objects/FieldsPage.ts` |

**Replacement strategy**:
- Read each `waitForTimeout` call and its surrounding context
- Replace with `page.waitForSelector()`, `page.waitForResponse()`, `expect(locator).toBeVisible()`, or `locator.waitFor()` as appropriate
- For drawer open/close animations: `await page.locator('[data-testid="drawer"]').waitFor({ state: 'visible' })` or `{ state: 'hidden' }`
- For API responses: `await page.waitForResponse(resp => resp.url().includes('/api/') && resp.status() === 200)`
- For table updates after filter/sort: `await expect(page.locator('table tbody tr')).toHaveCount(expectedCount)`

**IMPORTANT**: Do NOT replace all 28 calls at once. Process one page object at a time:
1. Read the page object file
2. Replace `waitForTimeout` calls
3. Run the relevant E2E tests that use that page object
4. Only move to the next page object after tests pass

**After each page object, verify** (adjust project filter based on which page objects are used):
```bash
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke
```

For CRUD tests (FieldsPage is used in `fields.spec.ts`):
```bash
pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

### Phase 6: Coverage Gates and CI Configuration

**Goal**: Set non-zero coverage thresholds, add test scripts.

**Steps**:

1. **Measure coverage after all new tests are added**:
   ```bash
   bunx vitest run --coverage
   ```

2. **Set coverage thresholds in `vitest.config.ts`**: Update the `thresholds` object to the measured values minus 5% (round down to nearest integer). This prevents regression while allowing some variance.
   ```typescript
   thresholds: {
     lines: <measured - 5>,
     functions: <measured - 5>,
     branches: <measured - 5>,
     statements: <measured - 5>
   }
   ```
   **Do NOT set arbitrary values like 30%**. Use actual measured values as the floor.

3. **Verify thresholds don't break the build**:
   ```bash
   bunx vitest run --coverage
   ```

---

## 4. Validation Checklist

After completing ALL phases, run the full validation suite:

```bash
# 1. Type check
bun run svelte-check --tsconfig ./tsconfig.json

# 2. Unit + integration tests
bunx vitest run

# 3. E2E smoke tests
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke

# 4. E2E CRUD tests
pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

ALL FOUR must pass before the work is considered complete.

---

## 5. Rules for the Executing Agent

1. **Always read source files before writing tests**. Never guess function signatures, imports, or component structure.
2. **Use `bunx` not `npx`** — the project uses bun as its package manager.
3. **Follow existing mock patterns**. Check `tests/unit/lib/stores/fieldsModel.test.ts` for the canonical pattern of mocking `$app/*`, `$lib/domain/mutations`, and `$lib/stores/toasts`.
4. **Do not create `.ts` files in component directories** — see CLAUDE.md "Code Organization Rules".
5. **Do not add unnecessary dependencies**. Everything needed is already installed.
6. **Run tests after each meaningful change**, not just at the end.
7. **If a test approach doesn't work** (e.g., Svelte 5 rune components fail in jsdom), document the blocker and skip that specific test. Do not spend more than 10 minutes fighting a single test.
8. **Commit at phase boundaries** using conventional commit format, not at the end of all phases.
9. **Do not modify application source code** except for adding `data-testid` attributes (Phase 2) and updating `testIds.ts`. All other changes should be in `tests/` directory.
10. **Kill stale vite servers** before running E2E tests: `pkill -f "vite" 2>/dev/null`

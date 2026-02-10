# E2E CRUD Test Implementation Guide

This document serves as both an **implementation prompt** for agents writing new E2E tests and a **verification checklist** for reviewing them. Every spec file under `tests/e2e/crud/` must conform to this guide exactly.

The reference implementation is `tests/e2e/crud/fields.spec.ts`. When in doubt, match its patterns verbatim.

---

## Implementation Prompt

You are implementing an E2E CRUD lifecycle test for a dashboard entity. Follow every instruction below without deviation.

### Architecture

- **One spec file per entity** in `tests/e2e/crud/{entity}.spec.ts`.
- **One `test()` function per file.** No `test.describe()` blocks. Auth happens once, navigation happens once, the page stays open throughout the entire flow.
- **One page object per entity** in `tests/page-objects/{EntityName}Page.ts`. The spec file calls only page object methods — no raw Playwright locators in the spec.

### Imports

Every spec file uses exactly these imports:

```ts
import { authenticatedTest as test, expect } from '../fixtures';
import { {EntityName}Page } from '../../page-objects';
import { E2EApiClient } from '../../helpers';
```

### Test Data Constants

Define 3-4 items as `const` objects at the top of the file. Requirements:

1. **All data is hardcoded.** No generators, timestamps, random suffixes, or computed values.
2. **Every filterable/sortable property has distinct values** across items so single-column sort and filter tests are meaningful.
3. **Multi-sort requires ties.** At least two items must share the same value for one sortable column so the secondary sort has a tie to break. If every item has a unique value for the primary sort column, the secondary sort never activates and the test gives false confidence.
4. **Pre-compute all expected sort orders** as named constants (`SORTED_ASC`, `SORTED_DESC`, `SORTED_BY_{COL1}_THEN_{COL2}`).
5. **The multi-sort expected order must differ from every single-column sort order.** Assert this explicitly with `expect(SORTED_BY_X_THEN_Y).not.toEqual(SORTED_ASC)`.

### Flow Structure

The test follows this exact linear sequence. Every step either creates state a later step needs, or verifies state a previous step created. Nothing is standalone.

```
 1. Clean slate         — api.deleteAll{Entity}()
 2. Navigate            — entity.goto()
 3. Verify empty state  — expect row count === 0
 4. Create items A-D    — entity.createNew{Entity}(ITEM_X) for each
 5. Verify count        — expect row count === N
 6. Search              — find one item, verify count === 1, verify correct item shown
 7. Clear search        — verify full count restored
 8. Filter              — by a property value, verify count and correct item(s)
 9. Clear filter        — verify full count restored
10. Sort ascending      — verify ordered names match SORTED_ASC
11. Sort descending     — click same column again, verify SORTED_DESC
12. Multi-sort          — click column X, then Shift+click column Y
                          verify order matches SORTED_BY_X_THEN_Y
                          assert SORTED_BY_X_THEN_Y !== SORTED_ASC
13. Read detail         — click a row, verify drawer opens, verify all field values
14. Close drawer
15. Update              — click a row, change values, verify save enabled, save
16. Verify persistence  — click same row, verify new values appear
17. Close drawer
18. Delete one by one   — for each item: click row → click delete → confirm → verify count decrements
19. Verify empty state  — expect row count === 0
```

### Cleanup Strategy

- **Clean at the start, never at the end.** Call `api.deleteAll{Entity}()` before any UI interaction.
- **No `afterAll`, `afterEach`, `try/catch`, or retries** in the spec file.
- A failed test leaves its state intact for debugging.

### Cross-Entity Isolation

The test creates only its own entity type. It does not create namespaces, objects, APIs, or any other entity. If a feature requires another entity, that belongs in that entity's test.

### Page Object Timing Rules

Every page object method must follow the two-tier timing model:

**Tier 1 — State-based waits (mandatory for transitions and API calls):**
Any action that triggers a UI transition or an API round-trip MUST wait for the resulting state change. Never use a fixed delay for these.

| Action | Wait for |
|---|---|
| Click table row (open drawer) | `drawer.waitFor({ state: 'visible', timeout: 5000 })` |
| Open create drawer | `createDrawer.waitFor({ state: 'visible', timeout: 5000 })` |
| Save (PUT) | `drawer.waitFor({ state: 'hidden', timeout: 10000 })` |
| Create (POST) | `createDrawer.waitFor({ state: 'hidden', timeout: 10000 })` |
| Confirm delete (DELETE) | `drawer.waitFor({ state: 'hidden', timeout: 10000 })` |
| Click delete (show confirm) | `confirmButton.waitFor({ state: 'visible', timeout: 5000 })` |
| Cancel delete | `deleteButton.waitFor({ state: 'visible', timeout: 5000 })` |
| Open filter panel | `filterPanel.waitFor({ state: 'visible', timeout: 5000 })` |
| Open dropdown | `options.first().waitFor({ state: 'visible', timeout: 5000 })` |

Timeouts: `10000` for API round-trips, `5000` for local UI transitions.

**Tier 2 — Pacing delays (for instant client-side operations):**
Form fills, search input, filter toggles, and sort clicks use `this.delay()` for visual pacing only. These are controlled by the `E2E_ACTION_DELAY` env var (default: 300ms).

**Decision rule:** "Does this action cause something to appear, disappear, or involve an API call?" Yes → Tier 1. No → Tier 2.

### File Organization

```
tests/
├── e2e/
│   ├── E2E_TESTING_GUIDE.md   ← this file
│   ├── fixtures.ts             ← authenticatedTest (Clerk sign-in)
│   ├── global-setup.ts         ← Clerk token setup
│   └── crud/
│       └── {entity}.spec.ts    ← one file per entity, one test() per file
├── page-objects/
│   └── {EntityName}Page.ts     ← all interactions for one page
└── helpers/
    ├── api-client.ts            ← E2EApiClient (auth'd API calls)
    └── e2e-delays.ts            ← ACTION_DELAY_MS
```

---

## Verification Checklist

Use this checklist to review any E2E CRUD spec before merging. Every box must be checked.

### Structure

- [ ] File is in `tests/e2e/crud/` and named `{entity}.spec.ts`
- [ ] Contains exactly one `test()` call — no `test.describe()`, no multiple tests
- [ ] Imports use `authenticatedTest as test` from `../fixtures`
- [ ] Page object is imported from `../../page-objects`
- [ ] `E2EApiClient` is imported from `../../helpers`

### Test Data

- [ ] 3-4 items defined as `const` at the top of the file
- [ ] All values are hardcoded — no `Date.now()`, `Math.random()`, or template literals
- [ ] Every filterable property has at least one unique value (for filter-by-X tests)
- [ ] At least two items share a value for one sortable column (for multi-sort tie-breaking)
- [ ] `SORTED_ASC` and `SORTED_DESC` are pre-computed and correct
- [ ] `SORTED_BY_{COL1}_THEN_{COL2}` is pre-computed and differs from `SORTED_ASC`
- [ ] The file explicitly asserts `expect(SORTED_BY_X_THEN_Y).not.toEqual(SORTED_ASC)`

### Flow Completeness

- [ ] Starts with `api.deleteAll{Entity}()` — clean slate via API
- [ ] Navigates to entity page exactly once
- [ ] Verifies empty state (row count === 0) before creating anything
- [ ] Creates all items and verifies total count
- [ ] Search: searches for one item, verifies count === 1, verifies correct item
- [ ] Clear search: verifies full count restored
- [ ] Filter: applies a filter, verifies reduced count and correct item(s)
- [ ] Clear filter: verifies full count restored
- [ ] Sort ascending: verifies order matches `SORTED_ASC`
- [ ] Sort descending: clicks same column again, verifies `SORTED_DESC`
- [ ] Multi-sort: clicks column X, then Shift+clicks column Y, verifies `SORTED_BY_X_THEN_Y`
- [ ] Multi-sort guard: asserts multi-sort order !== single-sort order
- [ ] Read: clicks a row, verifies drawer opens, verifies all field values in drawer
- [ ] Update: changes values, verifies save is enabled, saves, verifies drawer closes
- [ ] Verify persistence: re-opens same item, verifies updated values
- [ ] Delete: deletes items one by one, verifies count decrements after each
- [ ] Final empty state: verifies row count === 0

### Anti-Patterns (must NOT be present)

- [ ] No `test.describe()` wrapper
- [ ] No `afterAll`, `afterEach`, `beforeAll`, `beforeEach`
- [ ] No `try/catch` in the spec file
- [ ] No `test.retry()` or retry configuration
- [ ] No raw Playwright locators in the spec — only page object method calls
- [ ] No helper functions defined in the spec file
- [ ] No cross-entity setup (doesn't create objects for a field test, etc.)
- [ ] No `page.waitForTimeout()` in the spec — timing lives in page objects only

### Page Object Timing

- [ ] `clickRow()` / open detail → waits for drawer/panel `visible` (5s timeout)
- [ ] `create()` / `save()` → waits for drawer `hidden` (10s timeout)
- [ ] `confirmDelete()` → waits for drawer `hidden` (10s timeout)
- [ ] `clickDelete()` → waits for confirmation UI `visible` (5s timeout)
- [ ] `openCreateDrawer()` → waits for create drawer `visible` (5s timeout)
- [ ] `openFilters()` → waits for filter panel `visible` (5s timeout)
- [ ] `openDropdown()` → waits for options `visible` (5s timeout)
- [ ] Form fills / search / filter / sort → uses `this.delay()` only
- [ ] No `page.waitForTimeout()` used for API-dependent actions

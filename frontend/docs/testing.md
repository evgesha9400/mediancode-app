# LLM-Centric Testing Implementation Plan

> This repository is a SvelteKit/Node project, so all setup and commands continue to use the existing npm-based toolchain (no Poetry layers are present to manage). The plan below enforces the previously selected strategy: rich unit + integration coverage plus Playwright smoke on PRs and a nightly full run, all backed by deterministic fixtures shared across layers.

## Phase 0 – Baseline Audit (single pass before any coding)
1. Run dependency install and verify `npm run check` to make sure the working tree is clean before adding testing layers.
2. Inventory the `src/` tree (routes, lib/components, lib/utils, stores) and record the structure in `docs/PAGES_AND_FEATURES.md` or this file to preserve a canonical map for LLM agents.
3. Capture existing Vite aliases (`$lib`, `$routes`, etc.) from `svelte.config.js` and `tsconfig.json`; these must be reused in every Vitest/Playwright config to avoid divergence.
4. Decide on canonical TypeScript strictness for tests (match `tsconfig.json`); document any deviations here before work starts.

## Phase 1 – Directory & Naming Conventions
1. Create `tests/` with three mirrored layers:
   - `tests/unit/` mirroring `src/lib` and any pure utilities (one folder per `src` subdirectory, same names, `*.test.ts` suffix).
   - `tests/integration/` mirroring `src/routes` and `src/lib/stores` for MSW-backed flows.
   - `tests/e2e/` for Playwright, with subfolders per high-level route (`landing`, `auth`, `dashboard`, `mobile-blocked`).
2. Add `tests/README.md` summarizing the mirroring rule so future agents maintain the structure.
3. Place shared helpers under `tests/shared/` (e.g., fixtures, MSW handlers, render utilities) and document their purpose in short module-level comments.

## Phase 2 – Vitest + Testing Library Foundation
1. Add the following devDependencies: `vitest`, `@testing-library/svelte`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw`, `whatwg-fetch`, `ts-node`, and `eslint-plugin-testing-library` if linting needs to cover tests.
2. Create `vitest.config.ts` that:
   - Extends the existing Vite config so aliases and preprocessors match exactly.
   - Defines separate projects (`unit`, `integration`) with `setupFiles` pointing to shared init scripts.
   - Enables coverage reports targeting `src/`.
3. Add `tsconfig.vitest.json` extending the base tsconfig, including `tests/**`, and reference it in VS Code `settings.json` for test intellisense.
4. Implement `tests/setup/vitestSetup.ts` to register `@testing-library/jest-dom`, install `whatwg-fetch`, and start the MSW server in integration mode (see Phase 3); ensure teardown stops the server.
5. Document canonical render helper usage (e.g., `tests/shared/renderWithProviders.ts`) so LLM code always wraps components with any context providers/stores consistently.

## Phase 3 – Deterministic Mock API & Fixtures
1. Create `tests/fixtures/` with JSON (or TypeScript) files describing canonical datasets (users, fields, validators, APIs, permissions). Keep each dataset in its own file plus an `index.ts` aggregator exporting typed helpers.
2. Add a short `SCHEMA.md` under `tests/fixtures/` explaining every entity, optional fields, and how relationships map to UI expectations; this is the contract the mock API and Playwright rely on.
3. Build MSW handlers in `tests/shared/msw/handlers.ts`:
   - Reuse fixture helpers only (no inline literals).
   - Mirror real API routes (method, path, payload) and centralize status-code logic.
4. Expose a `tests/shared/msw/server.ts` that configures MSW for both Vitest (node) and Playwright (browser) contexts so every layer consumes the exact same mock.
5. Version fixtures: add a `package.json` script (e.g., `test:fixtures:validate`) that checks for orphaned fixture IDs or schema drift before tests are allowed to run.

## Phase 4 – Unit & Integration Test Authoring Rules
1. Author tests alongside mirrored directories:
   - `src/lib/components/DashboardLayout.svelte` → `tests/unit/lib/components/DashboardLayout.test.ts`.
   - `src/routes/dashboard/+page.svelte` → `tests/integration/routes/dashboard/page.test.ts`.
2. Use Testing Library patterns exclusively (`screen`, `userEvent`); forbid shallow rendering or custom assertion helpers that hide intent.
3. Capture store-based side effects with dedicated helpers (e.g., `renderWithStore`) and document them once instead of duplicating logic across tests.
4. Encode critical regression scenarios first: landing hero form, Clerk auth boundary states, dashboard table interactions, and mobile-blocked redirect logic.
5. Add `npm` scripts (`test:unit`, `test:integration`, `test:unit:watch`) mapped to Vitest project filters so agents can run the subset they touched.

## Phase 5 – Playwright E2E & Visual Validation
1. Install Playwright (`@playwright/test`) plus browsers via `npx playwright install` once; document this in `docs/README`.
2. Create `playwright.config.ts` that:
   - Loads the same env vars as Vite.
   - Seeds the MSW-powered mock API before each test via a shared fixture loader.
   - Defines two projects: `chromium-smoke` (subset of specs, fast) and `chromium-full` (entire suite with screenshot diffs).
   - Enables trace/video artifacts for failures.
3. Directory layout under `tests/e2e/`:
   - `scenarios/landing.spec.ts`, `scenarios/auth.spec.ts`, `scenarios/dashboard.spec.ts`, `scenarios/mobile-blocked.spec.ts`.
   - `page-objects/` mirroring actual routes (`LandingPage.ts`, `DashboardPage.ts`), each consuming selectors derived from the real component structure to minimize drift.
   - `fixtures/` re-exporting the shared JSON so Playwright and Vitest stay in sync.
4. Add visual regression checkpoints using `expect(page).toHaveScreenshot()` at key UI states (hero, dashboard table, drawer) after seeding deterministic data; store baselines under `tests/e2e/__screenshots__`.
5. Document a strict policy for updating baselines (e.g., require manual review + PR note) to prevent accidental acceptance of regressions.

## Phase 6 – CI & Automation
1. Introduce npm scripts:
   - `test:unit` → `vitest run --project unit`.
   - `test:integration` → `vitest run --project integration`.
   - `test:e2e:smoke` → `playwright test --project chromium-smoke`.
   - `test:e2e:full` → `playwright test --project chromium-full`.
2. Add a GitHub Actions workflow (e.g., `.github/workflows/tests.yml`) with jobs:
   - `lint-and-typecheck`: run `npm run check`.
   - `unit-integration`: execute `test:unit` and `test:integration`.
   - `playwright-smoke`: run the smoke project on every PR, upload traces/screenshots as artifacts.
   - `playwright-full`: scheduled nightly job (cron) running both Playwright projects plus collecting coverage.
3. Gate merges on the first three jobs; leave the nightly full suite to catch deeper regressions and notify via Slack/Email on failure.
4. Persist coverage (`coverage/`) and screenshot artifacts using workflow uploads so humans/LLMs can inspect failures without rerunning locally.

## Phase 7 – Governance & Runbooks
1. Append to this document whenever new routes/components are added, specifying which fixture slice and tests must be updated; keep entries terse for LLM parsing.
2. Create `docs/runbooks/testing.md` (or expand this file) with mini playbooks:
   - “Add a new component” checklist (update fixtures, add unit test, add integration test, update page-object).
   - “Update mock API schema” checklist (fixtures, MSW, Playwright fixtures, affected specs).
3. For LLM contributions, mandate the following workflow banner in PR templates:
   - `npm run test:unit`.
   - `npm run test:integration`.
   - `npm run test:e2e:smoke`.
   - Attach Playwright trace bundle when touching UI.
4. Schedule quarterly audits to ensure MSW handlers still match the production API contract and that no test bypasses the shared fixtures.

## Phase 8 – Next Actions Checklist
1. Approve the dependency set and directory layout described above.
2. Implement Phases 0–3 in order (foundation before authoring tests).
3. Stand up Playwright per Phase 5, then wire CI per Phase 6.
4. Document runbooks (Phase 7) immediately after the first green test passes so future LLM work has a reliable reference.

---

## Component & Route Testing Tracker

**Purpose:** Track which components and routes have test coverage. Update this section when adding new features.

### Routes Coverage

| Route | Integration Test | E2E Smoke | E2E Full | Fixtures | MSW Handlers | Notes |
|-------|-----------------|-----------|----------|----------|--------------|-------|
| `/` | ✅ | ✅ | ✅ | N/A | Formspree (external) | Landing page |
| `/signin` | ⚠️ | ✅ | ⚠️ | N/A | Clerk (external) | Auth - needs Clerk mock |
| `/signup` | ⚠️ | ✅ | ⚠️ | N/A | Clerk (external) | Auth - needs Clerk mock |
| `/dashboard` | ✅ | ✅ | ✅ | users, fields, validators, apis | ✅ | Main dashboard |
| `/dashboard/fields` | ⚠️ | ❌ | ❌ | fields | ✅ | Needs E2E tests |
| `/dashboard/types` | ⚠️ | ❌ | ❌ | types | ✅ | Needs E2E tests |
| `/dashboard/validators` | ⚠️ | ❌ | ❌ | validators | ✅ | Needs E2E tests |
| `/mobile-blocked` | ❌ | ✅ | ⚠️ | N/A | N/A | Needs mobile viewport tests |

**Legend:**
- ✅ Complete
- ⚠️ Partial or needs improvement
- ❌ Not implemented

### Component Coverage

| Component | Unit Test | Used In Route | Page Object | Notes |
|-----------|-----------|---------------|-------------|-------|
| `DashboardLayout` | ✅ | `/dashboard/*` | ✅ | Main layout |
| `PageHeader` | ⚠️ | `/dashboard/*` | ✅ | Needs more tests |
| `SearchBar` | ⚠️ | `/dashboard/fields`, etc. | ✅ | Needs interaction tests |
| `FilterPanel` | ⚠️ | `/dashboard/fields`, etc. | ⚠️ | Needs page object |
| `Table` | ✅ | `/dashboard/fields`, etc. | ✅ | Core component |
| `SortableColumn` | ⚠️ | Used in Table | ⚠️ | Needs sorting tests |
| `EmptyState` | ⚠️ | Used in Table | ✅ | Needs tests |
| `Drawer` | ⚠️ | `/dashboard/*` | ✅ | Needs interaction tests |
| `DrawerHeader` | ❌ | Used in Drawer | ❌ | Needs tests |
| `DrawerContent` | ❌ | Used in Drawer | ❌ | Needs tests |
| `DrawerFooter` | ❌ | Used in Drawer | ❌ | Needs tests |
| `Tooltip` | ❌ | Various | ❌ | Needs tests |
| `StatCard` | ⚠️ | `/dashboard` | ✅ | Needs prop validation |

### MSW Handlers Coverage

| Endpoint | Method | Handler | Fixtures | Tests Using | Notes |
|----------|--------|---------|----------|-------------|-------|
| `/api/users` | GET | ✅ | users | Integration | List users |
| `/api/users/:id` | GET | ✅ | users | Integration | Get user by ID |
| `/api/fields` | GET | ✅ | fields | Integration, E2E | List fields |
| `/api/fields/:id` | GET | ✅ | fields | Integration | Get field by ID |
| `/api/fields` | POST | ✅ | fields | Integration | Create field |
| `/api/fields/:id` | PUT | ✅ | fields | Integration | Update field |
| `/api/fields/:id` | DELETE | ✅ | fields | Integration | Delete field |
| `/api/validators` | GET | ✅ | validators | Integration, E2E | List validators |
| `/api/validators/:name` | GET | ✅ | validators | Integration | Get validator |
| `/api/validators` | POST | ✅ | validators | Integration | Create validator |
| `/api/validators/:name` | DELETE | ✅ | validators | Integration | Delete validator |
| `/api/types` | GET | ✅ | types | Integration | List types |
| `/api/types/:name` | GET | ✅ | types | Integration | Get type |
| `/api/endpoints` | GET | ✅ | apis | Integration, E2E | List API endpoints |
| `/api/endpoints/:id` | GET | ✅ | apis | Integration | Get endpoint |
| `/api/endpoints` | POST | ✅ | apis | Integration | Create endpoint |
| `/api/permissions` | GET | ✅ | permissions | Integration | List permissions |
| `/api/roles` | GET | ✅ | roles | Integration | List roles |

### Fixtures Coverage

| Fixture | File | Tests Using | Schema Documented | Validation | Notes |
|---------|------|-------------|-------------------|------------|-------|
| Users | `users.ts` | Integration, E2E | ✅ | ✅ | Complete |
| Fields | `fields.ts` | Integration, E2E | ✅ | ✅ | Complete |
| Validators | `validators.ts` | Integration, E2E | ✅ | ✅ | Complete |
| Types | `types.ts` | Integration, E2E | ✅ | ✅ | Complete |
| APIs | `apis.ts` | Integration, E2E | ✅ | ✅ | Complete |
| Permissions | `permissions.ts` | Integration | ✅ | ✅ | Complete |

### Testing Workflow Checklist

When adding a new component:
- [ ] Create unit test in `tests/unit/lib/components/[category]/`
- [ ] Add integration test if component uses stores/API
- [ ] Update page object if component appears in E2E flow
- [ ] Add E2E test if component is in critical user flow
- [ ] Update this tracker

When adding a new route:
- [ ] Create integration test in `tests/integration/routes/`
- [ ] Create page object in `tests/e2e/page-objects/`
- [ ] Create smoke test in `tests/e2e/scenarios/*.smoke.spec.ts`
- [ ] Create full test in `tests/e2e/scenarios/*.spec.ts`
- [ ] Update MSW handlers if route needs API
- [ ] Add/update fixtures if route needs data
- [ ] Update this tracker

When modifying API:
- [ ] Update fixtures in `tests/fixtures/`
- [ ] Update MSW handlers in `tests/shared/msw/handlers.ts`
- [ ] Run `npm run test:fixtures:validate`
- [ ] Update dependent tests
- [ ] Update fixture schema documentation
- [ ] Update this tracker

### Quarterly Audit Schedule

- **Q1 2025 (Jan-Mar):** Initial implementation complete
- **Q2 2025 (Apr-Jun):** First audit - review handlers vs production API
- **Q3 2025 (Jul-Sep):** Second audit - check for orphaned fixtures
- **Q4 2025 (Oct-Dec):** Third audit - update documentation

### Next Priority Tests

Based on current coverage gaps:

1. **High Priority:**
   - [ ] Complete E2E tests for `/dashboard/fields` route
   - [ ] Complete E2E tests for `/dashboard/types` route
   - [ ] Complete E2E tests for `/dashboard/validators` route
   - [ ] Add Clerk authentication mocking strategy

2. **Medium Priority:**
   - [ ] Add unit tests for Drawer sub-components
   - [ ] Add unit tests for Tooltip component
   - [ ] Improve SearchBar interaction tests
   - [ ] Improve FilterPanel tests and page object

3. **Low Priority:**
   - [ ] Add mobile viewport E2E tests
   - [ ] Add visual regression for all dashboard pages
   - [ ] Add performance benchmarks

# Testing Alignment Plan

## Observed Gaps
- `docs/testing.md` assumes deterministic fixtures shared across _all_ layers, yet Playwright still uses live Svelte stores and never starts the MSW worker (`tests/e2e/global-setup.ts`, `playwright.config.ts` comments).
- Auth smoke tests fail because `AuthPage.isClerkLoaded()` expects a live Clerk widget even when CI injects placeholder keys; no mocking layer exists in `src/lib/clerk.ts` or the auth routes.
- Sidebar markup lacks semantic `nav/aside` elements or deterministic identifiers, so `DashboardPage.sidebar` cannot find `nav, aside` and the smoke suite fails.
- Component/unit coverage described in the tracker (e.g., `DashboardLayout`, `Sidebar`, `StatCard`, `FilterPanel`, drawer subcomponents) is missing; only `tests/unit/lib/utils/sorting.test.ts` and `tests/unit/lib/components/table/Table.test.ts` run today.
- Integration coverage exists only for `src/routes/dashboard/+page.svelte`; routes for `/field-registry`, `/types`, `/validators`, and store-level helpers remain untested.
- E2E suites lack dedicated specs for `/field-registry`, `/types`, `/validators`, and there is no MSW-backed data seeding, contrary to the coverage tracker.
- `src/lib/stores/*.ts` duplicate the same seed data already present in `tests/fixtures/*.ts`, violating the “single source of truth” policy.
- Documentation promises `tests/e2e/__screenshots__/…` and a `docs/runbooks/testing.md` playbook, neither of which exists; `docs/testing.md` therefore diverges from reality.

## Ordered Implementation Steps
1. **Centralize Seed Data**
   1.1 Create `src/lib/stores/initialData.ts` (or similar) exporting the canonical arrays for fields, validators, types, APIs, permissions, and roles that are currently in each store module.  
   1.2 Update `src/lib/stores/{fields,validators,types}.ts` (and any other stores duplicating data) to import from the new module instead of maintaining inline literals.  
   1.3 Refactor `tests/fixtures/*.ts` to import those arrays (or cloning helpers) from `src/lib/stores/initialData.ts` so fixtures and runtime share identical data. Preserve the existing fixture helper functions by wrapping the imported arrays rather than re-declaring them.  
   1.4 Update `tests/fixtures/SCHEMA.md` and `docs/testing.md` to reference the new canonical module so future contributors know where to update data.  
   1.5 Re-run `npm run test:fixtures:validate` to confirm the validation script still passes with the new import paths.

2. **Enable MSW for Playwright**
   2.1 Extend `tests/shared/msw/browser.ts` with exported `startMSW`, `stopMSW`, and `reset` helpers (already stubbed) and ensure they mirror the Node server options (e.g., `onUnhandledRequest`).  
   2.2 Update `tests/e2e/global-setup.ts` to start the browser worker before tests run, seeding it with fixtures so all fetch/XHR calls resolve deterministically.  
   2.3 Add `tests/e2e/global-teardown.ts` (or inline teardown logic) to stop/reset the worker after the suite so repeated runs do not accumulate handlers. Reference it via `globalTeardown` inside `playwright.config.ts`.  
   2.4 Document the new MSW lifecycle in `tests/e2e/README.md` and `docs/testing.md`, and ensure `tests/shared/msw/handlers.ts` remains the only place where API responses are defined.

3. **Mock Clerk for Tests**
   3.1 Introduce a deterministic test mode (e.g., `PUBLIC_CLERK_MOCK=1` or reuse placeholder publishable key detection) inside `src/lib/clerk.ts`. When enabled, short-circuit `initializeClerk()` to populate `clerkState` with a fake user and expose a lightweight stub with `mountSignIn`, `mountSignUp`, and `signOut` no-ops.  
   3.2 Update `/src/routes/signin/+page.svelte` and `/src/routes/signup/+page.svelte` to render a `data-testid="clerk-placeholder"` container whenever the application is in mock mode so Playwright can assert against predictable DOM.  
   3.3 Modify `tests/e2e/scenarios/auth.smoke.spec.ts` to rely on the placeholder container instead of waiting for Clerk’s real iframe, and keep the existing skip guard only for “real key” runs.  
   3.4 Wire the mock flag into Playwright by setting the env var in `playwright.config.ts` (both smoke and full projects) and in the CI workflow jobs so local/CI behavior stay consistent.  
   3.5 Document the mock strategy in `docs/testing.md` under “Clerk authentication mocking strategy.”

4. **Restore Sidebar Semantics to Unblock Smoke Tests**
   4.1 Update `src/lib/components/Sidebar.svelte` so its root element is a `<nav>` (or wraps content in a `<nav>`), includes `role="navigation"`, and exposes deterministic selectors such as `data-testid="dashboard-sidebar"` for the smoke tests.  
   4.2 Align `tests/e2e/page-objects/DashboardPage.ts` with the new selectors instead of querying `nav, aside`.  
   4.3 Re-run `npm run test:e2e:smoke` to verify the “sidebar visible” assertion now passes.

5. **Bring Component Unit Coverage in Line with the Tracker**
   5.1 Enable Vitest’s browser mode (via `test.browser` + Playwright provider) or adopt `@testing-library/svelte`’s `render` helper inside `tests/unit` so `$props()`-based components can be rendered under test. Document the configuration inside `vitest.config.ts` and `tests/README.md`.  
   5.2 Mirror every component folder listed in the tracker inside `tests/unit/lib/components/…` (layout, drawer, search, toast, tooltip, etc.). For each component, add tests covering render guards, slot contracts, and prop defaults. Reuse helper wrappers like `TableTestWrapper.svelte` to avoid duplicating snippet boilerplate.  
   5.3 Move the barrel export “smoke test” (`src/lib/components/index.test.ts`) into the mirrored tests directory (e.g., `tests/unit/lib/components/index.test.ts`) so all tests live under `tests/`, and update imports to keep the compile-time assertions.  
   5.4 Update `docs/testing.md`’s component coverage table only after these tests exist so the ✅/⚠️ indicators stay accurate.

6. **Expand Store & Route Integration Tests**
   6.1 Under `tests/integration/routes/`, mirror each dashboard sub-route: add `field-registry/page.test.ts`, `types/page.test.ts`, and `validators/page.test.ts`. Use real store helpers to assert derived counts, filtering logic, drawer data, and API usage summaries exactly as rendered in the Svelte pages.  
   6.2 Under `tests/integration/lib/stores/`, add targeted suites for `fields`, `validators`, `types`, and any helper modules (e.g., `references.ts`). Verify behaviors such as `searchFields`, `deleteField`, validator usage derivations, and reference blocking, using the unified fixtures from Step 1.  
   6.3 Ensure each new integration suite imports the MSW server setup (already provided via `tests/setup/vitestSetup.ts`) so external requests remain mocked.  
   6.4 Update the “Routes Coverage” table in `docs/testing.md` once the mirrored files exist.

7. **Extend Playwright Coverage to Match Documentation**
   7.1 Create page objects for `/field-registry`, `/types`, and `/validators` (or extend `DashboardPage` with scoped helpers) under `tests/e2e/page-objects/`.  
   7.2 Add smoke specs for each route inside `tests/e2e/scenarios/` covering navigation from the sidebar, table visibility, and primary interactions (filter toggles, sort buttons).  
   7.3 Add full specs exercising multi-column sorting, drawer workflows, and any modal interactions described in the respective Svelte files. When interactions rely on API responses, assert against MSW-provided fixtures so expectations stay deterministic.  
   7.4 For visual regression, configure Playwright’s `expect().toHaveScreenshot()` to write baselines into `tests/e2e/__screenshots__/…` as promised in the docs (set `expect.configure({ toHaveScreenshot: { path: … } })` or use the `screenshotPathPattern` config). Port the existing snapshots from `*-snapshots/` into the new directory and remove the old folders.  
   7.5 Update `docs/testing.md`’s tables so `/dashboard/fields`, `/dashboard/types`, `/dashboard/validators`, and `/mobile-blocked` rows reflect the new smoke/full status.

8. **Add the Missing Testing Runbook & Doc Corrections**
   8.1 Create `docs/runbooks/testing.md` summarizing the checklists from “Testing Workflow Checklist” and detailing how to update fixtures, MSW handlers, and screenshot baselines. Reference it from both `docs/testing.md` and `.github/PULL_REQUEST_TEMPLATE.md`.  
   8.2 In `docs/testing.md`, correct stale statements (e.g., highlight that MSW is now required for E2E, describe the unified seed module, explain where screenshots live) so the document matches the implementation.  
   8.3 Ensure the coverage tracker reflects reality once the earlier steps land, and add guidance on how to update the tracker whenever new routes/components ship.

9. **Verification Sequence**
   - After Steps 1–6: `npm run test`, `npm run test:unit`, `npm run test:integration`, and `npm run test:fixtures:validate`.  
   - After Steps 2–7: `npm run test:e2e:smoke` (CI and local) and `npm run test:e2e:full` (locally or nightly).  
   - After documentation changes: regenerate any badges or links if needed, and ensure CI (`.github/workflows/tests.yml`) references the new env vars introduced above.

Following the ordered steps above will bring the codebase back in sync with the promises in `docs/testing.md`, eliminate flaky Playwright runs, and provide the coverage depth expected by the testing tracker.

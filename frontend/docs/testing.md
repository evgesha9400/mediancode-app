# Testing Documentation

> **Status:** Implementation complete as of 2025-11-25
>
> This document describes the testing strategy and infrastructure for the Median Code SvelteKit application. All tests use the npm-based toolchain (Vitest for unit/integration, Playwright for E2E).

## Table of Contents

1. [Overview](#overview)
2. [Data Sources](#data-sources)
3. [Test Layers](#test-layers)
4. [Test Commands](#test-commands)
5. [Mock Service Worker (MSW)](#mock-service-worker-msw)
6. [Clerk Authentication Testing](#clerk-authentication-testing)
7. [Visual Regression Testing](#visual-regression-testing)
8. [Coverage Tracking](#coverage-tracking)
9. [CI/CD Integration](#cicd-integration)
10. [Development Workflow](#development-workflow)

## Overview

The testing strategy follows a three-layer approach:

1. **Unit Tests** - Test individual components and utilities in isolation
2. **Integration Tests** - Test component interactions with stores and routes
3. **E2E Tests** - Test full user flows in a real browser environment

All tests share the same seed data through centralized fixtures to ensure consistency.

## Data Sources

### Centralized Seed Data

All seed data lives in `src/lib/stores/initialData.ts`. This is the **single source of truth** for:
- Field definitions
- Validator configurations
- Initial application state

**Why centralized?**
- Ensures consistency between runtime stores and test fixtures
- Changes to data happen in ONE place
- Prevents drift between test and production data

### Fixture Pattern

Test fixtures (`tests/fixtures/{fields,validators}.ts`) import from `initialData.ts`:

```typescript
// tests/fixtures/fields.ts
import { initialFields, cloneFields } from '$lib/stores/initialData';

export const mockFields = cloneFields(initialFields);
```

### Clone Helpers

`initialData.ts` provides clone functions for test isolation:

```typescript
// Create deep copy for test mutations
const fieldsForTest = cloneFields(initialFields);
```

### Validation

Run fixture validation to catch schema drift:

```bash
npm run test:fixtures:validate
```

## Test Layers

### Unit Tests (`tests/unit/`)

Test individual components and utilities in isolation.

**Location:** Mirrors `src/lib/` structure
**Example:** `tests/unit/lib/components/table/Table.test.ts`

**Technologies:**
- Vitest
- @testing-library/svelte
- @testing-library/jest-dom

**Run with:**
```bash
npm run test:unit          # Run once
npm run test:unit:watch    # Watch mode
```

### Integration Tests (`tests/integration/`)

Test component interactions with stores and routes.

**Location:** Mirrors `src/routes/` structure
**Example:** `tests/integration/routes/dashboard/page.test.ts`

**Technologies:**
- Vitest
- @testing-library/svelte
- MSW (Mock Service Worker) - for future API mocking

**Run with:**
```bash
npm run test:integration          # Run once
npm run test:integration:watch    # Watch mode
```

### E2E Tests (`tests/e2e/`)

Test full user flows in real browser environment.

**Structure:**
```
tests/e2e/
├── scenarios/           # Test specifications
│   ├── landing.smoke.spec.ts
│   ├── landing.spec.ts
│   ├── auth.smoke.spec.ts
│   ├── dashboard.smoke.spec.ts
│   ├── dashboard.spec.ts
│   └── mobile-blocked.smoke.spec.ts
├── page-objects/        # Page object models
│   ├── LandingPage.ts
│   ├── AuthPage.ts
│   ├── DashboardPage.ts
│   └── MobileBlockedPage.ts
└── __screenshots__/     # Visual regression baselines
    └── scenarios/
        ├── landing.spec.ts/
        └── dashboard.spec.ts/
```

**Technologies:**
- Playwright
- Chromium browser

**Projects:**
- `chromium-smoke` - Fast subset for PR validation (~2 minutes)
- `chromium-full` - Complete suite with visual regression

**Run with:**
```bash
npm run test:e2e:smoke    # Smoke tests only
npm run test:e2e:full     # Full suite with screenshots
npm run test:e2e:ui       # Interactive UI mode
```

## Test Commands

All test commands are defined in `package.json`:

| Command | Purpose | Layer | Duration |
|---------|---------|-------|----------|
| `npm run test` | Run all unit + integration tests | Unit + Integration | ~1s |
| `npm run test:unit` | Run unit tests only | Unit | <1s |
| `npm run test:integration` | Run integration tests only | Integration | <1s |
| `npm run test:unit:watch` | Unit tests in watch mode | Unit | Continuous |
| `npm run test:integration:watch` | Integration tests in watch mode | Integration | Continuous |
| `npm run test:coverage` | Generate coverage report | Unit + Integration | ~2s |
| `npm run test:fixtures:validate` | Validate fixture schema | Fixtures | <1s |
| `npm run test:e2e:smoke` | E2E smoke tests | E2E | ~2 min |
| `npm run test:e2e:full` | Full E2E with screenshots | E2E | ~5 min |
| `npm run test:e2e:ui` | Playwright UI mode | E2E | Interactive |

## Mock Service Worker (MSW)

### Current Status (Decision D1)

**MSW infrastructure is fully configured and ready for future use.**

**Why not active?**
The application currently uses Svelte stores for data (not API endpoints). Data flows:
```
src/lib/stores/initialData.ts → stores → components
```

**Infrastructure in place:**
- ✅ MSW service worker: `static/mockServiceWorker.js`
- ✅ Request handlers: `tests/shared/msw/handlers.ts`
- ✅ Browser worker: `tests/shared/msw/browser.ts`
- ✅ Server worker: `tests/shared/msw/server.ts`
- ✅ Vitest integration: Active in `tests/setup/vitestSetup.ts`

**When to enable for E2E:**
When API endpoints are added, activate MSW by:

1. Import in `tests/e2e/global-setup.ts`:
   ```typescript
   import { startMSW } from '../shared/msw/browser';
   await startMSW();
   ```

2. Update handlers to match actual API routes

3. Ensure handlers use fixtures from `tests/fixtures/`

### MSW Setup Locations

**Vitest (Unit/Integration):** `tests/setup/vitestSetup.ts`
```typescript
import { server } from '../shared/msw/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Playwright (E2E):** Ready in `tests/shared/msw/browser.ts`
```typescript
export async function startMSW() {
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' }
  });
}
```

## Clerk Authentication Testing

### Mock Mode (Decision D2)

E2E tests run in **Clerk mock mode** to avoid external API dependencies.

**Implementation:**
- Environment variable: `VITE_CLERK_MOCK_MODE=true`
- Set in: `playwright.config.ts` webServer env
- Enabled in: `src/lib/clerk.ts`

**Mock Behavior:**
When mock mode is active, Clerk renders placeholder components:

```html
<div class="cl-component" data-clerk-component="sign-in" data-testid="clerk-mock-signin">
  <div class="text-center p-8 border border-mono-200 rounded-lg bg-white">
    <i class="fa-solid fa-vial text-4xl text-mono-400"></i>
    <h2 class="text-xl font-semibold text-mono-900 mb-2">Mock Sign In</h2>
    <p class="text-mono-600">Clerk is running in mock mode for testing</p>
  </div>
</div>
```

**Test Assertions:**
```typescript
// In tests/e2e/scenarios/auth.smoke.spec.ts
const isMockMode = process.env.VITE_CLERK_MOCK_MODE === 'true';

if (isMockMode) {
  const mockComponent = page.locator('[data-testid="clerk-mock-signin"]');
  await expect(mockComponent).toBeVisible();
}
```

**Real Clerk Mode:**
To test with real Clerk (not recommended for CI):
1. Remove `VITE_CLERK_MOCK_MODE=true` from `playwright.config.ts`
2. Ensure `PUBLIC_CLERK_PUBLISHABLE_KEY` is set
3. Tests will interact with actual Clerk API

## Visual Regression Testing

### Screenshot Management (Decision D3)

All visual regression baselines live in **`tests/e2e/__screenshots__/`**

**Directory Structure:**
```
tests/e2e/__screenshots__/
├── README.md                      # Update rules and documentation
└── scenarios/
    ├── landing.spec.ts/
    │   ├── hero-heading-chromium-full-darwin.png
    │   ├── features-section-chromium-full-darwin.png
    │   └── landing-full-page-chromium-full-darwin.png
    └── dashboard.spec.ts/
        ├── stat-cards-chromium-full-darwin.png
        └── dashboard-full-page-chromium-full-darwin.png
```

**Configuration:**
Set in `playwright.config.ts`:
```typescript
snapshotPathTemplate: 'tests/e2e/__screenshots__/{testFilePath}/{arg}{ext}'
```

### Updating Baselines

**Update all snapshots:**
```bash
npm run test:e2e:full -- --update-snapshots
```

**Update specific test:**
```bash
npx playwright test tests/e2e/scenarios/landing.spec.ts --update-snapshots
```

**Update specific project:**
```bash
npx playwright test --project chromium-full --update-snapshots
```

### Review Process

Before updating baselines:

1. View the diff in Playwright HTML report:
   ```bash
   npx playwright show-report
   ```

2. Verify changes are intentional

3. Compare old vs new side-by-side

4. Document reason in PR description

### Snapshot Best Practices

1. **Consistency** - Run in same environment
2. **Stability** - Wait for animations/loading
3. **Isolation** - One snapshot per component state
4. **Naming** - Use descriptive names
5. **Platform** - Include platform suffix for OS-specific rendering

## Coverage Tracking

### Current Coverage

Run coverage report:
```bash
npm run test:coverage
```

**Coverage Thresholds:**
Currently set to 0% (no enforcement) in `vitest.config.ts`

**Coverage Report Formats:**
- Text (console output)
- HTML (`coverage/index.html`)
- JSON (`coverage/coverage-final.json`)
- LCOV (`coverage/lcov.info`)

### Component & Route Coverage

| Route | Integration Test | E2E Smoke | E2E Full | Notes |
|-------|-----------------|-----------|----------|-------|
| `/` | ✅ | ✅ | ✅ | Landing page complete |
| `/signin` | ✅ | ✅ | ✅ | Clerk mock mode active |
| `/signup` | ✅ | ✅ | ✅ | Clerk mock mode active |
| `/dashboard` | ✅ | ✅ | ✅ | Main dashboard complete |
| `/mobile-blocked` | ⚠️ | ✅ | ⚠️ | Basic tests only |

| Component | Unit Test | Notes |
|-----------|-----------|-------|
| `Table` | ✅ | Complete with sorting |
| `Drawer` components | ⚠️ | Needs interaction tests |
| `Tooltip` | ❌ | Not tested |
| `StatCard` | ⚠️ | Basic tests only |

## CI/CD Integration

### GitHub Actions (Future)

Recommended workflow structure:

```yaml
name: Tests
on: [pull_request]

jobs:
  lint-typecheck:
    - npm run check

  unit-integration:
    - npm run test
    - npm run test:coverage

  e2e-smoke:
    - npm run test:e2e:smoke
    - Upload artifacts on failure

  e2e-full:
    - Scheduled nightly
    - npm run test:e2e:full
    - Upload screenshot diffs
```

### Merge Gates

Recommended gates for PR merging:
- ✅ Linting and type checking pass
- ✅ Unit and integration tests pass
- ✅ E2E smoke tests pass
- ⚠️ E2E full suite (nightly, not blocking)

## Development Workflow

### Adding a New Component

1. Create component in `src/lib/components/[category]/`
2. Create unit test in `tests/unit/lib/components/[category]/`
3. Export through barrel export in `src/lib/components/index.ts`
4. If used in critical flow, add to page object
5. Run tests: `npm run test:unit`

### Adding a New Route

1. Create route in `src/routes/[path]/+page.svelte`
2. Create integration test in `tests/integration/routes/[path]/page.test.ts`
3. Create page object in `tests/e2e/page-objects/`
4. Create smoke test in `tests/e2e/scenarios/*.smoke.spec.ts`
5. Create full test in `tests/e2e/scenarios/*.spec.ts`
6. Run all tests: `npm run test && npm run test:e2e:smoke`

### Modifying Data Structures

1. Update `src/lib/stores/initialData.ts`
2. Run fixture validation: `npm run test:fixtures:validate`
3. Update dependent tests
4. Verify no regressions: `npm run test`

### Before Committing

Run the full test suite:
```bash
npm run check                  # Type checking
npm run test                   # Unit + integration
npm run test:e2e:smoke        # E2E smoke tests
```

### Pre-Deployment Checklist

Before pushing to main:
- [ ] `npm run check` passes (0 errors)
- [ ] `npm run test` passes (all tests green)
- [ ] `npm run test:e2e:smoke` passes
- [ ] Review Playwright traces for any warnings
- [ ] Visual regression diffs reviewed (if any)

## Testing Philosophy

This project follows an **LLM-centric testing strategy**:

1. **Deterministic Fixtures** - All test data comes from centralized sources
2. **Pattern Recognition** - Tests follow consistent structure for LLM understanding
3. **Documentation-First** - Every decision is documented inline
4. **Single Source of Truth** - `initialData.ts` is the canonical data source
5. **Future-Ready** - MSW infrastructure ready for when API endpoints are added

## Troubleshooting

### Tests Failing Locally But Pass in CI

**Likely Cause:** Environment differences
**Solution:** Ensure dependencies are up to date: `npm install`

### Clerk Tests Failing

**Check:** Mock mode is enabled
```bash
echo $VITE_CLERK_MOCK_MODE  # Should be 'true' in E2E
```

### Visual Regression Failures

**Common Causes:**
- Font rendering differences (OS-specific)
- Timing issues (animations not complete)
- Browser version differences

**Solutions:**
- Add explicit `waitFor()` before screenshot
- Use `maxDiffPixels` tolerance
- Hide dynamic content (timestamps, etc.)

### MSW Not Intercepting Requests

**Check:**
1. Service worker exists: `ls static/mockServiceWorker.js`
2. Handlers are registered: Review `tests/shared/msw/handlers.ts`
3. Server is started: Check `tests/setup/vitestSetup.ts`

**Regenerate service worker:**
```bash
npx msw init static --save
```

## Next Steps

Based on current implementation:

**High Priority:**
- [ ] Increase unit test coverage for Drawer components
- [ ] Add Tooltip component tests
- [ ] Improve mobile-blocked E2E coverage

**Medium Priority:**
- [ ] Add performance benchmarks
- [ ] Set up GitHub Actions CI
- [ ] Increase coverage thresholds

**Low Priority:**
- [ ] Add accessibility tests
- [ ] Add cross-browser testing (Firefox, Safari)
- [ ] Add network condition testing

## References

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [Svelte Testing Best Practices](https://svelte.dev/docs/testing)

---

**Last Updated:** 2025-11-25
**Status:** ✅ Implementation Complete
**Next Review:** Q1 2026

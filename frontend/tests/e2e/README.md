# Playwright E2E Tests

This directory contains end-to-end tests for Median Code using Playwright.

## Directory Structure

```
tests/e2e/
├── scenarios/           # Test scenarios
│   ├── *.smoke.spec.ts # Smoke tests (fast, runs on every PR)
│   └── *.spec.ts       # Full tests (comprehensive, runs nightly)
├── page-objects/        # Page object models
├── fixtures/            # Test fixtures (re-exported from shared)
├── __screenshots__/     # Visual regression baselines
├── global-setup.ts      # Global test setup (MSW initialization)
└── README.md           # This file
```

## Test Projects

We maintain two Playwright test projects:

### 1. chromium-smoke

- **Purpose:** Fast validation for PRs
- **Files:** `*.smoke.spec.ts`
- **Timeout:** 15 seconds per test
- **Execution:** Every PR via GitHub Actions
- **Target:** ~2 minutes total runtime

**Run locally:**
```bash
npm run test:e2e:smoke
```

### 2. chromium-full

- **Purpose:** Comprehensive testing with visual regression
- **Files:** `*.spec.ts` (includes smoke tests)
- **Timeout:** 30 seconds per test
- **Execution:** Nightly via GitHub Actions
- **Target:** Complete coverage

**Run locally:**
```bash
npm run test:e2e:full
```

## MSW Integration

**IMPORTANT: MSW is NOT currently active for E2E tests.**

The E2E tests currently run against the real application with Svelte stores providing data. While the MSW service worker file exists in `static/mockServiceWorker.js` and is verified during global setup, the worker is NOT started or initialized.

Current state:
1. **Global Setup:** `global-setup.ts` only verifies the service worker file exists - it does NOT start MSW
2. **Fixtures:** Available in `tests/fixtures/` but NOT currently used by E2E tests
3. **Handlers:** Defined in `tests/shared/msw/handlers.ts` but NOT active
4. **Browser Mode:** MSW is configured but NOT running in browser for Playwright tests

What this means:
- E2E tests interact with real Svelte stores (not mocked data)
- Network requests to external services (Formspree, Clerk, etc.) are NOT mocked
- Tests may hit live endpoints unless the app doesn't make external calls
- Test data comes from the application's initial store state

To enable MSW for E2E tests in the future:
1. Import and call `startMSW()` from `tests/shared/msw/browser.ts` in global setup
2. Or implement per-test fixtures that start MSW before each test
3. Ensure fixtures match the real store data to avoid assertion failures

## Page Objects

Page objects encapsulate page interactions and provide a clean API for tests:

- `LandingPage.ts` - Landing page (/)
- `DashboardPage.ts` - Dashboard (/dashboard)
- `AuthPage.ts` - Sign in/Sign up (/signin, /signup)
- `MobileBlockedPage.ts` - Mobile blocking page (/mobile-blocked)

**Example usage:**
```typescript
import { LandingPage } from '../page-objects';

const landingPage = new LandingPage(page);
await landingPage.goto();
await landingPage.submitHeroForm('test@example.com');
```

## Visual Regression Testing

Visual regression tests use Playwright's `toHaveScreenshot()` assertion to detect UI changes.

### Screenshot Locations

Baselines are stored in:
```
tests/e2e/__screenshots__/
├── chromium-smoke/
│   └── [test-name]/
│       └── [screenshot-name].png
└── chromium-full/
    └── [test-name]/
        └── [screenshot-name].png
```

### Updating Baselines

**IMPORTANT:** Screenshot baselines should only be updated when visual changes are intentional.

1. **Review Changes:** Always review screenshot diffs before updating
2. **Update Command:**
   ```bash
   npx playwright test --update-snapshots
   ```
3. **Commit Policy:**
   - Include screenshots in PR
   - Add note in PR description explaining visual changes
   - Require manual review for screenshot updates

### Screenshot Policy

- ✅ **DO:** Take screenshots of key UI states (hero, dashboard, stat cards)
- ✅ **DO:** Disable animations for consistent screenshots
- ✅ **DO:** Use full page screenshots for major pages
- ❌ **DON'T:** Screenshot dynamic content (timestamps, random data)
- ❌ **DON'T:** Update baselines without review
- ❌ **DON'T:** Screenshot auth flows (Clerk UI may change externally)

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Smoke Tests Only
```bash
npm run test:e2e:smoke
```

### Full Tests with Visual Regression
```bash
npm run test:e2e:full
```

### UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npx playwright test --debug
```

### Headed Mode (See Browser)
```bash
npx playwright test --headed
```

## Browser Installation

Playwright requires browsers to be installed:

```bash
npx playwright install chromium
```

For CI environments:
```bash
npx playwright install --with-deps chromium
```

## Environment Variables

Tests use environment variables from `.env`:

- `PLAYWRIGHT_BASE_URL` - Base URL for tests (default: http://localhost:5173)
- Additional env vars from Vite config (loaded via global-setup)

## Authentication in Tests

Authentication flows use Clerk, which requires special handling:

1. **Option 1: Mock Authentication**
   - Use MSW to mock Clerk API responses
   - Set up mock user session in tests

2. **Option 2: Test Tokens**
   - Use Clerk test tokens (if available)
   - Configure in environment variables

3. **Option 3: Skip Auth**
   - Test public routes without authentication
   - Use `test.skip()` for authenticated routes until auth is configured

**Current Status:** Auth tests are placeholders. Choose implementation strategy based on Clerk configuration.

## CI/CD Integration

E2E tests run in GitHub Actions:

- **PR Checks:** Smoke tests on every PR
- **Nightly:** Full tests with visual regression
- **Artifacts:** Screenshots and traces uploaded on failure

See `.github/workflows/tests.yml` for configuration.

## Troubleshooting

### Tests Fail Locally But Pass in CI

- Check viewport size (CI uses 1280x720 by default)
- Verify environment variables are set correctly
- Check that Svelte stores are initialized with the same data

### Visual Regression Failures

- Review screenshot diff in `playwright-report/index.html`
- Check if changes are intentional
- Update baselines if needed: `npx playwright test --update-snapshots`

### External Network Requests in E2E Tests

Since MSW is not currently enabled for E2E tests:
- Tests may make real network requests (Formspree, Clerk, etc.)
- To avoid this, ensure the app uses local stores and doesn't trigger external API calls during tests
- If you need to enable MSW, follow the steps in the "MSW Integration" section above

### Timeout Errors

- Increase timeout in test or config
- Check if page is waiting for external resources
- If external API calls are being made, consider enabling MSW to mock them

## Best Practices

1. **Use Page Objects:** Don't query elements directly in tests
2. **Deterministic Data:** Always use fixtures, never hardcode test data
3. **Isolation:** Each test should be independent
4. **Cleanup:** Page objects handle state; avoid manual cleanup
5. **Assertions:** Use Playwright's built-in assertions (`expect`)
6. **Waits:** Use `waitFor()` instead of `setTimeout()`
7. **Selectors:** Prefer semantic selectors (role, text) over CSS classes

## Adding New Tests

When adding a new page or feature:

1. **Create Page Object:**
   - Add new page object in `page-objects/`
   - Export from `page-objects/index.ts`

2. **Create Test Scenarios:**
   - Add smoke test: `[name].smoke.spec.ts`
   - Add full test: `[name].spec.ts`

3. **Update Fixtures (if needed):**
   - Add new fixtures in `tests/fixtures/`
   - Update MSW handlers in `tests/shared/msw/handlers.ts`

4. **Document:**
   - Update this README
   - Add to runbooks in `docs/runbooks/testing.md`

## Further Reading

- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Project Testing Documentation](../../docs/testing.md)

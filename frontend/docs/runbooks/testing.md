# Testing Runbooks

This document provides step-by-step procedures for common testing tasks. Follow these runbooks to ensure consistency and avoid common pitfalls.

## Table of Contents

1. [Add a New Component](#add-a-new-component)
2. [Update Mock API Schema](#update-mock-api-schema)
3. [Update Screenshot Baselines](#update-screenshot-baselines)
4. [Debug Failing Tests](#debug-failing-tests)
5. [Add a New Route](#add-a-new-route)
6. [Quarterly Fixture Audit](#quarterly-fixture-audit)

---

## Add a New Component

**When:** Creating a new Svelte component in `src/lib/components/`

**Steps:**

1. **Create the component** in the appropriate directory:
   ```bash
   # Example: Creating a new button component
   touch src/lib/components/button/Button.svelte
   ```

2. **Add unit test** mirroring the component location:
   ```bash
   # Mirror the src structure in tests/unit
   mkdir -p tests/unit/lib/components/button
   touch tests/unit/lib/components/button/Button.test.ts
   ```

3. **Write the unit test** using Testing Library patterns:
   ```typescript
   import { render, screen } from '@testing-library/svelte';
   import { describe, it, expect } from 'vitest';
   import Button from '$lib/components/button/Button.svelte';

   describe('Button', () => {
     it('should render with text', () => {
       render(Button, { props: { text: 'Click me' } });
       expect(screen.getByText('Click me')).toBeInTheDocument();
     });
   });
   ```

4. **Run unit tests** to verify:
   ```bash
   npm run test:unit
   ```

5. **Add integration test** if component has state/store interactions:
   ```bash
   mkdir -p tests/integration/lib/components/button
   touch tests/integration/lib/components/button/Button.test.ts
   ```

6. **Update page object** if component appears in E2E scenarios:
   ```typescript
   // In tests/e2e/page-objects/SomePage.ts
   readonly newButton: Locator;

   constructor(page: Page) {
     this.newButton = page.locator('button[data-testid="new-button"]');
   }
   ```

7. **Add E2E test** if component is part of critical user flow:
   ```typescript
   // In appropriate spec file
   test('should interact with new button', async () => {
     await somePage.newButton.click();
     // assertions...
   });
   ```

8. **Run all tests** before committing:
   ```bash
   npm run test:unit
   npm run test:integration
   npm run test:e2e:smoke
   ```

**Checklist:**
- [ ] Component created in `src/lib/components/`
- [ ] Unit test added in `tests/unit/lib/components/`
- [ ] Integration test added (if needed)
- [ ] Page object updated (if in E2E flow)
- [ ] E2E test added (if critical flow)
- [ ] All tests passing

---

## Update Mock API Schema

**When:** Adding/modifying API endpoints or data structures

**Steps:**

1. **Update fixture types** in `tests/fixtures/`:
   ```bash
   # Edit the relevant fixture file
   vim tests/fixtures/fields.ts
   ```

2. **Add/modify fixture data**:
   ```typescript
   // Example: Adding a new field
   export const mockFields: Field[] = [
     // existing fields...
     {
       id: 'field-new',
       name: 'newField',
       type: 'string',
       // ... other properties
     }
   ];
   ```

3. **Update fixture helpers** if needed:
   ```typescript
   export function getNewFieldsByType(type: string): Field[] {
     return mockFields.filter(f => f.type === type);
   }
   ```

4. **Update MSW handlers** in `tests/shared/msw/handlers.ts`:
   ```typescript
   // Add new endpoint or modify existing
   http.post('/api/new-endpoint', async ({ request }) => {
     const data = await request.json();
     return HttpResponse.json({ ...data, id: `new-${Date.now()}` }, { status: 201 });
   }),
   ```

5. **Validate fixtures**:
   ```bash
   npm run test:fixtures:validate
   ```

6. **Update tests** that depend on the schema:
   ```bash
   # Search for tests using the modified fixtures
   grep -r "mockFields" tests/
   ```

7. **Run all affected tests**:
   ```bash
   npm run test:unit
   npm run test:integration
   npm run test:e2e:smoke
   ```

8. **Update fixture documentation** in `tests/fixtures/SCHEMA.md`:
   ```markdown
   ### Field
   - `id`: Unique identifier
   - `name`: Field name (required, new: must be camelCase)
   - `type`: Field type (required)
   ```

**Checklist:**
- [ ] Fixture data updated in `tests/fixtures/`
- [ ] Fixture helpers updated (if needed)
- [ ] MSW handlers updated in `tests/shared/msw/handlers.ts`
- [ ] Fixture validation passing
- [ ] Dependent tests updated
- [ ] All tests passing
- [ ] Documentation updated

---

## Update Screenshot Baselines

**When:** Intentional UI changes that affect visual appearance

**IMPORTANT:** Never update baselines without review. Always verify changes are intentional.

**Steps:**

1. **Review failing visual regression tests**:
   ```bash
   npm run test:e2e:full
   ```

2. **Open Playwright report** to view diffs:
   ```bash
   npx playwright show-report
   ```

3. **Review each screenshot diff**:
   - Click on failed test
   - View "Expected" vs "Actual" vs "Diff"
   - Verify changes are intentional

4. **Document changes** in a file:
   ```bash
   # Create a changelog for visual updates
   echo "## Visual Changes - $(date +%Y-%m-%d)" > visual-changes.md
   echo "- Component: Button" >> visual-changes.md
   echo "- Change: Updated border radius from 4px to 6px" >> visual-changes.md
   echo "- Reason: Design system update" >> visual-changes.md
   ```

5. **Update baselines** for specific tests:
   ```bash
   # Update all baselines
   npx playwright test --update-snapshots

   # Or update specific test
   npx playwright test landing.spec.ts --update-snapshots
   ```

6. **Verify updated baselines**:
   ```bash
   npm run test:e2e:full
   ```

7. **Commit with clear message**:
   ```bash
   git add tests/e2e/__screenshots__/
   git commit -m "test(e2e): update visual baselines for button redesign

   - Updated button border radius from 4px to 6px
   - Affects landing page hero, dashboard stat cards
   - Part of design system update (ticket #123)"
   ```

8. **Create PR** with screenshot comparison:
   - Include before/after images in PR description
   - Link to design ticket/spec
   - Request visual review from design team

**Checklist:**
- [ ] Visual diffs reviewed in Playwright report
- [ ] Changes verified as intentional
- [ ] Visual changes documented
- [ ] Baselines updated
- [ ] Tests passing with new baselines
- [ ] Committed with descriptive message
- [ ] PR created with visual comparison

**Anti-Patterns to Avoid:**
- ❌ Running `--update-snapshots` without reviewing diffs
- ❌ Updating baselines to "fix" failing tests
- ❌ Not documenting why baselines changed
- ❌ Committing baseline updates without PR review

---

## Debug Failing Tests

**When:** Tests fail locally or in CI

### Strategy 1: Unit/Integration Test Failures

1. **Run test in watch mode**:
   ```bash
   npm run test:unit:watch
   ```

2. **Add debug output** to test:
   ```typescript
   test('failing test', () => {
     const result = someFunction();
     console.log('Debug output:', result); // Add logging
     expect(result).toBe(expected);
   });
   ```

3. **Use Vitest UI** for visual debugging:
   ```bash
   npx vitest --ui
   ```

4. **Check MSW handlers**:
   ```typescript
   // Add logging to handlers
   http.get('/api/endpoint', ({ request }) => {
     console.log('MSW intercepted:', request.url);
     return HttpResponse.json(mockData);
   }),
   ```

5. **Verify fixtures** are correct:
   ```bash
   npm run test:fixtures:validate
   ```

### Strategy 2: Playwright E2E Test Failures

1. **Run in headed mode** to see browser:
   ```bash
   npx playwright test --headed
   ```

2. **Use debug mode** for step-by-step execution:
   ```bash
   npx playwright test --debug
   ```

3. **Check test results** and traces:
   ```bash
   npx playwright show-report
   ```

4. **View screenshots** from failed tests:
   ```bash
   open test-results/[test-name]/[screenshot].png
   ```

5. **Add explicit waits** if timing issues:
   ```typescript
   await page.waitForSelector('[data-testid="loaded"]');
   ```

6. **Check MSW initialization**:
   ```typescript
   // In test
   test.beforeEach(async ({ page }) => {
     await page.goto('/');
     // Check console for MSW messages
     page.on('console', msg => console.log('Browser:', msg.text()));
   });
   ```

### Strategy 3: CI-Specific Failures

1. **Download artifacts** from GitHub Actions:
   - Go to failed workflow run
   - Download "playwright-smoke-traces" or "playwright-smoke-screenshots"

2. **View trace locally**:
   ```bash
   npx playwright show-trace path/to/trace.zip
   ```

3. **Check environment differences**:
   - Viewport size (CI: 1280x720)
   - Environment variables
   - Timing/race conditions

4. **Reproduce locally with CI settings**:
   ```bash
   CI=true npm run test:e2e:smoke
   ```

5. **Add retry logic** for flaky tests:
   ```typescript
   test.describe.configure({ retries: 2 });
   ```

**Common Issues:**

| Issue | Symptom | Solution |
|-------|---------|----------|
| MSW not intercepting | Network errors in tests | Check MSW initialization in global-setup |
| Timing issues | Element not found | Add explicit waits with `waitFor()` |
| Fixture mismatch | Unexpected data in tests | Run `npm run test:fixtures:validate` |
| Visual regression | Screenshot diff | Review if intentional, update baseline |
| Environment vars | Auth failures | Check `.env` and CI secrets |

---

## Add a New Route

**When:** Creating a new page in `src/routes/`

**Steps:**

1. **Create route files**:
   ```bash
   mkdir -p src/routes/new-page
   touch src/routes/new-page/+page.svelte
   touch src/routes/new-page/+page.ts  # if needed
   ```

2. **Add fixtures** if route needs data:
   ```bash
   # Add to existing fixture or create new one
   vim tests/fixtures/newPageData.ts
   ```

3. **Create page object** for E2E tests:
   ```bash
   touch tests/e2e/page-objects/NewPage.ts
   ```

4. **Implement page object**:
   ```typescript
   import { type Page, type Locator } from '@playwright/test';

   export class NewPage {
     readonly page: Page;
     readonly heading: Locator;

     constructor(page: Page) {
       this.page = page;
       this.heading = page.locator('h1');
     }

     async goto() {
       await this.page.goto('/new-page');
     }
   }
   ```

5. **Export page object**:
   ```typescript
   // In tests/e2e/page-objects/index.ts
   export { NewPage } from './NewPage';
   ```

6. **Create smoke test**:
   ```bash
   touch tests/e2e/scenarios/new-page.smoke.spec.ts
   ```

7. **Implement smoke test**:
   ```typescript
   import { test, expect } from '@playwright/test';
   import { NewPage } from '../page-objects';

   test.describe('New Page - Smoke Tests', () => {
     test('should load page', async ({ page }) => {
       const newPage = new NewPage(page);
       await newPage.goto();
       await expect(newPage.heading).toBeVisible();
     });
   });
   ```

8. **Create full test**:
   ```bash
   touch tests/e2e/scenarios/new-page.spec.ts
   ```

9. **Add integration test** if route has load function:
   ```bash
   mkdir -p tests/integration/routes/new-page
   touch tests/integration/routes/new-page/page.test.ts
   ```

10. **Update MSW handlers** if route needs API:
    ```typescript
    // In tests/shared/msw/handlers.ts
    http.get('/api/new-page-data', () => {
      return HttpResponse.json(mockNewPageData);
    }),
    ```

11. **Update navigation** in related page objects:
    ```typescript
    // If new page is in navigation
    readonly newPageLink: Locator;

    async navigateToNewPage() {
      await this.newPageLink.click();
    }
    ```

12. **Run all tests**:
    ```bash
    npm run test:unit
    npm run test:integration
    npm run test:e2e:smoke
    ```

**Checklist:**
- [ ] Route created in `src/routes/`
- [ ] Fixtures added (if needed)
- [ ] MSW handlers updated (if API needed)
- [ ] Page object created
- [ ] Page object exported
- [ ] Smoke test created
- [ ] Full test created
- [ ] Integration test created (if load function)
- [ ] Navigation updated in related page objects
- [ ] All tests passing

---

## Quarterly Fixture Audit

**When:** Every 3 months or when production API changes significantly

**Purpose:** Ensure MSW handlers match production API contract

**Steps:**

1. **Review production API documentation**:
   - Compare endpoints with MSW handlers
   - Check request/response schemas
   - Note any new endpoints

2. **Compare fixtures with production data**:
   ```bash
   # Export production data samples (sanitized)
   # Compare structure with fixtures
   ```

3. **Check for orphaned fixtures**:
   ```bash
   # Find fixtures not used in tests
   npm run test:fixtures:validate
   ```

4. **Verify fixture relationships**:
   - Check foreign key references
   - Ensure data consistency
   - Validate mock data realism

5. **Update handlers** to match API changes:
   ```typescript
   // Update response format, status codes, headers
   ```

6. **Add new endpoints** that were added to production:
   ```typescript
   http.get('/api/new-endpoint', () => {
     return HttpResponse.json(mockNewData);
   }),
   ```

7. **Deprecate old handlers** for removed endpoints:
   ```typescript
   // Remove or comment out deprecated handlers
   // Add note in commit message
   ```

8. **Run full test suite**:
   ```bash
   npm run test:unit
   npm run test:integration
   npm run test:e2e:full
   ```

9. **Document changes** in `tests/fixtures/SCHEMA.md`:
   ```markdown
   ## Changelog

   ### 2025-01-24
   - Added `newField` property to Field type
   - Deprecated `oldEndpoint` handler
   - Updated User fixture to include `role` property
   ```

10. **Create audit report**:
    ```markdown
    # Fixture Audit Report - Q1 2025

    ## Summary
    - Handlers reviewed: 25
    - Handlers updated: 3
    - New handlers added: 2
    - Handlers deprecated: 1

    ## Changes
    - Updated /api/fields to include `validation` property
    - Added /api/export endpoint
    - Deprecated /api/legacy-fields

    ## Action Items
    - [ ] Monitor new endpoints for usage patterns
    - [ ] Clean up deprecated handlers in Q2
    ```

**Checklist:**
- [ ] Production API reviewed
- [ ] Fixtures compared with production data
- [ ] Orphaned fixtures identified
- [ ] Handlers updated to match API
- [ ] New endpoints added
- [ ] Deprecated handlers removed/noted
- [ ] Full test suite passing
- [ ] Schema documentation updated
- [ ] Audit report created

---

## Quick Reference

### Test Commands

```bash
# Unit tests
npm run test:unit              # Run once
npm run test:unit:watch        # Watch mode

# Integration tests
npm run test:integration       # Run once
npm run test:integration:watch # Watch mode

# E2E tests
npm run test:e2e              # All E2E tests
npm run test:e2e:smoke        # Smoke tests only
npm run test:e2e:full         # Full suite
npm run test:e2e:ui           # Interactive UI mode

# Coverage
npm run test:coverage         # Generate coverage report

# Validation
npm run test:fixtures:validate # Validate fixtures
npm run check                  # Type check
```

### Debugging Commands

```bash
# Playwright
npx playwright test --headed           # See browser
npx playwright test --debug            # Debug mode
npx playwright show-report             # View report
npx playwright show-trace trace.zip    # View trace

# Vitest
npx vitest --ui                        # Visual UI
npx vitest run --reporter=verbose      # Detailed output
```

### File Locations

```
tests/
├── unit/               # Unit tests (mirror src/)
├── integration/        # Integration tests (mirror src/routes, stores)
├── e2e/
│   ├── scenarios/      # Test scenarios
│   ├── page-objects/   # Page object models
│   └── fixtures/       # Re-exported fixtures
├── fixtures/           # Shared test data
├── shared/
│   └── msw/           # MSW handlers
└── setup/             # Test setup files
```

---

## Support

- **Documentation:** `/docs/testing.md`
- **E2E Guide:** `/tests/e2e/README.md`
- **Fixtures Schema:** `/tests/fixtures/SCHEMA.md`
- **CI Workflow:** `/.github/workflows/tests.yml`

# Test Directory Structure

> This document defines the canonical testing structure for the Median Code project. All test files and directories MUST follow these conventions to ensure predictability for both human developers and LLM agents.

**Last Updated:** 2025-11-24

## Directory Layout

```
tests/
├── unit/                    # Unit tests for isolated components and utilities
│   └── lib/
│       ├── components/      # Component unit tests (mirroring src/lib/components/)
│       │   ├── drawer/
│       │   ├── layout/
│       │   ├── search/
│       │   ├── table/
│       │   ├── toast/
│       │   └── tooltip/
│       ├── stores/          # Store unit tests (mirroring src/lib/stores/)
│       ├── utils/           # Utility function tests (mirroring src/lib/utils/)
│       └── types/           # Type validation tests (mirroring src/lib/types/)
│
├── integration/             # Integration tests for routes and store interactions
│   ├── routes/              # Route integration tests (mirroring src/routes/)
│   └── lib/
│       └── stores/          # Store integration tests with MSW
│
├── e2e/                     # End-to-end Playwright tests
│   ├── scenarios/           # E2E test scenarios by feature area
│   │   ├── landing.spec.ts
│   │   ├── auth.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── field-registry.spec.ts
│   │   ├── types.spec.ts
│   │   ├── validators.spec.ts
│   │   └── mobile-blocked.spec.ts
│   ├── page-objects/        # Page object models
│   │   ├── LandingPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── FieldRegistryPage.ts
│   │   ├── TypesPage.ts
│   │   └── ValidatorsPage.ts
│   └── fixtures/            # Re-exports shared fixtures for Playwright
│
├── fixtures/                # Shared test data and fixtures
│   ├── users.ts
│   ├── fields.ts
│   ├── types.ts
│   ├── validators.ts
│   ├── apis.ts
│   ├── permissions.ts
│   ├── index.ts             # Aggregator exporting all fixtures
│   └── SCHEMA.md            # Entity relationships and contracts
│
├── shared/                  # Shared test utilities
│   ├── msw/                 # Mock Service Worker configuration
│   │   ├── handlers.ts      # MSW request handlers
│   │   └── server.ts        # MSW server setup (Vitest + Playwright)
│   ├── renderWithProviders.ts  # Component render helper
│   └── testUtils.ts         # Additional test utilities
│
├── setup/                   # Test setup and configuration
│   └── vitestSetup.ts       # Vitest global setup
│
└── README.md                # This file
```

## Mirroring Rules

### 1. Unit Tests Mirror `src/lib/`

For every file in `src/lib/`, there should be a corresponding test file in `tests/unit/lib/`:

**Example:**
- `src/lib/components/Drawer.svelte` → `tests/unit/lib/components/Drawer.test.ts`
- `src/lib/utils/sorting.ts` → `tests/unit/lib/utils/sorting.test.ts`
- `src/lib/stores/fields.ts` → `tests/unit/lib/stores/fields.test.ts`

**Component Categories:**
Component subdirectories (`drawer/`, `table/`, etc.) are mirrored exactly:
- `src/lib/components/drawer/DrawerHeader.svelte` → `tests/unit/lib/components/drawer/DrawerHeader.test.ts`

### 2. Integration Tests Mirror `src/routes/`

For every route in `src/routes/`, there should be a corresponding integration test:

**Example:**
- `src/routes/dashboard/+page.svelte` → `tests/integration/routes/dashboard/page.test.ts`
- `src/routes/field-registry/+page.svelte` → `tests/integration/routes/field-registry/page.test.ts`
- `src/routes/+layout.svelte` → `tests/integration/routes/layout.test.ts`

**Naming Convention:**
- Route files with `+` prefix (e.g., `+page.svelte`) → test files without `+` (e.g., `page.test.ts`)
- Preserves SvelteKit semantics while being filesystem-friendly

### 3. E2E Tests Organized by Feature

E2E tests are NOT mirrored 1:1 with routes. Instead, they're organized by user-facing features:

**Scenarios:**
- `landing.spec.ts` - Landing page interactions (hero, forms, navigation)
- `auth.spec.ts` - Authentication flows (sign-in, sign-up, sign-out)
- `dashboard.spec.ts` - Dashboard overview and navigation
- `field-registry.spec.ts` - Field management workflows
- `types.spec.ts` - Type definition workflows
- `validators.spec.ts` - Validator management workflows
- `mobile-blocked.spec.ts` - Mobile device detection and blocking

**Page Objects:**
Each major route gets a page object model to encapsulate selectors and interactions.

## File Naming Conventions

### Unit and Integration Tests
- **Suffix:** `.test.ts` (required)
- **Naming:** Match the source file name exactly
- **Examples:**
  - `Drawer.test.ts` (for `Drawer.svelte`)
  - `sorting.test.ts` (for `sorting.ts`)
  - `fields.test.ts` (for `fields.ts`)

### E2E Tests
- **Suffix:** `.spec.ts` (required for Playwright)
- **Naming:** Descriptive feature name
- **Examples:**
  - `landing.spec.ts`
  - `field-registry.spec.ts`

### Page Objects
- **Suffix:** `.ts` (no test suffix)
- **Naming:** `{FeatureName}Page.ts`
- **Examples:**
  - `DashboardPage.ts`
  - `FieldRegistryPage.ts`

## Test Organization Principles

### 1. One Test File Per Source File (Unit/Integration)
Each source file gets exactly one corresponding test file. Do not split tests across multiple files.

### 2. Co-locate Related Tests
Tests for components in the same category stay in the same subdirectory (e.g., all drawer tests in `tests/unit/lib/components/drawer/`).

### 3. Shared Logic Goes in `tests/shared/`
Any test utilities, helpers, or configurations used across multiple test files belong in `tests/shared/`, NOT duplicated in individual test files.

### 4. Fixtures Are Centralized
All mock data lives in `tests/fixtures/`. No inline fixture data in test files.

### 5. MSW Handlers Are Reusable
MSW handlers in `tests/shared/msw/handlers.ts` are consumed by BOTH Vitest (unit/integration) and Playwright (E2E) to ensure deterministic behavior across all test layers.

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Smoke Tests (Fast)
```bash
npm run test:e2e:smoke
```

### E2E Full Suite
```bash
npm run test:e2e:full
```

### Watch Mode (Unit)
```bash
npm run test:unit:watch
```

### Coverage
```bash
npm run test:coverage
```

## Future Maintenance

### Adding a New Component
1. Create component in `src/lib/components/{category}/`
2. Create corresponding test in `tests/unit/lib/components/{category}/`
3. Update fixtures if component uses external data
4. Update MSW handlers if component makes API calls
5. Add integration test if component interacts with stores
6. Update page objects if component appears in E2E scenarios

### Adding a New Route
1. Create route in `src/routes/{name}/`
2. Create integration test in `tests/integration/routes/{name}/`
3. Update fixtures for route-specific data
4. Create E2E scenario in `tests/e2e/scenarios/{name}.spec.ts`
5. Create page object in `tests/e2e/page-objects/{Name}Page.ts`
6. Update MSW handlers for route's API interactions

### Updating Mock API Schema
1. Update fixture definitions in `tests/fixtures/`
2. Update `tests/fixtures/SCHEMA.md`
3. Update MSW handlers in `tests/shared/msw/handlers.ts`
4. Run `npm run test:fixtures:validate` to check for drift
5. Update affected tests

## LLM Agent Guidelines

When implementing tests as an LLM agent:

1. **Always check the mirroring rule first** - Find the source file, then create the test in the mirrored location
2. **Never create inline fixtures** - Use or extend `tests/fixtures/`
3. **Reuse MSW handlers** - Don't mock API calls directly in tests
4. **Follow the established pattern** - If similar tests exist, match their structure
5. **Document new patterns** - If you establish a new testing pattern, update this README

## Configuration Files

- `vitest.config.ts` - Vitest configuration (extends vite.config.ts)
- `playwright.config.ts` - Playwright configuration
- `tsconfig.vitest.json` - TypeScript config for tests
- `tests/setup/vitestSetup.ts` - Global Vitest setup

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)

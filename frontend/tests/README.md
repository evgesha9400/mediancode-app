# Test Directory Structure

> Canonical test layout for this repository. Keep file placement and naming
> predictable for both human developers and automation.

**Last Updated:** 2026-02-21

## Directory Layout

```
tests/
├── unit/                    # Unit tests for isolated modules
│   └── lib/                 # Mirrors src/lib/
│       ├── api/
│       ├── components/
│       ├── domain/
│       ├── stores/
│       ├── types/
│       └── utils/
│
├── integration/             # Reserved for higher-level integration tests
│
├── smoke/                   # Playwright smoke coverage (core user paths)
│   ├── auth.spec.ts
│   ├── dashboard.spec.ts
│   └── landing.spec.ts
│
├── e2e/                     # Playwright backend-integration flows
│   ├── crud/                # CRUD workflows against real backend
│   ├── setup/               # Auth/session bootstrap specs
│   ├── fixtures.ts          # Playwright fixtures
│   └── global-setup.ts
│
├── page-objects/            # Shared Page Object Models used by smoke/e2e
├── fixtures/                # Shared test data and factories
├── helpers/                 # E2E helper modules
├── shared/                  # Shared infra (MSW, test utils)
│   └── msw/
├── setup/                   # Vitest setup
├── config/                  # Playwright config variants
└── README.md
```

## Mirroring Rules

### 1. Unit Tests Mirror `src/lib/`

For files in `src/lib/`, put the corresponding test under `tests/unit/lib/`:

- `src/lib/components/drawer/Drawer.svelte` → `tests/unit/lib/components/drawer/Drawer.test.ts`
- `src/lib/utils/sorting.ts` → `tests/unit/lib/utils/sorting.test.ts`
- `src/lib/stores/fields.ts` → `tests/unit/lib/stores/fields.test.ts`

### 2. Page Objects Live at `tests/page-objects/`

Page objects are shared by smoke and e2e suites and are not nested under `tests/e2e/`.

## File Naming Conventions

### Unit Tests

- Suffix: `.test.ts`
- Name matches source file purpose

### Playwright Tests

- Suffix: `.spec.ts`
- `tests/smoke/*.spec.ts` for fast confidence checks
- `tests/e2e/crud/*.spec.ts` for backend-integrated CRUD flows

### Page Objects

- Suffix: `.ts`
- Pattern: `{FeatureName}Page.ts`

## Test Organization Principles

### 1. One Test File Per Source Concern

Avoid splitting one concern across many files unless there is a clear boundary.

### 2. Shared Logic Stays Shared

Use `tests/shared/`, `tests/helpers/`, and `tests/fixtures/` for reusable code/data.

### 3. MSW is Centralized

Reuse handlers from `tests/shared/msw/handlers.ts` in test suites that need mocked API behavior.

## Running Tests

### All Unit Tests

```bash
bun run test
```

### Unit Tests Only

```bash
bun run test:unit
```

### Unit Tests with Coverage

```bash
bun run test:coverage
```

### E2E Smoke

```bash
bun run test:e2e:smoke
```

### E2E CRUD

```bash
bun run test:e2e:crud
```

### Fixture Drift Check

```bash
bun run test:fixtures:validate
```

## Future Maintenance

### Adding a New Component

1. Create the component in `src/lib/components/...`.
2. Add/update mirrored unit test in `tests/unit/lib/components/...`.
3. Update fixtures/MSW only when component behavior depends on API data.

### Adding a New Route

1. Create route in `src/routes/{name}/`.
2. Add or update a page object in `tests/page-objects/{Name}Page.ts`.
3. Add a smoke path in `tests/smoke/{name}.spec.ts`.
4. If the route performs real CRUD/backend workflows, add coverage in `tests/e2e/crud/{name}.spec.ts`.
5. Update fixtures and/or MSW handlers as required.

### Updating Mock API Schema

1. Update fixtures in `tests/fixtures/`.
2. Update `tests/fixtures/SCHEMA.md`.
3. Update handlers in `tests/shared/msw/handlers.ts`.
4. Run `bun run test:fixtures:validate`.

## Configuration Files

- `vitest.config.ts`
- `playwright.config.ts`
- `tests/config/playwright.config.ci.ts`
- `tests/config/playwright.config.shared.ts`
- `tsconfig.vitest.json`
- `tests/setup/vitestSetup.ts`

## References

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)

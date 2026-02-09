# E2E Tests

End-to-end tests that require a running backend (api.dev.mediancode.com).

## Directory Structure

```
tests/e2e/
├── setup/             # Authenticates test user (setup project)
├── crud/              # Entity CRUD lifecycle tests
│   ├── fields.spec.ts
│   ├── objects.spec.ts
│   ├── apis.spec.ts
│   ├── endpoints.spec.ts
│   └── namespaces.spec.ts
├── global-setup.ts    # MSW service worker verification
└── __screenshots__/   # Visual regression baselines
```

## Shared Resources (tests/)

Page objects, helpers, and fixtures live one level up in `tests/`:

```
tests/
├── page-objects/      # Playwright page object models
├── helpers/           # Test data generators, API client
└── fixtures/          # Deterministic test data
```

## Running

```bash
# CRUD tests (requires setup project for auth)
bun run test:e2e:crud
```

## Environment Variables

- `E2E_TEST_USER_EMAIL` - Pre-created test user email
- `E2E_TEST_USER_PASSWORD` - Test user password
- `PUBLIC_API_BASE_URL` - Backend API URL
- `CLERK_SECRET_KEY` - Required for setup project (`@clerk/testing` token)

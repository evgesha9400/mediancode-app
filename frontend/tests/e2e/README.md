# E2E Tests

End-to-end tests that require a running frontend app and (for CRUD) a running backend (api-dev.mediancode.com or local).

## Directory Structure

```
tests/e2e/
├── setup/             # Authenticates test user (setup project)
├── crud/              # Entity CRUD lifecycle tests
│   └── fields.spec.ts
├── global-setup.ts    # MSW service worker verification
└── fixtures.ts        # Shared Playwright fixtures
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

For frontend-impacting changes, always attempt a Playwright E2E command before handoff. If credentials or external services block execution, record the attempted command and exact blocker; do not silently skip E2E.

```bash
# Smoke tests
bun run test:e2e:smoke

# CRUD tests (requires setup project for auth)
bun run test:e2e:crud

# CI-style runs (Playwright manages preview server)
bun run test:e2e:smoke:ci
bun run test:e2e:crud:ci
```

Local runs auto-start and auto-stop the frontend dev server on
`127.0.0.1:4175` by default. Override with `PLAYWRIGHT_TEST_PORT` or
`PLAYWRIGHT_BASE_URL` when needed.
Local runs are fail-fast (`maxFailures=1`) to avoid noisy cascades.
Set `PUBLIC_API_BASE_URL` when running commands to choose local vs hosted backend.

## Environment Variables

- `PUBLIC_CLERK_PUBLISHABLE_KEY` - Required for all Playwright projects
- `E2E_TEST_USER_EMAIL` - Pre-created test user email
- `E2E_TEST_USER_PASSWORD` - Test user password
- `PUBLIC_API_BASE_URL` - Backend API URL
- `CLERK_SECRET_KEY` - Required for all Playwright projects (`@clerk/testing` token)

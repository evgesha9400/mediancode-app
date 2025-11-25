# Testing Quick Start Guide

> Get started with the testing infrastructure in 5 minutes

## What's Been Implemented

Phases 0-4 of the 8-phase testing plan are complete:

- ✅ **Test directory structure** mirroring src/
- ✅ **Vitest configuration** with unit/integration projects
- ✅ **Comprehensive fixtures** for all entities (fields, types, validators, APIs, users, permissions)
- ✅ **MSW handlers** using centralized fixtures
- ✅ **Testing utilities** and render helpers
- ✅ **Example tests** demonstrating patterns
- ✅ **npm scripts** for running tests

## Running Tests

### Quick Commands

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Watch mode for rapid development
npm run test:unit:watch

# Generate coverage report
npm run test:coverage

# Validate fixture integrity
npm run test:fixtures:validate
```

### What Each Command Does

- **`npm test`** - Runs both unit and integration tests once
- **`npm run test:unit`** - Tests isolated components and utilities
- **`npm run test:integration`** - Tests routes and store interactions with MSW
- **`npm run test:unit:watch`** - Re-runs unit tests on file changes
- **`npm run test:coverage`** - Generates HTML coverage report in `coverage/`
- **`npm run test:fixtures:validate`** - Checks fixtures for data integrity issues

## Project Structure

```
tests/
├── unit/                       # Unit tests mirroring src/lib
│   └── lib/
│       ├── components/         # Component unit tests
│       ├── stores/             # Store unit tests
│       └── utils/              # Utility function tests
│
├── integration/                # Integration tests
│   └── routes/                 # Route tests with MSW
│
├── e2e/                        # Playwright E2E tests (Phase 5)
│   ├── scenarios/              # Test scenarios
│   └── page-objects/           # Page object models
│
├── fixtures/                   # Centralized test data
│   ├── users.ts                # Mock users
│   ├── fields.ts               # Mock fields
│   ├── types.ts                # Mock types
│   ├── validators.ts           # Mock validators
│   ├── apis.ts                 # Mock API endpoints
│   ├── permissions.ts          # Mock permissions/roles
│   ├── index.ts                # Barrel export
│   └── SCHEMA.md               # Entity relationships
│
├── shared/                     # Shared test utilities
│   ├── msw/                    # Mock Service Worker
│   │   ├── handlers.ts         # API request handlers
│   │   └── server.ts           # MSW server setup
│   ├── renderWithProviders.ts  # Component render helper
│   └── testUtils.ts            # Test utilities
│
├── setup/                      # Global test setup
│   └── vitestSetup.ts          # Vitest initialization
│
└── README.md                   # Detailed structure docs
```

## Writing Your First Test

### 1. Unit Test Example

```typescript
// tests/unit/lib/utils/myUtil.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '$lib/utils/myUtil';

describe('myUtil', () => {
  it('does what it should', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### 2. Component Test Example

```typescript
// tests/unit/lib/components/MyComponent.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MyComponent from '$lib/components/MyComponent.svelte';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(MyComponent, { props: { name: 'Test' } });
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### 3. Integration Test with Fixtures

```typescript
// tests/integration/routes/my-route/page.test.ts
import { describe, it, expect } from 'vitest';
import { mockFields } from '../../../fixtures';

describe('My Route', () => {
  it('loads data from MSW', () => {
    // MSW automatically mocks /api/fields to return mockFields
    expect(mockFields.length).toBeGreaterThan(0);
  });
});
```

## Using Fixtures

### Importing Fixtures

```typescript
import {
  mockFields,
  mockValidators,
  mockTypes,
  getFieldById,
  getValidatorByName
} from 'tests/fixtures';
```

### Available Fixtures

- **Users** (3 mock users)
- **Fields** (8 fields covering all types)
- **Validators** (10 validators: 8 inline, 2 custom)
- **Types** (8 types: 6 primitive, 2 abstract)
- **APIs** (4 API endpoints with CRUD)
- **Permissions** (8 permissions, 3 roles)

### Helper Functions

Each fixture module exports helper functions:
- `getFieldById(id)` - Get field by ID
- `getValidatorByName(name)` - Get validator by name
- `getTypeByName(name)` - Get type by name
- `getUserById(id)` - Get user by ID
- And more...

## MSW (Mock Service Worker)

API requests are automatically mocked by MSW. No manual mocking needed!

### How It Works

1. MSW starts before all tests (configured in `tests/setup/vitestSetup.ts`)
2. Handlers in `tests/shared/msw/handlers.ts` intercept requests
3. All responses use fixtures from `tests/fixtures/`

### Available Endpoints

```typescript
GET    /api/users
GET    /api/users/:id
GET    /api/fields
GET    /api/fields/:id
POST   /api/fields
PUT    /api/fields/:id
DELETE /api/fields/:id
GET    /api/validators
GET    /api/validators/:name
POST   /api/validators
DELETE /api/validators/:name
GET    /api/types
GET    /api/types/:name
GET    /api/endpoints
GET    /api/endpoints/:id
POST   /api/endpoints
GET    /api/permissions
GET    /api/roles
```

## Test Organization Rules

### 1. Mirroring Rule

Test files mirror src/ structure exactly:

```
src/lib/utils/sorting.ts
→ tests/unit/lib/utils/sorting.test.ts

src/lib/components/table/Table.svelte
→ tests/unit/lib/components/table/Table.test.ts

src/routes/dashboard/+page.svelte
→ tests/integration/routes/dashboard/page.test.ts
```

### 2. Naming Convention

- Unit/Integration: `*.test.ts`
- E2E: `*.spec.ts`
- Match source file name exactly

### 3. No Inline Fixtures

Always use centralized fixtures:

```typescript
// ❌ Wrong
const mockData = [{ id: 1, name: 'test' }];

// ✅ Correct
import { mockFields } from 'tests/fixtures';
```

## Common Tasks

### Add a New Field to Fixtures

1. Edit `tests/fixtures/fields.ts`
2. Add new field to `mockFields` array
3. Run `npm run test:fixtures:validate` to verify integrity
4. Update tests that depend on field count

### Add a New API Endpoint

1. Add fixture data to `tests/fixtures/apis.ts` (if needed)
2. Add MSW handler to `tests/shared/msw/handlers.ts`
3. Write integration test in `tests/integration/`

### Debug a Failing Test

1. Run in watch mode: `npm run test:unit:watch`
2. Check MSW handlers are correct
3. Verify fixtures are up-to-date
4. Use `console.log()` or VS Code debugger

## Next Steps (Phases 5-7)

### Phase 5: Playwright E2E
- Install Playwright
- Write E2E scenarios
- Create page objects
- Set up visual regression

### Phase 6: CI/CD
- Create GitHub Actions workflow
- Add test jobs to CI pipeline
- Configure artifact uploads

### Phase 7: Documentation
- Write testing runbooks
- Create PR template with testing checklist
- Document common patterns

## Resources

- [Full Testing Plan](/docs/testing.md)
- [Test Structure Details](/tests/README.md)
- [Fixture Schema](/tests/fixtures/SCHEMA.md)
- [Implementation Status](/docs/TESTING_IMPLEMENTATION_STATUS.md)
- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [MSW Docs](https://mswjs.io/)

## Getting Help

1. Check `/tests/README.md` for structure rules
2. Review `/tests/fixtures/SCHEMA.md` for entity relationships
3. Look at example tests in `/tests/unit/` and `/tests/integration/`
4. Read `/docs/TESTING_IMPLEMENTATION_STATUS.md` for current status

## Key Principles

1. **Fixtures are the source of truth** - All test data comes from `/tests/fixtures/`
2. **MSW mocks everything** - Never mock fetch manually
3. **Mirror the source** - Test file locations match source files exactly
4. **Testing Library patterns** - Use screen queries, user events
5. **Deterministic tests** - Same input = same output, always

Start by running `npm test` to see the example tests in action!

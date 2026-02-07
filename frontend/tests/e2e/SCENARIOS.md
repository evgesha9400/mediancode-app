# E2E Test Scenarios

This document describes the E2E test scenarios for Median Code, including their purpose, execution flow, and configuration requirements.

## Overview

The E2E test system consists of two main test suites:

| Suite | Purpose | Trigger | Auth State |
|-------|---------|---------|------------|
| **App CRUD** | Tests entity CRUD lifecycle | Merge to develop + nightly | Pre-authenticated |
| **Auth Flows** | Tests signup, password change, org creation | Nightly only | Fresh (unauthenticated) |

Both suites run against the real dev backend (`api.dev.mediancode.com`) - no mocking.

## Test Data Conventions

All E2E test data uses identifiable prefixes for easy cleanup:

| Data Type | Prefix Pattern | Example |
|-----------|----------------|---------|
| Fields | `e2e_` | `e2e_crud_1706789012345_abc123` |
| Objects | `e2e_` | `e2e_object_1706789012345_abc123` |
| APIs | `e2e_` | `e2e_api_1706789012345_abc123` |
| Namespaces | `e2e_` | `e2e_namespace_1706789012345_abc123` |
| Endpoints | `e2e_` | `e2e_endpoint_1706789012345_abc123` |
| Test emails | `e2e-*@test.mediancode.com` | `e2e-1706789012345-abc123@test.mediancode.com` |
| Organizations | `E2E *` | `E2E Test Org 1706789012345` |

Use the helper functions from `tests/e2e/helpers/test-data.ts` to generate unique names.

---

## App CRUD Suite

### Location
`tests/e2e/scenarios/app-crud/`

### Prerequisites
- Pre-created test user in Clerk dev environment
- Environment variables:
  - `E2E_TEST_USER_EMAIL`
  - `E2E_TEST_USER_PASSWORD`
  - `E2E_API_BASE_URL` (defaults to `https://api.dev.mediancode.com/v1`)

### Scenarios

#### Fields CRUD (`fields.crud.spec.ts`)

**Purpose:** Test complete field entity lifecycle

**Steps:**
1. Create new field with unique name
2. Verify field appears in list
3. Open field and verify details
4. Update field description and default value
5. Verify updates persist after reload
6. Delete field
7. Verify field is removed

**Entities touched:** Fields

**Cleanup:** Automatic via `afterAll` hook using API client

---

#### Objects CRUD (`objects.crud.spec.ts`)

**Purpose:** Test complete object entity lifecycle

**Steps:**
1. Create helper field (objects need fields)
2. Create new object with unique name
3. Verify object appears in list
4. Open object and verify details
5. Add field to object
6. Update object description
7. Verify updates persist
8. Delete object
9. Cleanup helper field

**Entities touched:** Objects, Fields (helper)

**Cleanup:** Automatic via `afterAll` hook

---

#### APIs CRUD (`apis.crud.spec.ts`)

**Purpose:** Test complete API entity lifecycle

**Steps:**
1. Navigate to API creation page
2. Fill in API details (title, version, base URL)
3. Create API
4. Verify API appears in list
5. Open API for editing
6. Update version and description
7. Verify updates persist
8. Delete API
9. Verify API is removed

**Entities touched:** APIs

**Cleanup:** Automatic via `afterAll` hook

---

#### Endpoints CRUD (`endpoints.crud.spec.ts`)

**Purpose:** Test endpoint management within an API

**Steps:**
1. Create helper API
2. Navigate to API detail page
3. Add new endpoint
4. Verify endpoint appears
5. Update endpoint path/description
6. Delete endpoint
7. Cleanup helper API

**Entities touched:** APIs (helper), Endpoints

**Cleanup:** Automatic via `afterAll` hook

---

#### Namespaces CRUD (`namespaces.crud.spec.ts`)

**Purpose:** Test namespace entity lifecycle

**Steps:**
1. Navigate to namespaces page
2. Create new namespace
3. Verify namespace appears
4. Update namespace description
5. Verify updates persist
6. Delete namespace
7. Verify namespace is removed

**Entities touched:** Namespaces

**Cleanup:** Automatic via `afterAll` hook

---

## Auth Flows Suite

### Location
`tests/e2e/scenarios/auth-flows/`

### Prerequisites
- Clerk Admin API access for cleanup
- Environment variables:
  - `E2E_TEST_USER_EMAIL` (for password-change, organization tests)
  - `E2E_TEST_USER_PASSWORD`
  - `CLERK_SECRET_KEY` (for cleanup)

### Scenarios

#### Signup Flow (`signup.spec.ts`)

**Purpose:** Test complete user registration flow

**Steps:**
1. Navigate to signup page
2. Fill in email, password, name
3. Submit registration form
4. Handle email verification (if required)
5. Verify redirect to dashboard

**Cleanup:** Delete test user via Clerk Admin API

**Notes:**
- Creates a real user in Clerk
- Uses `@test.mediancode.com` email domain
- May require Clerk dev mode for verification bypass

---

#### Password Change (`password-change.spec.ts`)

**Purpose:** Test password change flow for authenticated users

**Steps:**
1. Sign in with test user
2. Navigate to account/security settings
3. Change password to new value
4. Verify new password works
5. Revert password to original

**Cleanup:** Password is reverted in the test itself

**Notes:**
- Uses pre-created test user
- Temporarily changes password, then reverts
- No external cleanup needed

---

#### Organization Management (`organization.spec.ts`)

**Purpose:** Test organization creation and management

**Steps:**
1. Sign in with test user
2. Open organization switcher
3. Create new organization
4. Verify organization appears
5. Switch to the organization
6. Delete organization

**Cleanup:** Delete organization via Clerk Admin API

**Notes:**
- Creates a real organization in Clerk
- Uses `E2E *` naming pattern
- Cleanup handles cases where UI deletion fails

---

## Running Tests Locally

### CRUD Tests

```bash
# Set environment variables
export E2E_TEST_USER_EMAIL="your-test-user@example.com"
export E2E_TEST_USER_PASSWORD="your-test-password"
export E2E_API_BASE_URL="https://api.dev.mediancode.com/v1"

# Run setup + CRUD tests
bunx playwright test --project=setup --project=app-crud
```

### Auth Flow Tests

```bash
# Set environment variables
export E2E_TEST_USER_EMAIL="your-test-user@example.com"
export E2E_TEST_USER_PASSWORD="your-test-password"
export CLERK_SECRET_KEY="sk_test_your_clerk_secret"

# Run auth flow tests
bunx playwright test --project=auth-flows
```

### Running Specific Scenarios

```bash
# Run only fields CRUD
bunx playwright test --project=setup --project=app-crud fields.crud

# Run only signup flow
bunx playwright test --project=auth-flows signup
```

---

## CI Configuration

### GitHub Secrets Required

| Secret | Purpose | Required For |
|--------|---------|--------------|
| `E2E_TEST_USER_EMAIL` | Test user email | CRUD, Auth flows |
| `E2E_TEST_USER_PASSWORD` | Test user password | CRUD, Auth flows |
| `E2E_API_BASE_URL` | Backend API URL | CRUD |
| `CLERK_SECRET_KEY` | Clerk Admin API | Auth flows cleanup |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | All |

### Execution Schedule

| Job | Trigger |
|-----|---------|
| `e2e-crud` | Merge to develop, nightly, manual |
| `e2e-auth` | Nightly, manual |

---

## Troubleshooting

### Test Data Not Cleaned Up

If tests fail and leave data behind:

1. **Fields/Objects/APIs:** Run cleanup via API client
   ```typescript
   const apiClient = new E2EApiClient(request);
   await apiClient.cleanupFields((f) => f.name.startsWith('e2e_'));
   ```

2. **Users:** Run Clerk Admin cleanup
   ```typescript
   await cleanupE2ETestUsers();
   ```

3. **Organizations:** Run Clerk Admin cleanup
   ```typescript
   await cleanupE2ETestOrganizations();
   ```

### Auth Setup Fails

1. Verify test user exists in Clerk dev environment
2. Check credentials are correct
3. Ensure Clerk is not rate-limiting

### Tests Pass Locally But Fail in CI

1. Check all secrets are configured in GitHub
2. Verify dev backend is accessible from CI
3. Check for timing issues (increase timeouts)

---

## Adding New Scenarios

1. Create new spec file in appropriate directory
2. Use test data helpers for unique names
3. Include cleanup in `afterAll` hook
4. Add scenario documentation to this file
5. Test locally before pushing

### Template

```typescript
import { test, expect } from '@playwright/test';
import { entityName, isE2ETestData, E2EApiClient } from '../../helpers';

test.describe('Entity CRUD Lifecycle', () => {
  let createdEntityName: string;

  test.beforeAll(() => {
    createdEntityName = entityName('crud');
  });

  test.describe.serial('Entity Lifecycle', () => {
    test('Step 1: Create', async ({ page }) => { /* ... */ });
    test('Step 2: Read', async ({ page }) => { /* ... */ });
    test('Step 3: Update', async ({ page }) => { /* ... */ });
    test('Step 4: Delete', async ({ page }) => { /* ... */ });
  });

  test.afterAll(async ({ request }) => {
    const apiClient = new E2EApiClient(request);
    await apiClient.cleanupEntities((e) => isE2ETestData(e.name));
  });
});
```

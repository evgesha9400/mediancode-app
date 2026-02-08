# E2E Testing Philosophy

## Core Principle

**"One entity, one flow, every action earns its place."**

Each entity type (fields, objects, APIs, namespaces, endpoints) gets one test that tells a single linear story of a user working with that entity. There are no separate "test create", "test search", "test delete" — because a real user doesn't restart their browser between actions.

Every action in the flow either **creates state** that a later action needs, or **verifies state** that a previous action created. Nothing is standalone.

---

## The Rules

### 1. One test function per entity

Not a `describe` block with 6 tests. One `test()`. Auth happens once, navigation happens once, the page stays open throughout.

```ts
// CORRECT
test('Field lifecycle', async ({ page }) => {
  // entire flow here
});

// WRONG
test.describe('Fields', () => {
  test('create', ...);
  test('search', ...);
  test('delete', ...);
});
```

### 2. Start dirty, clean first

Call the API to delete all entities before doing anything in the UI. Never clean up at the end. A failed test leaves evidence for debugging.

```ts
test('Field lifecycle', async ({ page }) => {
  const api = await E2EApiClient.fromPage(page);
  await api.deleteAllFields();  // clean slate

  // ... test flow ...

  // NO afterAll/afterEach cleanup
});
```

### 3. Create enough data to prove features work

A single item proves nothing about sorting or filtering. Create 2-3 items with **different values for every filterable/sortable property**.

```ts
// CORRECT — different types, names that sort differently
const FIELDS = [
  { name: 'e2e_is_active',    type: 'bool', ... },
  { name: 'e2e_retry_count',  type: 'int',  ... },
  { name: 'e2e_user_email',   type: 'str',  ... },
];

// WRONG — same type, similar names
const FIELDS = [
  { name: 'e2e_field_1', type: 'str', ... },
  { name: 'e2e_field_2', type: 'str', ... },
];
```

### 4. Every action serves double duty

Search isn't tested separately — it's how we verify that create worked. Filter isn't tested separately — it's how we prove items have the right type. Sort isn't tested separately — it's how we confirm all items exist with correct names.

Verification IS feature testing.

```ts
// CORRECT — search verifies create AND tests search
await fields.createNewField(FIELD_A);
await fields.search(FIELD_A.name);
expect(await fields.hasField(FIELD_A.name)).toBe(true);  // create worked + search works

// WRONG — separate verification step that doesn't test anything new
await fields.createNewField(FIELD_A);
expect(await fields.hasField(FIELD_A.name)).toBe(true);  // just checks create
// ... later, separate search test ...
await fields.search(FIELD_A.name);  // duplicated
```

### 5. No cross-entity dependencies

The field test creates only fields. It doesn't create namespaces, objects, or APIs. If a feature requires another entity (like namespace filtering), it belongs in that entity's test, not this one.

### 6. All test data is constants at the top

No generators, no timestamps, no random suffixes. Hardcoded, readable, predictable. The cleanup-at-start strategy makes uniqueness unnecessary.

```ts
// CORRECT
const FIELD_NAME = 'e2e_user_email';
const FIELD_TYPE = 'str';

// WRONG
const FIELD_NAME = `e2e_field_${Date.now()}_${Math.random()}`;
```

### 7. The page object is the only abstraction

No test helpers, no wrapper functions, no "test utils" in the spec file. The test reads as: `fields.create()`, `fields.search()`, `fields.clickRow()`. If you can't understand the test by reading it top to bottom, it's wrong.

### 8. Delete everything at the end, verify empty state

This isn't cleanup — it's the final test assertion. The flow ends where it started: an empty page.

---

## Universal Flow Template

Every entity lifecycle test follows this exact structure:

```
1.  Clean slate (API delete all)         ← precondition, not a test
2.  Navigate to entity page              ← once
3.  Create item A                        ← with distinct filterable values
4.  Create item B                        ← different type/properties than A
5.  Create item C                        ← different type/properties than A and B
6.  Search for one item                  ← verifies create + tests search
7.  Clear search                         ← restore full list
8.  Filter by a property                 ← verifies property values + tests filter
9.  Clear filter                         ← restore full list
10. Sort ascending                       ← verifies all items present + tests sort
11. Sort descending                      ← verifies sort direction toggles
12. Click one item → verify in drawer    ← tests detail/read view
13. Update values, save                  ← tests mutation
14. Click same item → verify new values  ← verifies persistence
15. Delete item A                        ← tests single delete
16. Verify item A gone, B and C remain
17. Delete item B
18. Delete item C
19. Verify empty state                   ← tests delete + proves clean exit
```

---

## What This Prevents

| Anti-pattern | Why it's bad |
|---|---|
| Splitting into many tiny tests | Each re-auths and re-navigates. Slow, fragile, tests less. |
| Random/timestamped names | Failures impossible to reproduce. Cleanup logic gets complex. |
| Helper abstractions in spec files | Hides what the test does. Makes copying to new entities error-prone. |
| Cross-entity setup | Hidden dependencies. Field test breaks when namespace API changes. |
| Cleanup at end | Hides failures. Creates flaky subsequent runs. |
| Testing features in isolation | Misses real user workflows. Wastes time duplicating setup. |

---

## Timing Control

All page object delays are controlled by a single env var:

```
E2E_ACTION_DELAY=300    # default — enough for animations
E2E_ACTION_DELAY=1500   # observation mode — watch in --headed
E2E_ACTION_DELAY=100    # fast CI
```

No hardcoded `waitForTimeout` values anywhere. Every page object method calls `this.delay()` which reads `ACTION_DELAY_MS` from the env.

No test-level timeouts. `actionTimeout: 3000` catches stuck actions. The total test duration is deterministic: sum of actions + delays.

---

## File Organization

```
tests/
├── e2e/
│   ├── TESTING_PHILOSOPHY.md    ← this file
│   ├── fixtures.ts              ← authenticatedTest (Clerk sign-in)
│   ├── global-setup.ts          ← Clerk token + MSW worker
│   └── crud/
│       ├── fields.spec.ts       ← field lifecycle (one test)
│       ├── objects.spec.ts      ← object lifecycle (one test)
│       ├── apis.spec.ts         ← API lifecycle (one test)
│       └── namespaces.spec.ts   ← namespace lifecycle (one test)
├── page-objects/
│   ├── FieldRegistryPage.ts     ← all field page interactions
│   ├── ObjectBuilderPage.ts     ← all object page interactions
│   └── ...
├── helpers/
│   ├── api-client.ts            ← E2EApiClient (auth'd API calls)
│   ├── e2e-delays.ts            ← ACTION_DELAY_MS
│   └── ...
└── smoke/
    └── ...                      ← page-render checks, no backend
```

---

## Creating a New Entity Lifecycle Test

When adding a test for a new entity (e.g., objects):

1. **Read this document first.** Follow the rules exactly.
2. **Define 3 test items as constants** with different values for every filterable/sortable column.
3. **Copy the universal flow template** and fill in entity-specific actions.
4. **Use only page object methods.** If a method doesn't exist, add it to the page object first.
5. **Call `api.deleteAll{Entity}()` at the start.** If the method doesn't exist, add it to `E2EApiClient`.
6. **No afterAll, no afterEach, no try/catch, no retries in the spec file.**
7. **Run with `E2E_ACTION_DELAY=1500 --headed` first** to visually verify the flow makes sense.

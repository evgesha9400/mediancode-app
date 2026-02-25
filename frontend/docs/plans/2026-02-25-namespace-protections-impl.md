> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans

# Frontend Implementation Plan: Namespace Protections

## Goal

Consume the new backend `locked` field to make the Global namespace fully read-only, block deletion of the default namespace, and add `isDefault` support to namespace creation.

## Architecture

The backend now returns a `locked: boolean` field on every namespace response (`true` for "Global", `false` for everything else). The frontend already has `locked` in its `Namespace` type and read-only UI logic keyed on it — we just need to remove the broken fallback and wire up the remaining gaps:

1. **API layer** — Accept `locked` from backend directly, add `isDefault` to create payload
2. **Store model** — Update deletion guard to check both `locked` and `isDefault`, handle `isDefault` on create
3. **UI** — Add `isDefault` toggle to create drawer, verify read-only mode works
4. **Tests** — Update unit tests for new behavior

## Tech Stack

SvelteKit, Svelte 5, TypeScript, Vitest, Playwright

## Prerequisite

Backend must be deployed with the namespace protections changes first. Backend plan: `/Users/evgesha/Documents/Projects/median-code-backend/docs/plans/2026-02-25-namespace-protections-impl.md`

---

## Part 1: API Layer Changes

### Task 1: Update NamespaceResponse and transform

**File**: `src/lib/api/namespaces.ts`

**Steps**:
1. Make `locked` non-optional in `NamespaceResponse` (backend now always returns it)
2. Remove the `?? response.isDefault` fallback in `transformNamespace` — use `response.locked` directly

**Before** (~lines 13-32):
```typescript
interface NamespaceResponse {
	id: string;
	name: string;
	description: string | null;
	isDefault: boolean;
	locked?: boolean;
}

function transformNamespace(response: NamespaceResponse): Namespace {
	return {
		id: response.id,
		name: response.name,
		description: response.description ?? undefined,
		isDefault: response.isDefault,
		locked: response.locked ?? response.isDefault
	};
}
```

**After**:
```typescript
interface NamespaceResponse {
	id: string;
	name: string;
	description: string | null;
	isDefault: boolean;
	locked: boolean;
}

function transformNamespace(response: NamespaceResponse): Namespace {
	return {
		id: response.id,
		name: response.name,
		description: response.description ?? undefined,
		isDefault: response.isDefault,
		locked: response.locked
	};
}
```

**Test**: `bunx vitest run tests/unit/lib/api/namespaces.test.ts`
**Commit**: `fix(namespaces): use backend locked field directly instead of fallback`

---

### Task 2: Add isDefault to CreateNamespaceRequest

**File**: `src/lib/api/namespaces.ts`

**Steps**:
1. Add `isDefault?: boolean` to `CreateNamespaceRequest`

**Before** (~line 57):
```typescript
export interface CreateNamespaceRequest {
	name: string;
	description?: string;
}
```

**After**:
```typescript
export interface CreateNamespaceRequest {
	name: string;
	description?: string;
	isDefault?: boolean;
}
```

**Test**: `bunx vitest run tests/unit/lib/api/namespaces.test.ts`
**Commit**: `feat(namespaces): add isDefault to CreateNamespaceRequest`

---

## Part 2: Store Model Changes

### Task 3: Update toCreatePayload to include isDefault

**File**: `src/lib/stores/namespacesModel.svelte.ts`

**Steps**:
1. In `toCreatePayload()`, include `isDefault` if the item has it set to `true`

**Before** (~line 174):
```typescript
  function toCreatePayload(item: Namespace): { ok: true; data: CreateNamespaceRequest } | { ok: false; error: string } {
    return {
      ok: true,
      data: {
        name: item.name,
        description: item.description
      }
    };
  }
```

**After**:
```typescript
  function toCreatePayload(item: Namespace): { ok: true; data: CreateNamespaceRequest } | { ok: false; error: string } {
    return {
      ok: true,
      data: {
        name: item.name,
        description: item.description,
        ...(item.isDefault ? { isDefault: true } : {})
      }
    };
  }
```

**Test**: `bunx vitest run tests/unit/lib/stores/namespacesModel.test.ts`
**Commit**: `feat(namespaces): include isDefault in create payload`

---

### Task 4: Update deletionGuard to check locked and isDefault

**File**: `src/lib/stores/namespacesModel.svelte.ts`

**Steps**:
1. In `deletionGuard()`, add checks for `locked` and `isDefault` before the entity count check

**Before** (~line 195):
```typescript
  function deletionGuard(item: Namespace): { canDelete: boolean; tooltip: string } {
    const details = getNamespaceEntityDetails(item.id);
    if (details.total > 0) {
      return { canDelete: false, tooltip: `Cannot delete: Contains ${details.total} entities` };
    }
    return { canDelete: true, tooltip: '' };
  }
```

**After**:
```typescript
  function deletionGuard(item: Namespace): { canDelete: boolean; tooltip: string } {
    if (item.locked) {
      return { canDelete: false, tooltip: 'Cannot delete the Global namespace' };
    }
    if (item.isDefault) {
      return { canDelete: false, tooltip: 'Cannot delete the default namespace' };
    }
    const details = getNamespaceEntityDetails(item.id);
    if (details.total > 0) {
      return { canDelete: false, tooltip: `Cannot delete: Contains ${details.total} entities` };
    }
    return { canDelete: true, tooltip: '' };
  }
```

**Test**: `bunx vitest run tests/unit/lib/stores/namespacesModel.test.ts`
**Commit**: `fix(namespaces): block deletion of locked and default namespaces`

---

### Task 5: Handle isDefault in handleCreate for store sync

**File**: `src/lib/stores/namespacesModel.svelte.ts`

**Steps**:
1. In `handleCreate()`, after a successful create, if the new namespace is default, clear `isDefault` on all other namespaces in the local store (same pattern as `handleSave`)

**In `handleCreate()`**, after `const result = await createNamespaceAction(payloadResult.data);` and the success check (~line 303), add:

```typescript
    // If this namespace was created as default, clear isDefault on all others in local store
    if (result.data!.isDefault) {
      const currentNamespaces = get(namespacesStore);
      namespacesStore.set(
        currentNamespaces.map(ns =>
          ns.id === result.data!.id ? result.data! : { ...ns, isDefault: false }
        )
      );
    }
```

**Test**: `bunx vitest run tests/unit/lib/stores/namespacesModel.test.ts`
**Commit**: `feat(namespaces): sync local store when creating default namespace`

---

## Part 3: UI Changes

### Task 6: Add isDefault toggle to create drawer

**File**: `src/routes/(dashboard)/namespaces/+page.svelte`

**Steps**:
1. Add a "Set as default namespace" checkbox inside the create drawer (when `isCreating` is true)
2. Place it after the Description field, before the closing `</div>`

**After the Description `</div>` block and before the closing `{/if}` for `workflow.editedItem`** (~line 201, inside the `<div class="space-y-4">` block), add the isDefault toggle for create mode:

Find the section that starts with `<!-- Entity Counts (only when editing) -->` (~line 203). Right before this `{#if !isCreating}` block, add a create-only default toggle:

```svelte
        <!-- Default toggle (create mode) -->
        {#if isCreating}
          <div>
            <h3 class="text-sm text-mono-700 mb-2 font-medium">Default Namespace</h3>
            <label class="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={workflow.editedItem.isDefault}
                class="w-4 h-4 rounded border-mono-300 text-mono-900 focus:ring-mono-400"
              />
              <span class="text-sm text-mono-600">Set as default namespace</span>
            </label>
            <p class="text-xs text-mono-500 mt-1">The default namespace is auto-selected when the app loads.</p>
          </div>
        {/if}
```

**Test**: `bun run svelte-check --tsconfig ./tsconfig.json`
**Commit**: `feat(namespaces): add isDefault toggle to create drawer`

---

## Part 4: Tests

### Task 7: Update unit tests

**File**: `tests/unit/lib/stores/namespacesModel.test.ts`

**Steps**:
1. Update existing tests that check deletion to account for the new `locked` and `isDefault` guards
2. Add new test cases:
   - Deletion guard blocks locked namespace
   - Deletion guard blocks default namespace
   - Deletion guard allows non-default, non-locked, empty namespace
   - Create payload includes isDefault when true
   - Create payload omits isDefault when false

**Add these test cases** (adapt to existing test file structure):

```typescript
describe('deletionGuard', () => {
  it('blocks deletion of locked namespace', () => {
    // Select a locked namespace (Global)
    const lockedNs = { id: 'global-id', name: 'Global', isDefault: true, locked: true };
    // Verify canDelete is false with appropriate tooltip
  });

  it('blocks deletion of default namespace', () => {
    // Select a non-locked but default namespace
    const defaultNs = { id: 'ns-id', name: 'My NS', isDefault: true, locked: false };
    // Verify canDelete is false
  });

  it('allows deletion of non-default, non-locked, empty namespace', () => {
    // Select a regular namespace with 0 entities
    // Verify canDelete is true
  });
});

describe('create payload', () => {
  it('includes isDefault when true', () => {
    // Open create, set name, set isDefault to true, verify payload
  });

  it('omits isDefault when false', () => {
    // Open create, set name, leave isDefault false, verify payload
  });
});
```

Also update the **API tests** in `tests/unit/lib/api/namespaces.test.ts`:
- Update the transform test to expect `locked` from the response (not derived from `isDefault`)
- Add a test that verifies `locked: true` is passed through for Global namespace
- Add a test that verifies `locked: false` is passed through for user namespace

**Test**: `bunx vitest run`
**Commit**: `test(namespaces): add tests for namespace protections`

---

## Final Verification

### Task 8: Run all test suites

Run all four validation layers:

```bash
# 1. Type check
bun run svelte-check --tsconfig ./tsconfig.json

# 2. Unit tests
bunx vitest run

# 3. E2E smoke tests
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke

# 4. E2E CRUD tests
pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

All must pass with zero failures. Fix any issues.

**Commit**: Only if fixes were needed — `fix(namespaces): resolve test failures from namespace protections`

---

## Expected API Contract

After backend deployment, the API responses will look like:

### GET /namespaces
```json
[
  {
    "id": "abc-123",
    "name": "Global",
    "description": null,
    "isDefault": true,
    "locked": true
  },
  {
    "id": "def-456",
    "name": "My Project",
    "description": "Custom namespace",
    "isDefault": false,
    "locked": false
  }
]
```

### POST /namespaces (with isDefault)
**Request**:
```json
{
  "name": "My Project",
  "description": "Custom namespace",
  "isDefault": true
}
```
**Response** (201):
```json
{
  "id": "def-456",
  "name": "My Project",
  "description": "Custom namespace",
  "isDefault": true,
  "locked": false
}
```

### PUT /namespaces/{id} on Global namespace
**Request**: `{"name": "Renamed"}`
**Response** (400): `{"detail": "Cannot rename the Global namespace"}`

### DELETE /namespaces/{id} on Global namespace
**Response** (400): `{"detail": "Cannot delete the Global namespace"}`

### DELETE /namespaces/{id} on default namespace
**Response** (400): `{"detail": "Cannot delete the default namespace"}`

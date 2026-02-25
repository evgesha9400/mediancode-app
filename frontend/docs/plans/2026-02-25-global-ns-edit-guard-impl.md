# Implementation Plan: Global Namespace Edit Guard (Frontend)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans

## Goal

Allow users to set the Global namespace as default from its drawer, while keeping name/description read-only. Currently the Global namespace drawer only shows a "Close" button — users cannot save any changes.

## Prerequisite

Backend must be deployed with the matching API changes first. The backend plan is at:
`/Users/evgesha/Documents/Projects/median-code-backend/docs/plans/2026-02-25-global-ns-edit-guard-impl.md`

After the backend change, the API only accepts `{ isDefault: true }` for the Global namespace — no name/description fields.

## Architecture

The fix requires two coordinated changes:

1. **Model layer** (`namespacesModel.svelte.ts`): The `toUpdatePayload` function must send only `{ isDefault: true }` for locked (Global) namespaces instead of including name/description.

2. **UI layer** (`+page.svelte`): The drawer footer for locked namespaces must show a Save + Close pair (instead of just Close) when the user has toggled isDefault.

No new components, stores, types, or API client changes are needed.

## Tech Stack

SvelteKit 2, Svelte 5 (runes), TypeScript, Tailwind CSS, Vitest, Playwright

## Tasks

### Task 1: Update `toUpdatePayload` for locked namespaces

**Files to modify:**
- `src/lib/stores/namespacesModel.svelte.ts` (~line 185, `toUpdatePayload` function)

**Steps:**

1. Replace the `toUpdatePayload` function (lines 185-194):

**Before:**
```typescript
function toUpdatePayload(item: Namespace): { ok: true; data: UpdateNamespaceRequest } | { ok: false; error: string } {
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

**After:**
```typescript
function toUpdatePayload(item: Namespace): { ok: true; data: UpdateNamespaceRequest } | { ok: false; error: string } {
    // Global namespace: only isDefault can be changed
    if (item.locked) {
      return {
        ok: true,
        data: {
          ...(item.isDefault ? { isDefault: true } : {})
        }
      };
    }

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

**Test command:**
```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

**Commit:**
```
feat(namespaces): send only isDefault for Global namespace updates
```

---

### Task 2: Update drawer footer for locked namespaces

**Files to modify:**
- `src/routes/(dashboard)/namespaces/+page.svelte` (~lines 273-307, the `<DrawerFooter>` section)

**Steps:**

1. Add a derived variable for tracking whether the default status changed. Add this near the other derived values (~line 64, after the `isCreating` line):

```typescript
let hasDefaultChanged = $derived(
    isReadOnly &&
    workflow.editedItem != null &&
    workflow.originalItem != null &&
    workflow.editedItem.isDefault !== workflow.originalItem.isDefault
  );
```

2. Replace the third branch of the footer (`{:else if workflow.editedItem && isReadOnly}`, lines 298-306):

**Before:**
```svelte
{:else if workflow.editedItem && isReadOnly}
    <button
      type="button"
      onclick={workflow.closeDrawer}
      class="w-full px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium"
    >
      Close
    </button>
```

**After:**
```svelte
{:else if workflow.editedItem && isReadOnly}
    {#if hasDefaultChanged}
      <button
        type="button"
        onclick={workflow.handleSave}
        disabled={workflow.isSaving}
        class="w-full px-4 py-2 rounded-md transition-colors font-medium {workflow.isSaving ? 'bg-mono-300 text-mono-500 cursor-not-allowed' : 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer'}"
      >
        {#if workflow.isSaving}
          Saving...
        {:else}
          Save
        {/if}
      </button>
    {/if}
    <button
      type="button"
      onclick={workflow.closeDrawer}
      class="w-full px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium"
    >
      Close
    </button>
```

This shows the Save button only when the user has toggled the isDefault checkbox on the Global namespace. The Close button is always visible.

**Test command:**
```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

**Commit:**
```
feat(namespaces): add Save button for Global default toggle
```

---

### Task 3: Update drawer locator in page object

**Files to modify:**
- `tests/page-objects/NamespacesPage.ts` (~line 87, drawer locator)

**Steps:**

1. The drawer locator currently matches `Create Namespace|Edit Namespace|View Namespace`. It needs to also match `Namespace Details` (the title shown for the Global namespace drawer). Update line 87-89:

**Before:**
```typescript
this.drawer = page.locator('[class*="fixed"][class*="right-0"]').filter({
    has: page.locator('text=/Create Namespace|Edit Namespace|View Namespace/')
});
```

**After:**
```typescript
this.drawer = page.locator('[class*="fixed"][class*="right-0"]').filter({
    has: page.locator('text=/Create Namespace|Edit Namespace|Namespace Details/')
});
```

2. Add a new locator for the "Set as default" checkbox. Add after the `namespaceDescriptionTextarea` locator (~line 93):

```typescript
readonly defaultCheckbox: Locator;
```

And in the constructor, after the description textarea assignment:

```typescript
this.defaultCheckbox = page.locator('input[type="checkbox"]').filter({ has: page.locator('xpath=..') }).locator('xpath=ancestor::label').filter({ hasText: /default namespace/i }).locator('input[type="checkbox"]');
```

Actually, a simpler approach — use the label text:

```typescript
this.defaultCheckbox = page.getByLabel(/set as default namespace/i);
```

3. Add helper methods for the default toggle:

```typescript
/**
 * Check if the "Set as default" checkbox is visible
 */
async isDefaultCheckboxVisible(): Promise<boolean> {
    return await this.defaultCheckbox.isVisible();
}

/**
 * Check if the "Set as default" checkbox is checked
 */
async isDefaultChecked(): Promise<boolean> {
    return await this.defaultCheckbox.isChecked();
}

/**
 * Toggle the "Set as default" checkbox
 */
async toggleDefault() {
    await this.defaultCheckbox.check();
    await this.delay();
}
```

**Test command:**
```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

**Commit:**
```
test(namespaces): add default checkbox locator to page object
```

---

### Task 4: Add unit tests for locked namespace payload

**Files to modify:**
- `tests/unit/lib/stores/namespacesModel.test.ts`

**Steps:**

1. Find the existing payload tests section (around line 430, "should include isDefault when true"). Add a new test after the existing payload tests:

```typescript
it('should send only isDefault for locked namespace', async () => {
    // Setup: create model with a locked Global namespace that is NOT default
    const globalNs = makeNamespace({
      id: 'global-id',
      name: 'Global',
      isDefault: false,
      locked: true
    });
    const items = [globalNs];
    // ... setup model with items (follow existing pattern)

    model.selectItem(items[0]);
    flushSync();

    // Simulate toggling isDefault to true
    model.editedItem!.isDefault = true;
    flushSync();

    // Trigger save
    (updateNamespaceAction as Mock).mockResolvedValue({
      success: true,
      data: makeNamespace({ id: 'global-id', name: 'Global', isDefault: true, locked: true })
    });

    await model.handleSave();

    // Verify payload contains ONLY isDefault, not name or description
    expect(updateNamespaceAction).toHaveBeenCalledWith('global-id', { isDefault: true });
    const payload = (updateNamespaceAction as Mock).mock.calls[0][1];
    expect(payload).not.toHaveProperty('name');
    expect(payload).not.toHaveProperty('description');
});
```

2. Add a test that verifies non-locked namespaces still include name/description:

```typescript
it('should send name and description for non-locked namespace', async () => {
    const ns = makeNamespace({
      id: 'ns-1',
      name: 'My NS',
      description: 'My desc',
      isDefault: false,
      locked: false
    });
    const items = [ns];
    // ... setup model with items

    model.selectItem(items[0]);
    flushSync();

    model.editedItem!.description = 'Updated desc';
    flushSync();

    (updateNamespaceAction as Mock).mockResolvedValue({
      success: true,
      data: makeNamespace({ id: 'ns-1', name: 'My NS', description: 'Updated desc' })
    });

    await model.handleSave();

    const payload = (updateNamespaceAction as Mock).mock.calls[0][1];
    expect(payload).toHaveProperty('name', 'My NS');
    expect(payload).toHaveProperty('description', 'Updated desc');
});
```

Follow the exact test setup pattern used by existing tests in the file (the `makeNamespace` helper, model creation, `flushSync` calls, mock setup).

**Test command:**
```bash
bunx vitest run tests/unit/lib/stores/namespacesModel.test.ts
```

**Commit:**
```
test(namespaces): add unit tests for locked namespace payload
```

---

### Task 5: Add E2E test for Global namespace default toggle

**Files to modify:**
- `tests/e2e/crud/namespaces.spec.ts`

**Steps:**

1. Add a new test after the existing lifecycle test. This test verifies that the Global namespace can be set as default:

```typescript
test('Global namespace: set as default', async ({ page }) => {
    const api = await E2EApiClient.fromPage(page);
    const namespaces = new NamespacesPage(page);

    // --- Setup: create a namespace and set it as default ---
    // This makes Global's isDefault = false
    await api.deleteAllNamespaces();
    const tempNs = await api.createNamespace({
        name: 'e2e_temp_default',
        description: 'Temporary default',
        isDefault: true
    });

    await namespaces.goto();

    // --- Click Global namespace row ---
    await namespaces.clickRow('Global');
    expect(await namespaces.isDrawerOpen()).toBe(true);

    // --- Verify name/description are read-only ---
    await expect(namespaces.namespaceNameInput).toBeDisabled();
    await expect(namespaces.namespaceDescriptionTextarea).toBeDisabled();

    // --- Verify default checkbox is unchecked and enabled ---
    expect(await namespaces.isDefaultChecked()).toBe(false);

    // --- Toggle default and save ---
    await namespaces.toggleDefault();
    expect(await namespaces.isSaveEnabled()).toBe(true);
    await namespaces.save();

    // --- Verify Global is now shown as default in the table ---
    // Re-open Global to confirm isDefault persisted
    await namespaces.clickRow('Global');
    expect(await namespaces.isDefaultChecked()).toBe(true);
    await namespaces.closeDrawer();

    // --- Cleanup ---
    await api.deleteNamespace(tempNs.id);
});
```

**Important:** Check if `E2EApiClient` has `createNamespace` and `deleteNamespace` methods. If not, the test should use the UI to create the temp namespace instead. Also check if `deleteAllNamespaces` already exists.

**Test command:**
```bash
pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud -g "Global namespace"
```

**Commit:**
```
test(namespaces): add E2E test for Global default toggle
```

---

### Task 6: Full verification

Run all test layers:

```bash
# Type check
bun run svelte-check --tsconfig ./tsconfig.json

# Unit tests
bunx vitest run

# E2E smoke
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke

# E2E CRUD (requires backend)
pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

All must pass with zero errors.

---

### Task 7: Cleanup

Delete the plan and prompt files:

```bash
rm docs/plans/2026-02-25-global-ns-edit-guard-impl.md
rm docs/plans/2026-02-25-global-ns-edit-guard-frontend-prompt.md
```

**Commit:**
```
chore(plans): remove completed Global namespace edit guard plan
```

---

## Expected API Contract

(Copied from backend plan — must match exactly)

### Global namespace — allowed update:
```
PUT /v1/namespaces/{global-ns-id}
Content-Type: application/json

{
  "isDefault": true
}
```
Response: `200 OK` with updated namespace (isDefault=true, locked=true)

### Global namespace — rejected update (name provided):
```
PUT /v1/namespaces/{global-ns-id}
Content-Type: application/json

{
  "name": "Global",
  "isDefault": true
}
```
Response: `400 Bad Request` — `"Cannot modify the Global namespace name"`

### Global namespace — rejected update (description provided):
```
PUT /v1/namespaces/{global-ns-id}
Content-Type: application/json

{
  "description": "anything"
}
```
Response: `400 Bad Request` — `"Cannot modify the Global namespace description"`

### Non-global namespace — always fully editable:
```
PUT /v1/namespaces/{user-ns-id}
Content-Type: application/json

{
  "name": "new-name",
  "description": "new description",
  "isDefault": true
}
```
Response: `200 OK` — all fields updated, regardless of whether namespace is default

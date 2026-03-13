# Field Reordering — Drag-and-Drop Implementation Plan

> **For Claude:** Your FIRST action must be to invoke the Skill tool with `running-tests`. Do NOT proceed without it.

**Goal:** Replace the reverted up/down chevron approach with drag-and-drop field reordering in the Object edit/create drawer using `svelte-dnd-action`. Users grab a grip handle on each field row to drag and reorder. The backend already supports ordering via array index, so this is frontend-only.

**Architecture:** A `$state` array (`dndItems`) mirrors `editedItem.fields` with an added `id` property (required by `svelte-dnd-action`). An `$effect` re-syncs `dndItems` when `editedItem.fields` changes externally (undo, field add/remove). During drag, `onconsider` updates only `dndItems` (live preview). On drop, `onfinalize` writes back to both `dndItems` and `editedItem`, triggering the existing dirty-state/undo mechanism.

**Tech Stack:** SvelteKit 2.47+, Svelte 5.41+ (runes), TypeScript, Tailwind CSS, svelte-dnd-action

**Files Modified:**
- `package.json` (new dependency)
- `src/lib/components/form/ObjectFormContent.svelte` (DnD integration)
- `tests/page-objects/ObjectsPage.ts` (new reorder + field names methods)
- `tests/e2e/crud/objects.spec.ts` (reorder test step)

---

## Task 1: Install svelte-dnd-action

Run:
```bash
bun add svelte-dnd-action
```

This adds `svelte-dnd-action` to `dependencies` in `package.json`.

### Verification
- Confirm `svelte-dnd-action` appears in `package.json` under `dependencies`
- Confirm `bun.lockb` was updated (git status shows it modified)

---

## Task 2: Add drag-and-drop to ObjectFormContent.svelte

**File:** `src/lib/components/form/ObjectFormContent.svelte`

### 2a. Add imports (line 14)

At line 14, the current imports block starts with:
```typescript
  import type { ObjectDefinition } from '$lib/stores/objects';
```

Replace the entire import section (lines 14-29) with the following. The only changes are: (1) add `dragHandleZone`, `dragHandle`, and `DndEvent` from `svelte-dnd-action`, and (2) add `flip` from `svelte/animate`:

**Current (lines 14-29):**
```typescript
  import type { ObjectDefinition } from '$lib/stores/objects';
  import type { Field } from '$lib/stores/fields';
  import { getFieldById } from '$lib/stores/fields';
  import type { ModelValidatorTemplate, InlineModelValidator, FieldAppearance, ObjectRelationship, Cardinality } from '$lib/types';
  import {
    FormField,
    FormLabel,
    FieldSelectorDropdown,
    TemplateGallery,
    TemplateForm,
    Pill
  } from '$lib/components';
  import { getModelValidatorTemplateById } from '$lib/stores/modelValidatorTemplates';
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import { showToast } from '$lib/stores/toasts';
  import { generateId } from '$lib/utils/ids';
```

**Replace with:**
```typescript
  import type { ObjectDefinition } from '$lib/stores/objects';
  import type { Field } from '$lib/stores/fields';
  import { getFieldById } from '$lib/stores/fields';
  import type { ModelValidatorTemplate, InlineModelValidator, FieldAppearance, ObjectFieldReference, ObjectRelationship, Cardinality } from '$lib/types';
  import {
    FormField,
    FormLabel,
    FieldSelectorDropdown,
    TemplateGallery,
    TemplateForm,
    Pill
  } from '$lib/components';
  import { getModelValidatorTemplateById } from '$lib/stores/modelValidatorTemplates';
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import { showToast } from '$lib/stores/toasts';
  import { generateId } from '$lib/utils/ids';
  import { dragHandleZone, dragHandle } from 'svelte-dnd-action';
  import type { DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
```

Note: We also add `ObjectFieldReference` to the `$lib/types` import (it was previously not explicitly imported since it was only used indirectly).

### 2b. Add DnD state, type, and handlers

Insert the following block **after** the `selectedFieldIds` derived declaration (after line 44) and **before** the `objectFieldDefinitions` derived declaration (line 47).

**Insert after line 44** (`let selectedFieldIds = $derived(editedItem.fields.map(f => f.fieldId));`):

```typescript

  // --- Drag-and-drop field reordering ---
  type DndItem = ObjectFieldReference & { id: string };

  // Mutable state for dndzone — synced from editedItem.fields
  let dndItems: DndItem[] = $state(
    editedItem.fields.map(f => ({ ...f, id: f.fieldId }))
  );

  // Re-sync when editedItem.fields changes externally (undo, field add/remove)
  $effect(() => {
    dndItems = editedItem.fields.map(f => ({ ...f, id: f.fieldId }));
  });

  // Map library items back to clean ObjectFieldReference[] (strip `id` and any library-injected properties)
  function toDomainFields(items: DndItem[]): ObjectFieldReference[] {
    return items.map(item => ({
      fieldId: item.fieldId,
      optional: item.optional,
      isPk: item.isPk,
      appears: item.appears
    }));
  }

  function handleDndConsider(e: CustomEvent<DndEvent<DndItem>>) {
    dndItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<DndItem>>) {
    dndItems = e.detail.items;
    editedItem = { ...editedItem, fields: toDomainFields(e.detail.items) };
  }
```

### 2c. Update the field list template

The template changes are in the `{:else}` branch of the fields section (lines 267-370). We need to:
1. Add `use:dragHandleZone` to the container div
2. Change `{#each editedItem.fields as fieldRef}` to `{#each dndItems as item (item.id)}`
3. Add `animate:flip` to each field row div
4. Add a grip handle as the first element inside each field row
5. Update all `fieldRef` references to `item` in the each block

**Current (lines 267-370):**
```svelte
        <div class="p-2 bg-mono-800 rounded border border-mono-700 space-y-2">
          {#each editedItem.fields as fieldRef}
            {@const field = getFieldById(fieldRef.fieldId)}
            {@const pkCompatible = field ? ALLOWED_PK_TYPES.has(field.type) : false}
            {#if field}
              <div class="flex items-center space-x-2 p-2 bg-mono-900 rounded border border-mono-700">
                <!-- Field Name and Type -->
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-sm text-mono-300">{field.name}</span>
                  <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">{field.type}</span>
                </div>

                <!-- Description (if available) -->
                {#if field.description}
                  <div class="flex-1 text-xs text-mono-400">
                    {field.description}
                  </div>
                {:else}
                  <div class="flex-1"></div>
                {/if}

                <!-- PK Toggle -->
                <button
                  type="button"
                  onclick={() => toggleFieldPk(fieldRef.fieldId)}
                  disabled={!pkCompatible && !fieldRef.isPk}
                  class="flex items-center space-x-1 px-2 py-0.5 text-xs font-medium border transition-colors {fieldRef.isPk
                    ? 'bg-green-900/30 text-green-400 border-green-700'
                    : pkCompatible
                      ? 'bg-mono-800 text-mono-500 border-mono-700 hover:text-mono-300 hover:border-mono-600'
                      : 'bg-mono-800 text-mono-600 border-mono-700 opacity-40 cursor-not-allowed'}"
                  title={fieldRef.isPk
                    ? 'Remove primary key'
                    : pkCompatible
                      ? 'Set as primary key'
                      : 'Only int and uuid fields can be primary keys'}
                >
                  <i class="fa-solid fa-key text-[10px]"></i>
                  <span>PK</span>
                </button>

                <!-- Appears-in Segmented Control -->
                <div class="flex border border-mono-700 rounded overflow-hidden {fieldRef.isPk ? 'opacity-40 pointer-events-none' : ''}">
                  <button
                    type="button"
                    onclick={() => setFieldAppears(fieldRef.fieldId, 'both')}
                    class="px-2 py-0.5 text-xs font-medium transition-colors {fieldRef.appears === 'both' ? 'bg-blue-500/20 text-blue-400 border-r border-blue-500/50' : 'bg-mono-800 text-mono-500 border-r border-mono-700 hover:text-mono-300'}"
                    title="Include in both request and response"
                  >Both</button>
                  <button
                    type="button"
                    onclick={() => setFieldAppears(fieldRef.fieldId, 'request')}
                    class="px-2 py-0.5 text-xs font-medium transition-colors {fieldRef.appears === 'request' ? 'bg-yellow-500/20 text-yellow-400 border-r border-yellow-500/50' : 'bg-mono-800 text-mono-500 border-r border-mono-700 hover:text-mono-300'}"
                    title="Include in request only"
                  >Req</button>
                  <button
                    type="button"
                    onclick={() => setFieldAppears(fieldRef.fieldId, 'response')}
                    class="px-2 py-0.5 text-xs font-medium transition-colors {fieldRef.appears === 'response' ? 'bg-green-500/20 text-green-400' : 'bg-mono-800 text-mono-500 hover:text-mono-300'}"
                    title="Include in response only"
                  >Res</button>
                </div>

                <!-- Optional Checkbox -->
                <label class="flex items-center space-x-2 {fieldRef.isPk || fieldRef.appears === 'response' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}" title={fieldRef.isPk ? 'Primary key fields cannot be optional' : fieldRef.appears === 'response' ? 'Response-only fields are not optional' : ''}>
                  <input
                    type="checkbox"
                    checked={fieldRef.optional}
                    disabled={fieldRef.isPk || fieldRef.appears === 'response'}
                    onchange={() => toggleFieldOptional(fieldRef.fieldId)}
                    class="h-4 w-4 border-mono-600 rounded text-green-400 focus:ring-2 focus:ring-green-400"
                  />
                  <span class="text-sm text-mono-400 whitespace-nowrap">Optional</span>
                </label>

                <!-- Delete Button -->
                <button
                  type="button"
                  onclick={() => removeField(fieldRef.fieldId)}
                  class="text-red-700 hover:text-red-600 transition-colors"
                  title="Remove field"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            {:else}
              <!-- Missing field fallback -->
              <div class="flex items-center gap-2 py-1.5">
                <i class="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>
                <span class="flex-1 text-sm text-red-700">
                  Field not found <span class="font-mono text-xs text-red-500">({fieldRef.fieldId})</span>
                </span>
                <button
                  type="button"
                  onclick={() => removeField(fieldRef.fieldId)}
                  class="p-1 text-red-700 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="Remove missing field reference"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            {/if}
          {/each}
        </div>
```

**Replace with:**
```svelte
        <div
          use:dragHandleZone={{ items: dndItems, flipDurationMs: 150, type: 'fields' }}
          onconsider={handleDndConsider}
          onfinalize={handleDndFinalize}
          class="p-2 bg-mono-800 rounded border border-mono-700 space-y-2"
        >
          {#each dndItems as item (item.id)}
            {@const field = getFieldById(item.fieldId)}
            {@const pkCompatible = field ? ALLOWED_PK_TYPES.has(field.type) : false}
            {#if field}
              <div animate:flip={{ duration: 150 }} class="flex items-center space-x-2 p-2 bg-mono-900 rounded border border-mono-700">
                <!-- Drag Handle -->
                <div use:dragHandle class="text-mono-600 hover:text-mono-400 cursor-grab">
                  <i class="fa-solid fa-grip-vertical text-xs"></i>
                </div>

                <!-- Field Name and Type -->
                <div class="flex items-center space-x-2">
                  <span class="font-mono text-sm text-mono-300">{field.name}</span>
                  <span class="text-xs text-mono-400 bg-mono-800 px-2 py-0.5 rounded">{field.type}</span>
                </div>

                <!-- Description (if available) -->
                {#if field.description}
                  <div class="flex-1 text-xs text-mono-400">
                    {field.description}
                  </div>
                {:else}
                  <div class="flex-1"></div>
                {/if}

                <!-- PK Toggle -->
                <button
                  type="button"
                  onclick={() => toggleFieldPk(item.fieldId)}
                  disabled={!pkCompatible && !item.isPk}
                  class="flex items-center space-x-1 px-2 py-0.5 text-xs font-medium border transition-colors {item.isPk
                    ? 'bg-green-900/30 text-green-400 border-green-700'
                    : pkCompatible
                      ? 'bg-mono-800 text-mono-500 border-mono-700 hover:text-mono-300 hover:border-mono-600'
                      : 'bg-mono-800 text-mono-600 border-mono-700 opacity-40 cursor-not-allowed'}"
                  title={item.isPk
                    ? 'Remove primary key'
                    : pkCompatible
                      ? 'Set as primary key'
                      : 'Only int and uuid fields can be primary keys'}
                >
                  <i class="fa-solid fa-key text-[10px]"></i>
                  <span>PK</span>
                </button>

                <!-- Appears-in Segmented Control -->
                <div class="flex border border-mono-700 rounded overflow-hidden {item.isPk ? 'opacity-40 pointer-events-none' : ''}">
                  <button
                    type="button"
                    onclick={() => setFieldAppears(item.fieldId, 'both')}
                    class="px-2 py-0.5 text-xs font-medium transition-colors {item.appears === 'both' ? 'bg-blue-500/20 text-blue-400 border-r border-blue-500/50' : 'bg-mono-800 text-mono-500 border-r border-mono-700 hover:text-mono-300'}"
                    title="Include in both request and response"
                  >Both</button>
                  <button
                    type="button"
                    onclick={() => setFieldAppears(item.fieldId, 'request')}
                    class="px-2 py-0.5 text-xs font-medium transition-colors {item.appears === 'request' ? 'bg-yellow-500/20 text-yellow-400 border-r border-yellow-500/50' : 'bg-mono-800 text-mono-500 border-r border-mono-700 hover:text-mono-300'}"
                    title="Include in request only"
                  >Req</button>
                  <button
                    type="button"
                    onclick={() => setFieldAppears(item.fieldId, 'response')}
                    class="px-2 py-0.5 text-xs font-medium transition-colors {item.appears === 'response' ? 'bg-green-500/20 text-green-400' : 'bg-mono-800 text-mono-500 hover:text-mono-300'}"
                    title="Include in response only"
                  >Res</button>
                </div>

                <!-- Optional Checkbox -->
                <label class="flex items-center space-x-2 {item.isPk || item.appears === 'response' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}" title={item.isPk ? 'Primary key fields cannot be optional' : item.appears === 'response' ? 'Response-only fields are not optional' : ''}>
                  <input
                    type="checkbox"
                    checked={item.optional}
                    disabled={item.isPk || item.appears === 'response'}
                    onchange={() => toggleFieldOptional(item.fieldId)}
                    class="h-4 w-4 border-mono-600 rounded text-green-400 focus:ring-2 focus:ring-green-400"
                  />
                  <span class="text-sm text-mono-400 whitespace-nowrap">Optional</span>
                </label>

                <!-- Delete Button -->
                <button
                  type="button"
                  onclick={() => removeField(item.fieldId)}
                  class="text-red-700 hover:text-red-600 transition-colors"
                  title="Remove field"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            {:else}
              <!-- Missing field fallback -->
              <div animate:flip={{ duration: 150 }} class="flex items-center gap-2 py-1.5">
                <i class="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>
                <span class="flex-1 text-sm text-red-700">
                  Field not found <span class="font-mono text-xs text-red-500">({item.fieldId})</span>
                </span>
                <button
                  type="button"
                  onclick={() => removeField(item.fieldId)}
                  class="p-1 text-red-700 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="Remove missing field reference"
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            {/if}
          {/each}
        </div>
```

Key changes summarized:
1. Container div gains `use:dragHandleZone`, `onconsider`, `onfinalize` attributes
2. `{#each editedItem.fields as fieldRef}` becomes `{#each dndItems as item (item.id)}` (keyed)
3. Each field row div gains `animate:flip={{ duration: 150 }}`
4. New grip handle div with `use:dragHandle` added as the first child of each field row
5. All `fieldRef` references become `item`
6. The missing-field fallback row also gets `animate:flip` (required since it is inside the dndzone)

### Verification
```bash
bun run svelte-check --tsconfig ./tsconfig.json
```
Must complete with 0 errors.

---

## Task 3: Update E2E page objects

**File:** `tests/page-objects/ObjectsPage.ts`

### 3a. Add grip handle locator to constructor

Add a new locator property declaration after `fieldDropdownOptions` (line 44):

**Current (lines 43-45):**
```typescript
	readonly fieldSelectorInput: Locator;
	readonly fieldDropdownOptions: Locator;
```

**Replace with:**
```typescript
	readonly fieldSelectorInput: Locator;
	readonly fieldDropdownOptions: Locator;
	readonly fieldGripHandles: Locator;
```

Then in the constructor, after the `fieldDropdownOptions` assignment (line 95):

**Current (lines 94-95):**
```typescript
		this.fieldSelectorInput = page.getByPlaceholder('Add field to object...');
		this.fieldDropdownOptions = page.locator('.absolute.z-10.w-full button');
```

**Replace with:**
```typescript
		this.fieldSelectorInput = page.getByPlaceholder('Add field to object...');
		this.fieldDropdownOptions = page.locator('.absolute.z-10.w-full button');
		this.fieldGripHandles = page.locator('.fa-grip-vertical').locator('..');
```

### 3b. Add getFieldNames method

Add the following method after `getFieldCount()` (after line 323):

```typescript
	/**
	 * Get ordered list of field names in the drawer
	 */
	async getFieldNames(): Promise<string[]> {
		const fieldRows = this.page.locator('.flex.items-center.space-x-2.p-2.bg-mono-900.rounded.border');
		const count = await fieldRows.count();
		const names: string[] = [];
		for (let i = 0; i < count; i++) {
			const nameSpan = fieldRows.nth(i).locator('.font-mono.text-sm.text-mono-300');
			const text = await nameSpan.textContent();
			if (text) names.push(text.trim());
		}
		return names;
	}
```

### 3c. Add reorderField method

Add the following method immediately after the new `getFieldNames()` method:

```typescript
	/**
	 * Reorder a field by dragging its grip handle to another field's grip handle position.
	 * @param fromIndex - 0-based index of the field to drag
	 * @param toIndex - 0-based index of the target position
	 */
	async reorderField(fromIndex: number, toIndex: number) {
		const sourceHandle = this.fieldGripHandles.nth(fromIndex);
		const targetHandle = this.fieldGripHandles.nth(toIndex);
		await sourceHandle.dragTo(targetHandle);
		await this.delay();
	}
```

### Verification
```bash
bun run svelte-check --tsconfig ./tsconfig.json
```
Must still pass with 0 errors (page objects are plain TS, but svelte-check validates the whole project).

---

## Task 4: Update E2E test

**File:** `tests/e2e/crud/objects.spec.ts`

### 4a. Add a second helper field constant

After the existing `HELPER_FIELD` constant (line 18-22), add a second helper field:

**Current (lines 18-22):**
```typescript
const HELPER_FIELD = {
	name: 'e2e_obj_helper_field',
	type: 'str',
	description: 'Helper field for object CRUD test'
};
```

**Replace with:**
```typescript
const HELPER_FIELD = {
	name: 'e2e_obj_helper_field',
	type: 'str',
	description: 'Helper field for object CRUD test'
};

const HELPER_FIELD_2 = {
	name: 'e2e_obj_helper_field_2',
	type: 'int',
	description: 'Second helper field for object reorder test'
};
```

### 4b. Extend cleanup to delete the second helper field

In the cleanup section (lines 42-49), add cleanup for the second helper field. The existing block deletes fields matching `HELPER_FIELD.name`. Extend the condition:

**Current (lines 42-49):**
```typescript
	const { data: existingFields } = await apiClient.listFields();
	if (existingFields) {
		for (const field of existingFields) {
			if (field.name === HELPER_FIELD.name) {
				await apiClient.deleteField(field.id);
			}
		}
	}
```

**Replace with:**
```typescript
	const { data: existingFields } = await apiClient.listFields();
	if (existingFields) {
		for (const field of existingFields) {
			if (field.name === HELPER_FIELD.name || field.name === HELPER_FIELD_2.name) {
				await apiClient.deleteField(field.id);
			}
		}
	}
```

### 4c. Create second helper field via UI

After the first helper field creation (line 54-55), add:

**Current (lines 53-55):**
```typescript
	await fields.goto();
	await fields.createNewField(HELPER_FIELD);
	expect(await fields.hasField(HELPER_FIELD.name)).toBe(true);
```

**Replace with:**
```typescript
	await fields.goto();
	await fields.createNewField(HELPER_FIELD);
	expect(await fields.hasField(HELPER_FIELD.name)).toBe(true);
	await fields.createNewField(HELPER_FIELD_2);
	expect(await fields.hasField(HELPER_FIELD_2.name)).toBe(true);
```

### 4d. Add field reorder test steps

After the existing "Add field to object" section (lines 82-85) and before the "Update description" section (line 88), insert a reorder test. The modified section should read:

**Current (lines 81-89):**
```typescript
	// --- Add field to object ---
	const initialFieldCount = await objects.getFieldCount();
	await objects.addField(HELPER_FIELD.name);
	const newFieldCount = await objects.getFieldCount();
	expect(newFieldCount).toBe(initialFieldCount + 1);

	// --- Update description ---
	await objects.setObjectDescription(UPDATED_DESCRIPTION);
```

**Replace with:**
```typescript
	// --- Add fields to object ---
	const initialFieldCount = await objects.getFieldCount();
	await objects.addField(HELPER_FIELD.name);
	await objects.addField(HELPER_FIELD_2.name);
	const newFieldCount = await objects.getFieldCount();
	expect(newFieldCount).toBe(initialFieldCount + 2);

	// --- Reorder fields via drag-and-drop ---
	const namesBefore = await objects.getFieldNames();
	expect(namesBefore).toContain(HELPER_FIELD.name);
	expect(namesBefore).toContain(HELPER_FIELD_2.name);

	// Find the indices of our two helper fields
	const idx1 = namesBefore.indexOf(HELPER_FIELD.name);
	const idx2 = namesBefore.indexOf(HELPER_FIELD_2.name);

	// Drag second helper field to first helper field's position (swap)
	await objects.reorderField(idx2, idx1);

	const namesAfter = await objects.getFieldNames();
	// After reorder, the second field should now appear before the first
	const newIdx1 = namesAfter.indexOf(HELPER_FIELD.name);
	const newIdx2 = namesAfter.indexOf(HELPER_FIELD_2.name);
	expect(newIdx2).toBeLessThan(newIdx1);

	// --- Update description ---
	await objects.setObjectDescription(UPDATED_DESCRIPTION);
```

### 4e. Update field count assertion after save

The existing assertion on line 98 checks `getFieldCount() > 0`. Update it to check for at least 2 (since we now add 2 fields):

**Current (line 98):**
```typescript
	expect(await objects.getFieldCount()).toBeGreaterThan(0);
```

**Replace with:**
```typescript
	expect(await objects.getFieldCount()).toBeGreaterThanOrEqual(2);
```

### 4f. Extend final cleanup to delete second helper field

At the end of the test (lines 113-121), the cleanup deletes the first helper field. Add cleanup for the second:

**Current (lines 113-121):**
```typescript
	// --- Cleanup helper field ---
	await fields.goto();
	await fields.search(HELPER_FIELD.name);
	if (await fields.hasField(HELPER_FIELD.name)) {
		await fields.clickRow(HELPER_FIELD.name);
		await fields.clickDelete();
		await fields.confirmDelete();
	}
```

**Replace with:**
```typescript
	// --- Cleanup helper fields ---
	await fields.goto();
	await fields.search(HELPER_FIELD.name);
	if (await fields.hasField(HELPER_FIELD.name)) {
		await fields.clickRow(HELPER_FIELD.name);
		await fields.clickDelete();
		await fields.confirmDelete();
	}
	await fields.clearSearch();
	await fields.search(HELPER_FIELD_2.name);
	if (await fields.hasField(HELPER_FIELD_2.name)) {
		await fields.clickRow(HELPER_FIELD_2.name);
		await fields.clickDelete();
		await fields.confirmDelete();
	}
```

### Verification
The test file should have no TypeScript errors. Verify with:
```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

---

## Task 5: Run full verification

> **IMPORTANT:** Invoke the `running-tests` skill before running any test command.

Run all verification steps in order. Each must pass with 0 errors before proceeding to the next.

### 5a. Type check
```bash
bun run svelte-check --tsconfig ./tsconfig.json
```
Timeout: 120000ms. Expected: 0 errors.

### 5b. Unit/integration tests
```bash
bunx vitest run
```
Timeout: 120000ms. Expected: all pass.

### 5c. Smoke E2E tests
```bash
bunx playwright test --project=smoke
```
Timeout: 120000ms. Expected: all pass.

### 5d. CRUD E2E tests
```bash
PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```
Timeout: 300000ms. Expected: all pass, including the updated objects test with reorder steps.

### Troubleshooting

If the drag-and-drop E2E test fails:
- **Grip handle not found:** Check that `.fa-grip-vertical` is rendered. The locator `page.locator('.fa-grip-vertical').locator('..')` selects the parent div (which has `use:dragHandle`).
- **dragTo doesn't reorder:** Playwright's `dragTo` may need the target to be a different element. Try adjusting `reorderField` to use the field row div instead of the grip handle as the drop target.
- **Animation timing:** If assertions run before animation completes, add `await this.delay()` after `dragTo`.

---

## Task 6: Commit and cleanup

### 6a. Commit the implementation

Use the `/commit` skill. The changes span:
- `package.json` and `bun.lockb` (new dependency)
- `src/lib/components/form/ObjectFormContent.svelte` (DnD integration)
- `tests/page-objects/ObjectsPage.ts` (new methods)
- `tests/e2e/crud/objects.spec.ts` (reorder test steps)

Suggested scope: `feat(objects)` with subject about drag-and-drop field reordering.

### 6b. Delete this plan file

```bash
rm docs/plans/2026-03-13-field-reordering-impl.md
```

### 6c. Commit cleanup

Use the `/commit` skill with scope `chore(plans)` to commit the deletion.

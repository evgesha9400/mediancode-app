# Endpoint Configure-Then-Create Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change endpoint creation from create-then-edit (immediate backend POST) to configure-then-create (local-only state until user clicks "Create").

**Architecture:** Add an `isCreating` boolean to the existing `apiDetailState` factory. `handleAddEndpoint` populates `editedEndpoint` with local defaults and opens the drawer without any API call. A new `handleCreateEndpoint` fires the POST only when the user clicks "Create". The template conditionally renders title and footer buttons based on `isCreating`.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript

---

### Task 1: Add `isCreating` state and update interface

**Files:**
- Modify: `src/lib/stores/apiDetailState.svelte.ts:54-137` (interface)
- Modify: `src/lib/stores/apiDetailState.svelte.ts:315-338` (state declarations)

**Step 1: Add `isCreating` to the `ApiDetailState` interface**

In the `// --- Endpoint drawer ---` section (line 83), add:

```typescript
// --- Endpoint drawer ---
readonly isCreating: boolean;
endpointDrawerOpen: boolean;
```

In the `// Endpoint list actions` section (line 104), change `handleAddEndpoint` return type and add new methods:

```typescript
// Endpoint list actions
handleAddEndpoint: () => void;
handleCreateEndpoint: () => Promise<void>;
handleCancelCreate: () => void;
handleDeleteEndpoint: () => Promise<void>;
```

**Step 2: Add `isCreating` state variable**

After line 328 (`let showEndpointDeleteConfirm = $state(false);`), add:

```typescript
let isCreating = $state(false);
```

**Step 3: Update `hasEndpointChanges` to handle create mode**

Replace the current `hasEndpointChanges` derived (lines 334-338) with:

```typescript
const CREATE_DEFAULTS = {
    method: 'GET' as const,
    path: '/',
    description: '',
    tagName: undefined as string | undefined,
    pathParams: [] as { name: string; fieldId: string }[],
    queryParamsObjectId: undefined as string | undefined,
    requestBodyObjectId: undefined as string | undefined,
    responseBodyObjectId: undefined as string | undefined,
    useEnvelope: true,
    responseShape: 'object' as const
};

let hasEndpointChanges = $derived.by(() => {
    if (!editedEndpoint) return false;
    if (isCreating) {
        return editedEndpoint.method !== CREATE_DEFAULTS.method
            || editedEndpoint.path !== CREATE_DEFAULTS.path
            || editedEndpoint.description !== CREATE_DEFAULTS.description
            || editedEndpoint.tagName !== CREATE_DEFAULTS.tagName
            || editedEndpoint.pathParams.length !== CREATE_DEFAULTS.pathParams.length
            || editedEndpoint.queryParamsObjectId !== CREATE_DEFAULTS.queryParamsObjectId
            || editedEndpoint.requestBodyObjectId !== CREATE_DEFAULTS.requestBodyObjectId
            || editedEndpoint.responseBodyObjectId !== CREATE_DEFAULTS.responseBodyObjectId
            || editedEndpoint.useEnvelope !== CREATE_DEFAULTS.useEnvelope
            || editedEndpoint.responseShape !== CREATE_DEFAULTS.responseShape;
    }
    if (!selectedEndpoint) return false;
    return JSON.stringify(editedEndpoint) !== JSON.stringify(selectedEndpoint);
});
```

**Step 4: Commit**

Message: `refactor(apis): add isCreating state and update interface`

---

### Task 2: Rewrite `handleAddEndpoint` and add create/cancel handlers

**Files:**
- Modify: `src/lib/stores/apiDetailState.svelte.ts:359-381` (handleAddEndpoint)
- Modify: `src/lib/stores/apiDetailState.svelte.ts:447-464` (drawer operations section)

**Step 1: Rewrite `handleAddEndpoint` to be synchronous and local-only**

Replace lines 359-381 with:

```typescript
function handleAddEndpoint(): void {
    closeEditDrawer();
    isCreating = true;
    selectedEndpoint = null;
    editedEndpoint = {
        id: '',
        apiId,
        method: CREATE_DEFAULTS.method,
        path: CREATE_DEFAULTS.path,
        description: CREATE_DEFAULTS.description,
        pathParams: [],
        useEnvelope: CREATE_DEFAULTS.useEnvelope,
        responseShape: CREATE_DEFAULTS.responseShape,
        expanded: false
    };
    endpointDrawerOpen = true;
    tagInputValue = '';
    tagDropdownOpen = false;
}
```

**Step 2: Add `handleCreateEndpoint` after `handleAddEndpoint`**

```typescript
async function handleCreateEndpoint(): Promise<void> {
    if (!editedEndpoint) return;

    isSaving = true;
    try {
        const result = await createEndpointAction({
            apiId,
            method: editedEndpoint.method,
            path: editedEndpoint.path,
            description: editedEndpoint.description,
            tagName: editedEndpoint.tagName,
            pathParams: editedEndpoint.pathParams,
            queryParamsObjectId: editedEndpoint.queryParamsObjectId,
            requestBodyObjectId: editedEndpoint.requestBodyObjectId,
            responseBodyObjectId: editedEndpoint.responseBodyObjectId,
            useEnvelope: editedEndpoint.useEnvelope,
            responseShape: editedEndpoint.responseShape
        });

        if (!result.success) {
            showToast(result.error ?? 'Failed to create endpoint', 'error');
            return;
        }

        showToast('Endpoint created successfully', 'success');
        isCreating = false;
        closeEndpointDrawer();
    } finally {
        isSaving = false;
    }
}
```

**Step 3: Add `handleCancelCreate` after `handleCreateEndpoint`**

```typescript
function handleCancelCreate(): void {
    isCreating = false;
    closeEndpointDrawer();
}
```

**Step 4: Commit**

Message: `feat(apis): implement configure-then-create for endpoints`

---

### Task 3: Expose new state and methods in the return object

**Files:**
- Modify: `src/lib/stores/apiDetailState.svelte.ts:574-646` (return block)

**Step 1: Add `isCreating` getter to the return object**

In the `// Endpoint drawer` section (after line 603), add:

```typescript
// Endpoint drawer
get isCreating() { return isCreating; },
```

**Step 2: Add new methods to the return object**

In the `// Endpoint list actions` section (after line 623), add `handleCreateEndpoint` and `handleCancelCreate`:

```typescript
// Endpoint list actions
handleAddEndpoint,
handleCreateEndpoint,
handleCancelCreate,
handleDeleteEndpoint,
```

**Step 3: Commit**

Message: `refactor(apis): expose isCreating state and create handlers`

---

### Task 4: Update the drawer template for create mode

**Files:**
- Modify: `src/routes/(dashboard)/apis/[id]/+page.svelte:320-547` (endpoint drawer)

**Step 1: Update the drawer header title (line 322)**

Replace:
```svelte
<DrawerHeader title="Edit Endpoint" onClose={apiState.closeEndpointDrawer} />
```

With:
```svelte
<DrawerHeader
    title={apiState.isCreating ? 'Create Endpoint' : 'Edit Endpoint'}
    onClose={apiState.isCreating ? apiState.handleCancelCreate : apiState.closeEndpointDrawer}
/>
```

**Step 2: Update the drawer footer (lines 485-546)**

Replace the entire `<DrawerFooter>` block with:

```svelte
<DrawerFooter>
    {#if apiState.editedEndpoint}
        {#if apiState.isCreating}
            <div class="flex space-x-2">
                <button
                    type="button"
                    onclick={apiState.handleCreateEndpoint}
                    disabled={!apiState.hasEndpointChanges || apiState.isSaving}
                    class="flex-1 px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {apiState.hasEndpointChanges && !apiState.isSaving ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
                >
                    {#if apiState.isSaving}
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <span>Creating...</span>
                    {:else}
                        <i class="fa-solid fa-plus"></i>
                        <span>Create</span>
                    {/if}
                </button>
                <button
                    type="button"
                    onclick={apiState.handleCancelCreate}
                    disabled={apiState.isSaving}
                    class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 cursor-pointer transition-colors font-medium flex items-center justify-center space-x-2"
                >
                    <span>Cancel</span>
                </button>
            </div>
        {:else if !apiState.showEndpointDeleteConfirm}
            <div class="flex space-x-2">
                <button
                    type="button"
                    onclick={apiState.handleSaveEndpoint}
                    disabled={!apiState.hasEndpointChanges}
                    class="flex-1 px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {apiState.hasEndpointChanges ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
                >
                    <i class="fa-solid fa-save"></i>
                    <span>Save</span>
                </button>
                <button
                    type="button"
                    onclick={apiState.handleUndoEndpoint}
                    disabled={!apiState.hasEndpointChanges}
                    class="flex-1 px-4 py-2 border rounded-md transition-colors font-medium flex items-center justify-center space-x-2 {apiState.hasEndpointChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
                >
                    <i class="fa-solid fa-undo"></i>
                    <span>Undo</span>
                </button>
                <button
                    type="button"
                    onclick={() => apiState.handleDuplicateEndpoint(apiState.editedEndpoint!.id)}
                    class="flex-1 px-4 py-2 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                    <i class="fa-solid fa-copy"></i>
                    <span>Duplicate</span>
                </button>
                <button
                    type="button"
                    onclick={apiState.handleDeleteEndpointClick}
                    class="flex-1 px-4 py-2 border border-mono-300 text-red-700 rounded-md hover:bg-red-50 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                    <i class="fa-solid fa-xmark"></i>
                    <span>Delete</span>
                </button>
            </div>
        {:else}
            <div class="bg-red-50 border border-red-200 rounded-md p-3">
                <p class="text-sm text-red-800 mb-2">Are you sure?</p>
                <div class="flex space-x-2">
                    <button
                        type="button"
                        onclick={apiState.handleDeleteEndpoint}
                        class="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                    >
                        Yes, Delete
                    </button>
                    <button
                        type="button"
                        onclick={apiState.cancelDeleteEndpoint}
                        class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 text-sm font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        {/if}
    {/if}
</DrawerFooter>
```

**Step 3: Commit**

Message: `feat(apis): add create mode UI to endpoint drawer`

---

### Task 5: Run validation and fix any issues

**Step 1: Run type checker**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 2: Run unit tests**

Run: `bunx vitest run`
Expected: all pass

**Step 3: Run E2E smoke tests**

Run: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
Expected: all pass

**Step 4: Run E2E CRUD tests**

Run: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
Expected: all pass

**Step 5: Fix any failures found in steps 1-4**

**Step 6: Commit fixes if any**

---

### Task 6: Clean up plan files

**Step 1: Delete plan and design files**

```bash
rm docs/plans/2026-02-26-endpoint-configure-then-create-design.md
rm docs/plans/2026-02-26-endpoint-configure-then-create-impl.md
```

**Step 2: Commit**

Message: `chore: remove completed endpoint creation flow plan`

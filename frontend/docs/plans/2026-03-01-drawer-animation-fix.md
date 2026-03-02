# Drawer Animation Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix broken drawer slide animations on the API detail and Objects pages by replacing the Drawer↔DrawerStack swap pattern with a single unified DrawerStack per page.

**Architecture:** Currently, both pages mount a `Drawer` for the base form and conditionally swap to a `DrawerStack` when inline creation overlays open. This destroy/recreate cycle breaks animations. The fix: always use `DrawerStack` — panels are pushed/popped reactively, the component stays mounted, and all panels animate with `transition:slide`.

**Tech Stack:** Svelte 5 (runes, snippets, `transition:slide`), SvelteKit 2, Tailwind CSS

**Design doc:** `docs/plans/2026-03-01-drawer-animation-fix-design.md`

---

### Task 1: Add `transition:slide` to DrawerStack base panel

The base panel (index 0) currently has no transition — it just appears/disappears. Add the same `transition:slide` that stacked panels already have.

**Files:**
- Modify: `src/lib/components/drawer/DrawerStack.svelte`

**Step 1: Add `transition:slide` to the base panel div**

In `DrawerStack.svelte`, the base panel div at line 38-55 currently has no transition. Add `transition:slide={{ duration: 400, axis: 'x' }}` to it:

```svelte
<!-- Before (line 38-42): -->
        <div
          class="flex-1 min-w-0 h-full flex flex-col bg-white overflow-hidden relative"
          class:border-r={i < panels.length - 1}
          class:border-mono-200={i < panels.length - 1}
        >

<!-- After: -->
        <div
          class="flex-1 min-w-0 h-full flex flex-col bg-white overflow-hidden relative"
          class:border-r={i < panels.length - 1}
          class:border-mono-200={i < panels.length - 1}
          transition:slide={{ duration: 400, axis: 'x' }}
        >
```

**Step 2: Verify type check passes**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 3: Commit**

```
fix(drawer): add slide transition to DrawerStack base panel

- Add transition:slide to base panel (index 0) matching stacked panel animation
```

---

### Task 2: Unify API detail page to single DrawerStack

Replace the two separate drawer components (standalone `Drawer` + conditional `DrawerStack`) with a single `DrawerStack` that manages all panels reactively.

**Files:**
- Modify: `src/routes/(dashboard)/apis/[id]/+page.svelte`

**Step 1: Add `editApiFormContent` and `editApiFormFooter` snippets**

The Edit API form is currently inline inside a `<Drawer>` (lines 371-495). Extract its content and footer into snippets so they can be passed to DrawerStack as panel content. Add these snippets right before the existing `endpointFormContent` snippet (around line 497):

```svelte
  {#snippet editApiFormContent(_: { close: () => void })}
    <div class="space-y-4">
      <!-- Namespace (Read-only) -->
      <div>
        <FormLabel label="Namespace" forId="edit-namespace" />
        <input
          id="edit-namespace"
          type="text"
          value={namespaceName}
          disabled
          class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md bg-mono-50 text-mono-500 cursor-not-allowed"
        />
        <p class="text-xs text-mono-500 mt-1">Namespace cannot be changed after creation</p>
      </div>

      <!-- API Title -->
      <FormField
        id="edit-title"
        label="API Title"
        bind:value={apiState.editForm.title}
        required
      />

      <!-- Version -->
      <FormField
        id="edit-version"
        label="Version"
        bind:value={apiState.editForm.version}
        placeholder="1.0.0"
      />

      <!-- Description -->
      <div>
        <FormLabel label="Description" forId="edit-description" />
        <textarea
          id="edit-description"
          bind:value={apiState.editForm.description}
          rows="3"
          placeholder="Describe what this API does..."
          class="w-full px-3 py-1.5 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
        ></textarea>
      </div>

      <!-- Server URL -->
      <FormField
        id="edit-server-url"
        label="Server URL"
        bind:value={apiState.editForm.serverUrl}
        placeholder="https://api.example.com"
      />

      <!-- Base URL -->
      <FormField
        id="edit-base-url"
        label="Base URL"
        bind:value={apiState.editForm.baseUrl}
        placeholder="/api/v1"
      />
    </div>
  {/snippet}

  {#snippet editApiFormFooter(_: { close: () => void })}
    {#if !apiState.showEditDeleteConfirm}
      <button
        type="button"
        onclick={apiState.handleEditSave}
        disabled={!apiState.hasEditChanges || apiState.isSaving}
        class="w-full px-4 py-2 rounded-md transition-colors font-medium {apiState.hasEditChanges && !apiState.isSaving ? 'bg-mono-900 text-white hover:bg-mono-800 cursor-pointer' : 'bg-mono-300 text-mono-500 cursor-not-allowed'}"
      >
        {#if apiState.isSaving}
          <i class="fa-solid fa-spinner fa-spin mr-2"></i>
          Saving...
        {:else}
          Save Changes
        {/if}
      </button>
      <button
        type="button"
        onclick={apiState.handleEditUndo}
        disabled={!apiState.hasEditChanges}
        class="w-full px-4 py-2 border rounded-md transition-colors font-medium {apiState.hasEditChanges ? 'border-mono-300 text-mono-700 hover:bg-mono-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed bg-mono-50'}"
      >
        Undo
      </button>
      <button
        type="button"
        onclick={apiState.handleEditDeleteClick}
        class="w-full px-4 py-2 bg-mono-100 text-red-700 rounded-md hover:bg-red-50 cursor-pointer transition-colors font-medium flex items-center justify-center space-x-2"
      >
        <i class="fa-solid fa-xmark"></i>
        <span>Delete API</span>
      </button>
    {:else}
      <div class="bg-red-50 border border-red-200 rounded-md p-3">
        <p class="text-sm text-red-800 mb-2">Delete this API and all its endpoints?</p>
        <div class="flex space-x-2">
          <button
            type="button"
            onclick={apiState.handleDeleteApi}
            disabled={apiState.isSaving}
            class="flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors {apiState.isSaving ? 'bg-red-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer'}"
          >
            {#if apiState.isSaving}
              <i class="fa-solid fa-spinner fa-spin mr-1"></i>
              Deleting...
            {:else}
              Yes, Delete
            {/if}
          </button>
          <button
            type="button"
            onclick={apiState.cancelEditDelete}
            disabled={apiState.isSaving}
            class="flex-1 px-3 py-1.5 border border-mono-300 text-mono-700 rounded-md hover:bg-mono-50 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  {/snippet}
```

**Step 2: Replace all drawer markup with a single DrawerStack**

Delete these three blocks:
1. The Edit API `<Drawer>` (lines 370-495)
2. The Endpoint `<Drawer>` (lines 745-757)
3. The conditional `{#if objectCreateOpen || fieldCreateOpen}` DrawerStack (lines 841-850)

Replace all three with a single DrawerStack that reactively builds its panels array. Place this at the end of the template, before the closing `{/if}` for `apiExists`:

```svelte
  <!-- Unified DrawerStack: all drawers in one component -->
  {#if apiState.editDrawerOpen || apiState.endpointDrawerOpen}
    <DrawerStack
      panels={[
        ...(apiState.editDrawerOpen
          ? [{ id: 'edit-api', title: 'Edit API', width: 520, content: editApiFormContent, footer: editApiFormFooter }]
          : []),
        ...(apiState.endpointDrawerOpen
          ? [{ id: 'endpoint', title: apiState.isCreating ? 'Create Endpoint' : 'Edit Endpoint', width: 1200, content: endpointFormContent, footer: endpointFormFooter }]
          : []),
        ...(objectCreateOpen
          ? [{ id: 'object', title: 'Create Object', width: 600, content: objectFormContent, footer: objectFormFooter }]
          : []),
        ...(fieldCreateOpen
          ? [{ id: 'field', title: 'Create Field', width: 600, content: fieldFormContent, footer: fieldFormFooter }]
          : [])
      ]}
      onPopPanel={() => {
        if (fieldCreateOpen) closeFieldCreate();
        else if (objectCreateOpen) closeObjectCreate();
        else if (apiState.endpointDrawerOpen) {
          if (apiState.isCreating) apiState.handleCancelCreate();
          else apiState.closeEndpointDrawer();
        }
        else if (apiState.editDrawerOpen) apiState.closeEditDrawer();
      }}
    />
  {/if}
```

**Step 3: Remove unused `Drawer` import**

In the import block (line 6), remove `Drawer` from the imports since it's no longer used on this page. Keep `DrawerHeader`, `DrawerContent`, `DrawerFooter` — they are still used by `DrawerStack` internally. Actually, check if those are used directly — they are NOT used directly anymore since snippets replaced inline content. Remove them too if unused:

After the change, the import should be:
```typescript
  import {
    DrawerStack,
    Pill,
    FormField,
    FormLabel,
    EndpointItem,
    ParameterEditor,
    QueryParametersEditor,
    RequestBodyEditor,
    ResponseBodyEditor
  } from '$lib/components';
```

**Step 4: Verify type check passes**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 5: Commit**

```
fix(apis): unify drawers into single DrawerStack

- Replace standalone Drawer and conditional DrawerStack with single unified DrawerStack
- Extract Edit API form into snippets for DrawerStack panel usage
- All panels now slide in/out with consistent 400ms animation
```

---

### Task 3: Unify Objects page to single DrawerStack

Same pattern as the API page — replace the Drawer + DrawerStack swap with a single DrawerStack.

**Files:**
- Modify: `src/routes/(dashboard)/objects/+page.svelte`

**Step 1: Convert the object form content and footer into DrawerStack-compatible snippets**

The object form content is currently inline in the `<Drawer>` (lines 260-271) and footer (lines 274-293). There's also a `objectFormInStack` snippet (lines 298-309) that duplicates the content without the `onCreateNewField` prop. We need a single snippet that always includes `onCreateNewField`.

Replace the `objectFormInStack` snippet (lines 298-309) with one that includes `onCreateNewField`:

```svelte
{#snippet objectFormContent(_: { close: () => void })}
  {#if workflow.editedItem}
    <ObjectFormContent
      bind:editedItem={workflow.editedItem}
      mode={workflow.mode === 'creating' ? 'creating' : 'editing'}
      namespaceName={objectNamespaceName}
      availableFields={namespacedFields}
      {modelValidatorTemplates}
      visibleErrors={workflow.visibleErrors}
      onCreateNewField={openFieldCreate}
    />
  {/if}
{/snippet}

{#snippet objectFormFooter(_: { close: () => void })}
  {#if workflow.editedItem}
    <CrudDrawerFooter
      mode={workflow.mode === 'creating' ? 'creating' : 'editing'}
      isSaving={workflow.isSaving}
      isFormValid={workflow.isFormValid}
      hasChanges={workflow.hasChanges}
      canDelete={workflow.canDelete}
      deleteTooltip={workflow.deleteTooltip}
      showDeleteConfirm={workflow.showDeleteConfirm}
      isDeleting={workflow.isDeleting}
      onCreate={workflow.handleCreate}
      onSave={workflow.handleSave}
      onUndo={workflow.handleUndo}
      onDeleteRequest={() => workflow.showDeleteConfirm = true}
      onDeleteConfirm={workflow.handleDelete}
      onDeleteCancel={() => workflow.showDeleteConfirm = false}
    />
  {/if}
{/snippet}
```

**Step 2: Replace Drawer + DrawerStack with single DrawerStack**

Delete:
1. The `<Drawer>` block (lines 257-294)
2. The `objectFormInStack` snippet (lines 298-309) — replaced by `objectFormContent` above
3. The conditional `{#if fieldCreateOpen}` DrawerStack (lines 351-370)

Replace with a single DrawerStack:

```svelte
{#if workflow.drawerOpen}
  <DrawerStack
    panels={[
      {
        id: 'object',
        title: workflow.mode === 'creating' ? 'Create Object' : 'Edit Object',
        width: 720,
        content: objectFormContent,
        footer: objectFormFooter
      },
      ...(fieldCreateOpen
        ? [{
            id: 'field',
            title: 'Create Field',
            width: 600,
            content: fieldFormContent,
            footer: fieldFormFooter
          }]
        : [])
    ]}
    onPopPanel={fieldCreateOpen ? closeFieldCreate : workflow.closeDrawer}
  />
{/if}
```

**Step 3: Clean up unused imports**

Remove `Drawer`, `DrawerHeader`, `DrawerContent`, `DrawerFooter` from the import if they are no longer used directly. Keep `DrawerStack` and `CrudDrawerFooter`.

Updated import:
```typescript
  import {
    PageHeader,
    SearchBar,
    Table,
    SortableColumn,
    Pill,
    TableEmptyState,
    DrawerStack,
    CrudDrawerFooter,
    NamespaceSelector,
    ObjectFormContent
  } from '$lib/components';
```

**Step 4: Verify type check passes**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 5: Commit**

```
fix(objects): unify drawers into single DrawerStack

- Replace standalone Drawer and conditional DrawerStack with single unified DrawerStack
- Merge duplicate object form snippets into one with onCreateNewField
- All panels now slide in/out with consistent 400ms animation
```

---

### Task 4: Visual verification in browser

**Step 1: Start dev server and test all drawer flows**

Run: `bun run dev`

Test these flows on the API detail page (`/apis/[id]`):
1. Click an endpoint → endpoint drawer slides in from right
2. Click "Edit API" → edit drawer slides in from right
3. From endpoint drawer, click "Create Object" → object panel slides in from right, endpoint squeezed + dimmed
4. From object panel, click "Create Field" → field panel slides in, object squeezed + dimmed
5. Close field panel → slides out, object panel expands
6. Close object panel → slides out, endpoint panel expands
7. Close endpoint drawer → slides out to right

Test these flows on the Objects page (`/objects`):
1. Click an object → object drawer slides in
2. Click "Create Field" → field panel slides in, object squeezed + dimmed
3. Close field panel → slides out, object expands
4. Close object drawer → slides out

**Step 2: Verify no console errors**

Check browser console for any Svelte warnings or JS errors during all transitions.

---

### Task 5: Run full test suite

**Step 1: Type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 2: Unit/integration tests**

Run: `bunx vitest run`
Expected: All pass

**Step 3: Smoke tests**

Run: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
Expected: All pass

**Step 4: CRUD tests**

Run: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
Expected: All pass

---

### Task 6: Cleanup

**Step 1: Delete plan files**

```bash
rm docs/plans/2026-03-01-drawer-animation-fix-design.md
rm docs/plans/2026-03-01-drawer-animation-fix.md
```

**Step 2: Commit cleanup**

```
chore: remove completed drawer animation fix plans
```

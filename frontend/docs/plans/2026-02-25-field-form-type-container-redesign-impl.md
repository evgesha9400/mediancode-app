# Field Form Type + Container Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge container selection into the type selector as an inline wrap/unwrap toggle, and place Field Name + Type on a single row in the field drawer form.

**Architecture:** Create a new `TypeContainerSelector` compound component that wraps the existing `TypeSelectorDropdown` with List wrap/unwrap controls and visual bracket nesting. Modify the fields page to use a horizontal flex layout for the top form row.

**Tech Stack:** Svelte 5, Tailwind CSS, TypeSelectorDropdown (reused)

---

### Task 1: Create TypeContainerSelector component

**Files:**
- Create: `src/lib/components/api-generator/TypeContainerSelector.svelte`

**Step 1: Create the component file**

Create `src/lib/components/api-generator/TypeContainerSelector.svelte` with this content:

```svelte
<script module lang="ts">
  import type { FieldType } from '$lib/stores/types';

  export interface TypeContainerSelectorProps {
    availableTypes: FieldType[];
    selectedTypeName: string;
    container: string | null;
    onTypeChange: (typeName: string) => void;
    onContainerChange: (container: string | null) => void;
    error?: boolean;
    id?: string;
  }
</script>

<script lang="ts">
  import TypeSelectorDropdown from './TypeSelectorDropdown.svelte';

  interface Props extends TypeContainerSelectorProps {}

  let {
    availableTypes,
    selectedTypeName,
    container,
    onTypeChange,
    onContainerChange,
    error = false,
    id
  }: Props = $props();

  let isWrapped = $derived(container === 'List');
  let wrapLabel = $derived(`List[${selectedTypeName}]`);
</script>

<div>
  <!-- Type selector area -->
  {#if isWrapped}
    <!-- Wrapped state: type nested inside List [ ... ] -->
    <div class="flex items-center gap-2 px-3 py-1.5 border border-mono-300 rounded-md bg-mono-50">
      <span class="text-sm font-mono text-mono-500 shrink-0">List [</span>
      <div class="flex-1 min-w-0">
        <TypeSelectorDropdown
          {id}
          {availableTypes}
          {selectedTypeName}
          onSelect={onTypeChange}
          placeholder="Search types..."
          {error}
        />
      </div>
      <span class="text-sm font-mono text-mono-500 shrink-0">]</span>
    </div>
  {:else}
    <!-- Unwrapped state: plain type selector -->
    <TypeSelectorDropdown
      {id}
      {availableTypes}
      {selectedTypeName}
      onSelect={onTypeChange}
      placeholder="Search types..."
      {error}
    />
  {/if}

  <!-- Wrap / Unwrap controls -->
  <div class="flex items-center justify-between mt-2">
    <!-- Wrap toggle (left-aligned) -->
    <button
      type="button"
      onclick={() => isWrapped ? onContainerChange(null) : onContainerChange('List')}
      class="px-2.5 py-1 text-xs rounded-md border transition-colors {isWrapped
        ? 'bg-mono-900 text-white border-mono-900'
        : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400 hover:text-mono-700'}"
    >
      {wrapLabel}
    </button>

    <!-- Unwrap button (right-aligned) -->
    <button
      type="button"
      onclick={() => onContainerChange(null)}
      disabled={!isWrapped}
      class="px-2.5 py-1 text-xs rounded-md transition-colors {isWrapped
        ? 'text-mono-600 hover:text-mono-800 cursor-pointer'
        : 'text-mono-300 cursor-not-allowed'}"
    >
      - Unwrap
    </button>
  </div>

  <!-- Type error message -->
  {#if error}
    <p class="text-xs text-red-500 mt-1">Type is required</p>
  {/if}
</div>
```

**Design decisions:**
- The wrap toggle button text is always `List[selectedTypeName]` — dynamic based on type.
- When wrapped, the toggle has dark background (`bg-mono-900`) to show active state.
- When unwrapped, clicking the toggle wraps; when wrapped, clicking it unwraps (true toggle).
- The Unwrap button is a separate right-aligned control, disabled when not wrapped.
- The error message is rendered inside the component to avoid duplication in the parent.

**Step 2: Verify the file was created**

Run: `ls -la src/lib/components/api-generator/TypeContainerSelector.svelte`
Expected: file exists

**Step 3: Commit**

Use `/commit` skill.
Suggested scope: `feat(fields): add TypeContainerSelector component`

---

### Task 2: Register TypeContainerSelector in barrel exports

**Files:**
- Modify: `src/lib/components/api-generator/index.ts` (add export at line 12)
- Modify: No change needed to `src/lib/components/index.ts` (re-exports via `./api-generator`)

**Step 1: Add export to api-generator barrel**

In `src/lib/components/api-generator/index.ts`, add after line 11 (`TypeSelectorDropdown`):

```typescript
export { default as TypeContainerSelector } from './TypeContainerSelector.svelte';
```

And add the type export after line 23 (`TypeSelectorDropdownProps`):

```typescript
export type { TypeContainerSelectorProps } from './TypeContainerSelector.svelte';
```

**Step 2: Verify exports compile**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 3: Commit**

Use `/commit` skill.
Suggested scope: `feat(fields): export TypeContainerSelector from barrel`

---

### Task 3: Rework the fields page drawer form layout

**Files:**
- Modify: `src/routes/(dashboard)/fields/+page.svelte`

This is the main task. It replaces the three vertical rows (name, container buttons, type selector) with a horizontal layout using `TypeContainerSelector`.

**Step 1: Update imports**

In `src/routes/(dashboard)/fields/+page.svelte`, replace the import block (lines 7-28).

Remove `TypeSelectorDropdown` from the import. Add `TypeContainerSelector`:

```typescript
import {
  PageHeader,
  SearchBar,
  FilterPanel,
  Table,
  SortableColumn,
  Pill,
  FormField,
  FormLabel,
  TableEmptyState,
  Drawer,
  DrawerHeader,
  DrawerContent,
  DrawerFooter,
  CrudDrawerFooter,
  NamespaceSelector,
  FieldConstraintEditor,
  TypeContainerSelector,
  TemplateGallery,
  TemplateForm,
  DefaultValueInput
} from '$lib/components';
```

**Step 2: Replace the form layout**

Replace the three sections — Namespace (lines 340-350), Field Name (lines 352-359), Container (lines 361-380), and Type (lines 382-396) — with the new layout.

Remove the old blocks (lines 339-396) and replace with:

```svelte
      <div class="space-y-4">
        <!-- Namespace (Read-only) -->
        <div>
          <FormLabel label="Namespace" forId="fields-namespace" />
          <input
            id="fields-namespace"
            type="text"
            value={allNamespaces.find(ns => ns.id === workflow.editedItem?.namespaceId)?.name ?? ''}
            disabled
            class="w-full px-3 py-2 border border-mono-300 rounded-md bg-mono-50 text-mono-500 cursor-not-allowed"
          />
          <p class="text-xs text-mono-500 mt-1">Namespace cannot be changed after creation</p>
        </div>

        <!-- Field Name + Type (single row) -->
        <div class="flex gap-4">
          <!-- Field Name (left 50%) -->
          <div class="w-1/2">
            <FormField
              id="fields-name"
              label="Field Name"
              bind:value={workflow.editedItem.name}
              required
              error={workflow.visibleErrors.name}
            />
          </div>

          <!-- Type + Container (right 50%) -->
          <div class="w-1/2">
            <FormLabel label="Field Type" forId="fields-type" required />
            <TypeContainerSelector
              id="fields-type"
              availableTypes={selectableTypes}
              selectedTypeName={workflow.editedItem.type}
              container={workflow.editedItem.container}
              onTypeChange={handleTypeChange}
              onContainerChange={handleContainerChange}
              error={!!workflow.visibleErrors.type}
            />
          </div>
        </div>
```

Note: the closing `</div>` for `space-y-4` stays as-is, along with all sections below (Description, Default Value, Validators, Constraints, Used In APIs).

**Step 3: Remove the FormLabel import for Container**

The `FormLabel` for "Container" is no longer used standalone for that purpose, but it's still used for Namespace and Field Type, so keep the import. Just verify no orphaned "Container" label reference exists.

**Step 4: Verify type check passes**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 5: Commit**

Use `/commit` skill.
Suggested scope: `feat(fields): inline field name and type on single row`

---

### Task 4: Update E2E page object selectors

**Files:**
- Modify: `tests/page-objects/FieldsPage.ts`

The `TypeSelectorDropdown` is now rendered inside `TypeContainerSelector`. The `typeSearchInput` locator uses `getByPlaceholder('Search types...')` which still works regardless of nesting. The `typeDropdownOptions` locator traverses up from the input — this may break because the DOM depth changed.

**Step 1: Verify current locators still work**

Run a quick smoke test first:

```bash
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke
```

If the fields-related tests pass, no changes needed. If they fail on type selection, update the `typeDropdownOptions` locator.

**Step 2: Update typeDropdownOptions if needed**

The current locator (line 106):
```typescript
this.typeDropdownOptions = this.typeSearchInput.locator('..').locator('..').locator('.absolute.z-10 button');
```

This walks up 2 parent levels from the input. With the new nesting (input is inside `TypeContainerSelector` → wrapper div → `TypeSelectorDropdown` → relative div → input), the depth changes. Replace with a more robust locator:

```typescript
this.typeDropdownOptions = page.locator('#fields-type').locator('..').locator('.absolute.z-10 button');
```

This anchors on the `id` prop which is passed through to the `<input>` element, then goes up one level to the `<div class="relative">` and finds the dropdown.

**Step 3: Add container toggle locators**

Add new locators for the wrap/unwrap controls (if E2E tests need to test container wrapping). Add after `typeDropdownOptions` (around line 106):

```typescript
// Container wrap/unwrap controls (inside TypeContainerSelector)
readonly wrapToggle: Locator;
readonly unwrapButton: Locator;
```

And in the constructor:

```typescript
this.wrapToggle = page.locator('button').filter({ hasText: /^List\[/ });
this.unwrapButton = page.getByRole('button', { name: '- Unwrap' });
```

**Step 4: Add helper methods**

```typescript
/**
 * Toggle the List wrapper on the type selector.
 * Clicks the wrap toggle button (e.g., "List[str]").
 */
async toggleWrap() {
  await this.wrapToggle.click();
  await this.delay();
}

/**
 * Unwrap the type (remove List container).
 * Only works when already wrapped.
 */
async unwrap() {
  await this.unwrapButton.click();
  await this.delay();
}

/**
 * Check if the type is currently wrapped in a List container.
 * When wrapped, the wrap toggle button has the active style (bg-mono-900).
 */
async isWrapped(): Promise<boolean> {
  const classes = await this.wrapToggle.getAttribute('class');
  return classes?.includes('bg-mono-900') ?? false;
}
```

**Step 5: Verify E2E tests pass**

Run:
```bash
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke
```

Expected: all smoke tests pass

**Step 6: Commit**

Use `/commit` skill.
Suggested scope: `test(fields): update page object for type container selector`

---

### Task 5: Run full verification suite

**Files:** None (verification only)

**Step 1: Type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 2: Unit tests**

Run: `bunx vitest run`
Expected: all pass

**Step 3: E2E smoke tests**

Run: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
Expected: all pass

**Step 4: E2E CRUD tests**

Run: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
Expected: all pass

**Step 5: Fix any failures**

If any test fails, diagnose and fix before proceeding. Do not skip.

---

### Task 6: Cleanup

**Files:**
- Delete: `docs/plans/2026-02-25-field-form-type-container-redesign-design.md`
- Delete: `docs/plans/2026-02-25-field-form-type-container-redesign-impl.md`

**Step 1: Delete plan files**

```bash
rm docs/plans/2026-02-25-field-form-type-container-redesign-design.md
rm docs/plans/2026-02-25-field-form-type-container-redesign-impl.md
```

**Step 2: Commit**

Use `/commit` skill.
Suggested scope: `chore(plans): remove completed field form redesign plans`

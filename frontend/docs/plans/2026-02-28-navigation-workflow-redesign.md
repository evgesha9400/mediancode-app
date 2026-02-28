# Navigation & Workflow Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure sidebar into Catalog/Components groups. Build a two-panel drawer system for nested entity creation (endpoint → object → field). Unify all entity forms into reusable components.

**Architecture:** Extract field/object form content into shared components. Create a DrawerStack component that shows the active panel (right) and dimmed parent panel (left). Add "Create new" options to all entity selectors. Update delete logic to restrict based on parent count > 1.

**Tech Stack:** SvelteKit 5 (Svelte 5.41+), Tailwind CSS, Vitest, Playwright

**Design doc:** `docs/plans/2026-02-28-navigation-workflow-redesign-design.md`

**Prototype reference:** `src/routes/(dashboard)/prototype/drawer/+page.svelte`

---

## Phase 1: Sidebar Navigation Restructure

### Task 1.1: Update Sidebar Nav Groups

**Files:**
- Modify: `src/lib/components/Sidebar.svelte` (lines 22-41)

**Step 1: Update nav item arrays**

Replace the `coreComponentItems` and `configItems` arrays (lines 22-41) with:

```typescript
const catalogItems: NavItem[] = [
  { href: '/types', label: 'Types', icon: 'fa-shapes' },
  { href: '/validators/field-constraints', label: 'Field Constraints', icon: 'fa-shield-halved' },
  { href: '/validators/field-validators', label: 'Field Validators', icon: 'fa-input-text' },
  { href: '/validators/model-validators', label: 'Model Validators', icon: 'fa-diagram-project' },
  { href: '/fields', label: 'Fields', icon: 'fa-table-list' },
  { href: '/objects', label: 'Objects', icon: 'fa-cubes' },
];

const componentItems: NavItem[] = [
  { href: '/namespaces', label: 'Namespaces', icon: 'fa-layer-group' },
  { href: '/apis', label: 'APIs', icon: 'fa-code' },
];
```

**Step 2: Update template to use new groups**

Replace the template sections (lines 63-145). Key changes:
- Remove the nested `{#if item.children}` block — validators are now flat items
- Change "Core Components" header text to "Catalog"
- Change "Configuration" header text to "Components"
- Remove the bottom `border-t` separator — Components goes in the main scrollable area, not the footer
- Both groups use the same simple `{#each}` rendering (no children support needed)

The template structure becomes:

```svelte
<div class="flex-1 overflow-y-auto p-4">
  <!-- Dashboard -->
  <ul class="space-y-1 mb-6">
    <li>
      <a href={dashboardItem.href} class="flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer {isActive(dashboardItem.href) ? 'bg-mono-800' : 'hover:bg-mono-800'}">
        <i class="fa-solid {dashboardItem.icon} w-5"></i>
        <span>{dashboardItem.label}</span>
      </a>
    </li>
  </ul>

  <!-- Catalog -->
  <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Catalog</h2>
  <ul class="space-y-1 mb-6">
    {#each catalogItems as item}
      <li>
        <a href={item.href} class="flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer {isActive(item.href) ? 'bg-mono-800' : 'hover:bg-mono-800'}">
          <i class="fa-solid {item.icon} w-5"></i>
          <span>{item.label}</span>
        </a>
      </li>
    {/each}
  </ul>

  <!-- Components -->
  <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Components</h2>
  <ul class="space-y-1">
    {#each componentItems as item}
      <li>
        <a href={item.href} class="flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer {isActive(item.href) ? 'bg-mono-800' : 'hover:bg-mono-800'}">
          <i class="fa-solid {item.icon} w-5"></i>
          <span>{item.label}</span>
        </a>
      </li>
    {/each}
  </ul>
</div>
```

Remove the old Configuration footer section (lines 130-145). Keep the Clerk user section as-is.

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Commit**

Use `/commit` skill: `refactor(sidebar): restructure nav into Catalog and Components groups`

---

### Task 1.2: Update Smoke Tests and Page Objects

**Files:**
- Modify: `tests/smoke/dashboard.spec.ts`
- Modify: `tests/page-objects/DashboardPage.ts` (lines 41-46, 100-108)

**Step 1: Verify smoke tests still pass**

The smoke tests at `tests/smoke/dashboard.spec.ts` test auth redirect for `/dashboard`, `/types`, `/fields`. These routes haven't changed, so they should still pass.

Run: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
Expected: All pass

**Step 2: Update DashboardPage nav link locator for field-constraints**

In `tests/page-objects/DashboardPage.ts`, the `fieldConstraintsNavLink` at line 71 uses:
```typescript
this.fieldConstraintsNavLink = page.locator('[data-testid="dashboard-sidebar"] a[href="/validators/field-constraints"]');
```

This still works (href unchanged). No changes needed to page objects for the sidebar restructure since we're only changing group headers and layout, not hrefs.

**Step 3: Run full test suite**

Run: `bunx vitest run`
Expected: All pass

Run: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
Expected: All pass

Run: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
Expected: All pass

**Step 4: Commit if any test updates were needed**

---

## Phase 2: Extract Reusable Form Components

### Task 2.1: Create FieldFormContent Component

**Files:**
- Create: `src/lib/components/form/FieldFormContent.svelte`
- Modify: `src/lib/components/form/index.ts`

**What this does:** Extract the form body from `fields/+page.svelte` (lines 337-505) into a standalone component. This component renders the form fields (namespace, name, container, type, description, default value, validators, field constraints, used-in-apis). It does NOT include the Drawer wrapper or footer — those are provided by the caller.

**Step 1: Create FieldFormContent.svelte**

The component accepts the workflow's `editedItem` (bindable) plus all the props needed for the form internals (namespace name, selectable types, field constraints, validator templates, etc.). Study the fields page at `src/routes/(dashboard)/fields/+page.svelte` lines 337-505 for the exact form content. Also lines 84-120 for the reactive state used by the form (validator gallery state, compatible templates, etc.).

Props interface:

```typescript
export interface FieldFormContentProps {
  editedItem: Field;                        // bindable — the field being edited
  mode: 'creating' | 'editing';
  namespaceName: string;
  selectableTypes: Array<{ name: string; id?: string }>;
  fieldConstraintDefinitions: FieldConstraintDefinition[];
  fieldValidatorTemplates: FieldValidatorTemplate[];
  visibleErrors: Record<string, string>;
  onTypeChange?: (typeName: string) => void; // called when type changes (to reset constraints/default)
}
```

Copy the form sections from the fields page:
1. Namespace (read-only input)
2. Field Name (`FormField`)
3. Container toggle (None/List) + Type (`TypeSelectorDropdown`)
4. Description (textarea)
5. Default Value (`DefaultValueInput`)
6. Validators section (gallery, template form, applied list)
7. Field Constraints (`FieldConstraintEditor`)
8. Used In APIs (only shown when `mode === 'editing'` and `editedItem.usedInApis.length > 0`)

The validator gallery state ($state for galleryOpen, selectedTemplate, paramValues) should be LOCAL to this component, just like it currently is in the fields page.

**Step 2: Export from barrel**

Add to `src/lib/components/form/index.ts`:
```typescript
export { default as FieldFormContent } from './FieldFormContent.svelte';
export type { FieldFormContentProps } from './FieldFormContent.svelte';
```

Also add to `src/lib/components/index.ts` if not already re-exported via the form barrel.

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Commit**

Use `/commit` skill: `refactor(fields): extract FieldFormContent into reusable component`

---

### Task 2.2: Refactor Fields Page to Use FieldFormContent

**Files:**
- Modify: `src/routes/(dashboard)/fields/+page.svelte`

**Step 1: Replace inline form with FieldFormContent**

In the Drawer's `<DrawerContent>` section (lines ~337-507), replace the inline form fields with:

```svelte
<FieldFormContent
  bind:editedItem={workflow.editedItem}
  mode={workflow.mode === 'creating' ? 'creating' : 'editing'}
  namespaceName={...}
  selectableTypes={selectableTypes}
  fieldConstraintDefinitions={...}
  fieldValidatorTemplates={...}
  visibleErrors={workflow.visibleErrors}
  onTypeChange={...}
/>
```

Move the validator gallery state (galleryOpen, selectedTemplate, etc.) that was previously in the page into the `FieldFormContent` component (done in Task 2.1).

The Drawer wrapper, DrawerHeader, DrawerFooter, and CrudDrawerFooter stay in the page file.

**Step 2: Run type check and all tests**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

Run: `bunx vitest run`
Expected: All pass

Run: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
Expected: All pass

Run: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
Expected: All pass (fields CRUD test exercises the full create/edit/delete flow)

**Step 3: Commit**

Use `/commit` skill: `refactor(fields): use FieldFormContent in fields page`

---

### Task 2.3: Create ObjectFormContent Component

**Files:**
- Create: `src/lib/components/form/ObjectFormContent.svelte`
- Modify: `src/lib/components/form/index.ts`

**Step 1: Create ObjectFormContent.svelte**

Same approach as FieldFormContent. Extract the form body from `objects/+page.svelte` (lines ~250-442).

Props interface:

```typescript
export interface ObjectFormContentProps {
  editedItem: ObjectDefinition;              // bindable
  mode: 'creating' | 'editing';
  namespaceName: string;
  availableFields: Field[];                  // fields in same namespace for the field selector
  modelValidatorTemplates: ModelValidatorTemplate[];
  visibleErrors: Record<string, string>;
  onCreateNewField?: () => void;             // callback when user clicks "Create new field" in selector
}
```

Form sections (from objects page):
1. Namespace (read-only)
2. Object Name (`FormField`)
3. Description (textarea)
4. Fields section (`FieldSelectorDropdown` + field rows with Optional checkbox + remove)
5. Validators section (model template gallery + applied list)
6. Used In APIs (only when editing)

The `onCreateNewField` callback is new — it will be used by the DrawerStack to open a stacked field drawer. For now, it's optional and not wired.

**Step 2: Export from barrel**

Add to `src/lib/components/form/index.ts`.

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Commit**

Use `/commit` skill: `refactor(objects): extract ObjectFormContent into reusable component`

---

### Task 2.4: Refactor Objects Page to Use ObjectFormContent

**Files:**
- Modify: `src/routes/(dashboard)/objects/+page.svelte`

**Step 1: Replace inline form with ObjectFormContent**

Same approach as Task 2.2. Replace the DrawerContent body with `<ObjectFormContent>`. Keep Drawer wrapper and footer in the page.

**Step 2: Run type check and all tests**

Run all four test commands (svelte-check, vitest, smoke, crud).
Expected: All pass

**Step 3: Commit**

Use `/commit` skill: `refactor(objects): use ObjectFormContent in objects page`

---

## Phase 3: Update Delete Restriction Logic

### Task 3.1: Update Fields Deletion Guard

**Files:**
- Modify: `src/lib/stores/fieldsModel.svelte.ts` (lines 233-241)
- Modify: `tests/unit/lib/stores/fieldsModel.test.ts`

**Step 1: Write failing test**

In `tests/unit/lib/stores/fieldsModel.test.ts`, add a test in the deletion guard `describe` block:

```typescript
it('should allow delete when field has at most one parent', () => {
  // usedInApis has 1 entry = 1 parent reference — should be deletable
  const item = { ...mockField, usedInApis: ['api1'] };
  // Need to also consider object references — but the current Field type
  // only tracks usedInApis. This test documents the new behavior.
});

it('should prevent delete when field has multiple parents', () => {
  const item = { ...mockField, usedInApis: ['api1', 'api2'] };
  // Should NOT be deletable — more than 1 parent
});
```

**Note:** The current Field type has `usedInApis: string[]` which tracks API references. Object references (which objects contain this field) are not directly on the Field type — they'd need to be computed from the objects store. Check whether the backend already provides this or if it needs frontend computation.

If `usedInApis` is the only parent tracking available, update the guard from `usedInApis.length === 0` to `usedInApis.length <= 1`. If object references need to be included, add a `usedInObjects` computed property or accept it as a config callback.

Run test: `bunx vitest run tests/unit/lib/stores/fieldsModel.test.ts`
Expected: FAIL (old guard still uses `=== 0`)

**Step 2: Update deletion guard**

In `src/lib/stores/fieldsModel.svelte.ts`, update `deletionGuard()` (lines 233-241):

```typescript
deletionGuard(item: Field) {
  const parentCount = item.usedInApis.length;
  return {
    canDelete: parentCount <= 1,
    tooltip: parentCount > 1
      ? buildDeletionTooltip('field', 'API', item.usedInApis.map(name => ({ name })))
      : ''
  };
}
```

**Step 3: Run tests**

Run: `bunx vitest run tests/unit/lib/stores/fieldsModel.test.ts`
Expected: All pass

**Step 4: Commit**

Use `/commit` skill: `feat(fields): restrict delete to fields with at most one parent`

---

### Task 3.2: Update Objects Deletion Guard

**Files:**
- Modify: `src/lib/stores/objectsModel.svelte.ts` (lines 216-224)
- Modify: `tests/unit/lib/stores/objectsModel.test.ts`

**Step 1: Same pattern as Task 3.1**

Update objects deletion guard from `usedInApis.length === 0` to `usedInApis.length <= 1`.

**Step 2: Run tests and commit**

Use `/commit` skill: `feat(objects): restrict delete to objects with at most one parent`

---

## Phase 4: Add "Create New" to Selectors

### Task 4.1: Add "Create New Field" to FieldSelectorDropdown

**Files:**
- Modify: `src/lib/components/api-generator/FieldSelectorDropdown.svelte`

**Step 1: Add onCreateNew prop**

Add to the props interface:
```typescript
onCreateNew?: () => void;
```

**Step 2: Add button to dropdown**

After the empty-state messages (lines 90-101) and after the filtered field list, add a footer section that's always visible when the dropdown is open:

```svelte
{#if onCreateNew}
  <div class="border-t border-mono-200 p-2">
    <button
      type="button"
      class="w-full text-left px-3 py-2 text-sm text-mono-600 hover:bg-mono-50 hover:text-mono-900 rounded cursor-pointer flex items-center space-x-2"
      onmousedown|preventDefault={onCreateNew}
    >
      <i class="fa-solid fa-plus text-xs"></i>
      <span>Create new field</span>
    </button>
  </div>
{/if}
```

Use `onmousedown|preventDefault` instead of `onclick` to fire before the dropdown's `onblur` closes it.

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Commit**

Use `/commit` skill: `feat(fields): add create-new option to FieldSelectorDropdown`

---

### Task 4.2: Add "Create New Object" to ObjectSelectorDropdown

**Files:**
- Modify: `src/lib/components/api-generator/ObjectSelectorDropdown.svelte`

**Step 1: Same pattern as Task 4.1**

Add `onCreateNew?: () => void` prop. Add a footer button "Create new object" at the bottom of the dropdown.

**Step 2: Run type check and commit**

Use `/commit` skill: `feat(objects): add create-new option to ObjectSelectorDropdown`

---

### Task 4.3: Add "Create New Field" to ParameterEditor

**Files:**
- Modify: `src/lib/components/api-generator/ParameterEditor.svelte`

**Step 1: Add onCreateNewField prop**

Add `onCreateNewField?: () => void` to props. Add the same footer button pattern when the field dropdown is open and no field is selected.

**Step 2: Run type check and commit**

Use `/commit` skill: `feat(endpoints): add create-new-field option to ParameterEditor`

---

## Phase 5: DrawerStack Component

### Task 5.1: Create DrawerStack Component

**Files:**
- Create: `src/lib/components/drawer/DrawerStack.svelte`
- Modify: `src/lib/components/drawer/index.ts`

**Step 1: Design the component**

The DrawerStack manages a stack of panels. It renders at most 2 panels:
- **Parent panel** (left, flex:1, dimmed with overlay)
- **Active panel** (right, fixed width, fully interactive)

Props interface:

```typescript
export interface DrawerStackPanel {
  id: string;
  title: string;
  width: number;           // fixed width in px (e.g., 600)
  content: Snippet<[{ close: () => void }]>;
  footer?: Snippet<[{ close: () => void }]>;
  onClose?: () => void;    // called when this panel is closed/popped
}

export interface DrawerStackProps {
  panels: DrawerStackPanel[];   // the stack — last item is active
  onPopPanel: () => void;       // called when active panel requests close
}
```

**Step 2: Implement the component**

Key layout:

```svelte
<script lang="ts">
  // ... props

  let activePanel = $derived(panels[panels.length - 1]);
  let parentPanel = $derived(panels.length >= 2 ? panels[panels.length - 2] : null);
</script>

{#if panels.length > 0}
  <!-- Backdrop -->
  <div class="fixed inset-0 z-40 bg-black/20" onclick={onPopPanel}></div>

  <div class="fixed right-0 top-0 h-screen z-50 flex" style="width: calc(100vw - 256px);">
    {#if parentPanel}
      <!-- Parent panel: fills remaining space, dimmed -->
      <div class="flex-1 flex flex-col bg-white border-r border-mono-200 relative overflow-hidden">
        <DrawerHeader title={parentPanel.title} onClose={onPopPanel} />
        <DrawerContent>
          {@render parentPanel.content({ close: onPopPanel })}
        </DrawerContent>
        {#if parentPanel.footer}
          <DrawerFooter>
            {@render parentPanel.footer({ close: onPopPanel })}
          </DrawerFooter>
        {/if}
        <!-- Dimming overlay -->
        <div class="absolute inset-0 bg-white/60 z-10"></div>
      </div>
    {/if}

    <!-- Active panel: fixed width, fully interactive -->
    <div
      class="flex-shrink-0 flex flex-col bg-white shadow-xl overflow-hidden"
      style="width: {activePanel.width}px;"
      transition:slide={{ duration: 300, axis: 'x' }}
    >
      <DrawerHeader title={activePanel.title} onClose={onPopPanel} />
      <DrawerContent>
        {@render activePanel.content({ close: onPopPanel })}
      </DrawerContent>
      {#if activePanel.footer}
        <DrawerFooter>
          {@render activePanel.footer({ close: onPopPanel })}
        </DrawerFooter>
      {/if}
    </div>
  </div>
{/if}
```

When there's only 1 panel, no parent is shown — the active panel takes its fixed width anchored to the right.

When there are 2+ panels, parent fills `flex-1` on the left and active takes fixed width on the right. The `256px` subtraction accounts for the sidebar.

**Step 3: Export from barrel**

Add to `src/lib/components/drawer/index.ts`:
```typescript
export { default as DrawerStack } from './DrawerStack.svelte';
export type { DrawerStackProps, DrawerStackPanel } from './DrawerStack.svelte';
```

Update `src/lib/components/index.ts` to re-export.

**Step 4: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 5: Commit**

Use `/commit` skill: `feat(drawer): add DrawerStack component for nested panel layout`

---

## Phase 6: Wire DrawerStack into API Detail Page

### Task 6.1: Add DrawerStack to Endpoint Creation Flow

**Files:**
- Modify: `src/routes/(dashboard)/apis/[id]/+page.svelte`

This is the largest single task. The API detail page needs to:
1. Replace the current endpoint Drawer with a DrawerStack
2. When "Create new object" is clicked in any selector, push an Object panel
3. When "Create new field" is clicked from within an Object panel, push a Field panel
4. On save of child entity: auto-select it in parent, pop the panel

**Step 1: Add panel stack state**

Add to the page's script:

```typescript
import { DrawerStack, type DrawerStackPanel } from '$lib/components';
import { FieldFormContent, ObjectFormContent } from '$lib/components';

// Panel stack for nested creation
let panelStack = $state<DrawerStackPanel[]>([]);

function pushObjectPanel(origin: 'query' | 'request' | 'response') {
  // Create a new draft object and push panel
  // On save callback: create object via store, auto-select in endpoint, pop panel
}

function pushFieldPanel(origin: 'pathParam' | 'objectField', context?: { paramName?: string }) {
  // Create a new draft field and push panel
  // On save callback: create field via store, auto-select in parent, pop panel
}

function popPanel() {
  panelStack = panelStack.slice(0, -1);
}
```

**Step 2: Replace endpoint Drawer with DrawerStack**

When the endpoint drawer opens, instead of `<Drawer open={apiState.endpointDrawerOpen} maxWidth={1200}>`, push the endpoint panel onto the stack:

The endpoint panel content uses the existing form sections (tag, description, method, path, path params, query params, request body, response body). Pass `onCreateNew` callbacks to the selectors:

```svelte
<QueryParametersEditor
  endpointNamespaceId={apiState.apiNamespaceId}
  selectedObjectId={endpoint.queryParamsObjectId}
  onSelectObject={(id) => endpoint.queryParamsObjectId = id}
  onCreateNew={() => pushObjectPanel('query')}
/>
```

**Step 3: Handle object creation panel**

When `pushObjectPanel` is called, it pushes a panel with `ObjectFormContent` inside it. The footer has a "Create" button that:
1. Calls the object create API action
2. Auto-selects the new object ID in the endpoint's selector (based on `origin`)
3. Pops the panel

**Step 4: Handle field creation panel**

When `pushFieldPanel` is called from within the object panel (via `onCreateNewField`), it pushes a panel with `FieldFormContent`. The footer "Create" button:
1. Calls the field create API action
2. Adds the field to the object's field list (if origin is 'objectField')
3. Or selects it as the path param field (if origin is 'pathParam')
4. Pops the panel

**Step 5: Keep the Edit API drawer as-is**

The Edit API drawer (maxWidth 520) stays as a regular `<Drawer>` — it doesn't need nesting.

**Step 6: Run type check and all tests**

Run all four test commands.
Expected: All pass (E2E CRUD tests for APIs test the list page and basic detail view — they may not exercise the new "Create new" buttons yet, but existing flows must not break).

**Step 7: Commit**

Use `/commit` skill: `feat(apis): wire DrawerStack for nested entity creation in endpoint editor`

---

### Task 6.2: Wire "Create New" in Object Panel to Field Panel

**Files:**
- Same file: `src/routes/(dashboard)/apis/[id]/+page.svelte`

**Step 1: Connect ObjectFormContent's onCreateNewField**

In the object panel content, pass the callback:

```svelte
<ObjectFormContent
  bind:editedItem={draftObject}
  mode="creating"
  namespaceName={namespaceName}
  availableFields={namespaceFields}
  modelValidatorTemplates={$modelValidatorTemplatesStore}
  visibleErrors={{}}
  onCreateNewField={() => pushFieldPanel('objectField')}
/>
```

When the field is created and the panel pops, the new field should be added to the draft object's `fields` array.

**Step 2: Test manually**

Navigate to an API detail page → Add Endpoint → in Request Body, click "Create new object" → in the object panel, click "Create new field" in the field selector → verify three panels: endpoint (hidden), object (parent, dimmed), field (active).

**Step 3: Run all tests and commit**

Use `/commit` skill: `feat(apis): connect field creation from within object panel`

---

## Phase 7: Wire DrawerStack into Catalog Pages

### Task 7.1: Add DrawerStack to Fields Page

**Files:**
- Modify: `src/routes/(dashboard)/fields/+page.svelte`

**Step 1: Replace Drawer with DrawerStack for the field edit/create flow**

The fields page currently uses a regular `<Drawer>` with `FieldFormContent` inside. Replace it with `DrawerStack` so the same panel system is used everywhere.

For the fields catalog page, the stack will usually have only 1 panel (the field form). No nesting expected here since fields don't create sub-entities through the DrawerStack — validators and constraints are inline within the field form.

Alternatively, keep the regular `<Drawer>` here since no nesting is needed. **Recommendation: keep the regular Drawer on catalog pages** — the DrawerStack is only needed on the API detail page where nesting occurs. The form content (`FieldFormContent`) is already shared.

If keeping regular Drawer: no changes needed beyond what was done in Phase 2.

**Step 2: Commit if changes were made**

---

### Task 7.2: Add DrawerStack to Objects Page (Optional Nesting)

**Files:**
- Modify: `src/routes/(dashboard)/objects/+page.svelte`

**Step 1: Decide nesting behavior**

The objects page has a `FieldSelectorDropdown` with the new "Create new field" button. When clicked from the catalog page, it should open a stacked field drawer.

Two options:
- A: Use DrawerStack on the objects page too — "Create new field" pushes a field panel on top
- B: Keep regular Drawer — "Create new field" button is hidden on the catalog page (only shown in DrawerStack context)

**Recommendation: Option A** — use DrawerStack on the objects page. This gives a consistent experience: users can always create fields inline when adding them to objects, whether from the catalog or from the endpoint flow.

**Step 2: Replace Drawer with DrawerStack**

Similar to Phase 6 but simpler — only 2 levels (object → field). The object panel is the "root" and field panel stacks on top.

**Step 3: Run all tests and commit**

Use `/commit` skill: `feat(objects): add DrawerStack for inline field creation`

---

## Phase 8: Update Tests

### Task 8.1: Update Unit Tests for Deletion Guard Changes

**Files:**
- Modify: `tests/unit/lib/stores/fieldsModel.test.ts`
- Modify: `tests/unit/lib/stores/objectsModel.test.ts`

**Step 1: Update deletion guard test cases**

Update existing tests that assert `canDelete` behavior to match the new `<= 1` parent rule. Add edge case tests:
- 0 parents → canDelete = true
- 1 parent → canDelete = true
- 2 parents → canDelete = false

**Step 2: Run tests**

Run: `bunx vitest run`
Expected: All pass

**Step 3: Commit**

Use `/commit` skill: `test(stores): update deletion guard tests for new parent count rule`

---

### Task 8.2: Update E2E Tests if Needed

**Files:**
- Potentially modify: `tests/e2e/crud/fields.spec.ts`
- Potentially modify: `tests/e2e/crud/objects.spec.ts`
- Potentially modify: `tests/e2e/crud/apis.spec.ts`
- Potentially modify: `tests/page-objects/FieldsPage.ts`
- Potentially modify: `tests/page-objects/ObjectsPage.ts`

**Step 1: Run E2E tests and check for failures**

Run: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`

**Step 2: Fix any failures**

The sidebar restructure shouldn't break E2E tests since routes are unchanged. The drawer changes on the fields/objects pages should be transparent if the form content and data-testid attributes are preserved in the extracted components.

If any tests break, update the page objects to match the new DOM structure.

**Step 3: Commit fixes**

Use `/commit` skill: `test(e2e): update tests for navigation and drawer changes`

---

## Phase 9: Cleanup

### Task 9.1: Delete Prototypes

**Files:**
- Delete: `src/routes/(dashboard)/prototype/wizard/+page.svelte`
- Delete: `src/routes/(dashboard)/prototype/drawer/+page.svelte`
- Delete: `src/routes/(dashboard)/prototype/` (entire directory)

**Step 1: Delete files**

```bash
rm -rf src/routes/\(dashboard\)/prototype/
```

**Step 2: Verify no references remain**

Search for "prototype" in the codebase:
- Grep for `/prototype/` in all files
- Grep for `prototype/wizard` and `prototype/drawer`

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Commit**

Use `/commit` skill: `chore: remove navigation redesign prototypes`

---

### Task 9.2: Delete Plan Files

**Files:**
- Delete: `docs/plans/2026-02-28-navigation-workflow-redesign-design.md`
- Delete: `docs/plans/2026-02-28-navigation-workflow-redesign.md`

**Step 1: Delete and commit**

Use `/commit` skill: `chore: remove completed navigation redesign plans`

---

### Task 9.3: Final Verification

**Step 1: Run all test layers**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
bunx vitest run
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke
pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

All must pass with 0 errors.

**Step 2: Update CLAUDE.md if needed**

If the project structure section in CLAUDE.md needs updating for new components or changed routes, update it.

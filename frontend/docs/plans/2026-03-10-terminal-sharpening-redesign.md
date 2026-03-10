# Terminal Sharpening Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:dispatching-parallel-agents to implement this plan. All 5 agents run simultaneously with zero file overlap.

**Goal:** Make the dashboard match the landing page's sharp terminal aesthetic — strip all rounding, use `border-2` outlines, square icon containers, bolder button typography, and fix Clerk dark theme consistency including GitHub icon contrast.

**Architecture:** Pure CSS/class changes. No structural, logic, or component API changes. Every agent applies the same mechanical rules to their file set. Zero file overlap between agents.

**Tech Stack:** SvelteKit 5, Tailwind CSS, Clerk appearance API

---

## Global Rules (ALL agents follow these)

### Rule 1: Strip Rounding
- Remove ALL `rounded-md` and `rounded-lg` from every element
- **Keep** `rounded-full` ONLY on: progress bars (h-1.5), checklist completion circles (w-5 h-5), user avatars, tiny status dots (w-2 h-2)
- **Remove** `rounded-full` on: status badges/pills (ApiReadinessCard), icon containers, any large element
- When removing `rounded-lg` from a class string like `bg-mono-900 rounded-lg border-2`, just delete `rounded-lg` — do not replace it with anything

### Rule 2: Icon Containers → Square Outlines
Landing page pattern: `w-10 h-10 border-2 border-green-400 flex items-center justify-center`
- Change `bg-mono-800 rounded-lg` icon boxes to `border-2 border-green-400` (remove bg fill, add outline)
- Icon color inside: change `text-mono-300` to `text-green-400` (matches landing page)

### Rule 3: Button Typography
- Primary action buttons (green CTA buttons) add `tracking-wide` if not already present
- This matches landing page: `font-bold tracking-wide`
- Do NOT add `uppercase` — dashboard buttons use normal case unlike nav links

### Rule 4: Clerk borderRadius
- All Clerk appearance configs: set `borderRadius: '0'` (was `'0.375rem'` or `'0.5rem'`)

### Rule 5: Verify After Changes
- Run: `bun run svelte-check --tsconfig ./tsconfig.json`
- Expected: 0 errors

### Rule 6: Commit
- Use the `/commit` skill for all commits

---

## Parallel Execution Strategy

```
5 parallel agents, zero file overlap:

Agent A: Clerk + Auth (11 files)
  clerk.ts, signin, signup, 4 Clerk components, 2 settings pages, mobile-blocked

Agent B: Layout + Data Display (11 files)
  Sidebar, PageHeader, Table, SortableColumn, EmptyState, SearchBar, FilterPanel,
  Pill, StatCard, NamespaceSelector, Modal

Agent C: Forms + Drawers + Toasts (10 files)
  DrawerStack, DrawerHeader, DrawerContent, DrawerFooter, CrudDrawerFooter,
  FormField, DefaultValueInput, FieldFormContent, ObjectFormContent, Toast

Agent D: API Generator + Dashboard Widgets (16 files)
  11 api-generator components, 2 validator-templates, QuickActions,
  ProjectChecklist, ApiReadinessCard

Agent E: All Dashboard Route Pages (10 files)
  dashboard, types, fields, objects, apis, apis/[id], namespaces,
  field-constraints, field-validators, model-validators

After all agents complete:
  Phase 2: Sequential integration testing + snapshot updates
```

---

## Agent A: Clerk + Auth

**Scope:** All Clerk-related theming and auth pages.

**Files (11):**
- `src/lib/clerk.ts`
- `src/routes/signin/+page.svelte`
- `src/routes/signup/+page.svelte`
- `src/routes/mobile-blocked/+page.svelte`
- `src/routes/(dashboard)/settings/+page.svelte`
- `src/routes/(dashboard)/settings/organization/+page.svelte`
- `src/lib/components/clerk/ClerkUserProfile.svelte`
- `src/lib/components/clerk/ClerkOrganizationProfile.svelte`
- `src/lib/components/clerk/ClerkCreateOrganization.svelte`
- `src/lib/components/clerk/ClerkSidebarUser.svelte`
- `src/lib/components/tooltip/Tooltip.svelte`

### Step 1: Update shared `clerkAppearance` in `clerk.ts`

The `clerkAppearance` export (line 15-38) is still using light theme. Migrate to dark and remove rounding:

```typescript
export const clerkAppearance = {
  variables: {
    colorBackground: '#171717',      // mono-900
    colorInputBackground: '#171717', // mono-900
    colorText: '#f5f5f5',            // mono-100
    colorTextSecondary: '#a3a3a3',   // mono-400
    colorPrimary: '#4ade80',         // green-400
    colorInputText: '#f5f5f5',       // mono-100
    borderRadius: '0',               // sharp corners
    colorNeutral: '#a3a3a3',         // mono-400
    colorDanger: '#dc2626',          // red-600
    colorSuccess: '#16a34a',         // green-600
    colorWarning: '#d97706',         // amber-600
  },
  elements: {
    card: 'shadow-none bg-mono-900 border-2 border-mono-700',
    formButtonPrimary: 'bg-green-400 text-mono-950 hover:bg-green-300 font-bold tracking-wide',
    formFieldInput: 'bg-mono-900 border-mono-600 text-mono-100',
    avatarBox: 'border-2 border-mono-700',
    footerActionLink: 'text-green-400 hover:text-green-300',
    socialButtonsIconButton__github: '[&>img]:invert',
  }
};
```

Key changes:
- All colors → dark theme values
- `borderRadius: '0'` (was `'0.5rem'`)
- Card: removed `rounded-lg`, added `shadow-none`
- GitHub icon fix: `socialButtonsIconButton__github: '[&>img]:invert'` inverts the dark GitHub logo to white. If Clerk uses an SVG element instead of img, try `'[&_svg]:invert'` or `'invert'` as fallback.
- Added `tracking-wide` to primary button
- Added `footerActionLink` for green links

### Step 2: Update mock Clerk HTML in `clerk.ts`

All mock mount methods use light theme HTML. Update every mock template (6 functions: mountSignIn, mountSignUp, mountUserButton, mountUserProfile, mountOrganizationProfile, mountCreateOrganization):

Replace in ALL mock HTML:
- `border border-mono-200 rounded-lg bg-white` → `border-2 border-mono-700 bg-mono-900`
- `text-mono-900` → `text-mono-100`
- `text-mono-600` → `text-mono-400`
- `bg-mono-200` → `border-2 border-mono-700`
- `rounded-lg` → remove
- `rounded-full` on avatar → keep (it's an avatar circle)

### Step 3: Update `signin/+page.svelte`

In the Clerk appearance config (line 31-51):
- Change `borderRadius: '0.375rem'` → `borderRadius: '0'`
- Change `card:` class — remove `rounded-lg`: `'shadow-none bg-mono-900 border-2 border-mono-700'`
- Add `tracking-wide` to `formButtonPrimary`
- Add `socialButtonsIconButton__github: '[&>img]:invert'` to elements
- Remove `logoBox` and `logoImage` (not needed since logo is above the form)

### Step 4: Update `signup/+page.svelte`

Apply identical Clerk appearance changes as signin. Read the file first — it should have the same appearance structure.

### Step 5: Update `mobile-blocked/+page.svelte`

- Remove `rounded-full` from the icon container div (line 14): `bg-mono-800 rounded-full` → `border-2 border-green-400` (square outline, matching landing)
- Change icon color: `text-mono-400` → `text-green-400`
- Remove any `rounded-lg` or `rounded-md`

### Step 6: Update settings pages

`settings/+page.svelte`:
- Line 14: Remove `rounded-md` from the Organization Settings button
- Line 27: `rounded-lg border border-mono-700` → `border-2 border-mono-700` (remove `rounded-lg`, upgrade border)

`settings/organization/+page.svelte`:
- Line 10: Remove `rounded-md` from back button, upgrade `border border-mono-600` → `border-2 border-mono-600`
- Line 27, 33: `rounded-lg border border-mono-700` → `border-2 border-mono-700`

### Step 7: Update Clerk wrapper components

For each of ClerkUserProfile, ClerkOrganizationProfile, ClerkCreateOrganization:
- Remove any `rounded-lg` from error/loading state containers
- Upgrade `border border-mono-700` → `border-2 border-mono-700` where present

`ClerkSidebarUser.svelte`:
- Remove any `rounded-md` or `rounded-lg`

`Tooltip.svelte`:
- Remove `rounded-md` if present (tooltips should be sharp too)

### Step 8: Verify and commit

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

Commit message suggestion: `feat(theme): sharpen Clerk components and auth pages`

---

## Agent B: Layout + Data Display

**Scope:** Navigation chrome and read-side UI components.

**Files (10):**
- `src/lib/components/Sidebar.svelte`
- `src/lib/components/layout/PageHeader.svelte`
- `src/lib/components/table/Table.svelte`
- `src/lib/components/table/SortableColumn.svelte`
- `src/lib/components/table/EmptyState.svelte`
- `src/lib/components/search/SearchBar.svelte`
- `src/lib/components/search/FilterPanel.svelte`
- `src/lib/components/pill/Pill.svelte`
- `src/lib/components/StatCard.svelte`
- `src/lib/components/namespace/NamespaceSelector.svelte`

### Step 1: Sidebar.svelte

Remove `rounded-md` from ALL sidebar nav items (3 occurrences on lines 81, 104, 128). The active/hover classes stay the same, just without rounding:

```
Before: "rounded-md cursor-pointer {isActive(...) ? 'bg-green-400/10 ...' : 'hover:bg-mono-800 ...'}"
After:  "cursor-pointer {isActive(...) ? 'bg-green-400/10 ...' : 'hover:bg-mono-800 ...'}"
```

### Step 2: SearchBar.svelte

- Line 98: Remove `rounded-md` from the search input
- Line 107: Remove `rounded-md` from the filter toggle button

### Step 3: FilterPanel.svelte

- Remove any `rounded-md` or `rounded-lg`

### Step 4: EmptyState.svelte

- Line 66: Remove `rounded-md` from the action button

### Step 5: StatCard.svelte

- Line 20: Remove `rounded-lg` from the card container
- Line 22: Change icon container from `rounded-lg` filled to square outline:
  - Normal: `bg-mono-800 rounded-lg` → `border-2 border-green-400`
  - Error: `bg-red-400/10` → `border-2 border-red-400/30`
- Line 26: Change icon color: `text-mono-300` → `text-green-400`

### Step 6: NamespaceSelector.svelte

- Remove all `rounded-md` and `rounded-lg` (2 occurrences)

### Step 7: Pill.svelte

- Remove any `rounded-*` (pills should be square tags)

### Step 8: Table.svelte, SortableColumn.svelte, PageHeader.svelte

- These likely have no `rounded-*` classes (they didn't show up in the search). Read and verify — if clean, skip.

### Step 9: Verify and commit

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

Commit message suggestion: `feat(theme): sharpen layout and data display components`

---

## Agent C: Forms + Drawers + Toasts

**Scope:** Write-side UI — drawers, form inputs, feedback.

**Files (10):**
- `src/lib/components/drawer/DrawerStack.svelte`
- `src/lib/components/drawer/DrawerHeader.svelte`
- `src/lib/components/drawer/DrawerContent.svelte`
- `src/lib/components/drawer/DrawerFooter.svelte`
- `src/lib/components/drawer/CrudDrawerFooter.svelte`
- `src/lib/components/form/FormField.svelte`
- `src/lib/components/form/DefaultValueInput.svelte`
- `src/lib/components/form/FieldFormContent.svelte`
- `src/lib/components/form/ObjectFormContent.svelte`
- `src/lib/components/toast/Toast.svelte`

### Step 1: CrudDrawerFooter.svelte (7 occurrences — most changes)

Remove `rounded-md` from ALL buttons and containers:
- Line 63: Create button — remove `rounded-md`
- Line 78: Save button — remove `rounded-md`
- Line 91: Undo button — remove `rounded-md`
- Line 101: Delete button — remove `rounded-md`
- Line 108: Delete confirmation container — remove `rounded-md`
- Line 115: Confirm delete button — remove `rounded-md`
- Line 128: Cancel button — remove `rounded-md`

Add `tracking-wide` to the Create and Save buttons (primary CTA buttons, lines 63 and 78) — they already have `font-bold`.

### Step 2: FormField.svelte

- Remove `rounded-md` from input element (1 occurrence)

### Step 3: DefaultValueInput.svelte

- Remove `rounded-md` from input elements (2 occurrences)

### Step 4: FieldFormContent.svelte

- Remove all `rounded-md` / `rounded-lg` (6 occurrences — likely on selects, inputs, containers)

### Step 5: ObjectFormContent.svelte

- Remove all `rounded-md` / `rounded-lg` (4 occurrences)

### Step 6: Toast.svelte

- Remove `rounded-md` or `rounded-lg` (1 occurrence — the toast container)

### Step 7: DrawerStack.svelte, DrawerHeader.svelte, DrawerContent.svelte, DrawerFooter.svelte

- Read each file and remove any `rounded-*` classes. DrawerStack and DrawerHeader were already read and have no rounding, but verify all 4.

### Step 8: Verify and commit

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

Commit message suggestion: `feat(theme): sharpen forms, drawers, and toasts`

---

## Agent D: API Generator + Dashboard Widgets

**Scope:** Complex domain components — endpoint editors, dropdowns, template forms, dashboard cards.

**Files (16):**
- `src/lib/components/api-generator/EndpointItem.svelte`
- `src/lib/components/api-generator/FieldConstraintEditor.svelte`
- `src/lib/components/api-generator/FieldConstraintSelectorDropdown.svelte`
- `src/lib/components/api-generator/FieldSelectorDropdown.svelte`
- `src/lib/components/api-generator/GenerateModal.svelte`
- `src/lib/components/api-generator/ObjectSelectorDropdown.svelte`
- `src/lib/components/api-generator/ParameterEditor.svelte`
- `src/lib/components/api-generator/QueryParametersEditor.svelte`
- `src/lib/components/api-generator/RequestBodyEditor.svelte`
- `src/lib/components/api-generator/ResponseBodyEditor.svelte`
- `src/lib/components/api-generator/TypeSelectorDropdown.svelte`
- `src/lib/components/validator-templates/TemplateGallery.svelte`
- `src/lib/components/validator-templates/TemplateForm.svelte`
- `src/lib/components/dashboard/QuickActions.svelte`
- `src/lib/components/dashboard/ProjectChecklist.svelte`
- `src/lib/components/dashboard/ApiReadinessCard.svelte`

### General rule for all api-generator files:

Read each file, then:
- Remove ALL `rounded-md` and `rounded-lg` from every element (buttons, inputs, selects, dropdowns, containers, modals)
- Do NOT change any logic, structure, or non-rounded classes

**Specific file counts from search:**
- FieldConstraintSelectorDropdown: 4 occurrences
- GenerateModal: 4 occurrences
- ParameterEditor: 4 occurrences
- TypeSelectorDropdown: 3 occurrences
- ObjectSelectorDropdown: 3 occurrences
- FieldSelectorDropdown: 2 occurrences
- ResponseBodyEditor: 1 occurrence
- EndpointItem: 1 occurrence
- TemplateForm: 7 occurrences
- TemplateGallery: 1 occurrence

Other files (FieldConstraintEditor, QueryParametersEditor, RequestBodyEditor): may have 0 — read and verify.

### QuickActions.svelte

- Line 26: Remove `rounded-lg` from onboarding card container
- Line 28: Icon container `bg-mono-800 rounded-lg` → `border-2 border-green-400` (square outline), change icon `text-mono-300` → `text-green-400`
- Line 38: Remove `rounded-md` from "Create your first Field" button, add `tracking-wide`
- Line 51: Remove `rounded-lg` from quick action buttons

### ProjectChecklist.svelte

- Line 46: Remove `rounded-lg` from card container
- Line 63: Progress bar `rounded-full` → **keep** (it's a thin bar)
- Line 65: Progress bar fill `rounded-full` → **keep**
- Line 74: Checklist circle `rounded-full` → **keep** (intentional completion dots)

### ApiReadinessCard.svelte

- Line 29: Remove `rounded-lg` from card container
- Line 40: Status badge `rounded-full` → remove (make it a square tag)
- Line 57: Remove `rounded-md` from Generate button, add `tracking-wide`
- Line 66: Remove `rounded-md` from Configure button

### Verify and commit

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

Commit message suggestion: `feat(theme): sharpen api-generator and dashboard widgets`

---

## Agent E: All Dashboard Route Pages

**Scope:** Route-level page components. Most rendering is done by shared components (already handled by Agents B-D), so changes are limited to page-specific inline styles.

**Files (10):**
- `src/routes/(dashboard)/dashboard/+page.svelte`
- `src/routes/(dashboard)/types/+page.svelte`
- `src/routes/(dashboard)/fields/+page.svelte`
- `src/routes/(dashboard)/objects/+page.svelte`
- `src/routes/(dashboard)/apis/+page.svelte`
- `src/routes/(dashboard)/apis/[id]/+page.svelte` (32 occurrences — the biggest file)
- `src/routes/(dashboard)/namespaces/+page.svelte`
- `src/routes/(dashboard)/validators/field-constraints/+page.svelte`
- `src/routes/(dashboard)/validators/field-validators/+page.svelte`
- `src/routes/(dashboard)/validators/model-validators/+page.svelte`

### General rule for all page files:

Read each file, then:
- Remove ALL `rounded-md` and `rounded-lg`
- Upgrade `border border-mono-700` → `border-2 border-mono-700` on card/panel containers (NOT on every element)
- Do NOT change any logic, structure, or non-rounded classes

### apis/[id]/+page.svelte (32 occurrences — most changes)

This is the API detail page with endpoint editor, panels, tabs, dropdowns. It has 32 `rounded-*` occurrences. Read the entire file and remove every `rounded-md` and `rounded-lg`. This file alone accounts for ~25% of all rounding in the codebase.

### dashboard/+page.svelte

- Line 125: Remove `rounded-lg` from the "No APIs yet" empty state container, upgrade `border border-mono-700` → `border-2 border-mono-700`

### Other CRUD list pages (types, fields, objects, namespaces, field-constraints)

- Read each file. Remove `rounded-md`/`rounded-lg` (1-6 occurrences each). Most have inline buttons or small containers with rounding.

### Validator pages (field-validators, model-validators)

- 1 occurrence each — likely on a container or button. Read and remove.

### Verify and commit

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

Commit message suggestion: `feat(theme): sharpen all dashboard route pages`

---

## Phase 2: Sequential Integration Testing

**Run after ALL 5 agents complete.**

### Step 1: Type check

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

Expected: 0 errors.

### Step 2: Unit tests

```bash
bunx vitest run
```

Expected: All pass. These test logic, not styles.

### Step 3: Smoke tests (update snapshots)

```bash
bunx playwright test --project=smoke --update-snapshots
```

Snapshots will fail due to visual changes. Update all snapshots. Visually review the new screenshots.

### Step 4: E2E CRUD tests

```bash
PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

Expected: All pass. Zero logic changes means zero functional regressions. If any fail, debug — likely a selector that referenced a `rounded-*` class.

### Step 5: Commit snapshot updates

Commit message suggestion: `test(smoke): update snapshots for terminal sharpening`

---

## Final Cleanup

```bash
rm docs/plans/2026-03-10-terminal-sharpening-redesign.md
```

Commit message suggestion: `chore: remove completed terminal sharpening plan`

---

## File Ownership Matrix (Zero Overlap Guarantee)

| Agent | Files | Count |
|-------|-------|-------|
| A | clerk.ts, signin, signup, mobile-blocked, settings, settings/organization, ClerkUserProfile, ClerkOrganizationProfile, ClerkCreateOrganization, ClerkSidebarUser, Tooltip | 11 |
| B | Sidebar, PageHeader, Table, SortableColumn, EmptyState, SearchBar, FilterPanel, Pill, StatCard, NamespaceSelector | 10 |
| C | DrawerStack, DrawerHeader, DrawerContent, DrawerFooter, CrudDrawerFooter, FormField, DefaultValueInput, FieldFormContent, ObjectFormContent, Toast | 10 |
| D | 11 api-generator/*, 2 validator-templates/*, QuickActions, ProjectChecklist, ApiReadinessCard | 16 |
| E | dashboard, types, fields, objects, apis, apis/[id], namespaces, field-constraints, field-validators, model-validators | 10 |
| **Total** | | **57** |

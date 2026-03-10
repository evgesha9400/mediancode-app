# Dashboard Dark Theme Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle the entire dashboard to match the landing page's dark terminal aesthetic — dark backgrounds, green-400 accents, JetBrains Mono font, 2px borders — while keeping all structural patterns (tables, drawers, forms, search) identical.

**Architecture:** Pure CSS/class restyling. No structural, logic, or component API changes. Every file gets the same mechanical class replacements from a single token map. The sidebar gets green-400 active state accents. JetBrains Mono replaces Inter globally.

**Tech Stack:** SvelteKit 5, Tailwind CSS, JetBrains Mono (Google Fonts)

---

## Design Token Map (Light → Dark)

This is the authoritative reference for ALL class replacements across the entire codebase. Every agent MUST follow this map exactly.

### Backgrounds

| Find | Replace | Context |
|------|---------|---------|
| `bg-white` | `bg-mono-900` | Cards, panels, drawers, search bars |
| `bg-mono-50` | `bg-mono-950` | Page backgrounds, table headers, subtle backgrounds |
| `bg-mono-100` | `bg-mono-800` | Hover states, disabled inputs, icon backgrounds, active filters |
| `bg-mono-200` | `bg-mono-700` | Pill/badge backgrounds |

### Text Colors

| Find | Replace | Context |
|------|---------|---------|
| `text-mono-900` | `text-mono-100` | Primary text, headings, names |
| `text-mono-800` | `text-mono-100` | Page titles, section headers |
| `text-mono-700` | `text-mono-300` | Form labels, secondary headings, button text |
| `text-mono-600` | `text-mono-400` | Tertiary text, loading text |
| `text-mono-500` | `text-mono-400` | Secondary text (already close, slight shift) |

### Borders

| Find | Replace | Context |
|------|---------|---------|
| `border-mono-200` | `border-mono-700` | All standard borders |
| `border-mono-300` | `border-mono-600` | Form input borders, button borders |
| `border-mono-100` | `border-mono-700` | Subtle dividers |
| `border border-` | `border-2 border-` | Upgrade 1px → 2px borders (SELECTIVE — only on cards, panels, major containers. NOT on every element.) |
| `divide-mono-200` | `divide-mono-700` | Table row dividers |

### Buttons

| Find | Replace | Context |
|------|---------|---------|
| `bg-mono-900 text-white` (primary btn) | `bg-green-400 text-mono-950 font-mono font-bold` | Primary CTA buttons |
| `hover:bg-mono-800` (primary btn hover) | `hover:bg-green-300` | Primary button hover |
| `bg-mono-300 text-mono-500` (disabled btn) | `bg-mono-700 text-mono-500` | Disabled buttons |

### Form Inputs

| Find | Replace | Context |
|------|---------|---------|
| `focus:ring-mono-400` | `focus:ring-green-400` | Focus rings on inputs |
| `focus:ring-mono-500` | `focus:ring-green-400` | Focus rings (alternate) |
| `placeholder-mono-400` | `placeholder-mono-500` | Placeholder text |

### Status Colors (semantic — adjust for dark backgrounds)

| Find | Replace | Context |
|------|---------|---------|
| `bg-green-50` | `bg-green-400/10` | Success/ready background |
| `border-green-200` | `border-green-400/30` | Success border |
| `text-green-700` | `text-green-400` | Success text |
| `text-green-800` | `text-green-400` | Success text (toast) |
| `text-green-600` | `text-green-400` | Success icon (toast) |
| `bg-amber-50` | `bg-amber-400/10` | Warning background |
| `border-amber-200` | `border-amber-400/30` | Warning border |
| `text-amber-700` | `text-amber-400` | Warning text |
| `text-amber-800` | `text-amber-400` | Warning text (toast) |
| `text-amber-600` | `text-amber-400` | Warning icon (toast) |
| `bg-red-50` | `bg-red-400/10` | Error/destructive background |
| `border-red-200` | `border-red-400/30` | Error border |
| `text-red-700` | `text-red-400` | Error text |
| `text-red-800` | `text-red-400` | Error text (toast) |
| `text-red-600` | `text-red-400` | Error icon (toast) |
| `bg-blue-50` | `bg-blue-400/10` | Info background (toast) |
| `border-blue-200` | `border-blue-400/30` | Info border (toast) |
| `text-blue-800` | `text-blue-400` | Info text (toast) |
| `text-blue-600` | `text-blue-400` | Info icon (toast) |

### Shadows

| Find | Replace | Context |
|------|---------|---------|
| `shadow-xl` | `shadow-xl shadow-black/30` | Drawer shadows (enhance on dark) |
| `shadow-lg` | `shadow-lg shadow-black/30` | Dropdown shadows |

### Spinner/Loading

| Find | Replace | Context |
|------|---------|---------|
| `border-b-2 border-mono-900` | `border-b-2 border-green-400` | Loading spinners |

### Overlay

| Find | Replace | Context |
|------|---------|---------|
| `bg-black/20` | `bg-black/40` | Drawer overlay (needs more opacity on dark) |
| `bg-white/60` | `bg-mono-900/60` | Stacked drawer panel tint |

### Special Cases

- **Destructive (delete) buttons**: Keep `bg-red-600 text-white hover:bg-red-700` as-is — red on dark works fine.
- **Tooltip**: Already dark (`bg-mono-800 text-mono-100`) — no changes needed.
- **Logo component**: Already supports `variant="dark"` — switch sidebar usage if needed.
- **Clerk components** (UserProfile, OrgProfile): Clerk renders its own UI; we cannot restyle it. Only restyle the wrapper/container around Clerk mounts.

---

## Parallel Execution Strategy

```
Phase 1: Foundation (sequential, ~5 min)
  └── Task 1: Global config (app.html, app.css, tailwind.config.js, root layouts)

Phase 2: Component & Page Restyling (5 parallel agents, ~30 min each)
  ├── Agent A: Layout Shell (Sidebar, PageHeader, Logo, ClerkSidebarUser)
  ├── Agent B: Data Display (Table, Search, Pill, StatCard, Namespace, Tooltip)
  ├── Agent C: Interaction (Drawer, Form, Toast)
  ├── Agent D: Complex Components (API Generator, Validator Templates, Dashboard widgets)
  └── Agent E: All Pages (Dashboard, CRUD lists, API detail, Validators, Settings, Auth)

Phase 3: Integration (sequential, ~10 min)
  └── Task: svelte-check, vitest, smoke snapshot update, E2E CRUD
```

**Safety guarantees:**
- Zero file overlap between agents — each agent owns a unique, non-overlapping set of files
- All agents follow the same token map — visual consistency is enforced by shared spec
- No logic changes — only CSS class replacements, zero risk of functional regressions

---

## Phase 1: Foundation

### Task 1: Global Configuration

**Files:**
- Modify: `src/app.html`
- Modify: `src/app.css`
- Modify: `tailwind.config.js`
- Modify: `src/routes/+layout.svelte` (root layout — no visual classes, skip)
- Modify: `src/routes/(dashboard)/+layout.svelte`

**Step 1: Update `src/app.html`**

Add JetBrains Mono font import and update body classes:

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Median Code</title>
		<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,...">

		<!-- Google Fonts preconnect for performance -->
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<!-- JetBrains Mono for terminal aesthetic -->
		<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">

		<!-- Local Font Awesome -->
		<link rel="stylesheet" href="/font-awesome.min.css">

		<!-- Hide scrollbar -->
		<style>
			::-webkit-scrollbar { display: none; }
			html { scrollbar-width: none; -ms-overflow-style: none; }
		</style>

		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover" class="bg-mono-950 text-mono-100 font-mono">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

Key changes:
- Added JetBrains Mono font link (move from landing page's `<svelte:head>` to global)
- Body class: `bg-mono-50 text-mono-900 font-inter` → `bg-mono-950 text-mono-100 font-mono`

**Step 2: Update `src/app.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color-scheme: dark;
}
```

Key changes:
- Font family: Inter → JetBrains Mono with monospace fallbacks
- Color scheme: `light` → `dark`
- Keep Inter import (landing page still references it for potential fallback)

**Step 3: Update `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        'mono-50': '#fafafa',
        'mono-100': '#f5f5f5',
        'mono-200': '#e5e5e5',
        'mono-300': '#d4d4d4',
        'mono-400': '#a3a3a3',
        'mono-500': '#737373',
        'mono-600': '#525252',
        'mono-700': '#404040',
        'mono-800': '#262626',
        'mono-900': '#171717',
        'mono-950': '#0a0a0a',
        'red-50': '#fef2f2',
        'red-100': '#fee2e2',
        'red-200': '#fecaca',
        'red-600': '#dc2626',
        'red-700': '#b91c1c',
        'red-800': '#991b1b',
        'green-400': '#4ade80',
      }
    }
  },
  plugins: []
}
```

Key changes:
- Added `font-mono` family pointing to JetBrains Mono
- Added `green-400` to custom colors (ensures it's always available)

**Step 4: Update `src/routes/(dashboard)/+layout.svelte`**

Apply token map to all classes in this file:
- `bg-mono-50` → `bg-mono-950`
- `border-b-2 border-mono-900` → keep (already dark)
- `text-mono-600` → `text-mono-400`
- `border-b-2 border-mono-900` → `border-b-2 border-green-400` (loading bar accent)
- `animate-spin ... border-b-2 border-mono-900` → `animate-spin ... border-b-2 border-green-400`

**Step 5: Remove JetBrains Mono `<svelte:head>` from landing page**

In `src/routes/+page.svelte`, remove lines 23-27 (the `<svelte:head>` block with JetBrains Mono import) since the font is now loaded globally from `app.html`.

Also remove the `:global(.font-mono)` override from the landing page's `<style>` block — it's now the global default.

**Step 6: Verify**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

**Step 7: Commit**

```
feat(theme): add dark terminal foundation

- load JetBrains Mono globally from app.html
- set body to dark bg, light text, mono font
- update color-scheme to dark in app.css
- update dashboard layout loading states
- remove redundant font imports from landing page
```

---

## Phase 2: Parallel Agent Groups

### Agent A: Layout Shell

**Scope:** The "chrome" around dashboard content — navigation, headers, branding.

**Files (5):**
- `src/lib/components/Sidebar.svelte`
- `src/lib/components/layout/PageHeader.svelte`
- `src/lib/components/logo/Logo.svelte`
- `src/lib/components/clerk/ClerkSidebarUser.svelte`
- `src/lib/components/clerk/ClerkCreateOrganization.svelte` (if it has styling)
- `src/lib/components/clerk/ClerkUserProfile.svelte` (if it has styling)
- `src/lib/components/clerk/ClerkOrganizationProfile.svelte` (if it has styling)

**Critical design decision — Sidebar active state:**

The sidebar active state changes from `bg-mono-800` to a green-400 accent. Apply this pattern:

```svelte
<!-- BEFORE -->
class="rounded-md cursor-pointer {isActive(item.href) ? 'bg-mono-800' : 'hover:bg-mono-800'}"

<!-- AFTER -->
class="rounded-md cursor-pointer {isActive(item.href)
  ? 'bg-green-400/10 text-green-400 border-l-2 border-green-400'
  : 'hover:bg-mono-800 hover:text-green-400'}"
```

Active items get:
- Subtle green-tinted background: `bg-green-400/10`
- Green text: `text-green-400`
- Left accent border: `border-l-2 border-green-400`

Hover items get:
- Existing dark hover: `hover:bg-mono-800`
- Green text hint: `hover:text-green-400`

**Sidebar section headers** (`text-xs uppercase tracking-wider text-mono-400`):
- Change to: `text-xs uppercase tracking-wider text-mono-500 font-bold`

**Sidebar icon color for active items:**
- Active: icons inherit `text-green-400` from parent
- Inactive: keep default white

**PageHeader changes:**
- `bg-white` → `bg-mono-950`
- `border-mono-200` → `border-mono-700`
- `text-mono-800` → `text-mono-100`
- Add `border-b-2` (upgrade from `border-b`)

**ClerkSidebarUser changes:**
- `bg-white` → `bg-mono-900`
- `border-mono-200` → `border-mono-700`
- `shadow-xl` → `shadow-xl shadow-black/30`
- Any `text-mono-900` → `text-mono-100`
- Any `hover:bg-mono-50` → `hover:bg-mono-800`

**Clerk mount wrapper components** (ClerkUserProfile, ClerkOrgProfile, ClerkCreateOrg):
- Only change the wrapper/container divs: `bg-white` → `bg-mono-900`, borders per token map
- Do NOT attempt to style Clerk's internal rendered UI

**Steps:**
1. Read each file
2. Apply token map + sidebar active state changes
3. Run: `bun run svelte-check --tsconfig ./tsconfig.json`
4. Commit: `feat(theme): restyle layout shell with terminal aesthetic`

---

### Agent B: Data Display Components

**Scope:** Read-side UI — tables, search, filters, badges, stats.

**Files (10):**
- `src/lib/components/table/Table.svelte`
- `src/lib/components/table/SortableColumn.svelte`
- `src/lib/components/table/EmptyState.svelte`
- `src/lib/components/table/TableEmptyState.svelte`
- `src/lib/components/search/SearchBar.svelte`
- `src/lib/components/search/FilterPanel.svelte`
- `src/lib/components/pill/Pill.svelte`
- `src/lib/components/StatCard.svelte`
- `src/lib/components/namespace/NamespaceSelector.svelte`
- `src/lib/components/tooltip/Tooltip.svelte` (verify — may need no changes)

**Table.svelte specifics:**
- `bg-white` → `bg-mono-900` (table container)
- `bg-mono-50 sticky top-0` (header) → `bg-mono-800 sticky top-0`
- `divide-y divide-mono-200` → `divide-y divide-mono-700`
- `hover:bg-mono-50` (row hover) → `hover:bg-mono-800`
- `bg-mono-100` (selected row) → `bg-mono-800`

**SortableColumn.svelte specifics:**
- `text-mono-500` → `text-mono-400`
- `hover:text-mono-700` → `hover:text-mono-200`
- Sort indicator colors: `bg-mono-800 text-white` is already fine on dark

**EmptyState.svelte specifics:**
- `text-mono-300` (icon) → `text-mono-600`
- `text-mono-500` (text) → `text-mono-400`
- `bg-mono-900 text-white` (button in empty state) → `bg-green-400 text-mono-950 font-bold`

**SearchBar.svelte specifics:**
- `bg-white border-b border-mono-200` → `bg-mono-950 border-b-2 border-mono-700`
- Input: `border-mono-300` → `border-mono-600`, add `bg-mono-900 text-mono-100`
- Filter toggle active: `bg-mono-100 border-mono-400` → `bg-mono-800 border-green-400`
- Results count: `text-mono-500` → `text-mono-400`
- Clear button: apply token map

**FilterPanel.svelte specifics:**
- `bg-white border-mono-200` → `bg-mono-900 border-mono-700`
- Checkbox: `text-mono-900 focus:ring-mono-500` → `text-green-400 focus:ring-green-400`
- Checkbox border: `border-mono-300` → `border-mono-600`
- `bg-mono-50` (section bg) → `bg-mono-800`
- All text colors per token map

**Pill.svelte specifics:**
- `bg-mono-200 text-mono-700` → `bg-mono-800 text-mono-300`

**StatCard.svelte specifics:**
- `bg-white border-mono-200` → `bg-mono-900 border-2 border-mono-700`
- Error variant: `border-red-200` → `border-red-400/30`
- `bg-red-50` → `bg-red-400/10`
- `bg-mono-100` (icon bg) → `bg-mono-800`
- `text-mono-700` (icon) → `text-mono-300`
- `text-mono-900` (value) → `text-mono-100`
- `text-mono-500` (title) → `text-mono-400`

**NamespaceSelector.svelte specifics:**
- `bg-white` → `bg-mono-900`
- `border-mono-300` → `border-mono-600`
- Dropdown: `shadow-xl bg-white` → `shadow-xl shadow-black/30 bg-mono-900`
- `hover:bg-mono-50` → `hover:bg-mono-800`
- All text per token map

**Tooltip.svelte:** Already `bg-mono-800 text-mono-100` — verify and skip if no changes needed.

**Steps:**
1. Read each file
2. Apply token map changes
3. Run: `bun run svelte-check --tsconfig ./tsconfig.json`
4. Commit: `feat(theme): restyle data display components`

---

### Agent C: Interaction Components

**Scope:** Write-side UI — drawers, forms, feedback (toast).

**Files (14):**
- `src/lib/components/drawer/DrawerStack.svelte`
- `src/lib/components/drawer/DrawerHeader.svelte`
- `src/lib/components/drawer/DrawerContent.svelte`
- `src/lib/components/drawer/DrawerFooter.svelte`
- `src/lib/components/drawer/CrudDrawerFooter.svelte`
- `src/lib/components/form/FormField.svelte`
- `src/lib/components/form/FormLabel.svelte`
- `src/lib/components/form/DetailField.svelte`
- `src/lib/components/form/DefaultValueInput.svelte`
- `src/lib/components/form/FieldFormContent.svelte`
- `src/lib/components/form/ObjectFormContent.svelte`
- `src/lib/components/toast/Toast.svelte`
- `src/lib/components/toast/ToastContainer.svelte`

**DrawerStack.svelte specifics:**
- `bg-white` (panel bg) → `bg-mono-900`
- `bg-black/20` (overlay) → `bg-black/40`
- `bg-white/60` (stacked panel tint) → `bg-mono-900/60`
- `border-mono-200` (panel border) → `border-mono-700`
- `shadow-xl` → `shadow-xl shadow-black/30`

**DrawerHeader.svelte specifics:**
- `border-mono-200` → `border-mono-700`
- `text-mono-800` (title) → `text-mono-100`
- `text-mono-500` (close icon) → `text-mono-400`
- `hover:text-mono-700` → `hover:text-mono-200`

**DrawerContent.svelte:** Likely structural only — verify and skip if no color classes.

**DrawerFooter.svelte specifics:**
- `border-mono-200` → `border-mono-700`

**CrudDrawerFooter.svelte specifics:**
- Primary button: `bg-mono-900 text-white hover:bg-mono-800` → `bg-green-400 text-mono-950 font-bold hover:bg-green-300`
- Disabled: `bg-mono-300 text-mono-500` → `bg-mono-700 text-mono-500`
- Secondary/cancel button: `border-mono-300 text-mono-700 hover:bg-mono-50` → `border-mono-600 text-mono-300 hover:bg-mono-800`
- Delete button: `bg-mono-100 text-red-700 hover:bg-red-50` → `bg-red-400/10 text-red-400 hover:bg-red-400/20`
- Delete confirmation: `bg-red-50 border-red-200 text-red-800` → `bg-red-400/10 border-red-400/30 text-red-400`
- Confirm delete: `bg-red-600 text-white hover:bg-red-700` → keep as-is
- `text-mono-400` (helper text) → keep
- `bg-mono-50` → `bg-mono-800`

**FormField.svelte specifics:**
- `text-mono-700` (label) → `text-mono-300`
- `text-red-500` (required asterisk) → keep
- Input: `border-mono-300` → `border-mono-600`
- Add to input: `bg-mono-900 text-mono-100` (if not already set by parent)
- `focus:ring-mono-400` → `focus:ring-green-400`
- Error: `border-red-500` → keep
- `text-red-500` (error message) → keep
- Disabled: `bg-mono-100` → `bg-mono-800`

**FormLabel.svelte specifics:**
- `text-mono-700` → `text-mono-300`
- `text-red-500` → keep

**DetailField.svelte specifics:**
- `text-mono-500` (label) → `text-mono-400`
- `text-mono-900` (value) → `text-mono-100`

**DefaultValueInput.svelte:**
- Apply standard form input token map

**FieldFormContent.svelte & ObjectFormContent.svelte:**
- Apply token map to all inline styles
- These likely use FormField internally, so changes may be minimal
- Check for any standalone `bg-white`, `border-mono-200`, `text-mono-900` etc.

**Toast.svelte specifics:**
Apply semantic color changes for all 4 variants:
- Success: `bg-green-50 border-green-200 text-green-800` → `bg-green-400/10 border-green-400/30 text-green-400`
- Error: `bg-red-50 border-red-200 text-red-800` → `bg-red-400/10 border-red-400/30 text-red-400`
- Warning: `bg-amber-50 border-amber-200 text-amber-800` → `bg-amber-400/10 border-amber-400/30 text-amber-400`
- Info: `bg-blue-50 border-blue-200 text-blue-800` → `bg-blue-400/10 border-blue-400/30 text-blue-400`
- Icon colors: `text-green-600` → `text-green-400`, etc.
- Close button: adjust per token map

**ToastContainer.svelte:** Likely structural (z-index, positioning) — verify and skip if no color classes.

**Steps:**
1. Read each file
2. Apply token map changes
3. Run: `bun run svelte-check --tsconfig ./tsconfig.json`
4. Commit: `feat(theme): restyle drawers, forms, and toasts`

---

### Agent D: Complex Components

**Scope:** Domain-specific components — API generator, validator templates, dashboard widgets.

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

**General approach for api-generator components:**
These are complex forms and dropdowns. Apply the token map mechanically:
- All `bg-white` → `bg-mono-900`
- All form inputs/selects: add `bg-mono-900 text-mono-100`, border `border-mono-600`
- All dropdowns: `bg-white shadow-lg` → `bg-mono-900 shadow-lg shadow-black/30 border border-mono-700`
- All `hover:bg-mono-50` → `hover:bg-mono-800`
- All text colors per token map
- Any `focus:ring-mono-*` → `focus:ring-green-400`

**GenerateModal.svelte specifics:**
- Modal overlay: likely `bg-black/50` — keep or adjust to `bg-black/60`
- Modal panel: `bg-white` → `bg-mono-900 border-2 border-mono-700`
- All internal elements per token map

**Dropdown components** (TypeSelector, FieldSelector, ObjectSelector, FieldConstraintSelector):
- Trigger button: `bg-white border-mono-300` → `bg-mono-900 border-mono-600 text-mono-100`
- Dropdown panel: `bg-white border-mono-200 shadow-lg` → `bg-mono-900 border-mono-700 shadow-lg shadow-black/30`
- Options: `hover:bg-mono-50` → `hover:bg-mono-800`
- Selected option: `bg-mono-100` → `bg-mono-800`

**QuickActions.svelte specifics:**
- Card: `bg-white border-mono-200` → `bg-mono-900 border-2 border-mono-700`
- Primary button: `bg-mono-900 text-white` → `bg-green-400 text-mono-950 font-bold`
- Secondary button: `bg-white border-mono-200 text-mono-700` → `bg-transparent border-mono-600 text-mono-300`
- `hover:bg-mono-50` → `hover:bg-mono-800`

**ProjectChecklist.svelte specifics:**
- Card: `bg-white border-mono-200` → `bg-mono-900 border-2 border-mono-700`
- Progress bar bg: `bg-mono-100` → `bg-mono-800`
- Progress bar fill: `bg-mono-900` → `bg-green-400`
- Completed checkbox: `bg-mono-900` → `bg-green-400`
- Uncompleted checkbox: `border-mono-300` → `border-mono-600`
- Completed text: `text-mono-400 line-through` → keep
- Uncompleted text: `text-mono-900 font-medium` → `text-mono-100 font-medium`
- Title: `text-mono-900` → `text-mono-100`

**ApiReadinessCard.svelte specifics:**
- Card: `bg-white border-mono-200` → `bg-mono-900 border-2 border-mono-700`
- Status badges: apply semantic color map
- Button: `bg-mono-900 text-white` → `bg-green-400 text-mono-950 font-bold`
- `text-mono-900` → `text-mono-100`
- `text-mono-400` → keep
- `text-mono-500` → `text-mono-400`

**Steps:**
1. Read each file
2. Apply token map changes
3. Run: `bun run svelte-check --tsconfig ./tsconfig.json`
4. Commit: `feat(theme): restyle api-generator and dashboard widgets`

---

### Agent E: All Pages

**Scope:** Route-level page components. Most pages are thin wrappers around shared components — changes are minimal (page-specific inline styles only).

**Files (15):**
- `src/routes/(dashboard)/dashboard/+page.svelte`
- `src/routes/(dashboard)/types/+page.svelte`
- `src/routes/(dashboard)/fields/+page.svelte`
- `src/routes/(dashboard)/objects/+page.svelte`
- `src/routes/(dashboard)/apis/+page.svelte`
- `src/routes/(dashboard)/apis/[id]/+page.svelte`
- `src/routes/(dashboard)/namespaces/+page.svelte`
- `src/routes/(dashboard)/validators/field-constraints/+page.svelte`
- `src/routes/(dashboard)/validators/field-validators/+page.svelte`
- `src/routes/(dashboard)/validators/model-validators/+page.svelte`
- `src/routes/(dashboard)/settings/+page.svelte`
- `src/routes/(dashboard)/settings/organization/+page.svelte`
- `src/routes/signin/+page.svelte`
- `src/routes/signup/+page.svelte`
- `src/routes/mobile-blocked/+page.svelte`

**Dashboard home (`dashboard/+page.svelte`) specifics:**
- Header section: `bg-white border-b border-mono-200` → `bg-mono-950 border-b-2 border-mono-700`
- Title: `text-mono-800` → `text-mono-100`
- Subtitle: `text-mono-500` → `text-mono-400`
- Section heading: `text-mono-400` → `text-mono-500`
- Main content bg: `bg-mono-50` → `bg-mono-950`
- This page imports QuickActions, ProjectChecklist, ApiReadinessCard, StatCard — those are restyled by Agent D/B

**CRUD list pages** (types, fields, objects, namespaces, field-constraints):
- These are typically: PageHeader + SearchBar + Table + Drawer
- All shared components are restyled by Agents A/B/C
- Check for any page-specific inline styles: `bg-mono-50`, `text-mono-*`, etc.
- Apply token map to any found

**API detail page (`apis/[id]/+page.svelte`):**
- This is the most complex page — contains endpoint editor, multiple panels
- Apply token map to all inline styles
- Any `bg-white` sections → `bg-mono-900`
- Tab/panel borders: `border-mono-200` → `border-mono-700`
- Active tab: may need green accent treatment

**Validator pages** (field-validators, model-validators):
- View-only tables derived from stores
- Minimal page-specific styling — mostly shared components
- Apply token map to any inline styles

**Settings pages:**
- Check what they render — likely Clerk profile mounts
- Only restyle wrapper containers, not Clerk's own UI

**Auth pages (signin, signup) — DETAILED:**

These pages need three changes: dark background, logo always visible above the Clerk form, and Clerk dark appearance.

1. **Page background**: The `min-h-screen` container inherits `bg-mono-950` from body — no class needed.

2. **Logo + branding always visible**: Currently the Logo + "Median Code" heading only appear during loading/redirect states. Add the logo/heading ABOVE the Clerk mount div so it's always visible:

```svelte
{:else}
  <div class="w-full max-w-md">
    <!-- Logo above Clerk form -->
    <div class="flex items-center justify-center space-x-3 mb-8">
      <Logo size="lg" variant="dark" />
      <h1 class="text-3xl font-bold text-mono-100">median-code</h1>
    </div>
    <div bind:this={clerkMountDiv}></div>
  </div>
{/if}
```

Also update the loading/redirect states:
- `text-mono-900` → `text-mono-100` on headings
- `text-mono-500` → `text-mono-400` on "Loading..." / "Redirecting..." text
- Add `variant="dark"` to `<Logo>` if not already set

3. **Clerk appearance dark theme**: Update the `appearance` config passed to `clerk.mountSignIn()` / `clerk.mountSignUp()`:

```typescript
appearance: {
  variables: {
    colorBackground: '#171717',
    colorInputBackground: '#171717',
    colorText: '#f5f5f5',
    colorTextSecondary: '#a3a3a3',
    colorPrimary: '#4ade80',
    colorInputText: '#f5f5f5',
    borderRadius: '0.375rem',
    colorNeutral: '#a3a3a3',
  },
  elements: {
    rootBox: 'mx-auto',
    card: 'shadow-none bg-mono-900 border-2 border-mono-700 rounded-lg',
    logoBox: 'height: 48px',
    logoImage: 'height: 48px; width: 48px',
    formButtonPrimary: 'bg-green-400 text-mono-950 hover:bg-green-300 font-bold',
    formFieldInput: 'bg-mono-900 border-mono-600 text-mono-100',
    footerActionLink: 'text-green-400 hover:text-green-300',
  }
},
```

4. **Branding SVG update**: The current inline SVG uses `stroke='%23333333'` (dark gray) which is invisible on dark backgrounds. Change to `stroke='%23f5f5f5'` (mono-100, light) in both `branding.logo` and `branding.logoImageUrl`.

Apply identical changes to both `signin/+page.svelte` and `signup/+page.svelte`.

**Mobile-blocked page:**
- Apply token map to all inline styles

**Steps:**
1. Read each file
2. Apply token map to page-specific inline styles
3. Run: `bun run svelte-check --tsconfig ./tsconfig.json`
4. Commit: `feat(theme): restyle all dashboard and auth pages`

---

## Phase 3: Integration Testing & Polish

### Task: Full Test Suite

**Run after ALL Phase 2 agents complete.**

**Step 1: Type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

Expected: 0 errors. If errors exist, they are likely missing color class references — fix per token map.

**Step 2: Unit tests**

```bash
bunx vitest run
```

Expected: All pass. Unit tests test logic, not styles. No failures expected.

**Step 3: Smoke tests (update snapshots)**

```bash
bunx playwright test --project=smoke --update-snapshots
```

Smoke tests include screenshot comparisons that will ALL fail due to the visual redesign. Update all snapshots. Review the new screenshots visually to verify the dark theme looks correct.

**Step 4: E2E CRUD tests**

```bash
PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

Expected: All pass. CRUD tests verify functionality (create, read, update, delete operations). Since we changed zero logic, these should pass unchanged. If any fail, debug — the issue is likely a selector that relied on a color class or a visual state check.

**Step 5: Visual review**

Open the dev server (`bun run dev`) and manually check:
- [ ] Landing page still looks correct (no regressions from font import move)
- [ ] Dashboard home: dark bg, green accents, stat cards readable
- [ ] Sidebar: green active states, section labels visible
- [ ] Any CRUD page: table readable, search bar functional, filters work
- [ ] Open a drawer: dark background, form inputs visible and editable
- [ ] Toast notifications: all 4 variants visible on dark background
- [ ] Sign-in page: Clerk component renders (Clerk's own theme may contrast — acceptable)

**Step 6: Commit snapshot updates**

```
test(smoke): update snapshots for dark theme
```

---

## Final Cleanup Task

After all phases complete and tests pass:

```bash
rm docs/plans/2026-03-10-dashboard-dark-theme-redesign.md
```

Commit:
```
chore: remove completed dashboard redesign plan
```

---

## File Ownership Matrix (Zero Overlap Guarantee)

| File | Agent |
|------|-------|
| `src/app.html` | Phase 1 |
| `src/app.css` | Phase 1 |
| `tailwind.config.js` | Phase 1 |
| `src/routes/+page.svelte` | Phase 1 |
| `src/routes/(dashboard)/+layout.svelte` | Phase 1 |
| `src/routes/+layout.svelte` | Phase 1 |
| `src/lib/components/Sidebar.svelte` | Agent A |
| `src/lib/components/layout/PageHeader.svelte` | Agent A |
| `src/lib/components/logo/Logo.svelte` | Agent A |
| `src/lib/components/clerk/ClerkSidebarUser.svelte` | Agent A |
| `src/lib/components/clerk/ClerkCreateOrganization.svelte` | Agent A |
| `src/lib/components/clerk/ClerkUserProfile.svelte` | Agent A |
| `src/lib/components/clerk/ClerkOrganizationProfile.svelte` | Agent A |
| `src/lib/components/table/Table.svelte` | Agent B |
| `src/lib/components/table/SortableColumn.svelte` | Agent B |
| `src/lib/components/table/EmptyState.svelte` | Agent B |
| `src/lib/components/table/TableEmptyState.svelte` | Agent B |
| `src/lib/components/search/SearchBar.svelte` | Agent B |
| `src/lib/components/search/FilterPanel.svelte` | Agent B |
| `src/lib/components/pill/Pill.svelte` | Agent B |
| `src/lib/components/StatCard.svelte` | Agent B |
| `src/lib/components/namespace/NamespaceSelector.svelte` | Agent B |
| `src/lib/components/tooltip/Tooltip.svelte` | Agent B |
| `src/lib/components/drawer/DrawerStack.svelte` | Agent C |
| `src/lib/components/drawer/DrawerHeader.svelte` | Agent C |
| `src/lib/components/drawer/DrawerContent.svelte` | Agent C |
| `src/lib/components/drawer/DrawerFooter.svelte` | Agent C |
| `src/lib/components/drawer/CrudDrawerFooter.svelte` | Agent C |
| `src/lib/components/form/FormField.svelte` | Agent C |
| `src/lib/components/form/FormLabel.svelte` | Agent C |
| `src/lib/components/form/DetailField.svelte` | Agent C |
| `src/lib/components/form/DefaultValueInput.svelte` | Agent C |
| `src/lib/components/form/FieldFormContent.svelte` | Agent C |
| `src/lib/components/form/ObjectFormContent.svelte` | Agent C |
| `src/lib/components/toast/Toast.svelte` | Agent C |
| `src/lib/components/toast/ToastContainer.svelte` | Agent C |
| `src/lib/components/api-generator/*.svelte` (11 files) | Agent D |
| `src/lib/components/validator-templates/*.svelte` (2 files) | Agent D |
| `src/lib/components/dashboard/QuickActions.svelte` | Agent D |
| `src/lib/components/dashboard/ProjectChecklist.svelte` | Agent D |
| `src/lib/components/dashboard/ApiReadinessCard.svelte` | Agent D |
| `src/routes/(dashboard)/dashboard/+page.svelte` | Agent E |
| `src/routes/(dashboard)/types/+page.svelte` | Agent E |
| `src/routes/(dashboard)/fields/+page.svelte` | Agent E |
| `src/routes/(dashboard)/objects/+page.svelte` | Agent E |
| `src/routes/(dashboard)/apis/+page.svelte` | Agent E |
| `src/routes/(dashboard)/apis/[id]/+page.svelte` | Agent E |
| `src/routes/(dashboard)/namespaces/+page.svelte` | Agent E |
| `src/routes/(dashboard)/validators/field-constraints/+page.svelte` | Agent E |
| `src/routes/(dashboard)/validators/field-validators/+page.svelte` | Agent E |
| `src/routes/(dashboard)/validators/model-validators/+page.svelte` | Agent E |
| `src/routes/(dashboard)/settings/+page.svelte` | Agent E |
| `src/routes/(dashboard)/settings/organization/+page.svelte` | Agent E |
| `src/routes/signin/+page.svelte` | Agent E |
| `src/routes/signup/+page.svelte` | Agent E |
| `src/routes/mobile-blocked/+page.svelte` | Agent E |

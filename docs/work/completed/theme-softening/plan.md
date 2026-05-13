# Theme Softening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soften the dark theme by moving colors to CSS variables, applying the "Soft" palette, and creating brand assets — without changing any component files.

**Architecture:** CSS custom properties defined under `html[data-theme="soft"]` in `app.css`, referenced from `tailwind.config.js` via `rgb(var(--color-*) / <alpha-value>)`. All existing Tailwind utility classes resolve automatically. Non-Tailwind colors (Clerk, Three.js, favicon) updated manually.

**Tech Stack:** SvelteKit, Tailwind CSS v3.4, Vitest, Clerk

**Spec:** `docs/work/theme-softening/spec.md`

**Repos:**
- Shared workspace (this repo): `mediancode-shared-workspace/`
- Frontend: `../mediancode-frontend/`
- Brand assets: `~/Projects/dev-tools/mediancode/design/brand/`

**IMPORTANT — big-bang migration:** All of Task 2 (CSS vars + Tailwind config + data-theme attribute) must be implemented together. Intermediate states between steps within that task will have broken colors. This is expected — do not try to make each individual step build-safe.

---

### Task 1: Create brand palette JSON

**Files:**
- Create: `~/Projects/dev-tools/mediancode/design/brand/color-palette.json`

- [ ] **Step 1: Create the JSON file**

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "themes": {
    "current": {
      "description": "Original dark theme — sharp terminal aesthetic",
      "neutral": {
        "mono-950": "#0a0a0a",
        "mono-900": "#171717",
        "mono-800": "#262626",
        "mono-700": "#404040",
        "mono-600": "#525252",
        "mono-500": "#737373",
        "mono-400": "#a3a3a3",
        "mono-300": "#d4d4d4",
        "mono-200": "#e5e5e5",
        "mono-100": "#f5f5f5",
        "mono-50": "#fafafa"
      },
      "success": {
        "green-400": "#4ade80",
        "green-300": "#86efac"
      },
      "error": {
        "red-50": "#fef2f2",
        "red-100": "#fee2e2",
        "red-200": "#fecaca",
        "red-600": "#dc2626",
        "red-700": "#b91c1c",
        "red-800": "#991b1b"
      }
    },
    "soft": {
      "description": "Softened dark theme — lifted blacks, cool blue-grey tint, desaturated green",
      "neutral": {
        "mono-950": "#101012",
        "mono-900": "#1d1d1f",
        "mono-800": "#2b2b2e",
        "mono-700": "#444449",
        "mono-600": "#55555b",
        "mono-500": "#74747b",
        "mono-400": "#a0a0a8",
        "mono-300": "#cfcfd6",
        "mono-200": "#e0e0e6",
        "mono-100": "#f0f0f5",
        "mono-50": "#f6f6fa"
      },
      "success": {
        "green-50": "#f0fdf6",
        "green-100": "#d6f5e4",
        "green-200": "#aaebc8",
        "green-300": "#8cf0b4",
        "green-400": "#52e28c",
        "green-600": "#2ea860"
      },
      "error": {
        "red-50": "#fef2f2",
        "red-100": "#fee2e2",
        "red-200": "#fecaca",
        "red-600": "#dc2626",
        "red-700": "#b91c1c",
        "red-800": "#991b1b"
      },
      "warning": {
        "amber-50": "#fdf6e8",
        "amber-100": "#fae8c2",
        "amber-200": "#f5d48e",
        "amber-400": "#e4a83a",
        "amber-600": "#c48a1a",
        "amber-800": "#8a5c10"
      },
      "info": {
        "blue-50": "#f0f4fc",
        "blue-100": "#dae3f7",
        "blue-200": "#b4c7f0",
        "blue-400": "#5b8be0",
        "blue-600": "#3d66b8",
        "blue-800": "#2b4a8a"
      }
    }
  }
}
```

- [ ] **Step 2: Validate JSON is parseable**

Run: `cat ~/Projects/dev-tools/mediancode/design/brand/color-palette.json | python3 -m json.tool > /dev/null && echo "Valid JSON"`
Expected: `Valid JSON`

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/dev-tools/mediancode/design/brand
git add color-palette.json
git commit -m "feat(brand): add color palette JSON with current and soft themes"
```

Note: `design/brand/` is outside any git repo. If it's not tracked, skip the commit and just verify the file exists.

---

### Task 2: Core theme migration (CSS vars + Tailwind config + data-theme)

**This task is atomic — all three files change together.**

**Files:**
- Modify: `../mediancode-frontend/src/app.css`
- Modify: `../mediancode-frontend/tailwind.config.js`
- Modify: `../mediancode-frontend/src/app.html:2` (html tag) and `:7` (favicon)

- [ ] **Step 1: Add CSS custom properties to app.css**

Insert the following block **between the `@import` line and the `@tailwind base;` line** in `src/app.css`:

```css
html[data-theme="soft"] {
  /* Neutrals */
  --color-mono-950: 16 16 18;
  --color-mono-900: 29 29 31;
  --color-mono-800: 43 43 46;
  --color-mono-700: 68 68 73;
  --color-mono-600: 85 85 91;
  --color-mono-500: 116 116 123;
  --color-mono-400: 160 160 168;
  --color-mono-300: 207 207 214;
  --color-mono-200: 224 224 230;
  --color-mono-100: 240 240 245;
  --color-mono-50: 246 246 250;

  /* Success / Primary accent (green) */
  --color-green-50: 240 253 246;
  --color-green-100: 214 245 228;
  --color-green-200: 170 235 200;
  --color-green-300: 140 240 180;
  --color-green-400: 82 226 140;
  --color-green-600: 46 168 96;

  /* Error / Destructive (red) — unchanged values */
  --color-red-50: 254 242 242;
  --color-red-100: 254 226 226;
  --color-red-200: 254 202 202;
  --color-red-600: 220 38 38;
  --color-red-700: 185 28 28;
  --color-red-800: 153 27 27;

  /* Warning (amber) */
  --color-amber-50: 253 246 232;
  --color-amber-100: 250 232 194;
  --color-amber-200: 245 212 142;
  --color-amber-400: 228 168 58;
  --color-amber-600: 196 138 26;
  --color-amber-800: 138 92 16;

  /* Info (blue) */
  --color-blue-50: 240 244 252;
  --color-blue-100: 218 227 247;
  --color-blue-200: 180 199 240;
  --color-blue-400: 91 139 224;
  --color-blue-600: 61 102 184;
  --color-blue-800: 43 74 138;
}
```

The final `app.css` should look like:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

html[data-theme="soft"] {
  /* ... all the variables above ... */
}

@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color-scheme: dark;
}
```

- [ ] **Step 2: Update tailwind.config.js**

Replace the entire `colors` object with CSS variable references using the `rgb(var(...) / <alpha-value>)` format:

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
        'mono-50': 'rgb(var(--color-mono-50) / <alpha-value>)',
        'mono-100': 'rgb(var(--color-mono-100) / <alpha-value>)',
        'mono-200': 'rgb(var(--color-mono-200) / <alpha-value>)',
        'mono-300': 'rgb(var(--color-mono-300) / <alpha-value>)',
        'mono-400': 'rgb(var(--color-mono-400) / <alpha-value>)',
        'mono-500': 'rgb(var(--color-mono-500) / <alpha-value>)',
        'mono-600': 'rgb(var(--color-mono-600) / <alpha-value>)',
        'mono-700': 'rgb(var(--color-mono-700) / <alpha-value>)',
        'mono-800': 'rgb(var(--color-mono-800) / <alpha-value>)',
        'mono-900': 'rgb(var(--color-mono-900) / <alpha-value>)',
        'mono-950': 'rgb(var(--color-mono-950) / <alpha-value>)',
        'red-50': 'rgb(var(--color-red-50) / <alpha-value>)',
        'red-100': 'rgb(var(--color-red-100) / <alpha-value>)',
        'red-200': 'rgb(var(--color-red-200) / <alpha-value>)',
        'red-600': 'rgb(var(--color-red-600) / <alpha-value>)',
        'red-700': 'rgb(var(--color-red-700) / <alpha-value>)',
        'red-800': 'rgb(var(--color-red-800) / <alpha-value>)',
        'green-50': 'rgb(var(--color-green-50) / <alpha-value>)',
        'green-100': 'rgb(var(--color-green-100) / <alpha-value>)',
        'green-200': 'rgb(var(--color-green-200) / <alpha-value>)',
        'green-300': 'rgb(var(--color-green-300) / <alpha-value>)',
        'green-400': 'rgb(var(--color-green-400) / <alpha-value>)',
        'green-600': 'rgb(var(--color-green-600) / <alpha-value>)',
        'amber-50': 'rgb(var(--color-amber-50) / <alpha-value>)',
        'amber-100': 'rgb(var(--color-amber-100) / <alpha-value>)',
        'amber-200': 'rgb(var(--color-amber-200) / <alpha-value>)',
        'amber-400': 'rgb(var(--color-amber-400) / <alpha-value>)',
        'amber-600': 'rgb(var(--color-amber-600) / <alpha-value>)',
        'amber-800': 'rgb(var(--color-amber-800) / <alpha-value>)',
        'blue-50': 'rgb(var(--color-blue-50) / <alpha-value>)',
        'blue-100': 'rgb(var(--color-blue-100) / <alpha-value>)',
        'blue-200': 'rgb(var(--color-blue-200) / <alpha-value>)',
        'blue-400': 'rgb(var(--color-blue-400) / <alpha-value>)',
        'blue-600': 'rgb(var(--color-blue-600) / <alpha-value>)',
        'blue-800': 'rgb(var(--color-blue-800) / <alpha-value>)',
      }
    }
  },
  plugins: []
}
```

- [ ] **Step 3: Add data-theme attribute and update favicon in app.html**

In `src/app.html`:

Line 2 — change:
```html
<html lang="en">
```
to:
```html
<html lang="en" data-theme="soft">
```

Line 7 — in the favicon data URI, replace `stroke='%23f5f5f5'` with `stroke='%23f0f0f5'` (soft mono-100).

- [ ] **Step 4: Verify the app starts and renders**

Run: `cd ../mediancode-frontend && bun run dev`

Open the app in a browser. Check:
- Page background is the soft dark grey (not pure black)
- Sidebar has the slightly lifted surface color
- Green accent buttons/links render with the softer green
- Borders are visible with the blue-grey tint
- No broken/missing colors (no transparent backgrounds or invisible text)

- [ ] **Step 5: Verify opacity modifiers work**

In the running app, check components that use opacity modifiers:
- Sidebar active state (`bg-green-400/10`) — should show a faint green tint
- Drawer overlays (`bg-mono-900/60`) — should be semi-transparent
- Toast notifications if triggerable

If opacity modifiers are broken (colors show as transparent or solid black), the CSS variable format is wrong — check that values are space-separated channels, not hex.

- [ ] **Step 6: Run type check**

Run: `cd ../mediancode-frontend && bun run check`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
cd ../mediancode-frontend
git add src/app.css tailwind.config.js src/app.html
git commit -m "feat(ui): migrate color palette to CSS variables with soft theme"
```

---

### Task 3: Update Clerk appearance config

**Files:**
- Modify: `../mediancode-frontend/src/lib/clerk.ts:17-27`
- Modify: `../mediancode-frontend/src/routes/signin/+page.svelte:31-52`
- Modify: `../mediancode-frontend/src/routes/signup/+page.svelte:18-39`
- Modify: `../mediancode-frontend/tests/unit/lib/clerk.test.ts:76`

- [ ] **Step 1: Update clerk.ts variables block**

In `src/lib/clerk.ts`, update the `variables` object (lines 17-27):

```typescript
variables: {
  colorBackground: '#1d1d1f',      // mono-900 soft
  colorInputBackground: '#1d1d1f', // mono-900 soft
  colorText: '#f0f0f5',            // mono-100 soft
  colorTextSecondary: '#a0a0a8',   // mono-400 soft
  colorPrimary: '#52e28c',         // green-400 soft
  colorInputText: '#f0f0f5',       // mono-100 soft
  borderRadius: '0',
  colorNeutral: '#a0a0a8',         // mono-400 soft
  colorDanger: '#dc2626',          // red-600 (unchanged)
  colorSuccess: '#2ea860',         // green-600 soft
  colorWarning: '#e4a83a',         // amber-400 soft
},
```

- [ ] **Step 2: Refactor signin page to use shared config**

In `src/routes/signin/+page.svelte`, replace the inline `appearance` object. Import the shared config and merge with page-specific element overrides:

Add import at top of `<script>`:
```typescript
import { clerkAppearance } from '$lib/clerk';
```

Replace the inline `appearance` object (lines 31-52) with:
```typescript
appearance: {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    rootBox: 'mx-auto',
    headerTitle: 'hidden',
    logoBox: 'hidden',
  }
}
```

- [ ] **Step 3: Refactor signup page to use shared config**

In `src/routes/signup/+page.svelte`, same pattern as signin.

Add import at top of `<script>`:
```typescript
import { clerkAppearance } from '$lib/clerk';
```

Replace the inline `appearance` object (lines 18-39) with:
```typescript
appearance: {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    rootBox: 'mx-auto',
    headerTitle: 'hidden',
    logoBox: 'hidden',
  }
}
```

- [ ] **Step 4: Update clerk test assertion**

In `tests/unit/lib/clerk.test.ts`, line 76, change:
```typescript
expect(clerkAppearance.variables.colorPrimary).toBe('#4ade80');
```
to:
```typescript
expect(clerkAppearance.variables.colorPrimary).toBe('#52e28c');
```

- [ ] **Step 5: Run unit tests**

Run: `cd ../mediancode-frontend && bun run test:unit`
Expected: All tests pass, including the updated clerk test.

- [ ] **Step 6: Commit**

```bash
cd ../mediancode-frontend
git add src/lib/clerk.ts src/routes/signin/+page.svelte src/routes/signup/+page.svelte tests/unit/lib/clerk.test.ts
git commit -m "feat(ui): update Clerk appearance to soft theme and deduplicate config"
```

---

### Task 4: Update minor hard-coded colors

**Files:**
- Modify: `../mediancode-frontend/src/lib/components/logo/Logo.svelte:123`
- Modify: `../mediancode-frontend/README.md:257-267`

- [ ] **Step 1: Update Three.js colors in Logo.svelte**

In `src/lib/components/logo/Logo.svelte`, line 123, change:
```typescript
const edgeColor = variant === 'light' ? 0x333333 : 0xe5e5e5;
```
to:
```typescript
const edgeColor = variant === 'light' ? 0x2b2b2e : 0xe0e0e6;
```

These map to soft mono-800 (`#2b2b2e`) and soft mono-200 (`#e0e0e6`).

- [ ] **Step 2: Update README palette section**

In `README.md`, replace the color palette block (around lines 257-267) with:

```
mono-50:  #f6f6fa (lightest)
mono-100: #f0f0f5
mono-200: #e0e0e6
mono-300: #cfcfd6
mono-400: #a0a0a8
mono-500: #74747b
mono-600: #55555b
mono-700: #444449
mono-800: #2b2b2e
mono-900: #1d1d1f
mono-950: #101012 (darkest)
```

- [ ] **Step 3: Commit**

```bash
cd ../mediancode-frontend
git add src/lib/components/logo/Logo.svelte README.md
git commit -m "fix(ui): update hard-coded logo colors and README palette to soft theme"
```

---

### Task 5: Create brand palette HTML reference

**Files:**
- Create: `~/Projects/dev-tools/mediancode/design/brand/color-palette.html`

- [ ] **Step 1: Create the visual reference HTML**

Create `~/Projects/dev-tools/mediancode/design/brand/color-palette.html` — a self-contained HTML file with rendered color swatches for all token families (mono, green, red, amber, blue). Should include:

- Title: "Mediancode — Soft Theme Color Palette"
- A swatch strip for each color family showing all shades
- Hex values printed below each swatch
- Usage notes for each token
- Prints cleanly to PDF (use `@media print` styles)
- Dark background matching the theme so swatches show in context

Reference the values from `color-palette.json`. The HTML should be a standalone file with inline CSS (no external dependencies).

- [ ] **Step 2: Open in browser and verify**

Open `~/Projects/dev-tools/mediancode/design/brand/color-palette.html` in a browser. Verify all swatches render correctly and the page is print-friendly.

- [ ] **Step 3: Commit (if tracked)**

If design/brand/ is in a git repo:
```bash
cd ~/Projects/dev-tools/mediancode/design/brand
git add color-palette.html
git commit -m "feat(brand): add visual color palette HTML reference"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full type check**

Run: `cd ../mediancode-frontend && bun run check`
Expected: 0 errors

- [ ] **Step 2: Run all unit tests**

Run: `cd ../mediancode-frontend && bun run test:unit`
Expected: All pass

- [ ] **Step 3: Run smoke tests**

Run: `cd ../mediancode-frontend && bun run test:e2e:smoke`
Expected: All pass. If auth-dependent tests fail due to Clerk appearance changes, check that the sign-in/sign-up pages render correctly with the refactored shared config.

- [ ] **Step 4: Visual spot check**

Start dev server: `cd ../mediancode-frontend && bun run dev`

Check these pages:
- Landing page (`/`) — hero section, terminal decoration, CTAs
- Sign-in page (`/signin`) — Clerk form styling
- Sign-up page (`/signup`) — Clerk form styling
- Dashboard (if accessible) — sidebar, cards, forms, toasts
- Verify the 3D logo renders with updated colors

- [ ] **Step 5: Verify opacity modifiers in context**

In the running app, confirm these specific patterns still work:
- Sidebar active nav item has a faint green background tint (`bg-green-400/10`)
- DrawerStack overlay is semi-transparent (`bg-mono-900/60`)
- Toast notifications show colored borders with transparency (`border-*/30`)

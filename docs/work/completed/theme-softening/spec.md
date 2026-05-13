# Theme Softening — Specification

## Problem

The current dark theme uses near-pure black backgrounds (`#0a0a0a`) and a highly saturated green accent (`#4ade80`). On modern displays (especially OLED), this creates a halation effect where bright text appears to bleed against very dark backgrounds. Extended use causes eye strain. The contrast ratio between background and accent is higher than needed for accessibility and contributes to visual fatigue.

## Goal

Soften the theme to reduce eye strain without changing the color identity. The app should still look and feel like a dark terminal-inspired tool — just more comfortable for extended sessions.

## Design Decisions

**Intensity level:** Soft (Level 4 from the brainstorm scale). Backgrounds lift ~6 RGB units with a subtle blue-grey tint. Light-end text drops ~3-5 units. Green accent desaturates slightly. The result feels "professional dark" (like VS Code, Linear) rather than "harsh terminal."

**Implementation approach:** CSS variables with full palette remap. All color hex values move from `tailwind.config.js` into CSS custom properties in `app.css`. Tailwind references `var(--color-*)`. This enables future theme switching by toggling a `data-theme` attribute.

**CSS variable format:** Variables must be defined in space-separated RGB channel format (e.g., `--color-green-400: 82 226 140`) and referenced in Tailwind as `rgb(var(--color-green-400) / <alpha-value>)`. This is required for Tailwind's opacity modifier syntax (`bg-green-400/10`, `border-red-400/30`, etc.) to work. Defining variables as full hex strings would silently break all opacity modifiers.

**Fallthrough shades:** Only the tokens listed in the palette tables below are remapped to CSS variables. Unlisted Tailwind shades (e.g., `green-500`, `red-400`, `red-300`) continue to use Tailwind defaults. The custom Tailwind config only overrides the specific shades listed — it does not replace entire color families.

**Palette scope:** All custom token families — neutrals (mono), green accent, red errors (unchanged values), plus new warning (amber) and info (blue) semantic colors. Default Tailwind utilities (`white`, `black`, `teal`, `yellow`) and unlisted shades within remapped families (e.g., `green-500`, `red-400`) are **not** part of this migration — they continue using Tailwind's built-in values. These are used sparingly (terminal dot decorations, modal overlays, HTTP method badges) and do not contribute to the eye-strain problem being solved.

**Brand palette file:** A machine-readable JSON and a visual HTML reference stored at `design/brand/` in the project root (`~/Projects/dev-tools/mediancode/design/brand/`), outside any single repo.

## Color Palette

### Neutrals (mono)

| Token | Current | Soft | Delta | Usage |
|-------|---------|------|-------|-------|
| mono-950 | `#0a0a0a` | `#101012` | +6,+6,+8 | Page background |
| mono-900 | `#171717` | `#1d1d1f` | +6,+6,+8 | Sidebar, cards, inputs |
| mono-800 | `#262626` | `#2b2b2e` | +5,+5,+8 | Hover states, elevated surfaces |
| mono-700 | `#404040` | `#444449` | +4,+4,+9 | Borders, dividers |
| mono-600 | `#525252` | `#55555b` | +3,+3,+9 | Input borders |
| mono-500 | `#737373` | `#74747b` | +1,+1,+8 | Muted text, placeholders |
| mono-400 | `#a3a3a3` | `#a0a0a8` | -3,-3,+5 | Secondary text |
| mono-300 | `#d4d4d4` | `#cfcfd6` | -5,-5,+2 | Body text, labels |
| mono-200 | `#e5e5e5` | `#e0e0e6` | -5,-5,+1 | Emphasis text |
| mono-100 | `#f5f5f5` | `#f0f0f5` | -5,-5,0 | Headings, primary text |
| mono-50 | `#fafafa` | `#f6f6fa` | -4,-4,0 | Brightest text |

Design principle: dark end lifts +5-6 per channel to reduce halation. Light end drops -3-5 to compress contrast range. Blue channel gets +5-9 extra across the board for the cool tint.

### Success / Primary Accent (green)

| Token | Current | Soft | Usage |
|-------|---------|------|-------|
| green-50 | — | `#f0fdf6` | Success alert background (light theme) |
| green-100 | — | `#d6f5e4` | Success highlight |
| green-200 | — | `#aaebc8` | Success light |
| green-300 | `#86efac` (Tailwind default) | `#8cf0b4` | Hover states |
| green-400 | `#4ade80` | `#52e28c` | CTAs, active states, badges |
| green-600 | — | `#2ea860` | Clerk `colorSuccess`, darker accent variant |

### Error / Destructive (red) — unchanged

| Token | Value | Usage |
|-------|-------|-------|
| red-50 | `#fef2f2` | Error alert background (light theme) |
| red-100 | `#fee2e2` | Error highlight |
| red-200 | `#fecaca` | Error light |
| red-600 | `#dc2626` | Error text, destructive buttons |
| red-700 | `#b91c1c` | Error hover, pressed |
| red-800 | `#991b1b` | Error emphasis, dark variant |

### Warning (amber) — new

| Token | Value | Usage |
|-------|-------|-------|
| amber-50 | `#fdf6e8` | Warning alert background (light theme) |
| amber-100 | `#fae8c2` | Warning highlight |
| amber-200 | `#f5d48e` | Warning light |
| amber-400 | `#e4a83a` | Warning text, caution badges |
| amber-600 | `#c48a1a` | Warning emphasis |
| amber-800 | `#8a5c10` | Warning dark variant |

Design rationale: warm gold-amber, intentionally not too yellow. Slightly desaturated to match the soft palette. Reads clearly against the dark background without competing with the green accent.

### Info (blue) — new

| Token | Value | Usage |
|-------|-------|-------|
| blue-50 | `#f0f4fc` | Info alert background (light theme) |
| blue-100 | `#dae3f7` | Info highlight |
| blue-200 | `#b4c7f0` | Info light |
| blue-400 | `#5b8be0` | Info text, informational badges |
| blue-600 | `#3d66b8` | Info emphasis |
| blue-800 | `#2b4a8a` | Info dark variant |

Design rationale: muted steel-blue that complements the cool tint in the neutrals. Distinct enough from the neutral grey-blue but not electric/neon.

## File Changes

### New files

**`design/brand/color-palette.json`**
Machine-readable source of truth for all brand colors. Contains both "current" and "soft" theme definitions. Follows design token conventions. Consumable by scripts, build tools, design tools.

**`design/brand/color-palette.html`**
Visual reference with rendered swatches, contrast ratios, and usage notes. Opens in any browser. Can be printed to PDF or screenshotted to PNG for sharing.

### Modified files (frontend repo)

**`src/app.css`**
- Add CSS custom properties under `html[data-theme="soft"]`
- All mono-*, green-*, red-*, amber-*, blue-* tokens defined as `--color-{name}-{shade}`
- Existing Tailwind directives and font imports unchanged

**`tailwind.config.js`**
- Replace hard-coded hex values with `rgb(var(--color-*) / <alpha-value>)` references — this exact format is required for Tailwind v3's opacity modifier syntax to work
- Add green-300 (currently relying on Tailwind default, should be explicit)
- Add amber-* and blue-* token entries pointing to CSS variables

**`src/app.html`**
- Add `data-theme="soft"` to the `<html>` element (must be an ancestor of all themed content)

**`src/lib/clerk.ts`**
- Update the `variables` block in `clerkAppearance` — these contain hard-coded hex values (`colorBackground: '#171717'`, `colorPrimary: '#4ade80'`, etc.). Note: Clerk now supports CSS variables in appearance theming (as of July 2025), but direct hex values are used here for broader browser compatibility.
- Update all hard-coded hex values in the `variables` block to their soft equivalents per the palette tables above (includes `colorBackground`, `colorInputBackground`, `colorPrimary`, `colorText`, `colorTextSecondary`, `colorNeutral`, `colorSuccess`, `colorWarning`, `colorDanger`)
- The `elements` block uses Tailwind classes and resolves automatically — no changes needed there

**`src/routes/signin/+page.svelte`** and **`src/routes/signup/+page.svelte`**
- These duplicate the Clerk appearance config inline instead of importing from `clerk.ts`
- Update the `variables` blocks to match, or (preferred) refactor to import the shared `clerkAppearance` from `clerk.ts`
- Page-specific `elements` overrides (`rootBox`, `headerTitle: 'hidden'`, `logoBox: 'hidden'`) must be preserved during refactor

**`src/app.html`** (minor)
- Update the encoded favicon SVG stroke color from `%23f5f5f5` (mono-100) to `%23f0f0f5` (soft mono-100)

**`src/lib/components/logo/Logo.svelte`** (minor)
- Update hard-coded Three.js color values (`0x333333`, `0xe5e5e5`) to soft equivalents. These are numeric color constants outside the Tailwind pipeline and must be changed manually.

**`tests/unit/lib/clerk.test.ts`**
- Update assertion that checks `colorPrimary` against old `#4ade80` — will break when Clerk config changes

**`README.md`**
- Update the mono palette documentation section to reflect soft values

### Unchanged

- All `.svelte` component files (except sign-in/sign-up Clerk config) — zero changes needed. Tailwind utility classes resolve to the new CSS variable values automatically.
- Red-* hex values — same values, just moved to CSS variables.
- Font imports, PostCSS config, build pipeline.

## Future: Theme Switching

The CSS variable structure means adding a new theme is:

1. Define a new `[data-theme="new-theme"]` block in `app.css` with different values
2. Toggle the `data-theme` attribute on the root element via JS

No Tailwind config or component changes needed. The brand palette JSON would gain a new theme entry.

## Out of Scope

- Light theme — not planned, but the architecture supports it
- Theme persistence (localStorage) — not needed until there's more than one theme
- Theme toggle UI — not needed until there's more than one theme
- Border width changes — keeping 2px borders as-is

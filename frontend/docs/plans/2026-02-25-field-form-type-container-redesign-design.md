# Field Form — Inline Type + Container Redesign

**Date:** 2026-02-25
**Status:** Approved

## Problem

The current field form stacks Field Name, Container toggle, and Type selector as
three separate vertical rows. The Container selector (None / List buttons) feels
disconnected from the Type it wraps. The goal is to merge container selection into
the type selection area so the user sees wrapping as a property of the type, not a
separate concept.

## Design

### Layout

```
Row 0:  [ Namespace (read-only, full width)  ]        ← edit mode only
        ┌──── 50% ────┐┌─────── 50% ────────┐
Row 1:  [ Field Name   ][ Field Type         ]        ← labels
Row 2:  [ name input   ][ type selector area ]        ← inputs (same line)
Row 3:                   [ List[t]   - Unwrap ]        ← wrap controls
        └──────────────┘└────────────────────┘
Row 4+: Description, Default Value, Validators, Field Constraints  ← unchanged
```

- **Field Name** occupies the left 50% with its label left-aligned above it.
- **Field Type** occupies the right 50% with its label left-aligned above it.
- The two inputs sit on the same horizontal line.
- A small gap (e.g. `gap-4`) separates the two halves.

### Type Selector Area — Two Visual States

**Unwrapped** (container = null):

```
┌───────────────────────┐
│  • str          ▼     │     searchable dropdown (TypeSelectorDropdown)
└───────────────────────┘
  List[str]      - Unwrap
  (clickable)    (disabled, grayed)
```

**Wrapped** (container = 'List'):

```
┌───────────────────────────────┐
│  List [  • str         ▼  ]  │  type dropdown nested inside List brackets
└───────────────────────────────┘
  List[str]         - Unwrap
  (active/toggled)  (enabled)
```

### Wrap Toggle (left-aligned below type area)

- Always visible.
- Text: `List[<selectedType>]` — dynamically reflects the currently selected type
  (e.g. `List[str]`, `List[int]`, `List[MyCustomType]`).
- **Unwrapped state:** Rendered as an inactive toggle. Clicking it sets
  `container = 'List'` and visually nests the type selector inside brackets.
- **Wrapped state:** Rendered as an active/toggled state (e.g. dark background).
- Existing behavior preserved: changing container resets constraints and
  default value.

### Unwrap Button (right-aligned below type area)

- Always visible.
- Text: `- Unwrap`.
- **Unwrapped state:** Disabled and grayed out (`cursor-not-allowed`,
  `text-mono-400`).
- **Wrapped state:** Enabled. Clicking it sets `container = null` and removes
  the visual nesting.

### Visual Nesting (Wrapped State)

When `container = 'List'`, the type selector input gets rendered inside a styled
wrapper:

- The wrapper has a light background (e.g. `bg-mono-50`) with a subtle border.
- `List [` text appears on the left of the dropdown.
- `]` text appears on the right.
- The type dropdown sits between the brackets, slightly smaller than unwrapped.
- Typography for brackets: monospace, `text-mono-500`.

### Type Change Propagation

When the user changes the selected type (e.g. `str` → `int`):

1. The wrap toggle text updates: `List[str]` → `List[int]`.
2. Constraints and default value are reset (existing behavior).
3. If currently wrapped, the visual nesting remains — only the inner type label
   changes.

## Removed Elements

- **Container label** ("Container") — no longer needed.
- **Container toggle buttons** ("None" / "List") — replaced by wrap/unwrap
  controls.

## Unchanged Elements

- Namespace (read-only row, edit mode only).
- Description textarea.
- Default Value input.
- Validators section.
- Field Constraints section.
- "Used In APIs" section.
- All validation logic.
- All CRUD workflow (create/edit/save/undo/delete).
- `TypeSelectorDropdown` component — reused internally, may need minor style
  adjustments for the nested variant.

## Component Strategy

### New Component: `TypeContainerSelector.svelte`

A new compound component in `src/lib/components/api-generator/` that
encapsulates:

- The type selector dropdown (reuses `TypeSelectorDropdown`).
- The visual List wrapper/nesting.
- The wrap toggle and unwrap button.

**Props:**
- `availableTypes: FieldType[]`
- `selectedTypeName: string`
- `container: string | null`
- `onTypeChange: (typeName: string) => void`
- `onContainerChange: (container: string | null) => void`
- `error?: boolean`
- `id?: string`

This keeps the field page clean — it just renders `TypeContainerSelector`
instead of managing container buttons + type dropdown separately.

### Modified: `fields/+page.svelte`

- Replace the three vertical rows (name, container, type) with a single
  `flex` row: left half = `FormField` for name, right half =
  `TypeContainerSelector`.
- Remove the container toggle button markup.
- Remove the standalone `TypeSelectorDropdown` usage (now inside
  `TypeContainerSelector`).

### Barrel Export Update

- Add `TypeContainerSelector` to `src/lib/components/api-generator/index.ts`
  and `src/lib/components/index.ts`.

## Files Touched

| File | Change |
|---|---|
| `src/lib/components/api-generator/TypeContainerSelector.svelte` | **New** — compound component |
| `src/lib/components/api-generator/index.ts` | Add export |
| `src/lib/components/index.ts` | Add export |
| `src/routes/(dashboard)/fields/+page.svelte` | Rework form top section |
| `src/lib/components/api-generator/TypeSelectorDropdown.svelte` | Minor style tweaks for nested variant (optional prop) |
| `tests/page-objects/FieldsPage.ts` | Update selectors for new layout |

## Test Impact

- E2E tests that interact with the container toggle or type selector will need
  updated selectors.
- Functional behavior is unchanged — same fields, same validation, same API
  payloads.

## Cleanup Task

Delete this design file and any companion prompt file after implementation is
complete.

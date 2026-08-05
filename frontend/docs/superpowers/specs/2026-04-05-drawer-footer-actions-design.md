# Drawer footer actions — design spec

**Date:** 2026-04-05  
**Status:** Approved for implementation (pending spec review)  
**Scope:** Median Code frontend — `DrawerStack` footers, shared tokens in `src/lib/ui/classes.ts`, `src/app.css` drawer theme hooks.

## Problem

- Some drawers (e.g. read-only namespace details) use standalone full-width controls with `rounded-xl`, which fights the drawer shell’s bottom radius (`--drawer-panel-radius`) and looks deformed at the outer corners.
- Footer actions should share the same glass vocabulary as form fields inside the drawer, with consistent color coding for action types.
- **Requirement:** Every action control that is **not** disabled must have a clear **highlighted** state (pointer hover and keyboard focus), not only the primary action.

## Decision

Use **real `<button>`** elements inside a **single edge-to-edge segmented footer** (same pattern as `CrudDrawerFooter`: `drawerFooterSegmentedPanel` + `drawerFooterSegmentDivider` + `drawerFooterSegmentBtn`). Do not replace buttons with inert `div`s; preserving native accessibility outweighs the cosmetic similarity to “list rows.”

## Layout and geometry

1. **One slab:** For `DrawerFooter` with `padding="edge"`, prefer one `drawerFooterSegmentedPanel` per footer state (or stacked panels only when UX demands, e.g. delete banner + actions — already used in `DrawerFooterDeleteConfirm`).
2. **No per-cell outer rounding** on footer actions that sit flush to the drawer bottom; corner continuity comes from the **drawer/footer shell** clipping to the panel radius (`overflow-hidden` + bottom radius matching `--drawer-panel-radius` where needed).
3. Migrate ad-hoc footers (e.g. read-only **Close** / conditional **Save** on namespaces) onto the segmented pattern so they are not lone `rounded-xl` blocks.

## Visual language (glass + color coding)

- **Primary** (Create, Save, main confirm): green — strong emphasis; may stay fill-forward or use green-tinted glass per final polish; must remain obviously “main.”
- **Destructive** (Delete, confirm delete): red tint / red text as today’s destructive tokens; align with existing `drawerFooterBtnDestructive*` / danger confirm segments.
- **Undo:** **amber** accent (use theme `--color-amber-*`), distinct from green and red.
- **Duplicate:** **blue** accent (use theme `--color-blue-*`), distinct from undo and primary.
- **Secondary** (Cancel, Close when neutral): mono glass — `drawerFooterBtnSecondarySegment*` family; muted when disabled.

Inner surfaces already use `--drawer-inner-surface-bg` on `.drawer-footer-segmented-panel`; action tints should read as **tinted glass** (hover/active), not unrelated solid pills.

## Interaction: highlighted state (mandatory)

For **every** footer segment button that is **enabled**:

- **Hover:** Visible change (e.g. stronger background tint, border, or text contrast) — must be noticeable on the dark glass footer, not a barely perceptible shift.
- **Focus (keyboard):** Keep or reinforce visible focus — `drawerFooterSegmentBtn` already includes `focus-visible:ring-inset` + green ring; ensure new tint variants do not remove contrast or clip the ring.
- **Disabled:** No hover highlight; stays muted (existing `*Muted` / `cursor-not-allowed` patterns).

Primary, destructive, undo, duplicate, and secondary **all** follow this rule when enabled.

## Implementation notes (non-binding)

- Add named exports in `src/lib/ui/classes.ts` for **undo** and **duplicate** segment styles; reuse in `CrudDrawerFooter` and any drawer that adds those actions.
- Audit `DrawerFooter` / `drawer-footer-shell` in `src/app.css` for bottom-radius + `overflow-hidden` so segmented content does not leak past the drawer corners.
- Grep for drawer footers with `rounded-xl` or bespoke full-width footer buttons and align them to the segmented primitives.

## Out of scope

- Changing drawer motion or stack behavior (only footer chrome and action styling).
- Non-drawer pages (tables, page headers) unless they duplicate the same footer pattern.

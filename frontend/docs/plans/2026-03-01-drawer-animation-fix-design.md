# Drawer Animation Fix — Design

## Problem

The API detail page (`/apis/[id]`) uses two separate components — `Drawer` (z-50) and `DrawerStack` (z-70) — and swaps between them via `{#if}` blocks when inline creation overlays open. This causes:

1. No slide-in animation for the base panel (it pops in instantly)
2. No coordinated slide-out when closing overlays (content vanishes, then re-slides from scratch)
3. The Edit API Drawer at z-50 gets visually trampled by DrawerStack at z-70
4. Endpoint form content is destroyed and recreated on every swap

The Objects page (`/objects`) has the same Drawer ↔ DrawerStack swap pattern with identical issues.

## Solution: Single DrawerStack per page

Replace both `Drawer` and `DrawerStack` usage with a **single DrawerStack** instance that's always mounted when any drawer is open. Panels are pushed/popped reactively — no component swapping.

### Panel stack progression (APIs)

```
[endpoint]                    → endpoint open, full width
[endpoint, object]            → object overlay pushed, endpoint squeezed + dimmed
[endpoint, object, field]     → field pushed, object squeezed + dimmed
```

Edit API is a separate base panel (mutually exclusive with endpoint — opening one closes the other).

### Panel stack progression (Objects)

```
[object]                      → object drawer open, full width
[object, field]               → field overlay pushed, object squeezed + dimmed
```

## DrawerStack component changes

1. **Add `transition:slide` to base panel (index 0)** — currently only stacked panels animate
2. **Add `open` prop** — controls entire stack visibility, replacing `{#if panels.length > 0}`
3. **Base panel width**: `flex-1` when stacked panels exist (current), full available width when alone

## API detail page changes

1. Remove standalone `<Drawer>` for endpoint (line 746)
2. Remove standalone `<Drawer>` for Edit API (line 371)
3. Single `<DrawerStack>` — panels array built reactively from state
4. Remove duplicated endpoint form snippets (one set serves both modes)

## Objects page changes

Same pattern: replace Drawer + DrawerStack swap with single DrawerStack.

## Animation behavior

| Action | Animation |
|--------|-----------|
| Open any drawer | Base panel slides in from right (400ms) |
| Close any drawer | Base panel slides out to right (400ms) |
| Push overlay | Overlay slides in from right (400ms), base squeezed via flex |
| Pop overlay | Overlay slides out to right (400ms), base expands via flex |

All transitions use consistent 400ms duration.

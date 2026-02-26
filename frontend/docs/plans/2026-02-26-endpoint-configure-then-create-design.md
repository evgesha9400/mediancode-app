# Endpoint Configure-Then-Create Design

## Problem

Clicking "Add Endpoint" immediately creates a backend record with hardcoded defaults
(GET /, empty description) before the user has specified any meaningful data. The drawer
opens in edit mode on an already-persisted entity. If the user closes without customizing,
a bare endpoint remains in the database. This is counterintuitive — users expect to
configure first, then save.

## Solution

Add an `isCreating` mode to the existing endpoint drawer. "Add Endpoint" opens the drawer
with local-only state (no API call). The backend POST fires only when the user clicks
"Create". Closing or cancelling discards everything — no orphaned records.

## State Machine Changes (`apiDetailState.svelte.ts`)

- Add `isCreating: boolean` to state interface (readonly)
- `handleAddEndpoint` becomes synchronous:
  - Sets `editedEndpoint` to local defaults (no `id`, GET /, empty description, etc.)
  - Sets `isCreating = true`
  - Opens the drawer
  - No API call
- `selectedEndpoint` stays `null` during create mode (no saved version to compare)
- `hasEndpointChanges` in create mode: true when anything differs from defaults
- New `handleCreateEndpoint`: calls `createEndpointAction` with `editedEndpoint` data,
  on success shows toast, closes drawer
- New `handleCancelCreate`: closes drawer, clears `editedEndpoint` and `isCreating`
- Existing edit-mode methods unchanged: `handleSaveEndpoint`, `handleUndoEndpoint`,
  `handleDeleteEndpoint`, `handleDuplicateEndpoint`

## Template Changes (`+page.svelte`)

- Drawer title: `isCreating ? 'Create Endpoint' : 'Edit Endpoint'`
- Footer in create mode: "Create" + "Cancel" buttons (replaces Save/Undo/Duplicate/Delete)
- "Create" button disabled when `!hasEndpointChanges`
- Form fields identical in both modes

## What Doesn't Change

- `openEndpoint` (clicking existing row) — always edit mode
- `handleDuplicateEndpoint` — keeps backend-first pattern (convenience shortcut)
- Mutations layer, API client, stores — zero changes

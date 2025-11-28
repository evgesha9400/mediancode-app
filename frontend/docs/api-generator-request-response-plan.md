# API Generator Request/Response Builder Plan

Goal: add inline request/response body builders inside the existing API Generator drawer (no new drawer). Keep users in-flow, reuse existing parameter UI, and connect to the field registry for reuse. No code below—LLM-executable checklist only.

## Snapshot of current UX/state (reference)
- Drawer already holds Method/Path, Tag/Description, Path Params, Query Params, Request Body (static pre), Response preview (string), Response Envelope toggle.
- Components to reuse: `ParameterEditor` row UI, `ResponsePreview`, `Drawer` shell, `EndpointItem`, `ApiMetadataCard`.
- State: `createApiGeneratorState` in `src/lib/stores/apiGeneratorState.svelte.ts` orchestrates drawer state and delegates to `apis.ts` store.
- Data model: `ApiEndpoint` has `requestBody?: string`, `responseBody: string`, `useEnvelope: boolean`.

## Guardrails (do not violate)
- Single drawer only; add sections/tabs inside it, no extra overlay.
- Reuse existing UI components; do not create a new parameter row.
- Keep component directory rules (only `.svelte` + `index.ts` in component folders).
- Centralize new domain logic in stores/state; avoid page-level business logic.

## Plan (step-by-step, no code)
1) **Data model extension**
   - Decide on request/response schema shape (e.g., array of `EndpointParameter`-like items, plus optional raw JSON string for paste mode).
   - Extend `ApiEndpoint` in `src/lib/types/index.ts` to hold structured request/response bodies and the chosen mode flags (e.g., `bodyMode: 'none' | 'fields' | 'json'` per side).
   - Update initial endpoint defaults in `src/lib/stores/apis.ts` to include the new fields/modes.

2) **Store/state wiring**
   - In `apis.ts`, add helpers to update request/response body structures, add/remove/update body fields (reusing `generateParamId`), and to set raw JSON bodies.
   - Ensure duplication/creation flows clone body fields with new IDs.
   - In `createApiGeneratorState`, expose actions for body operations (add field, update field, delete field, set mode, set raw JSON) and route saves through store helpers.
   - Keep `hasChanges` computation aware of the new fields/modes.

3) **UI: Request Body section**
   - Replace the static pre block with a structured card inside the existing drawer.
   - Provide mode toggle (None / Fields / Paste JSON). Persist choice to state.
   - For Fields mode: render a list using `ParameterEditor` rows; include “Add field” (blank) and “Add from field registry” (dropdown/search backed by `fieldsStore`).
   - For Paste JSON mode: textarea for raw JSON; validate/parsing errors surfaced inline.
   - Show a small preview or badge indicating envelope usage if relevant.

4) **UI: Response Body section**
   - Mirror the Request Body structure: mode toggle + fields list + paste JSON.
   - Add optional “Copy from request” shortcut (one-click clone fields/raw JSON into response).
   - Keep `ResponsePreview` for formatted display; update it to accept structured data by formatting to JSON string before rendering.

5) **Envelope handling**
   - Keep the existing envelope toggle UI but wire it to the new state (still default-on).
   - Ensure preview reflects envelope choice when composing the display payload.

6) **Derivations and validation**
   - Add lightweight validators in state: required names/types in Fields mode; JSON parse check in Paste mode.
   - Surface inline errors in the drawer sections; block Save if invalid.

7) **Tests (Vitest)**
   - Add/extend tests mirroring structure under `tests` (e.g., `tests/unit/lib/stores/apis.test.ts`, `tests/unit/lib/stores/apiGeneratorState.test.ts`) to cover:
     - Body mode switches, add/update/delete body fields, cloning on duplicate endpoint.
     - Raw JSON handling (valid/invalid).
     - Copy-from-request to response helper.
     - Envelope flag affecting preview assembly helper.

8) **Docs/update**
   - Briefly document new state fields and modes in a short README note if needed.
   - Confirm imports follow barrel pattern; ensure no `.ts` files are added inside component folders.

## Ambiguity checks (choices locked)
1) Schema storage format: **A** — `EndpointParameter[]`-shape for bodies (fields mode) and `string` for raw JSON.
2) Mode toggle granularity: **A** — per-side modes (`requestBodyMode`, `responseBodyMode`).
3) Field registry reuse: **C** — hard references to registry items (do not copy values; maintain linkage).
4) Copy-to-response shortcut: **A** — provide “Copy from request” button (clone into response).
5) Envelope preview behavior: **A** — preview shows envelope-wrapped payload always (toggle disabled but stateful).

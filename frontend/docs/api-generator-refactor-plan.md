# API Generator State Refactor Plan

Context:
- `src/routes/api-generator/+page.svelte` (~705 lines) mixes UI markup with API/tag CRUD, ID generation, path-param syncing, and toast text, making it hard for humans and LLMs to reason about.
- `src/lib/stores/apis.ts` holds the domain stores but exposes minimal selectors, uses manual subscriptions, and leaves most orchestration to the page component.
- No focused unit tests cover API generator domain operations; only UI-level behavior exists in the page.

Objective:
Centralize API generator domain logic into a dedicated store/state module and slim `+page.svelte` to presentation and wiring only, matching existing store patterns (`fields.ts`, `validators.ts`, `types.ts`). This should reduce duplication, standardize store access, and make behavior testable in isolation.

Plan (no code, step-by-step; choices locked: state container = dedicated Svelte-runes module; ID strategy = deterministic helper with optional seed; messages centralized in state/store):
1) Baseline mapping
   - Extract a checklist of responsibilities currently in `src/routes/api-generator/+page.svelte` (metadata updates, tag CRUD with usage cleanup, endpoint CRUD/duplicate, path/query param sync, drawer state, validation, toasts, ID generation).
   - Cross-check against existing helpers in `src/lib/stores/apis.ts` to avoid re-implementing any logic already present.

2) Shared utilities
   - Introduce a small ID/clone utility in `src/lib/utils` (e.g., `ids.ts` or `object.ts`) to replace inline generators and `JSON.parse(JSON.stringify(...))`, ensuring no similar utility already exists.
   - Implement deterministic ID generation (counter + prefix) with optional seed to keep tests snapshot-friendly; use this for endpoints/tags/params across stores/state.
   - Keep the API surface minimal: predictable ID creation and a typed deep-clone helper reused by stores and tests.

3) Store consolidation (`src/lib/stores/apis.ts`)
   - Replace manual `subscribe` reads with `get` to align with other stores and avoid hidden subscriptions.
   - Add typed selectors/derivations for common lookups (tag by ID, endpoint by ID, endpoints by tag, total counts) so pages don’t re-implement them.
   - Move tag lifecycle logic here: create with uniqueness guard, delete with automatic endpoint detachment, and return a `DeletionResult`-style outcome with messages for UI toasts.
   - Move endpoint lifecycle logic here: create default endpoint, duplicate endpoint (including param ID regeneration), update endpoint, toggle expand, and safe delete.
   - Centralize path/query parameter updates (path parsing via `extractPathParameters`) so the page only calls one helper to reconcile params after path changes.

4) State container (`src/lib/stores/apiGeneratorState.svelte.ts`)
   - Mirror the `createListViewState` pattern: encapsulate UI-only state (drawer open, selected/edited endpoint, tag input text, hasChanges flag) and expose a typed API of actions that delegate to `apis.ts`.
   - Ensure the container surfaces ready-to-bind values and callbacks (e.g., `openEndpoint`, `saveEndpoint`, `undo`, `selectTag`, `createTag`, `deleteTag`, `addQueryParam`, `handlePathChange`) without UI markup.
   - Centralize toast/message strings in the container (or returned from `apis.ts`) so `+page.svelte` remains declarative and string drift is avoided.

5) Page integration (`src/routes/api-generator/+page.svelte`)
   - Replace inline logic with the new state container: bind to exposed state, forward events to container actions, and remove duplicate helpers (`generateId`, `generateParamId`, local tag/delete handlers).
   - Ensure imports follow the existing barrel pattern (`$lib/components`, `$lib/stores/apis`, new state module).
   - Keep UI markup intact while trimming script size to presentation wiring only.

6) Tests
   - Add vitest unit coverage mirroring src structure (e.g., `tests/unit/lib/stores/apis.test.ts` and `tests/unit/lib/stores/apiGeneratorState.test.ts`) to cover:
     * Tag creation/deletion flows (including endpoint detachment and `DeletionResult` messaging)
     * Endpoint create/update/duplicate/delete and path param reconciliation
     * State container behaviors (`hasChanges`, `undo`, drawer open/close, tag input interactions)
   - Reuse fixtures in `tests/fixtures` where possible to avoid data duplication.

7) Verification
   - Run `npm run check`, `npm run test:unit`, and the relevant integration spec touching API generator (if present) to ensure no regressions.
   - Confirm `src/lib/components` directory rules remain intact (only `.svelte` + `index.ts`).
   - Document any new public store/state APIs in docstrings or a short README blurb if patterns need explanation.

Definition of done:
- `src/routes/api-generator/+page.svelte` reduced to UI wiring with no domain logic.
- All domain logic for the API generator lives in `src/lib/stores/apis.ts` and the new state container, using shared utilities for IDs/cloning.
- Unit tests cover the new store/state APIs, and existing UI still renders/behaves as before.

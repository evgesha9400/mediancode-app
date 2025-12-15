# Field/Object Click + Drawer Autoclose Plan

## Findings (from 127.0.0.1:4173 via Chrome MCP)
- New field/object rows cannot be re-opened after creation; console shows `DataCloneError: [object Array] could not be cloned` when clicking the new row. Direct `structuredClone` on the just-created store items also fails.
- Root cause: `validators`/`fields` arrays (and possibly `usedInApis`) are `$state` proxies. `listViewState.selectItem` relies on `structuredClone`, which errors on these proxies, blocking drawer open for both fields and objects.
- Field creation specifically: after the create toast, the drawer stays open in edit mode with proxied state still attached.
- Object creation: closes the drawer, but the stored item still contains proxies, so clicking the new row fails the same way.

## Plan
1) Harden list selection clone strategy  
   - File: `src/lib/stores/listViewState.svelte.ts`  
   - Replace direct `structuredClone` usage in `selectItem` (and any clone points) with the existing `deepClone` utility to tolerate proxy-backed arrays while preserving current edit tracking/reset behavior.

2) Sanitize data written to stores  
   - File: `src/lib/stores/fields.ts`  
     - Before persisting in `createField`/`updateField` (and any add helpers), deep-clone incoming `validators`, `usedInApis`, and other array/object options so the store holds plain data, not `$state` proxies. Ensure returned created/updated items are also plain (structuredClone-safe).  
   - File: `src/lib/stores/objects.ts`  
     - Apply the same deep-clone normalization for `fields`, `usedInApis`, and other options in `createObject`/`updateObject`. Ensure returned created/updated items are plain (structuredClone-safe).  
   - Keep trimming/uniqueness guards intact; do not alter IDs or namespace logic.

3) Align creation flows and drawer state  
   - File: `src/routes/field-registry/+page.svelte`  
     - After a successful create, use the normalized field data; set `isCreating` false and close the drawer (mirroring objects). Ensure any type-tracking (`previousFieldType`) resets cleanly and that subsequent select/open uses normalized data (no proxies).  
   - File: `src/routes/object-builder/+page.svelte`  
     - Ensure the create path uses the normalized object payload and that post-create state resets do not reintroduce proxies; keep the drawer closing behavior consistent.

4) Tests (vitest)  
   - Extend `tests/unit/lib/stores/fields.test.ts` and `tests/unit/lib/stores/objects.test.ts` with cases that:  
     - Pass proxy-backed arrays into create/update and assert returned items are `structuredClone`-safe (no `DataCloneError`).  
     - Preserve existing expectations for IDs, trimming, counts, and uniqueness.  
   - Add a small unit for `listViewState` (new file under `tests/unit/lib/stores/`) verifying `selectItem` handles items whose arrays are proxies without throwing and sets edited/original snapshots as expected.
   - E2E: Update/Create Playwright coverage in `tests/e2e` to exercise field and object creation/select/edit flows:  
     - Create field → drawer closes → row clickable → edit drawer opens without console errors.  
     - Create object (with field selection) → drawer closes → row clickable → edit drawer opens and field list renders.  
     - Assert no console errors for structuredClone, and toasts appear. Align fixtures/selectors with the updated UI if needed.

5) Manual verification
   - Run `npm run dev -- --host 127.0.0.1 --port 4173`, then:  
     - `/field-registry`: create a new field (with/without validators/defaults), confirm toast, drawer auto-closes, new row is clickable and opens edit drawer without console errors; ensure edited saves still work.  
     - `/object-builder`: create a new object (with/without fields), confirm toast, drawer closes, new row is selectable and opens edit drawer without errors; ensure field add/remove still works.  
     - Spot-check existing rows remain editable and lists still sort/search as before.

6) Automated checks
   - `npm run test:unit` (and targeted suites if faster).  
   - `npm run test:e2e:smoke` (or targeted e2e covering fields/objects) to confirm UI workflows pass post-change.  
   - `npm run check` for type safety and svelte-check.  
   - Optional: `npm run test:integration` if time permits to ensure list pages still render.

# Object Builder Creation Plan

Goal: enable creating objects from existing fields with namespace-aware selection, matching the current edit form patterns, keeping field selection searchable, and preventing duplicate additions.

Reuse these patterns:
- `src/routes/object-builder/+page.svelte`: list/drawer state via `createListViewState`, field rendering, validation structure.
- `src/routes/field-registry/+page.svelte`: create-mode handling (`isCreating`, draft factory, dynamic drawer header/footer, create/cancel buttons).
- `src/lib/components/api-generator/FieldSelectorDropdown.svelte`: searchable field picker that already filters out selected IDs.
- `src/lib/components/namespace/NamespaceSelector.svelte` and `$lib/stores/namespaces`: active namespace management.
- `$lib/stores/objects.createObject`: namespace-scoped uniqueness guard.

Steps:
1) Add create mode state to object builder
   - Introduce `isCreating` flag and a `createObjectDraft()` helper defaulting to the active namespace, empty fields/usedInApis, and blank name/description.
   - Reset draft/create state on drawer close alongside existing validation/reset behavior.
2) Activate the “Create Object” entry point
   - Replace the disabled header button with the same actionable pattern used for “Add Field” (click opens drawer, clears selection/original state, assigns draft via factory, sets `isCreating = true`).
   - Ensure list selection/highlight handling still works when switching between create and edit flows.
3) Namespace assignment in the create form
   - Default draft namespace to `$activeNamespaceId`; allow namespace selection during creation (keep edit mode read-only).
   - When namespace changes, refresh available fields to that namespace and clear/validate selected field references that no longer belong.
4) Field picker behavior
   - Continue using `FieldSelectorDropdown` with `availableFields` filtered to the draft’s namespace and `selectedFieldIds` mirroring current selections.
   - Enforce no-duplicate additions by removing already-selected fields from the list (retain current behavior); keep search usability intact.
5) Validation and save/create handlers
   - Extend `validateForm` to run for create mode; require name + namespace.
   - Add `handleCreate` that calls `createObject` with namespace, fields (including required flags), and description; surface duplicate-name errors in `validationErrors`; on success, select the new object, sync `originalItem`, toast, and close drawer.
   - Preserve `handleSave` for edits; ensure `hasChanges` logic doesn’t block create-mode buttons.
6) Drawer UI adjustments
   - Dynamic header/title and footer buttons for create vs edit (mirror field-registry UX: Create/Cancel vs Save/Undo/Delete).
   - Keep namespace control read-only in edit mode; allow interactive control in create mode; ensure field list/required toggles work for drafts.
7) Derived data and list coherence
   - Maintain `deriveExtra` fields (fieldCount, usedInApisCount, namespaceName) for drafts so sort/table rendering stays stable.
   - Confirm `namespacedObjects` and list results update immediately after creation within the active namespace.
8) Tests
   - Unit: add coverage around `createObject` (success path, duplicate guard, namespace assignment, fields persisted).
   - Integration/UI: add object-builder page test that covers create flow (open create, choose namespace, search/select fields, prevent duplicate add, create, verify row counts/namespace/fields displayed).
9) Verification
   - Run `npm run check` and targeted tests (`npm run test:unit`, `npm run test:integration` or focused suites added for object builder); run Playwright spec if added.

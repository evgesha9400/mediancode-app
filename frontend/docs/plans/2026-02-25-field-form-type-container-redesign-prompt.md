# Field Form Type + Container Redesign — Session Prompt

Execute the implementation plan at `docs/plans/2026-02-25-field-form-type-container-redesign-impl.md`.

## Context

We are redesigning the field editing/creation drawer form on the Fields page (`/fields`). The changes:

1. **Single-row layout**: Field Name (left 50%) and Field Type (right 50%) sit on the same horizontal line, replacing the current vertical stack of name → container → type.
2. **New `TypeContainerSelector` component**: Merges the old container toggle buttons ("None"/"List") and the `TypeSelectorDropdown` into a single compound component with:
   - A searchable type dropdown (reuses `TypeSelectorDropdown` internally)
   - Visual `List [ ... ]` bracket nesting when the container is set to 'List'
   - A wrap toggle button (`List[str]`, `List[int]`, etc.) that dynamically reflects the selected type — clicking it toggles wrapping on/off
   - An "- Unwrap" button (right-aligned, disabled when not wrapped)
3. **Removed elements**: The standalone "Container" label and "None"/"List" toggle buttons are deleted.
4. **Everything else unchanged**: Namespace, Description, Default Value, Validators, Field Constraints, Used In APIs sections all remain as-is.

## Key files

- **Fields page**: `src/routes/(dashboard)/fields/+page.svelte` (lines 333-533 are the drawer)
- **TypeSelectorDropdown**: `src/lib/components/api-generator/TypeSelectorDropdown.svelte`
- **Barrel exports**: `src/lib/components/api-generator/index.ts`, `src/lib/components/index.ts`
- **E2E page object**: `tests/page-objects/FieldsPage.ts`
- **Design doc**: `docs/plans/2026-02-25-field-form-type-container-redesign-design.md`

## Instructions

1. Use the `superpowers:executing-plans` skill to work through the plan task by task.
2. Use a git worktree for isolation (`superpowers:using-git-worktrees`).
3. Use `/commit` for every commit — never write raw `git commit`.
4. After all tasks complete, run the full verification suite (svelte-check, vitest, E2E smoke, E2E CRUD). Fix all failures.
5. The final task deletes both plan files and this prompt file.

# Session Prompt: Global Namespace Edit Guard — Frontend

## Context

You are adding the ability to set the Global namespace as default from its drawer. Currently the Global namespace drawer is fully read-only with only a "Close" button. After this change, users can toggle the "Set as default" checkbox and save — while name/description remain read-only.

The full implementation plan is at:

`/Users/evgesha/Documents/Projects/median-code-frontend/docs/plans/2026-02-25-global-ns-edit-guard-impl.md`

Read the plan before doing anything.

## Instructions

Execute the plan task-by-task following these rules:

1. Read the full plan first
2. Execute task-by-task in order — do NOT skip ahead
3. Run tests after each task — fix failures before moving on
4. Commit after each task with the commit message specified in the plan
5. Zero failures is the only acceptable outcome
6. If a test fails, fix it before proceeding — do not accumulate debt

**REQUIRED SUB-SKILL:** Use superpowers:executing-plans to implement this plan.

## Scope

- **Tasks**: 7 tasks (2 implementation, 1 page object update, 2 test tasks, 1 verification, 1 cleanup)
- **Parts**: Model layer, UI layer, Page objects, Unit tests, E2E tests
- **Estimated files**: 4 files to modify

## Key constraints

- Package manager: `bun` / `bunx` (not npm/npx)
- Type check: `bun run svelte-check --tsconfig ./tsconfig.json`
- Unit tests: `bunx vitest run`
- E2E CRUD tests: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
- E2E smoke tests: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
- Svelte 5 runes: use `$derived`, `$state`, NOT legacy reactive `$:` syntax
- Component directories must only contain `.svelte` files + `index.ts` barrel export
- All imports from `$lib/components` use the barrel export pattern
- The `locked` property on Namespace is computed by the backend (true when name="Global")
- The backend API (after its plan is deployed) rejects name/description fields entirely for Global namespace
- Always use the `/commit` skill when committing — never raw `git commit`

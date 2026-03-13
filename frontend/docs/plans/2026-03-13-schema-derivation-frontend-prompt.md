# Session Prompt: Schema Derivation & Relationships — Frontend

## Context

You are implementing field-level "appears in" controls, object relationships with bidirectional auto-inverse UI, and merging the endpoint's two object selectors into one. The full implementation plan is at:

`/Users/evgesha/Documents/Projects/median-code-frontend/docs/plans/2026-03-13-schema-derivation-impl.md`

Read the plan before doing anything.

## BEFORE YOU DO ANYTHING

**STOP. Invoke the `superpowers:executing-plans` skill NOW using the Skill tool.**

Do NOT read the plan, do NOT explore the codebase, do NOT write any code until you have invoked the skill. The skill governs your entire workflow — including worktree setup, batch execution, and review checkpoints. Skipping it means working without isolation and without the correct process.

This is not optional. This is not informational. Call the Skill tool with `superpowers:executing-plans` as your very first action.

## Instructions

After invoking the skill above, follow its process to execute this plan. Key rules:

1. Read the full plan first
2. Execute task-by-task in order — do NOT skip ahead
3. Run tests after each task — fix failures before moving on
4. Commit after each task using the `/commit` skill (NEVER raw `git commit`)
5. Zero failures is the only acceptable outcome
6. If a test fails, fix it before proceeding — do not accumulate debt

## Scope

- **Tasks**: 13 tasks across 5 parts
- **Parts**: Types/API/Stores, Preview Generation, Object Form UI, Endpoint Drawer Merge, Tests & Verification
- **Estimated files**: ~25 files to create/modify

## Key constraints

- SvelteKit 2.47+, Svelte 5.41+ with runes (`$state`, `$derived`, `$effect`)
- Use `fromStore()` in `.svelte.ts` files, `$storeName` in `.svelte` files
- Type check: `bun run svelte-check --tsconfig ./tsconfig.json`
- Unit tests: `bunx vitest run`
- E2E tests: `PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
- NEVER use `pkill -f "vite"` — it kills VS Code extensions
- NEVER pipe test output through `tail` or `head`
- Always use `/commit` skill for commits — NEVER raw `git commit`
- Import from barrel exports: `import { Table, Drawer } from '$lib/components'`
- No `.ts` files in component directories (except `index.ts`)
- Monochrome design palette: `mono-50` through `mono-900`
- Table Name columns: `text-sm text-mono-900 font-medium` (no `font-mono`)
- Backend prerequisite: backend must be deployed with matching API changes first

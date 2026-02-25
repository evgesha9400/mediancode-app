# Session Prompt: Namespace Protections — Frontend

## Context

You are implementing frontend changes for namespace protections: consuming the new backend `locked` field to make the Global namespace fully read-only, blocking deletion of the default namespace, and adding `isDefault` support to namespace creation.

The full implementation plan is at:

`/Users/evgesha/Documents/Projects/median-code-frontend/docs/plans/2026-02-25-namespace-protections-impl.md`

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

- **Tasks**: 8 tasks across 4 parts
- **Parts**: API Layer Changes, Store Model Changes, UI Changes, Tests
- **Estimated files**: 5 files to modify (api/namespaces.ts, namespacesModel.svelte.ts, +page.svelte, 2 test files)

## Key constraints

- **Type check**: `bun run svelte-check --tsconfig ./tsconfig.json`
- **Unit tests**: `bunx vitest run`
- **E2E smoke**: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
- **E2E CRUD**: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
- **ALL FOUR test layers must pass** before reporting completion — this is non-negotiable
- **Commit standard**: Conventional commits — `feat(namespaces):`, `fix(namespaces):`, `test(namespaces):`
- **Framework**: Svelte 5 with runes ($state, $derived), SvelteKit
- **Prerequisite**: Backend must be deployed with namespace protections first. Backend plan at `/Users/evgesha/Documents/Projects/median-code-backend/docs/plans/2026-02-25-namespace-protections-impl.md`

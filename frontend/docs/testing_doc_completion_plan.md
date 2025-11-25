# docs/testing.md Completion Plan

Scope: Align `docs/testing.md` with the evaluated plan (`docs/testing_alignment_plan.md`) and evaluation outcomes (`docs/testing_alignment_evaluation.md`), reflecting the actual repository state (current tests, centralized seed data, MSW usage, Clerk behavior, and screenshot storage). No code changes are performed in this plan—only documentation updates.

Current state snapshot (inputs to use while editing):
- Seed data now lives in `src/lib/stores/initialData.ts` with clone helpers; `tests/fixtures/{fields,validators}.ts` import from it.
- Vitest unit/integration tests use MSW via `tests/setup/vitestSetup.ts`; Playwright currently does **not** start MSW (`tests/e2e/global-setup.ts` comments).
- Clerk smoke tests skip widget assertions when using placeholder keys (`tests/e2e/scenarios/auth.smoke.spec.ts`).
- Existing tests: unit (`tests/unit/lib/components/table/Table.test.ts`, `tests/unit/lib/utils/sorting.test.ts`), integration (`tests/integration/routes/dashboard/page.test.ts`), E2E (landing/auth/dashboard/mobile-blocked specs plus related snapshots under `tests/e2e/scenarios/*-snapshots/`), fixtures plus MSW handlers present.
- Docs/runbook promised paths (`tests/e2e/__screenshots__/…`, `docs/runbooks/testing.md`) do not exist yet; `tests/README.md` overstates available specs.

Decision outcomes to encode in `docs/testing.md`:
- D1 (Playwright data): **Enable MSW for all E2E runs** — deterministic fixtures across layers.
- D2 (Auth testing): **Add mock flag + placeholder DOM when real key absent**; keep real Clerk when key exists.
- D3 (Visual baselines): **Migrate snapshots to `tests/e2e/__screenshots__/`** and document update rules.

Implementation steps (ordered, minimal-noise edits for LLM consumption):
1) Reframe the intro to state the current test philosophy (npm toolchain, Vitest + Playwright) and reference this plan as the source of truth for finishing `docs/testing.md`.
2) Add a “Data Sources” section documenting `src/lib/stores/initialData.ts` as the single source of seed data, the clone helpers, and the expectation that fixtures import from it; mention `npm run test:fixtures:validate`.
3) Describe test layers and commands using actual scripts (`test`, `test:unit`, `test:integration`, `test:e2e:smoke`, `test:e2e:full`, `test:coverage`) and note that Vitest runs with MSW enabled via `tests/setup/vitestSetup.ts`.
4) Codify MSW policy (D1): state Playwright now starts MSW; specify setup/teardown touchpoints to edit (`tests/shared/msw/browser.ts`, `tests/e2e/global-setup.ts`, `playwright.config.ts`) and the expectation that E2E data comes from fixtures.
5) Codify Clerk policy (D2): document the mock flag behavior (placeholder DOM like `data-testid="clerk-placeholder"`), how Playwright should assert it when using placeholder keys, and that real Clerk remains active when a real key is present.
6) Update coverage tables to mirror reality: note existing routes/components/tests; flag missing ones (field-registry/types/validators routes, drawer/tooltip/unit gaps); remove claims about nonexistent specs or directories from `tests/README.md` references.
7) Clarify visual regression strategy (D3): declare `tests/e2e/__screenshots__/` as canonical, describe migration from `*-snapshots/` and how to update baselines.
8) Add a runbook pointer: create/reference `docs/runbooks/testing.md` as the durable playbook; until created, reference `tests/README.md` as interim.
9) Final consistency pass: ensure terminology matches CLAUDE.md patterns, hyperlinks point to real paths, and all decision outcomes are captured inline; no code snippets included.

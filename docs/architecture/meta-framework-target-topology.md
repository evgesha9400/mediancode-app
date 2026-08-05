# Meta Framework Target Topology

Status: current best long-term target, not a permanent prescription.
Last reviewed: 2026-06-06.

## Purpose

This note stores the current best final codebase shape for Median Code so future
LLM sessions can reason from a shared target instead of rediscovering it from
scratch.

Use this document as a strong default. Do not treat it as immutable. Before
implementing structural work, re-read `CONTEXT.md`, current ADRs, active work
plans, and the live codebase. If the business direction or codebase shape has
changed, update this document or write a new ADR before large moves.

## Current best target

The best long-term direction is a Meta Framework workspace:

```text
apps/
  api-service/
  web-dashboard/
contracts/
  openapi/
packages/
  meta-framework/
  generation-targets/
instances/
  median-code/
infra/
  foundation/
  wiring/
  components/
docs/
```

## Why this currently fits

- `apps/` makes deployable applications explicit.
- `contracts/` makes shared app contracts explicit.
- `packages/meta-framework/` gives the shared engine and pattern schema a home.
- `packages/generation-targets/` makes targets replaceable instead of naming the
  codebase after FastAPI.
- `instances/median-code/` separates the reference Median Code Instance from the
  reusable Meta Framework.
- `infra/foundation/`, `infra/wiring/`, and `infra/components/` match ADR 0003.
- The tree reads in the same order as the product story: Instance -> Pattern
  Registry -> portable design facts -> Generation Targets -> deploy topology.

## Re-evaluation questions

Before applying this target, answer these questions from the current codebase:

- Has `CONTEXT.md` changed the meaning of Meta Framework, Pattern Registry,
  Component, Generation Target, Foundation, Wiring, or Instance?
- Has a newer ADR accepted a different structure?
- Are there now multiple Median Code Instances, or is Median Code still the only
  reference Instance?
- Are there now multiple Generation Targets, or is FastAPI Python still the only
  concrete target?
- Are Foundation, Wiring, and Components implemented, or still only documented?
- Would moving deployable apps under `apps/` improve locality now, or just churn
  CI and deploy config?
- Would a smaller backend-only migration create the needed clarity first?

## Guardrails

- Prefer complete transitions over compatibility shims.
- Keep deploy topology stable until the code structure demands a deploy move.
- Do not split by fashionable monorepo names if the split does not improve the
  Median Code story.
- Do not move historical completed work docs just to match a new topology.
- Update active docs, tests, and import paths in the same migration as code.
- Keep root sparse: only repo-level entry points, contracts, app/package folders,
  and documentation should live there.

## Current migration recommendation

The next executable step should not be a full workspace move.

Recommended next migration:

```text
backend/src/api_craft
  -> backend/src/meta_framework/generation_targets/fastapi_python
```

Then extract target-neutral API Design Snapshot types into the Meta Framework
and move the FastAPI input adapter into the FastAPI Python Generation Target.

This is the best risk-adjusted step because it:

- aligns code names with the Meta Framework direction;
- keeps backend and frontend deploy paths stable;
- deepens the existing API Design Snapshot -> Generation Target seam;
- avoids moving SvelteKit routes and CI at the same time;
- creates a clearer base for later `packages/` extraction.

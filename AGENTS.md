# AGENTS.md — mediancode-app (root)

Cross-cutting guidance for Codex / agentic tools. Mirrors `CLAUDE.md` at this level — see that file for the canonical content. Per-app rules live in `backend/AGENTS.md`.

## Naming and decision precision

When designing modules and interfaces, name the narrow question the module owns instead of inventing broad taxonomies. Prefer straightforward domain wording that lets callers understand the decision without learning extra categories. For example, an Endpoint Query Semantics module should expose query availability because it owns filter and pagination applicability; it should not classify the whole Endpoint operation unless the module truly owns that operation.

## E2E verification rule

For any change that touches or can affect frontend behavior, run a Playwright E2E command before handing off. Do not silently omit E2E. Use the narrowest relevant Bun command first, for example `cd frontend && bun run test:e2e:smoke` for UI/rendering changes or `cd frontend && bun run test:e2e` when the blast radius is broad. If the E2E command cannot execute because required external credentials or services are unavailable, still run the command, capture the failure, and report the exact blocker and missing environment variables in the final response.

# CLAUDE.md — mediancode-app (root)

Cross-cutting guidance for the Median Code monorepo. Per-app rules live in `backend/CLAUDE.md` and `backend/AGENTS.md`. Read the relevant subtree's file before touching code in that subtree.

## Layout

- `backend/` — FastAPI service (Python 3.13, poetry/uv)
- `frontend/` — SvelteKit app (Bun)
- `api-spec.yaml` — OpenAPI contract, source of truth (root)
- `docs/` — shared philosophy, standards, protocols, and `docs/work/` for cross-cutting initiatives

## API contract rule

`api-spec.yaml` at repo root is the single source of truth.

1. Backend owns the spec generation. `backend/tests/contract/test_openapi_spec.py` asserts `app.openapi()` matches the committed file and tells you how to regenerate when stale.
2. Frontend regenerates types from the same file. Never edit a derived types file by hand.
3. To change the contract: edit backend route signatures / Pydantic models, regenerate the spec file, then regenerate frontend types in the same commit (or paired commits in the same PR).

Never edit `api-spec.yaml` by hand.

## Commit messages

See `docs/standards/COMMIT_MESSAGE_STANDARD.md`. Conventional Commits, imperative subject ≤50 chars, no `Co-Authored-By` lines.

## Docs structure

Work artifacts (specs, plans, prompts) live in `docs/work/{initiative-name}/`. When complete, move the whole directory to `docs/work/completed/{initiative-name}/`. Do not create flat `docs/specs/` or `docs/plans/` trees.

## Cross-cutting changes

When a change spans backend and frontend:
- Same PR, both subtrees touched.
- Both CI pipelines must pass.
- Run the shared E2E protocol in `docs/protocols/e2e.md` before merging.

## Deploy coupling

Per `docs/work/completed/monorepo-migration/spec.md`: backend and frontend deploy independently via path-filtered CI. Breaking-change features ship together (both touched in one PR); fixes ship independently.

## Branches

- `main` — production. Pushes deploy Vercel prod (frontend) and Coolify prod (backend), gated by path filters.
- `develop` — integration. Pushes deploy Vercel preview and Coolify staging.

Branch protection requires both `backend-ci` and `frontend-ci` job statuses (auto-pass when not affected by path filter).

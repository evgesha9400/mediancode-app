# Repo Topology

## Layout

```
mediancode-app/
├── api-spec.yaml         # OpenAPI contract — source of truth
├── backend/              # FastAPI service (Python 3.13)
├── frontend/             # SvelteKit app (Bun)
├── docs/                 # cross-cutting docs
│   ├── philosophy/       # product philosophy and decision framing
│   ├── standards/        # commit messages, etc.
│   ├── protocols/        # cross-app verification flows
│   ├── architecture/     # this doc and other topology notes
│   └── work/             # active and completed initiatives
├── .github/workflows/    # backend-ci.yml, frontend-ci.yml (path-filtered)
├── Makefile              # root entry points (delegates to subdir Makefiles)
├── CLAUDE.md             # cross-cutting agent guidance
└── AGENTS.md             # cross-cutting agent guidance (Codex)
```

## Ownership

| Path | Owns |
|------|------|
| `backend/` | Python application code, Alembic migrations, backend tests, Coolify deploy, `Dockerfile` |
| `frontend/` | SvelteKit application code, frontend tests, Vercel deploy |
| `api-spec.yaml` | The contract. Owned by backend (generated from FastAPI), consumed by frontend |
| `docs/` | Cross-cutting concerns only. Per-app docs live in `backend/docs/` and `frontend/docs/` |
| `.github/workflows/` | Path-filtered CI per app, plus contract-change triggers |

## Why monorepo

Pre-merge pain points (recorded in `docs/work/completed/monorepo-migration/spec.md`):

- API contract drift between two `api-spec.yaml` copies
- Branch juggling across two repos for cross-cutting features
- Tooling duplication (two CIs, two CLAUDE.md, two `docs/work/` trees)
- Refactor friction — renaming an endpoint required two coordinated PRs
- Issue scatter — bugs spanning both stacks were hard to track

Monorepo eliminates the first four. Issue tracking now happens in one GitHub project.

## CI strategy

- **Path filters**: only the affected app's pipeline runs when a PR touches one side
- **Contract changes**: edits to `api-spec.yaml` trigger both pipelines
- **Required checks**: both `backend-ci` and `frontend-ci` job statuses are required on `main` and `develop` (auto-pass when unaffected by path filter)

## Deploy strategy

| Branch | Backend (Coolify) | Frontend (Vercel) |
|--------|-------------------|-------------------|
| `main` | Production (path-filtered) | Production (path-filtered) |
| `develop` | Staging (path-filtered) | Preview (path-filtered) |

Feature branches don't trigger deploys. Breaking-change features ship atomically by touching both subtrees in one PR.

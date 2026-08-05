# Repo Topology

Two deployable apps share one repo and one OpenAPI contract.

- `backend/` — FastAPI service (Python 3.13), deployed to `mac-server`
- `frontend/` — SvelteKit app (Bun), deployed to Vercel through GitHub Actions
- `api-spec.yaml` — single source of truth, backend-generated, frontend-consumed
- `docs/` — cross-cutting only (`philosophy/`, `standards/`, `protocols/`, `operations/`, `architecture/`, `work/`)
- `config/operational-settings.json` — value-free operational configuration registry
- `scripts/check-operational-config.py` — configuration drift validator
- `.github/workflows/` — path-filtered CI per app
- `.githooks/` — root hooks delegating to app-local checks
- `Makefile` — root entry points delegating to subdir Makefiles
- `CLAUDE.md` / `AGENTS.md` — cross-cutting agent guidance

## Ownership

| Path | Owns |
|------|------|
| `backend/` | Python application code, Alembic migrations, backend tests, backend config, backend docs, backend deploy implementation |
| `backend/deploy/docker/Dockerfile` | Backend production-image build implementation |
| `backend/deploy/local/docker-compose.yml` | Local PostgreSQL compose stack |
| `frontend/` | SvelteKit application code, frontend tests, frontend config, frontend docs, Vercel deploy |
| `api-spec.yaml` | The contract. Owned by backend (generated from FastAPI), consumed by frontend |
| `docs/` | Cross-cutting concerns only. Per-app docs live in `backend/docs/` and `frontend/docs/` |
| `docs/operations/` | Application-wide configuration, provider boundary and recovery protocol |
| `config/operational-settings.json` | Names, classification, authority, consumers and scopes; never values |
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
- **Operational contract**: a separate lightweight workflow compares backend
  settings, frontend public variables, GitHub inputs, environment examples and
  public operations documentation without triggering a deployment

## Deploy strategy

| Branch | Backend (`mac-server`) | Frontend (Vercel) |
|--------|-------------------|-------------------|
| `main` | Production after backend CI | Production after frontend CI |
| `develop` | Development after backend CI | Development alias after frontend CI |

Feature branches don't trigger deployments. Backend images are built on GitHub
for `linux/amd64`, published by immutable digest to GHCR, and deployed over
Tailscale using a restricted SSH key. Vercel's direct Git deployment is
disabled; GitHub Actions builds and deploys the frontend after its full CI
gate. Breaking-change features ship by touching both subtrees in one PR.

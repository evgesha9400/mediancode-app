# mediancode-app

Median Code monorepo. Combines the former `mediancode-backend` and `mediancode-frontend` repositories.

## What lives here

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI service; see [backend/README.md](backend/README.md) |
| `frontend/` | SvelteKit app; see [frontend/README.md](frontend/README.md) |
| `api-spec.yaml` | Backend-generated OpenAPI contract; frontend-consumed source of truth |
| `docs/` | Cross-cutting architecture, standards, protocols, and work records |
| `.github/workflows/` | Path-filtered CI plus backend and frontend deployment |
| `.githooks/` | Root Git hooks delegating into backend and frontend commands |
| `Makefile` | Root entry points delegating to app-level commands |
| `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md` | Cross-cutting agent and domain guidance |

## Quickstart

```bash
# install (one-time)
make install

# run both stacks in parallel
make dev

# run all tests
make test
```

Per-app docs: `backend/CLAUDE.md`, `backend/AGENTS.md`, `backend/README.md`, `frontend/README.md`.

Repo file placement policy: [docs/architecture/app-root-file-policy.md](docs/architecture/app-root-file-policy.md).

## API contract

`api-spec.yaml` at repo root is the single source of truth. The backend regenerates it from FastAPI routes; the frontend consumes it for type generation. Changes to it trigger both CI pipelines.

## Branches

- `main` — production
- `develop` — integration / preview environments

Path-filtered CI: only the affected app's pipeline runs when a PR touches one
side; both run when `api-spec.yaml` or root files change. Successful pushes to
`develop` and `main` deploy through GitHub Actions.

## History

Both source repos were rewritten with `git filter-repo` into the `backend/` and `frontend/` subdirectories before merge. `git log --follow backend/src/...` or `git log --follow frontend/src/...` traces individual files back to their original commits.

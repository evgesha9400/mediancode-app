# mediancode-app

Median Code monorepo. Combines the former `mediancode-backend` and `mediancode-frontend` repositories.

## Layout

```
.
├── api-spec.yaml         # OpenAPI contract — source of truth, generated from backend
├── backend/              # FastAPI service (Python 3.13, poetry/uv)
├── frontend/             # SvelteKit app (Bun)
├── docs/                 # cross-cutting docs (philosophy, standards, protocols, work)
├── .github/workflows/    # path-filtered CI per app
├── CLAUDE.md             # cross-cutting agent guidance
├── AGENTS.md             # cross-cutting agent guidance (Codex)
└── Makefile              # parallel dev/test entry points
```

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

## API contract

`api-spec.yaml` at repo root is the single source of truth. The backend regenerates it from FastAPI routes; the frontend consumes it for type generation. Changes to it trigger both CI pipelines.

## Branches

- `main` — production
- `develop` — integration / preview environments

Path-filtered CI: only the affected app's pipeline runs when a PR touches one side; both run when `api-spec.yaml` or root files change.

## History

Both source repos were rewritten with `git filter-repo` into the `backend/` and `frontend/` subdirectories before merge. `git log --follow backend/src/...` or `git log --follow frontend/src/...` traces individual files back to their original commits.

# Monorepo Migration Spec

Status: executed 2026-05-13

## Goal

Merge `mediancode-backend` and `mediancode-frontend` into a single repository, `mediancode-app`. Eliminate cross-repo coordination overhead while preserving deploy independence.

## Pain Drivers (Q1)

Acknowledged before migration:

- API contract sync — two `api-spec.yaml` copies drifted; frontend's was 116 lines behind backend's
- Branch juggling — feature work required checking out matching branches across two dirs
- Tooling duplication — two CI configs, two `CLAUDE.md`, two `docs/work/` trees
- Refactor friction — endpoint renames required atomically-impossible cross-repo edits
- Issue scatter — bugs spanning both stacks were hard to track

## Decisions

| # | Question | Choice | Notes |
|---|----------|--------|-------|
| Q2 | Deploy coupling | Together for breaking, independent otherwise | Path-filtered CI; convention-based |
| Q3 | API contract | FastAPI generates spec, frontend consumes | Backend test asserts committed spec matches `app.openapi()` (to be added) |
| Q4 | Directory layout | Flat: `backend/`, `frontend/`, root `api-spec.yaml` | No `apps/`/`packages/` overhead |
| Q5 | Git history | Preserve both via `git filter-repo` + `--allow-unrelated-histories` merge | All 481+535 commits accessible |
| Q6 | Branch model | Keep `main` + `develop` | Same as pre-merge mental model |
| Q7a | Vercel ownership | `evgesha9400` (unchanged) | |
| Q7b | Dockerfile location | `backend/deploy/docker/Dockerfile` | Build context: `backend/` |
| Q7c | `api-spec.yaml` triggers | Both CIs | Frontend regenerates types, backend re-asserts spec |
| Q7d | Cross-cutting PRs | Both CIs required to pass | Path filter handles auto-skip on unaffected side |
| Q8 | Local dev | Root `Makefile` delegating to subdir Makefiles | `make -j2 backend.dev frontend.dev` |
| Q9a | CLAUDE.md | Two-tier (root + per-app) | Root holds cross-cutting; subdirs hold tech-specific |
| Q9b | Shared-workspace docs | Folded into `docs/` then shared-workspace deleted | Philosophy, commit standard, e2e protocol, completed initiatives all migrated |
| Q9c | `docs/work/completed/` | Keep all three (unified-field-model, theme-softening, cdk-generation) | History cheap; useful for "why did we do X" |
| Q10a | New repo name | `mediancode-app` | Distinguishes from org name |
| Q10b | Old repos | Delete after 2-week grace | Initially archived; deleted after verification window |
| Q11a | Grace period | 2 weeks archived | Rollback path remains via `git push` to archived repos |
| Q11b | Cutover ordering | Code-first | Filter-repo → merge → push monorepo → verify CI → flip Vercel → flip Coolify → delete old |

## Migration Mechanics

### Phase 0 — Prep
- Verified prerequisites: `git filter-repo` installed via Homebrew, `gh` authed as `evgesha9400`
- Created `mediancode-app` private repo on GitHub
- Inventoried secrets to migrate:
  - `COOLIFY_TOKEN` (was in backend)
  - `CLERK_SECRET_KEY`, `E2E_TEST_USER_EMAIL`, `E2E_TEST_USER_PASSWORD` (were in frontend)

### Phase 1 — History rewrite
```bash
git clone --no-local mediancode-backend backend-rewrite
cd backend-rewrite && git filter-repo --to-subdirectory-filter backend --force

git clone --no-local mediancode-frontend frontend-rewrite
cd frontend-rewrite && git filter-repo --to-subdirectory-filter frontend --force

mkdir mediancode-app && cd mediancode-app && git init -b main
git remote add backend ../backend-rewrite && git fetch backend
git remote add frontend ../frontend-rewrite && git fetch frontend

git checkout -b main backend/main
git merge frontend/main --allow-unrelated-histories -m "chore: merge frontend repo into monorepo"

git checkout -b develop backend/develop
git merge frontend/develop --allow-unrelated-histories -m "chore: merge frontend repo into monorepo"

git remote remove backend
git remote remove frontend
git remote add origin git@github-personal:evgesha9400/mediancode-app.git
```

Result: 1017 commits on `develop` (481 backend + 535 frontend + 1 merge), files cleanly partitioned under `backend/` and `frontend/`.

### Phase 2 — Root scaffolding
- `Makefile` — delegates to `backend/Makefile` and `bun` scripts via `make -j2`
- `.github/workflows/backend-ci.yml` — path filter `backend/**` + `api-spec.yaml`, `defaults.run.working-directory: backend`
- `.github/workflows/frontend-ci.yml` — path filter `frontend/**` + `api-spec.yaml`, `defaults.run.working-directory: frontend`
- `CLAUDE.md`, `AGENTS.md`, `README.md` at root
- `docs/philosophy/`, `docs/standards/`, `docs/protocols/`, `docs/architecture/` populated from shared-workspace
- `docs/work/completed/{unified-field-model, theme-softening, cdk-generation}/` migrated from shared-workspace
- Per-app `.github/` directories removed (workflows live at root only)

### Phase 3 — Contract path consolidation
- Moved `backend/docs/api-spec.yaml` → `api-spec.yaml` at root
- Deleted `frontend/docs/api-spec.yaml` (stale, 116 lines behind backend)
- Updated `frontend/package.json` `lint:api` script to reference `../api-spec.yaml`
- Audited backend code for any direct reads of the old path

### Phase 4 — Push & verify
- Pushed `main` and `develop` to `evgesha9400/mediancode-app`
- Set 4 secrets via `gh secret set`
- Watched first CI runs green on both pipelines
- Validated `make dev` brings up both stacks locally

### Phase 5 — Deploy flip (manual)
- Vercel: project Git source → `evgesha9400/mediancode-app`, root directory → `frontend/`
- Coolify: Git source → `evgesha9400/mediancode-app`, build context → `backend/`, Dockerfile path → `backend/deploy/docker/Dockerfile`
- Push to `develop` triggers preview+staging deploys; push to `main` triggers prod deploys

### Phase 6 — Grace period (2 weeks)
- Old repos archived (read-only) on GitHub immediately after Phase 5 verifies
- Monorepo runs exclusively
- At least one prod deploy + one rollback drill before deletion

### Phase 7 — Demolish
- Delete `mediancode-backend` and `mediancode-frontend` on GitHub
- Delete `mediancode-shared-workspace` repo and local dir
- Replace local `~/Projects/dev-tools/mediancode/repos/mediancode-{backend,frontend}` with clone of `mediancode-app`

## Known Follow-ups

- Add backend test that asserts `app.openapi()` matches committed `api-spec.yaml` (closes the loop on contract drift)
- Audit if backend code reads `docs/api-spec.yaml` at runtime; if so, point at root path or remove
- Confirm frontend type-gen tool (likely `openapi-typescript`) reads root spec
- Document branch protection rules on new repo: require `backend-ci` and `frontend-ci`

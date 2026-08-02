# Meta Framework Topology Migration Plan

Status: ready for implementation.
Target architecture note: `docs/architecture/meta-framework-target-topology.md`.

## Goal

Create the first executable migration toward the Meta Framework target topology
without moving deployable apps yet.

The implementation should rename and relocate backend generation code so the
worktree tells this story:

```text
Product API service
  -> assembles API Design Snapshot from persisted API data
  -> passes portable facts to a Generation Target
  -> FastAPI Python target renders the current generated project
```

## Non-goals

- Do not move `backend/` to `apps/api-service/`.
- Do not move `frontend/` to `apps/web-dashboard/`.
- Do not implement new Generation Targets.
- Do not implement Foundation, Wiring, or Components.
- Do not change generated output behavior.
- Do not change `api-spec.yaml`.
- Do not add `api_craft` compatibility shims.

## Naming decisions

| Caller question | Name |
|---|---|
| What shared code owns target-neutral generation concepts? | `meta_framework` |
| Which target renders the current FastAPI Python API Implementation? | `fastapi_python` |
| Which portable API facts can Generation Targets consume? | `api_design_snapshot` |
| What FastAPI Python input should be built from an API Design Snapshot? | `input_from_api_design_snapshot` |

## Target backend structure

```text
backend/src/
  api/
    services/
      generation.py
      api_design_snapshot.py
  meta_framework/
    __init__.py
    api_design/
      __init__.py
      snapshot.py
    generation_targets/
      __init__.py
      fastapi_python/
        __init__.py
        main.py
        prepare.py
        prepared_views.py
        project_plan.py
        relationship_derivation.py
        sqlalchemy_relationships.py
        schema_splitter.py
        orm_builder.py
        placeholders.py
        extractors.py
        utils.py
        models/
        templates/
        input_from_api_design_snapshot.py
```

`api/services/api_design_snapshot.py` remains the persistence assembler because
it imports SQLAlchemy product API models. The portable dataclasses move to
`meta_framework/api_design/snapshot.py`.

## Phase 0: Baseline checks

- Run `git status --short --branch`.
- Identify existing dirty files.
- Do not revert user-owned changes.
- Run `cd backend && poetry run pytest tests/codegen tests/test_api_craft tests/test_api/test_services/test_api_craft_input.py tests/test_api/test_services/test_api_design_snapshot.py -v`.

## Phase 1: Move the FastAPI Python target

- Create `backend/src/meta_framework/generation_targets/fastapi_python/`.
- Move all files from `backend/src/api_craft/` into that directory.
- Remove the old `backend/src/api_craft/` package.
- Update imports from `api_craft...` to `meta_framework.generation_targets.fastapi_python...`.
- Update `backend/pyproject.toml` package includes.
- Update Ruff first-party import config.
- Update active docs that describe current packages.
- Leave completed historical work plans unchanged unless they are active instructions.

Verification:

```bash
cd backend
poetry run pytest tests/codegen tests/test_api_craft -v
poetry run ruff check src tests
```

## Phase 2: Extract portable API Design Snapshot types

- Create `backend/src/meta_framework/api_design/snapshot.py`.
- Move only portable dataclasses and related type aliases from
  `backend/src/api/services/api_design_snapshot.py`.
- Keep persistence assembly functions in `api/services/api_design_snapshot.py`.
- Import snapshot dataclasses from `meta_framework.api_design.snapshot`.
- Do not let `meta_framework/api_design/snapshot.py` import SQLAlchemy product
  API models.

Verification:

```bash
cd backend
poetry run pytest tests/test_api/test_services/test_api_design_snapshot.py -v
poetry run ruff check src tests
```

## Phase 3: Move the FastAPI input adapter into the target

- Move `backend/src/api/services/api_craft_input.py` to
  `backend/src/meta_framework/generation_targets/fastapi_python/input_from_api_design_snapshot.py`.
- Rename exported builders to question-based names if the call site becomes
  clearer.
- Update `api/services/generation.py` to import from the FastAPI Python target.
- Update tests currently named around `api_craft_input`.
- Remove old target-specific service module from `api/services/`.

Preferred exported name:

```python
build_fastapi_python_input_from_api_design_snapshot
```

Caller question:

```text
What FastAPI Python target input should be built from this API Design Snapshot?
```

Verification:

```bash
cd backend
poetry run pytest tests/test_api/test_services/test_api_craft_input.py tests/codegen -v
poetry run ruff check src tests
```

## Phase 4: Move tests to mirror the new story

- Move `backend/tests/test_api_craft/` to
  `backend/tests/meta_framework/generation_targets/fastapi_python/`.
- Move target adapter tests out of `tests/test_api/test_services/` if they no
  longer test product API services.
- Keep product service tests under `backend/tests/test_api/test_services/`.
- Keep end-to-end generated project tests under `backend/tests/codegen/` and
  `backend/tests/runtime/`.

Verification:

```bash
cd backend
poetry run pytest tests/meta_framework tests/codegen tests/test_api/test_services -v
poetry run ruff check src tests
```

## Phase 5: Documentation and cleanup

- Update `backend/README.md`.
- Update `backend/CLAUDE.md`.
- Update root `README.md` only if the root story changes.
- Update `docs/work/planned/endpoint-owned-query-semantics/plan.md` if it refers
  to old active paths.
- Run `rg "api_craft" backend/src backend/tests backend/README.md backend/CLAUDE.md docs/work/planned`.
- Any remaining `api_craft` hit must be historical or intentionally documented.
- Run `rg "FastAPI target|Generation Target|API Design Snapshot" backend/src docs`.

## Final verification

```bash
cd backend
poetry run pre-commit run --all-files
poetry run pytest tests/ -v
poetry run mypy src/
```

If backend tests require PostgreSQL and it is unavailable, start the local
database and rerun:

```bash
cd backend
make db
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/median_code poetry run pytest tests/ -v
```

## Completion criteria

- No `backend/src/api_craft/` package remains.
- FastAPI Python generation code lives under
  `meta_framework/generation_targets/fastapi_python`.
- Portable API Design Snapshot types live under `meta_framework/api_design`.
- Product API service keeps persistence loading and generation ZIP orchestration.
- Backend tests pass.
- Active docs describe the new structure.
- No frontend behavior changes were made.

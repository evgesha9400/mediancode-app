# Fresh Session Implementation Prompt

You are Codex working in:

```text
/Users/evgesha/Projects/dev-tools/mediancode/repos/mediancode-app
```

Implement the first backend migration toward the Meta Framework target topology.

Read these files first, in this order:

```text
AGENTS.md
CLAUDE.md
CONTEXT.md
docs/architecture/meta-framework-target-topology.md
docs/work/planned/meta-framework-topology-migration/plan.md
backend/AGENTS.md
backend/CLAUDE.md
backend/README.md
backend/pyproject.toml
```

Do not ask questions unless implementation is genuinely blocked. If ambiguity
remains after reading the docs and code, use the `grill-me` skill as an escape
hatch and ask exactly one precise question with your recommended answer.

## Objective

Execute `docs/work/planned/meta-framework-topology-migration/plan.md`.

The intended migration is backend-only:

```text
backend/src/api_craft
  -> backend/src/meta_framework/generation_targets/fastapi_python
```

Then:

```text
portable API Design Snapshot dataclasses
  -> backend/src/meta_framework/api_design/snapshot.py

FastAPI target input adapter
  -> backend/src/meta_framework/generation_targets/fastapi_python/input_from_api_design_snapshot.py
```

Do not move `backend/`, `frontend/`, `.github/`, or `api-spec.yaml`.

## Required constraints

- Preserve generated output behavior.
- Do not change frontend behavior.
- Do not change `api-spec.yaml`.
- Do not create an `api_craft` compatibility shim.
- Do not leave old internal parallel import paths.
- Do not revert user-owned dirty files.
- Use `git mv` for moves.
- Use `apply_patch` for manual file edits.
- Use Poetry for backend Python commands.
- Keep completed historical docs unchanged unless they are active instructions.
- Update active docs and tests in the same migration.

## Expected target structure

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

`api/services/api_design_snapshot.py` must remain the persistence assembler. It
may import SQLAlchemy product API models. `meta_framework/api_design/snapshot.py`
must not import SQLAlchemy product API models.

## Names to use

Use this exported adapter name unless the code proves a better question-based
name:

```python
build_fastapi_python_input_from_api_design_snapshot
```

Caller question:

```text
What FastAPI Python target input should be built from this API Design Snapshot?
```

## Implementation sequence

1. Run:

   ```bash
   git status --short --branch
   cd backend
   poetry run pytest tests/codegen tests/test_api_craft tests/test_api/test_services/test_api_craft_input.py tests/test_api/test_services/test_api_design_snapshot.py -v
   ```

2. Move `backend/src/api_craft/` to:

   ```text
   backend/src/meta_framework/generation_targets/fastapi_python/
   ```

3. Update every active source/test import:

   ```text
   api_craft...
   -> meta_framework.generation_targets.fastapi_python...
   ```

4. Update `backend/pyproject.toml`:

   - package include should use `meta_framework`;
   - Ruff `known-first-party` should include `meta_framework`;
   - remove `api_craft` from active first-party package config.

5. Extract portable API Design Snapshot dataclasses from:

   ```text
   backend/src/api/services/api_design_snapshot.py
   ```

   into:

   ```text
   backend/src/meta_framework/api_design/snapshot.py
   ```

   Keep assembly functions in `api/services/api_design_snapshot.py`.

6. Move:

   ```text
   backend/src/api/services/api_craft_input.py
   ```

   to:

   ```text
   backend/src/meta_framework/generation_targets/fastapi_python/input_from_api_design_snapshot.py
   ```

7. Update `backend/src/api/services/generation.py` to import:

   - `APIGenerator` from the FastAPI Python target;
   - the renamed input builder from the FastAPI Python target.

8. Move tests to mirror the new structure:

   ```text
   backend/tests/test_api_craft/
   -> backend/tests/meta_framework/generation_targets/fastapi_python/
   ```

   Move target adapter tests out of `tests/test_api/test_services/` if they no
   longer test product API services.

9. Update active docs:

   ```text
   backend/README.md
   backend/CLAUDE.md
   docs/work/planned/endpoint-owned-query-semantics/plan.md
   ```

10. Run cleanup searches:

    ```bash
    rg "api_craft" backend/src backend/tests backend/README.md backend/CLAUDE.md docs/work/planned
    rg "FastAPI target|Generation Target|API Design Snapshot" backend/src docs
    ```

11. Run final verification:

    ```bash
    cd backend
    poetry run pre-commit run --all-files
    poetry run pytest tests/ -v
    poetry run mypy src/
    ```

    If PostgreSQL tests skip or fail because the database is unavailable:

    ```bash
    cd backend
    make db
    DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/median_code poetry run pytest tests/ -v
    ```

## Completion response

Report:

- files moved;
- files edited;
- test commands run;
- any failing command with exact blocker;
- remaining `api_craft` references and why each remains;
- whether frontend was untouched.

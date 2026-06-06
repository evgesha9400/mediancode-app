# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Median Code Backend consists of two active source areas:

- `api`: FastAPI product service exposing REST endpoints.
- `meta_framework`: portable API Design facts and Generation Targets.

**Python 3.13+ required.**

## Package Structure

```
src/
├── meta_framework/
│   ├── api_design/     # Portable API Design Snapshot facts
│   └── generation_targets/
│       └── fastapi_python/
│           ├── main.py
│           ├── models/
│           ├── templates/
│           ├── input_from_api_design_snapshot.py
│           ├── prepare.py
│           └── extractors.py
└── api/                # FastAPI service
    └── ...
```

## Commands

```bash
# Install dependencies
poetry install

# Run all tests
make test
# Or: poetry run pytest tests/ -v

# Run all tests with the local Docker PostgreSQL database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/median_code poetry run pytest tests/ -v

# Run a single test
poetry run pytest tests/codegen/test_input_and_transform.py::TestPascalCaseValidation -v

# Format code
poetry run black src/

# Clean caches and test output
make clean
```

## Test Database

The backend PostgreSQL test database runs in Docker. Do not treat PostgreSQL
skips as a completed full pytest run. If DB-backed tests skip, start or inspect
the Docker database and rerun the tests with the Docker database URL.

Current local Docker database:

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/median_code poetry run pytest tests/ -v
```

## FastAPI Python Generation Target

### Generation Pipeline

```
API Design Snapshot → FastAPI Python InputAPI → Prepare → Extract → Render → Write
```

1. **Snapshot** (`api/services/api_design_snapshot.py`): assembles persisted API rows into portable facts.
2. **Input adapter** (`input_from_api_design_snapshot.py`): builds FastAPI Python `InputAPI`.
3. **Prepare** (`prepare.py`): computes target-specific names, schemas, ORM models, and views.
4. **Extract** (`extractors.py`): pulls renderable components from the prepared API.
5. **Render/Write** (`main.py`, `project_plan.py`): renders templates and writes the generated project.

### Generated Output Structure

```
{api-name}/
├── src/
│   ├── models.py      # Pydantic models
│   ├── views.py       # FastAPI routes
│   ├── main.py        # FastAPI app
│   ├── path.py        # Path parameter validators (if needed)
│   └── query.py       # Query parameter validators (if needed)
├── pyproject.toml
├── Makefile
├── Dockerfile
└── swagger.py
```

## Naming Convention

All user-provided names in input JSON must be **PascalCase**. The `Name` type automatically provides:
- `.snake_name` → snake_case
- `.camel_name` → camelCase
- `.kebab_name` → kebab-case

## Adding Generation Features

To extend the current target:
1. Add target input fields to `meta_framework/generation_targets/fastapi_python/models/input.py`.
2. Update `input_from_api_design_snapshot.py` when the new fact comes from persisted API design.
3. Update `prepare.py` or narrower helpers for target-specific derivation.
4. Update `extractors.py` when templates need new renderable components.
5. Create or modify Mako templates in `templates/`.
6. Update `main.py` or `project_plan.py` when generated files change.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) as specified in `docs/COMMIT_MESSAGE_STANDARD.md`. Use scopes: `api`, `generation`, `models`, `config`, `deps`. Body must be sequential bullet points. Do NOT include Co-Authored-By lines.

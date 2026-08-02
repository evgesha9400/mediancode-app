# Median Code Backend

FastAPI backend for Median Code - API code generation and entity management.

## Quick Start (Local Development)

### Prerequisites

- Python 3.13+
- Docker (for PostgreSQL)
- Poetry

### Setup

```bash
# Install dependencies
poetry install

# Create local environment file
cp .env.local.example .env.local
# Edit .env.local with your Clerk credentials

# First-time setup: deps, pre-commit hooks (Ruff — same as CI), DB, migrations
make setup

# Start the backend (in a separate terminal)
make dev
```

`make setup` installs root hooks and backend pre-commit environments from `config/pre-commit-config.yaml`. To run the same checks manually, use `make lint`.

<details>
<summary>If <code>make install-hooks</code> errors about <code>core.hooksPath</code></summary>

The monorepo expects `core.hooksPath` to be `.githooks`. Run `make install-hooks` from the repo root to restore it.
</details>

Backend runs at http://localhost:8001
- API Docs: http://localhost:8001/docs
- Health: http://localhost:8001/health

## Root Interface

| Path | Purpose |
|------|---------|
| `README.md` | Backend entry point for humans |
| `pyproject.toml`, `poetry.lock` | Poetry-managed Python dependencies |
| `Makefile` | Backend local development, tests, lint, Docker commands |
| `alembic.ini` | Migration tool config |
| `.env.*.example` | Environment templates |
| `config/pre-commit-config.yaml` | Ruff pre-commit config used by Poetry and CI |
| `deploy/docker/Dockerfile` | Container build implementation |
| `deploy/local/docker-compose.yml` | Local PostgreSQL stack |
| `docs/` | Backend docs and diagrams |
| `AGENTS.md`, `CLAUDE.md` | Agent guidance kept at app root for tool discovery |

### Local Commands

```bash
make setup          # First-time setup: install deps, hooks, DB, migrations
make dev            # Start backend with hot reload
make db             # Start PostgreSQL only
make db-stop        # Stop PostgreSQL
make db-reset       # Reset database: delete data, restart, re-migrate
make test           # Run all tests
make test-codegen   # Run codegen tests only (no DB needed)
make lint           # Ruff format + lint (same as CI / backend pre-commit)
make install-hooks  # Install pre-commit git hooks (also run by make setup)
make clean          # Remove Python caches and test output
```

### Database Migrations (Local)

```bash
make migrate-up             # Apply all pending migrations
make migrate-down           # Rollback last migration
make migrate-history        # Show migration history
make migrate-current        # Show current migration version
make migration msg="..."    # Create new migration file
```

## Architecture

```
┌─────────────────┐     ┌───────────────────────────────────────────────┐
│  Vercel         │     │  mac-server (Colima + Docker Compose)          │
│  Frontend       │     │                                               │
│  (SvelteKit)    │────>│  ┌─────────────┐     ┌─────────────────────┐  │
└─────────────────┘     │  │  Backend     │────>│  PostgreSQL         │  │
        │               │  │  (FastAPI)   │     │                     │  │
        │               │  └─────────────┘     └─────────────────────┘  │
        │               └───────────────────────────────────────────────┘
        │                       │
        └───────────────────────┘
                  │
            Clerk Auth
```

## Packages

- `src/api/` — FastAPI service (routers, services, schemas, models, migrations).
- `src/meta_framework/api_design/` — portable API Design Snapshot dataclasses.
- `src/meta_framework/generation_targets/fastapi_python/` — FastAPI Python Generation Target (input models, preparation, project planning, Mako templates).

See [CLAUDE.md](CLAUDE.md) for the generation pipeline and conventions.

## Deployment

GitHub Actions tests the backend, builds a `linux/amd64` image, publishes it to
GHCR by immutable digest, and deploys it to `mac-server` over Tailscale after a
successful push to `develop` or `main`. See
[deploy/mac-server/README.md](deploy/mac-server/README.md) for the deployment
contract. The Coolify material is retained temporarily as migration and
rollback documentation while the existing DigitalOcean deployment remains
active.

## Documentation

- [Environment configuration](docs/environments.md)
- [Testing strategy](docs/testing.md)
- [Database diagram](docs/database-diagram.png)
- [Global namespace behavior](docs/GLOBAL_NAMESPACE_BEHAVIOR.md)

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

`make setup` installs hooks from `.pre-commit-config.yaml` via `pre-commit`. To run the same checks manually, use `make lint`.

<details>
<summary>If <code>make install-hooks</code> errors about <code>core.hooksPath</code></summary>

Some tools set a custom Git hooks path. Either unset it (`git config --unset-all core.hooksPath`) or follow your tool’s instructions for running <code>pre-commit</code>.
</details>

Backend runs at http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

### Local Commands

```bash
make setup          # First-time setup: install deps, hooks, DB, migrations
make dev            # Start backend with hot reload
make db             # Start PostgreSQL only
make db-stop        # Stop PostgreSQL
make db-reset       # Reset database: delete data, restart, re-migrate
make test           # Run all tests
make test-codegen   # Run codegen tests only (no DB needed)
make lint           # Ruff format + lint (same as CI / pre-commit)
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
│  Vercel         │     │  Digital Ocean Droplet (Coolify)               │
│  Frontend       │     │                                               │
│  (Next.js)      │────>│  ┌─────────────┐     ┌─────────────────────┐  │
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
- `src/api_craft/` — code generation library (transformers, extractors, renderers, Mako templates).

See [CLAUDE.md](CLAUDE.md) for the generation pipeline and conventions.

## Deployment

Deployed on a Digital Ocean droplet via [Coolify](https://coolify.io/). Pushing to `develop` or `main` triggers CI, and on success a webhook triggers Coolify to build and deploy. See [deploy/coolify/COOLIFY_DEPLOYMENT.md](deploy/coolify/COOLIFY_DEPLOYMENT.md) for setup details.

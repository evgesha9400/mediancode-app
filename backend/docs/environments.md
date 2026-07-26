# Environment Configuration

Quick-reference for the backend's three runtime contexts. See
[../deploy/mac-server/README.md](../deploy/mac-server/README.md) for the
deployment contract.

## Environments

| Environment | Branch | Backend URL | Frontend URL | Clerk App |
|-------------|--------|-------------|--------------|-----------|
| **Local** | any | `localhost:8001` | `localhost:5173` | Development |
| **Mac server Dev** | `develop` | `api.dev.mediancode.com` | `dev.mediancode.com` | Development |
| **Mac server Prod** | `main` | `api.mediancode.com` | `mediancode.com` | Production |

## Master Variable Table

| Variable | Local (`.env.local`) | Mac server Dev | Mac server Prod | Purpose |
|---|---|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/median_code` | Constructed from the mounted Postgres password | Constructed from the mounted Postgres password | PostgreSQL connection |
| `ENVIRONMENT` | `development` (default) | `development` | `production` | Controls API docs visibility |
| `CLERK_FRONTEND_API_URL` | `https://accurate-lion-1.clerk.accounts.dev` | Same (dev Clerk app) | `https://clerk.mediancode.com` | JWT validation (JWKS endpoint) |
| `FRONTEND_URL` | `http://localhost:5173` (default) | `https://dev.mediancode.com` | `https://mediancode.com` | CORS allowed origin |
| `SYSTEM_NAMESPACE_ID` | `00000000-0000-0000-0000-000000000001` | `00000000-0000-0000-0000-000000000001` | `00000000-0000-0000-0000-000000000001` | System namespace UUID for seed data |
| `CLERK_JWT_AUDIENCE` | *(empty)* | *(empty)* | *(empty)* | Optional JWT audience claim |

### Notes

- **`DATABASE_URL` format**: Hosting providers may inject `postgres://` or `postgresql://`. The `settings.py` validator auto-converts to `postgresql+asyncpg://` for SQLAlchemy async. You do **not** need to manually adjust the scheme.
- **Server secrets**: The Clerk and PostgreSQL secrets are mounted as files and
  never stored in Git, Compose environment files, command arguments, or images.
- **`ENVIRONMENT` on the server**: Set to `development` or `production` in the
  host-owned non-secret configuration file.
- **Migrations**: The `entrypoint.sh` runs `alembic upgrade head` automatically on every deploy -- no manual migration step needed after initial setup.

## Local Development

Local dev uses `.env.local` (loaded by `settings.py`). Copy from `.env.local.example`:

```bash
cp .env.local.example .env.local
# Edit .env.local with your actual Clerk dev URL
```

All variables have sensible defaults in `settings.py` except `CLERK_FRONTEND_API_URL` -- this must be set to your actual Clerk Frontend API URL for JWT validation to work.

## Configuration Checklist

When setting up or auditing a server environment:

- [ ] The mounted PostgreSQL password is present, private, and readable by the containers
- [ ] `ENVIRONMENT` is set to `development` or `production`
- [ ] `CLERK_FRONTEND_API_URL` points to the correct Clerk app (dev vs prod)
- [ ] `FRONTEND_URL` matches the frontend domain for that environment
- [ ] `SYSTEM_NAMESPACE_ID` is set to `00000000-0000-0000-0000-000000000001`
- [ ] Healthcheck path is `/health` on port `8080`
- [ ] Branch is set correctly (`develop` for dev, `main` for prod)

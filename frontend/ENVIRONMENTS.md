# Environment Configuration

This document defines the canonical environment structure used across all Median Code services.

## Environments

We use **two environments**:

| Environment | Purpose | Users |
|-------------|---------|-------|
| **Development** | Testing, staging, QA | Internal team |
| **Production** | Live application | End users |

## Service URLs

| Service | Development | Production |
|---------|-------------|------------|
| Frontend | `dev.mediancode.com` | `app.mediancode.com` |
| API | `api.dev.mediancode.com` | `api.mediancode.com` |

## Environment Variables

### Frontend (SvelteKit)

| Variable | Development | Production |
|----------|-------------|------------|
| `PUBLIC_API_BASE_URL` | `https://api.dev.mediancode.com/v1` | `https://api.mediancode.com/v1` |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dev key (`pk_test_...`) | Clerk Prod key (`pk_live_...`) |

## Service Mapping

### Vercel (Frontend)

| Vercel Environment | Maps To | Branch | Domain |
|--------------------|---------|--------|--------|
| Preview | Development | `develop`, PRs | `dev.mediancode.com` |
| Production | Production | `main` | `app.mediancode.com` |

> **Note:** Ignore Vercel's "Development" environment - it's for local `vercel dev` which we don't use.

### Clerk (Authentication)

| Clerk Instance | Maps To |
|----------------|---------|
| Development | Development |
| Production | Production |

### Railway (API Backend)

| Railway Service/Environment | Maps To |
|-----------------------------|---------|
| Dev service | Development |
| Prod service | Production |

### GitHub

| Branch | Maps To | Deploys To |
|--------|---------|------------|
| `develop` | Development | `dev.mediancode.com` |
| `main` | Production | `app.mediancode.com` |

## Local Development

Local development does not require environment variables for the API URL - it defaults to `http://localhost:8000/v1`.

```bash
# .env.local (optional overrides)
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Configuration Checklist

When setting up a new service or updating configuration:

- [ ] **Vercel**: Set `PUBLIC_API_BASE_URL` for Preview and Production environments
- [ ] **Clerk**: Ensure Development and Production instances have correct redirect URLs
- [ ] **Railway**: Ensure CORS allows `dev.mediancode.com` (dev) and `app.mediancode.com` (prod)
- [ ] **GitHub**: Branch protection on `main`, deploy workflows for both branches

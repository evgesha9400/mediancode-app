# Operational Configuration Contract

This document is the public, value-free inventory of Median Code operational
configuration. The machine-readable companion is
`config/operational-settings.json`; `make config.check` verifies that it stays
aligned with application settings, frontend public variables, GitHub workflow
references, environment examples, and this document.

This repository is public. It records names, purpose, scope, ownership,
injection and verification only. It must never contain secret values, account
recovery details, private keys, database contents, production user data, or
copies of provider sessions.

## Classification

| Classification | Meaning |
| --- | --- |
| Secret | Grants access or contains credentials; store only in an approved secret control plane. |
| Sensitive | Not necessarily a password, but keep it in a masked secret field because disclosure provides useful identity or access metadata. |
| Public configuration | Safe to expose, but must still match the intended environment. |
| Public client configuration | Deliberately shipped to browser code; never treat it as an authorization secret. |
| Non-secret path | Points to a mounted secret file but does not contain the secret. |
| Destructive configuration | Not a credential, but unsafe to enable as routine configuration. |
| Automatic secret | Created for a single CI job by its provider; do not recover or copy it manually. |

## Environment map

| Environment | Branch | Frontend | API | Clerk | Host stack |
| --- | --- | --- | --- | --- | --- |
| Local | any | `http://localhost:5173` | `http://localhost:8001` | Clerk development instance | Local process and Docker PostgreSQL |
| Development | `develop` | `https://dev.mediancode.com` | `https://api-dev.mediancode.com` | Clerk development instance | Mac development stack |
| Production | `main` | `https://mediancode.com` | `https://api.mediancode.com` | Clerk production instance | Mac production stack |

Development and production values must never be exchanged merely because they
share a variable name.

## Backend runtime settings

| Name | Classification | Required | Purpose and authority |
| --- | --- | --- | --- |
| `DATABASE_URL` | Secret | Yes | Async PostgreSQL connection URL. Local developers set it in an ignored environment file; CI creates it for the job; the Mac entrypoint derives it from the mounted PostgreSQL password. |
| `CLERK_FRONTEND_API_URL` | Public configuration | Yes | Issuer and JWKS base URL from the matching Clerk instance. |
| `CLERK_SECRET_KEY` | Secret | Required for profile synchronization and authenticated test setup | Comes from the matching Clerk instance. Local use is untracked; deployed use is a mounted host secret; CI uses a GitHub secret. |
| `CLERK_JWT_AUDIENCE` | Public configuration | No | Expected JWT audience when audience validation is enabled. Empty means no audience check. |
| `SYSTEM_NAMESPACE_ID` | Public configuration | Yes | Stable UUID for built-in seed data. It must remain identical across environments unless a reviewed data migration changes the contract. |
| `FRONTEND_URL` | Public configuration | Yes | Exact allowed frontend origin for CORS. |
| `ENVIRONMENT` | Non-secret | Yes | `development` or `production`; controls production-only behavior such as hiding API docs. |
| `BETA_MODE` | Non-secret | Yes | Enables or bypasses generation limits according to product policy. |
| `FREE_GENERATION_LIMIT` | Non-secret | Required when beta mode is disabled | Monthly generation allowance. |

The backend entrypoint also understands these container interfaces:

| Name | Classification | Purpose |
| --- | --- | --- |
| `DATABASE_URL_FILE` | Non-secret path | Optional mounted file containing the complete database URL. |
| `CLERK_SECRET_KEY_FILE` | Non-secret path | Mounted Clerk secret file used on the Mac. |
| `POSTGRES_PASSWORD_FILE` | Non-secret path | Mounted PostgreSQL password file used to derive `DATABASE_URL`. |
| `POSTGRES_USER` | Non-secret | Database username used during URL construction. |
| `POSTGRES_HOST` | Non-secret | Compose database service hostname. |
| `POSTGRES_PORT` | Non-secret | Database service port. |
| `POSTGRES_DB` | Non-secret | Database name. |
| `PORT` | Non-secret | Backend listening port; the production container defaults to 8080. |
| `DB_RESET` | Destructive configuration | When `true`, drops and recreates the public schema before migrations. It must never be enabled as persistent development or production configuration. Use only for an explicitly approved disposable-data reset. |

## Frontend and E2E settings

| Name | Classification | Scope and authority |
| --- | --- | --- |
| `PUBLIC_API_BASE_URL` | Public client configuration | Local API URL or the matching development/production public API `/v1` URL. GitHub and Vercel own deployed values. |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Public client configuration | Publishable key from the matching Clerk instance. It is safe for browser delivery but must not be confused with the secret key. |
| `PUBLIC_CLERK_MOCK_MODE` | Test-only | Test runner switch. It must be false or absent from deployed builds. |
| `E2E_TEST_USER_EMAIL` | Sensitive | Dedicated Clerk development test identity, stored locally in an ignored environment or as a GitHub secret. Do not use a personal or production user. |
| `E2E_TEST_USER_PASSWORD` | Secret | Password for the dedicated development test identity. |
| `E2E_ACTION_DELAY` | Non-secret | Optional test pacing value in milliseconds. |
| `PLAYWRIGHT_BASE_URL` | Non-secret | Frontend target for Playwright. |
| `PLAYWRIGHT_TEST_PORT` | Non-secret | Optional local managed-server port override. |
| `SEED_USER_EMAIL` | Sensitive | Explicit operator input for backend seed commands. It must target the intended Clerk environment and must never have a committed personal default. |

## GitHub Actions deployment inputs

GitHub environment-scoped values are preferred for anything that differs
between development and production. Repository-level test values must target
development only.

| Name | GitHub kind | Purpose |
| --- | --- | --- |
| `ENABLE_MAC_SERVER_DEPLOY` | Environment variable | Explicit backend deployment gate. |
| `TS_OAUTH_CLIENT_ID` | Environment secret | Tailscale federated CI identity metadata. |
| `TS_AUDIENCE` | Environment secret | Audience for the Tailscale trust credential. |
| `MAC_SERVER_DEPLOY_KEY` | Environment secret | Dedicated restricted SSH private key. The server retains only its public half with a forced command. |
| `MAC_SERVER_SSH_KNOWN_HOSTS` | Environment variable | Verified SSH public host-key line. Replace it only after independently confirming an intentional host-key change. |
| `ENABLE_VERCEL_DEPLOY` | Environment variable | Explicit frontend deployment gate. |
| `VERCEL_TOKEN` | Environment secret | Vercel deployment credential. |
| `VERCEL_ORG_ID` | Environment variable | Non-secret Vercel ownership identifier. |
| `VERCEL_PROJECT_ID` | Environment variable | Non-secret Vercel project identifier. |
| `PUBLIC_API_BASE_URL` | Repository or environment variable | Development value for shared E2E jobs; matching value for deployment. |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Repository or environment variable | Development value for tests; matching environment value for deployment. |
| `CLERK_SECRET_KEY` | Repository secret | Development Clerk key used only by E2E setup. Runtime copies remain host-managed. |
| `E2E_TEST_USER_EMAIL` | Repository secret | Dedicated development test identity. |
| `E2E_TEST_USER_PASSWORD` | Repository secret | Dedicated development test password. |
| `GITHUB_TOKEN` | Automatic secret | Job-scoped token used to publish the backend image to GHCR. GitHub creates it; do not create or back it up. |

## External service registry

| Service | Role | Configuration source | Recovery boundary |
| --- | --- | --- | --- |
| GitHub | Source, CI/CD, environments and workflow credentials | This repository plus GitHub settings | Repository files are authoritative for code and workflow shape; settings must be reconstructed from this contract and an approved secret source. |
| GHCR | Immutable backend images and attestations | Backend GitHub workflow | Rebuild an image from its Git commit; do not back up local Docker images as source. |
| Clerk | Authentication, JWT issuer and user identity | Separate development and production instances | Restore access to the existing instances or execute an explicit identity migration. Recreating users with unrelated IDs does not preserve application ownership. |
| Vercel | Frontend build and hosting | Project settings plus GitHub deployment workflow | Restore project linkage, environment variables and domains; direct Git deployment remains disabled. |
| Mac server | Backend and PostgreSQL runtime | Private `server-admin` repository | This public repository owns the application contract; the private platform repository owns Compose, host ports, secret files, ingress and restart recovery. |
| PostgreSQL | Persistent application data | Mac host volumes and separately approved backup source | Application code and migrations are in Git; data must be restored separately and verified before production traffic. |
| Cloudflare and DNS | Public API routing and domains | Private platform/provider configuration | Application docs declare expected hostnames; provider credentials and tunnel identity stay outside this repository. |
| Tailscale | Private deployment and observability transport | Private tailnet policy and GitHub trust credential | Re-enrol machines and recreate CI trust; never copy a machine node identity. |
| Dozzle | Read-only container logs and short-lived statistics | Private Mac/Tailscale service | Optional observability only; an unavailable dashboard does not prove the application is down. |

## Safe installation and verification

1. Copy only the relevant `.env.*.example` to an ignored local file.
2. Obtain secret values directly from the declared control plane or approved
   secret recovery source.
3. Never place deployed secrets in Compose environment files, command
   arguments, Docker images, documentation, issues, pull requests, or chat.
4. Verify presence through the provider UI, a permission check, or a bounded
   health/E2E test. Do not print the value.
5. Run `make config.check` after any configuration change.

Backend seed commands require the identity explicitly for each invocation, for
example `SEED_USER_EMAIL=<intended-development-user> make seed-dev`. Do not put
the address in a tracked Makefile or documentation example.

## Rotation protocol

For a credential rotation:

1. Identify every consumer in this contract.
2. Create the replacement without revoking the working credential.
3. Install it in one environment at a time, beginning with development.
4. Verify health, authentication and the relevant CI/deployment path.
5. Promote the replacement to production and verify again.
6. Revoke the old credential only after every consumer is confirmed migrated.
7. Update this contract if the source, scope or injection mechanism changed.
8. Remove obsolete variables, files and temporary credentials through the
   autophagy pass.

If a secret is exposed, stop using ordinary rotation sequencing: revoke or
contain it immediately, inspect access logs, replace every affected consumer,
and record only sanitized incident findings.

## Alignment rule

Any change to application settings, frontend public environment reads,
environment examples, GitHub workflow variables/secrets, provider ownership or
runtime injection must update this document and
`config/operational-settings.json` in the same commit. A new variable is not
complete until `make config.check` passes.

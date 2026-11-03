# Mac Server Deployment

GitHub Actions builds the backend for `linux/amd64`, publishes it to GHCR, and
asks the trusted deployment helper on `mac-server` to deploy the resulting
immutable image digest.

The host-owned Compose definition, secrets, state and rollback helper live in
the separate `server-admin` platform repository. Application commits cannot
silently change host mounts, privileges or exposed ports.

## Environments

| Branch | Environment | Host API port | Frontend |
| --- | --- | ---: | --- |
| `develop` | development | `127.0.0.1:18081` | Vercel preview/development |
| `main` | production | `127.0.0.1:18080` | Vercel production |

The loopback ports are not public ingress. A separately reviewed edge route
must proxy the required public hostnames after the private deployments pass
health, restart and recovery tests.

## Required GitHub configuration

The deployment job is gated by the repository variable
`ENABLE_MAC_SERVER_DEPLOY=true`.

Repository secrets:

- `TS_OAUTH_CLIENT_ID` — Tailscale federated-identity client ID.
- `TS_AUDIENCE` — Tailscale federated-identity audience.
- `MAC_SERVER_DEPLOY_KEY` — dedicated restricted SSH private key.

Repository variable:

- `MAC_SERVER_SSH_KNOWN_HOSTS` — pinned public SSH host-key line for
  `mac-server.tailf57fcc.ts.net`.

The Tailscale identity must use `tag:ci` and be permitted to reach only
`mac-server` TCP port 22. The SSH public key on the server must be restricted
to the platform-owned, service-bound deployment receiver:

```text
restrict,command="/Users/evgesha/server-admin/scripts/receive-deploy.sh mediancode-app"
```

Although the host control plane supports multiple registered services, this
key can request deployments only for `mediancode-app`. The repository sends the
same minimal `deploy <environment> <image@digest>` command; the trusted host
catalog supplies the Compose definition, ports, secrets, health checks and
rollback policy.

The frontend workflow also uses these settings in the matching `development`
and `production` GitHub environments:

- variable `ENABLE_VERCEL_DEPLOY=true`;
- secret `VERCEL_TOKEN`;
- variable `VERCEL_ORG_ID`;
- variable `VERCEL_PROJECT_ID`.

The Vercel project retains its Clerk and public API variables. Direct Vercel
Git deployment is disabled so a push cannot bypass GitHub's test gate.

## Image and build-cache contract

The deployment helper accepts only:

```text
ghcr.io/evgesha9400/mediancode-backend@sha256:<64 lowercase hex characters>
```

- `backend/deploy/docker/Dockerfile` starts with `# syntax=docker/dockerfile:1`, creates the non-root `app` user (`10001:10001`), and installs Poetry and lockfile dependencies (`poetry install --only main --no-root --no-interaction --no-ansi`) using BuildKit cache mounts (`--mount=type=cache,target=/root/.cache/pip` and `--mount=type=cache,target=/root/.cache/pypoetry`) before `COPY src/ ./src/` so source edits do not invalidate dependency layers.
- `.github/workflows/backend-ci.yml` caches `~/.cache/pypoetry`, `~/.cache/pip`, and `~/.cache/pre-commit` in the test job, builds native `linux/amd64` images on `ubuntu-latest` with GitHub Actions BuildKit layer caching (`cache-from: type=gha`, `cache-to: type=gha,mode=max`), and deploys the verified digest over ephemeral OIDC Tailscale (`tag:ci`) to `mac-server`.

The GHCR package must either be public or the host must have a separately
approved read-only package credential. Public visibility is preferred because
the source repository is public and the image contains no runtime secrets.

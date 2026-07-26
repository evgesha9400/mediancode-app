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
to the platform-owned deployment receiver.

The frontend workflow also uses these settings in the matching `development`
and `production` GitHub environments:

- variable `ENABLE_VERCEL_DEPLOY=true`;
- secret `VERCEL_TOKEN`;
- variable `VERCEL_ORG_ID`;
- variable `VERCEL_PROJECT_ID`.

The Vercel project retains its Clerk and public API variables. Direct Vercel
Git deployment is disabled so a push cannot bypass GitHub's test gate.

## Image contract

The deployment helper accepts only:

```text
ghcr.io/evgesha9400/mediancode-backend@sha256:<64 lowercase hex characters>
```

The GHCR package must either be public or the host must have a separately
approved read-only package credential. Public visibility is preferred because
the source repository is public and the image contains no runtime secrets.

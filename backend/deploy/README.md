# Deployment

This directory contains deployment configurations for different providers.

## Providers

| Provider | Directory / Docs | Notes |
|----------|------------------|-------|
| **Mac server** | [`mac-server/README.md`](mac-server/README.md) | Active GitHub Actions, GHCR and restricted Tailscale/SSH deployment |
| **AWS** | `aws/` | Full IaC, ECS Fargate |

## Docker Layout

| Path | Purpose |
|------|---------|
| `docker/Dockerfile` | Hardened backend production image used by CI and local verification |
| `local/docker-compose.yml` | Local PostgreSQL only; backend runs natively for iteration |

## Quick Start

### Mac server

See [`mac-server/README.md`](mac-server/README.md).

The host-owned Compose definition lives in the separate `server-admin`
repository so an application commit cannot silently expand host privileges,
mounts, or ports.

### AWS

```bash
make cdk-install
cd deploy/aws && cdk bootstrap
make cdk-deploy
```

## Adding New Providers

Create a new directory (e.g., `render/`, `fly/`) with:
1. Provider-specific config file
2. README with setup instructions
3. Makefile targets in root `Makefile`

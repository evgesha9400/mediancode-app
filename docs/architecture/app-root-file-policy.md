# App Root File Policy

App roots expose only files that tools or humans need immediately.

| Location | Belongs there |
|----------|---------------|
| `backend/`, `frontend/` | `README.md`, package manifests, lockfiles, env examples, and tool files that must stay discoverable at app root |
| `*/config/` | Tool config that supports explicit `--config`, `--ignore-path`, or `--ruleset` flags |
| `*/docs/` | App-specific documentation and diagrams |
| `*/deploy/` | Deploy implementation, provider docs, Dockerfiles, and local compose files |
| repo root | Cross-app docs, value-free operational registry and validator, root agent guidance, root `Makefile`, `.githooks/`, CI, and `api-spec.yaml` |

Skipped moves:

- `frontend/svelte.config.js`, `frontend/vite.config.ts`, `frontend/vitest.config.ts`, `frontend/tsconfig*.json`, `frontend/postcss.config.js`, `frontend/tailwind.config.js`, `frontend/vercel.json`, and `frontend/bunfig.toml` stay at app root because those tools conventionally discover config there.
- `backend/AGENTS.md` and `backend/CLAUDE.md` stay at app root because agent tooling discovers per-app guidance there.
- `frontend/.editorconfig` stays at app root because editor discovery relies on parent traversal.

Dependency manager decision:

- Backend uses Poetry.
- CI, `backend/Makefile`, Docker build, docs, and `poetry.lock` already use Poetry first-class.
- `backend/uv.lock` was removed because no CI, Makefile, Docker, or docs path used uv as the active backend manager.

# AGENTS.md — mediancode-app (root)

Cross-cutting guidance for Codex / agentic tools. Mirrors `CLAUDE.md` at this level — see that file for the canonical content. Per-app rules live in `backend/AGENTS.md`.

## Naming and decision precision

When designing modules and interfaces, name the narrow question the module owns instead of inventing broad taxonomies. Prefer straightforward domain wording that lets callers understand the decision without learning extra categories. For example, an Endpoint Query Semantics module should expose query availability because it owns filter and pagination applicability; it should not classify the whole Endpoint operation unless the module truly owns that operation.

### Naming decomposition rule

Before naming any module, type, function, or returned object, decompose the name into the concrete question it answers.

Required process:

1. Write the caller question in plain English.
2. Name the module or function after that question.
3. Reject names that describe a broad domain area, implementation category, or architecture role when a narrower question exists.
4. Prefer verbs like `get`, `can`, `is`, `build`, `prepare`, `format`, `validate`, and `apply` only when they match the caller question.
5. Use abstract nouns like `semantics`, `context`, `manager`, `processor`, `handler`, `workflow`, `engine`, `state`, and `resolver` only after proving the caller question cannot be named more concretely.

Examples:

- Bad: `resolveEndpointQuerySemantics`
- Better question: "Can this Endpoint have query parameters?"
- Better name: `getEndpointQueryAvailability`

- Bad: `EndpointSemanticsContext`
- Better question: "Which Object and Field Members can this Endpoint reference?"
- Better name: `EndpointTarget`

- Bad: `prepareEndpointCommand`
- Better question: "Can this Endpoint be saved, and what sanitized Endpoint should be saved?"
- Better name: `prepareEndpointSave`

Enforcement:

- In code review and implementation, include the caller question next to any new exported name.
- If the name contains `semantics`, `context`, `manager`, `processor`, `handler`, `workflow`, `engine`, `state`, or `resolver`, pause and propose at least two question-based alternatives before writing code.

## E2E verification rule

For any change that touches or can affect frontend behavior, run the full Playwright E2E suite before handing off: `cd frontend && bun run test:e2e`. Do not substitute a narrower smoke, CRUD, or file-filtered command for final verification. If the full E2E command cannot execute because required external credentials or services are unavailable, still run the command, capture the failure, and report the exact blocker and missing environment variables in the final response.

## Runtime observability

The project-scoped `dozzle` MCP server provides read-only access to the Docker
runtime on the private Mac server. It is optional and is reachable only from an
authorized Tailscale device.

When diagnosing a deployed environment:

1. Identify the Compose project, environment, and container role before
   requesting logs.
2. Use `search_container_logs` with a narrow term and time range before using
   `get_container_logs`.
3. Keep log and statistics requests bounded to the smallest useful result.
4. Fetch a broader recent log range only when targeted search is insufficient.
5. Treat an unavailable Dozzle endpoint as an observability-path failure, not
   proof that the application is unavailable.
6. Never reproduce credentials, tokens, personal information, or other secrets
   found in runtime logs.

## Operational configuration and recovery alignment

`docs/operations/CONFIGURATION.md` and
`config/operational-settings.json` are the public, value-free configuration
contract. `docs/operations/RECOVERY.md` is the application recovery protocol.

Whenever a change adds, removes, renames or changes the scope, source,
injection, verification or rotation of a setting, secret, external service,
deployment step, database migration or recovery dependency:

1. update the machine-readable contract, operations documentation, environment
   examples and affected workflow in the same change;
2. run `make config.check`;
3. exercise the affected recovery or deployment check rather than documenting
   an assumption;
4. remove obsolete variables, instructions, provider artifacts and helpers;
5. never commit a secret value, personal test identity, account recovery detail
   or private provider session.

Anything discovered missing or incorrect during recovery is a repository
defect. Apply the smallest safe correction, verify it, and align all affected
sources of truth before considering recovery complete.

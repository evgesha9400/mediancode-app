# Mock API Plan

Selections: FastAPI with built-in Swagger; Clerk Bearer JWT for user scoping; JSON fixtures on disk as the mock data source; single JSON schema as source of truth; read-only list/detail endpoints for types, validators, fields, and objects; include test strategy.

## Steps
1) Project setup (Poetry)
   - Create `mock_api/pyproject.toml` via `poetry init` with FastAPI/uvicorn/pydantic/httpx/pyjwt/cryptography as deps; add pytest/pytest-cov as dev deps.
   - Structure: `mock_api/src/mock_api/` for app code, `mock_api/tests/` mirroring src with `test_` prefixes.
   - Add `poetry run` scripts for `uvicorn mock_api.main:app --reload` and tests.

2) Schema + fixtures (single source of truth)
   - Add `mock_api/src/mock_api/schema/definitions.json`: define shapes for type, validator, field, object (including defaults, optional fields, relationships, owner/account id), plus enums/constants reused across resources.
   - Add `mock_api/src/mock_api/fixtures/data.json`: seed arrays for types/validators/fields/objects with owner/account ids; keep small, deterministic samples; ensure defaults populate missing optional fields.
   - Add lightweight helper to validate fixtures against schema on startup; fail fast with clear errors.

3) Models and defaults
   - Create Pydantic models matching schema (Types/Validators/Fields/Objects) with default values mirroring `definitions.json`; include `owner_id`/`account_id` for scoping.
   - Add mapper that loads fixture records into models, applies defaults, and stores normalized data (no duplication across resources).

4) Auth integration (Clerk)
   - Configure env vars: `CLERK_JWKS_URL` (from Clerk), `CLERK_ISSUER`.
   - Implement dependency that extracts Bearer token, fetches/caches JWKS, verifies signature/issuer/audience, and returns `user_id`/`account_id` claims.
   - Add global security scheme to FastAPI/OpenAPI so Swagger requires Bearer; include example token placeholder.

5) Data access layer
   - Implement in-memory store populated at startup from fixtures; index by resource name and by `owner_id`/`account_id` for quick filtered reads.
   - Provide read helpers: `list_<resource>(owner_id/account_id)` and `get_<resource>(id, owner_id/account_id)` that enforce scoping.
   - Provide utility to inject example responses per endpoint from fixtures (so editing fixtures updates Swagger examples automatically).

6) API routes (read-only)
   - Prefix: `/api/mock/`.
   - For each of `types`, `validators`, `fields`, `objects`: implement `GET /` (list with pagination/query params) and `GET /{id}` (detail); always scope to authenticated user/account.
   - Support optional query params (e.g., `namespace`, `search`, `limit/offset`) if already present elsewhere; enforce defaults and validation via FastAPI.
   - Responses use Pydantic models; include examples drawn from fixtures; ensure 404 for missing/unauthorized access.

7) Swagger/OpenAPI enrichment
   - Tag routes per resource; add descriptions referencing default data behavior.
   - Add reusable response examples via `example`/`examples` using fixture samples; document filtering rules and default values per schema.
   - Include auth doc (Bearer JWT via Clerk) and note that data is scoped by `owner_id`/`account_id` claims.

8) Tests (pytest)
   - Mirror structure: `mock_api/tests/test_schema/`, `test_fixtures/`, `test_routes/`, `test_auth/` to match src layout.
   - Coverage: fixture validation, default application, auth dependency (valid/invalid/missing token), scoping (user only sees own data), list/detail responses, OpenAPI schema presence of security and examples.
   - Commands: `poetry run pytest -q`; add `--cov=mock_api` if desired.

9) Run/verify
   - Start server: `poetry run uvicorn mock_api.main:app --reload`.
   - Visit Swagger at `/docs` to confirm examples, auth scheme, and per-user data filtering messaging.
   - Optionally add `poetry run python -m httpx` smoke script to hit list/detail endpoints with/without auth for quick regression checks.

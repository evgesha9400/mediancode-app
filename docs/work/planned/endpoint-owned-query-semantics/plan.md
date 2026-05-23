# Endpoint-Owned Query Semantics Refactor Plan

## Context

This plan implements [ADR 0002](../../adr/0002-endpoint-owned-query-semantics.md): Endpoints own their filter and pagination facts directly. Path parameters and query parameters reference target Object Field Members, not reusable query Objects or global Field definitions.

The refactor follows the Architecture Transition Rule in `docs/philosophy/PHILOSOPHY.md`: complete the transition in one coherent pass, replace all call sites, move tests to the new interface, and delete the duplicate implementation immediately. Do not keep internal compatibility shims, parallel code paths, or half-migrated seams.

## Target Contract

```text
FieldMember
  replaces FieldMember everywhere
  memberType = "field"

Endpoint
  targetObjectId
  pathParams: [{ name, fieldMemberId }]
  queryParams: [{ name, fieldMemberId, operator, required }]
  pagination
```

## Phase 0: Discovery References

- Architecture transition rule: `docs/philosophy/PHILOSOPHY.md`
- Domain terms: `CONTEXT.md`
- Endpoint-owned decision: `docs/adr/0002-endpoint-owned-query-semantics.md`
- Current member model: `backend/src/api/models/members.py`
- Current Endpoint model/schema/service: `backend/src/api/models/database.py`, `backend/src/api/schemas/endpoint.py`, `backend/src/api/services/endpoint.py`
- Current snapshot/generation path: `backend/src/api/services/api_design_snapshot.py`, `backend/src/api/services/api_craft_input.py`, `backend/src/api_craft/prepared_views.py`
- Current frontend Endpoint drift: `frontend/src/lib/types/index.ts`, `frontend/src/lib/api/endpoints.ts`, `frontend/src/lib/stores/endpointsConfig.svelte.ts`

## Phase 1: Rename Field Member To Field Member

Rename backend classes, schemas, services, tests, frontend types, UI text, and docs from `FieldMember` / `scalar` to `FieldMember` / `field`.

Main files:

- `backend/src/api/models/members.py`
- `backend/src/api/schemas/members.py`
- `backend/src/api/services/object_membership.py`
- `backend/tests/test_api/test_services/test_object_membership.py`
- `frontend/src/lib/types/index.ts`
- Object form and object member UI files under `frontend/src/lib/components/form/`

Migration work:

- Rewrite existing migrations coherently so `field_members` becomes `field_members`.
- Change the object member discriminator value from `scalar` to `field`.

Verification:

```bash
rg "FieldMember|Field Member|field_members|memberType.*legacy-field|member_type.*legacy-field" backend frontend docs
```

Anti-pattern guard:

- Do not keep `scalar` aliases, compatibility enum values, or dual `scalar`/`field` support.

## Phase 2: Rewrite Endpoint Persistence

Replace the legacy endpoint parameter JSON storage, query object reference, and endpoint object reference with first-class target and parameter storage.

Target model shape:

```text
api_endpoints.target_object_id
api_endpoints.pagination

endpoint_path_params:
  endpoint_id
  position
  name
  field_member_id

endpoint_query_params:
  endpoint_id
  position
  name
  field_member_id
  operator
  required
```

Main files:

- `backend/src/api/models/database.py`
- `backend/src/api/migrations/versions/*.py`

Verification:

```bash
rg "path_params|query_params_object_id|object_id" backend/src/api/models backend/src/api/migrations
```

Anti-pattern guard:

- No JSONB Endpoint parameters.
- No query Object path.
- No compatibility fields.

## Phase 3: Rewrite Endpoint Schemas And Service

Replace Endpoint schemas with:

```python
PathParamSchema(name, field_member_id)
QueryParamSchema(name, field_member_id, operator, required=False)
ApiEndpointCreate/Update/Response(... target_object_id, path_params, query_params, pagination)
```

Service validation:

- Path token names exactly match `pathParams`.
- Every param Field Member belongs to `targetObjectId`.
- Query operator is compatible with the Field type behind the Field Member.
- DELETE has no query params.
- Pagination is valid only where supported by generated target behavior.
- Endpoint has one target Object for this refactor.

Main files:

- `backend/src/api/schemas/endpoint.py`
- `backend/src/api/services/endpoint.py`
- `backend/src/api/routers/endpoints.py`

Tests:

- `backend/tests/test_api/test_services/test_resource_responses.py`
- Endpoint HTTP lifecycle tests under `backend/tests/http/`

Anti-pattern guard:

- No `endpoint query object ID`.
- No `fieldId` in Endpoint params.
- No ambiguous `endpoint object ID`.

## Phase 4: Rewrite API Design Snapshot

Rename snapshot `APIDesignFieldMember` to `APIDesignFieldMember`. Build Endpoint path/query params from endpoint parameter rows and Field Member references, not query Objects or path JSONB.

Snapshot Endpoint param facts should include:

- query/path param name
- Field Member name
- Field type
- Field description
- operator
- required

Main files:

- `backend/src/api/services/api_design_snapshot.py`
- `backend/src/api/services/generation.py`

Tests:

- `backend/tests/test_api/test_services/test_api_design_snapshot.py`

Anti-pattern guard:

- No silent fallback to `"str"` for missing param fields. Missing references should fail validation before snapshot assembly.

## Phase 5: Rewrite FastAPI Generation Adapter

Map API Design Snapshot Endpoint Query Semantics into `api_craft` input. Preserve `required`.

Recommended cleanup:

- Rename `InputQueryParam.optional` and `PreparedQueryParam.optional` to `required` to avoid inverted language.
- Generate optional FastAPI query params when `required=False`.
- Generate required FastAPI query params when `required=True`.

Main files:

- `backend/src/api/services/api_craft_input.py`
- `backend/src/api_craft/models/input.py`
- `backend/src/api_craft/prepared_views.py`
- `backend/src/api_craft/templates/views.mako`
- `backend/src/api_craft/templates/query.mako`

Tests:

- `backend/tests/test_api/test_services/test_api_craft_input.py`
- `backend/tests/test_api_craft/test_prepared_views.py`
- Relevant codegen tests under `backend/tests/codegen/`

Anti-pattern guard:

- Do not derive query params from Object Membership.
- Do not force every filter optional in prepare; use `required`.

## Phase 6: Rewrite Frontend Endpoint Flow

Frontend types and API adapter should match the backend contract:

```ts
PathParam { name; fieldMemberId }
QueryParam { name; fieldMemberId; operator; required }
ApiEndpoint { targetObjectId; pathParams; queryParams; pagination }
FieldMember { memberType: 'field' }
```

Update UI to select Field Members from the target Object, then display Field metadata by joining through the reusable Field.

Main files:

- `frontend/src/lib/types/index.ts`
- `frontend/src/lib/api/endpoints.ts`
- `frontend/src/lib/stores/endpointsConfig.svelte.ts`
- `frontend/src/lib/stores/apiDetailState.svelte.ts`
- `frontend/src/lib/domain/paramInference.ts`
- `frontend/src/lib/components/api-generator/QueryParametersEditor.svelte`
- `frontend/src/lib/components/api-generator/QueryParamRow.svelte`

Tests:

- `frontend/tests/unit/lib/api/endpoints.test.ts`
- `frontend/tests/unit/lib/domain/paramInference.test.ts`
- Relevant API generator component tests under `frontend/tests/unit/lib/components/api-generator/`

Anti-pattern guard:

- No `endpoint query object ID`.
- No `field` string param references.
- No `fieldId` Endpoint params.

## Phase 7: Contract, Spec, And Fixtures

Regenerate `api-spec.yaml` after backend schema changes. Update seed fixtures and Shop contract data to use Field Member IDs for params.

Main files:

- `api-spec.yaml`
- `backend/tests/support/shop_contract.py`
- `backend/tests/seeding/shop_data.py`
- frontend fixtures under `frontend/tests/fixtures/`

Verification:

```bash
cd backend
poetry run python -c "import yaml; from api.main import app; print(yaml.safe_dump(app.openapi(), sort_keys=False))" > ../api-spec.yaml
poetry run pytest tests/contract/test_openapi_spec.py
```

## Phase 8: Full Verification

Backend:

```bash
cd backend
poetry run pytest --cov=src --cov-report=term-missing
poetry run mypy src/
```

Frontend:

```bash
cd frontend
bun run check
bun run test:unit
bun run lint:consistency
bun run test:fixtures:validate
```

Final grep guards:

```bash
rg "legacy endpoint parameter JSON|endpoint query object ID|endpoint object ID|legacy field path params" .
```

## Notes

- DTO-style Endpoints with separate request, response, and target Objects are a valid future direction, but are explicitly out of scope for this refactor.
- Reusable filter definitions should be introduced only through a future architecture decision backed by real reuse requirements.

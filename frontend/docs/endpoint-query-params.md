# Endpoint Query Parameter Anomaly

## Status: UNVERIFIED — do not change `endpoints.ts` until resolved

## Problem

The `/v1/endpoints` list endpoint has a query parameter mismatch between three layers:

| Layer              | Query key used  | Source                                |
|--------------------|-----------------|---------------------------------------|
| OpenAPI spec       | `namespace_id`  | `api-spec.yaml` line ~698             |
| Frontend API client| `apiId`         | `src/lib/api/endpoints.ts` line 74    |
| E2E test client    | `api_id`        | `tests/helpers/api-client.ts` line 163|

The OpenAPI spec defines **only** `namespace_id` as the accepted query parameter for
`GET /v1/endpoints`. Neither `api_id` nor `apiId` appear in the spec.

However, the frontend sends `?apiId=<uuid>` and the E2E client sends `?api_id=<uuid>`.
Both of these filter by parent API rather than by namespace.

## Questions to resolve

1. Does the backend accept `api_id` as an undocumented query parameter?
2. Is filtering by `api_id` the intended behavior for the endpoints list?
3. Should the spec be updated to document `api_id`, or should the frontend use `namespace_id`?

## Decision

**Pending backend verification.** Until verified:

- `src/lib/api/endpoints.ts` keeps its current `apiId` query key unchanged
- `tests/helpers/api-client.ts` keeps its current `api_id` query key unchanged
- All other API services (`apis.ts`, `fields.ts`, `objects.ts`, `fieldConstraints.ts`)
  have been aligned to use `namespace_id`

## How to verify

```bash
# Against the dev backend, with a valid JWT:
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.dev.mediancode.com/v1/endpoints?api_id=<some-api-uuid>"

# Compare with namespace_id:
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.dev.mediancode.com/v1/endpoints?namespace_id=<some-namespace-uuid>"
```

Check which returns filtered results and which returns all endpoints.

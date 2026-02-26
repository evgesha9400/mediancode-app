# Frontend Enum Enforcement

> **For Claude:** This is a prompt describing backend changes that require frontend enforcement. Read the OpenAPI spec at the backend URL to confirm the exact `enum` arrays, then implement accordingly.

## Context

The backend now enforces ENUM-like fields using `Literal` types. The OpenAPI spec auto-generates `enum` arrays for these fields. The frontend must read these enum values and use them for dropdowns, client-side validation, and form controls.

## Affected Endpoints and Fields

### 1. Endpoints — `method`

**Allowed values:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`

| Route | Field | Direction | Notes |
|---|---|---|---|
| `POST /v1/endpoints` | `method` | Request body | Required |
| `PUT /v1/endpoints/{id}` | `method` | Request body | Optional (partial update) |
| `GET /v1/endpoints` | `method` | Response array | Each item has `method` |
| `GET /v1/endpoints/{id}` | `method` | Response | |

**Frontend action:** Render `method` as a dropdown/select populated from the OpenAPI `enum` array. Do not allow free-text input.

### 2. Endpoints — `responseShape`

**Allowed values:** `object`, `list`

| Route | Field | Direction | Notes |
|---|---|---|---|
| `POST /v1/endpoints` | `responseShape` | Request body | Required |
| `PUT /v1/endpoints/{id}` | `responseShape` | Request body | Optional |
| `GET /v1/endpoints` | `responseShape` | Response array | |
| `GET /v1/endpoints/{id}` | `responseShape` | Response | |

**Frontend action:** Render as a toggle or dropdown. Only two values — a segmented control or radio group may be more appropriate than a dropdown.

### 3. Fields — `container`

**Allowed values:** `List` (or `null`)

| Route | Field | Direction | Notes |
|---|---|---|---|
| `POST /v1/fields` | `container` | Request body | Optional, nullable |
| `PUT /v1/fields/{id}` | `container` | Request body | Optional, nullable |
| `GET /v1/fields` | `container` | Response array | |
| `GET /v1/fields/{id}` | `container` | Response | |

**Frontend action:** Render as a checkbox or toggle ("Is this a list?"). When checked, send `"List"`. When unchecked, send `null`. Currently only one container type exists.

### 4. Field Validator Templates — `mode`

**Allowed values:** `before`, `after`

| Route | Field | Direction | Notes |
|---|---|---|---|
| `GET /v1/field-validator-templates` | `mode` | Response array | Read-only catalogue |

**Frontend action:** Display the mode value. If the UI lets users pick a validator template, show its `mode` as a label or badge (e.g. "before" / "after"). No input control needed — this is read-only.

### 5. Model Validator Templates — `mode`

**Allowed values:** `before`, `after`

| Route | Field | Direction | Notes |
|---|---|---|---|
| `GET /v1/model-validator-templates` | `mode` | Response array | Read-only catalogue |

**Frontend action:** Same as field validator templates — display only.

## Implementation Approach

1. **Read enum values from OpenAPI spec** — The backend's `/openapi.json` endpoint now includes `enum` arrays for all fields listed above. Use these as the source of truth rather than hardcoding values.
2. **Validate on submit** — Before sending create/update requests, validate that enum fields contain allowed values. Show inline errors for invalid selections.
3. **Dropdowns and controls** — Replace any free-text inputs for these fields with constrained controls (select, radio, toggle, segmented control) populated from the enum arrays.
4. **Display in tables/lists** — When rendering these values in read contexts, consider using badges or styled labels to make enum values visually distinct.

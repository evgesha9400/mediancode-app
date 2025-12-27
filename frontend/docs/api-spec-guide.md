# API Specification Guide

This document explains the structure and purpose of `api-spec.yaml`.

## Overview

The OpenAPI specification defines the contract between the Median Code frontend and the code generation backend service. The backend is implemented in a separate repository.

## Endpoints

### POST /v1/generate

Generates a production-ready FastAPI application from the frontend API design.

**Request Body:** Complete API specification including:
- Metadata (title, version, description)
- Tags (for OpenAPI organization)
- Endpoints (methods, paths, parameters, request/response bodies)
- Objects (Pydantic model definitions)
- Fields (field definitions with types and validators)
- Validators (validation rules)

**Response:** Binary zip file containing:
- `main.py` - FastAPI application
- `models/` - Pydantic models
- `requirements.txt` - Dependencies
- `README.md` - Setup instructions

## Schema Alignment

All OpenAPI schemas directly correspond to TypeScript interfaces in the frontend:

| OpenAPI Schema | TypeScript Interface | Source File |
|---------------|---------------------|-------------|
| `ApiMetadata` | `ApiMetadata` | `/src/lib/types/index.ts` |
| `EndpointTag` | `EndpointTag` | `/src/lib/types/index.ts` |
| `ApiEndpoint` | `ApiEndpoint` | `/src/lib/types/index.ts` |
| `EndpointParameter` | `EndpointParameter` | `/src/lib/types/index.ts` |
| `ObjectDefinition` | `ObjectDefinition` | `/src/lib/types/index.ts` |
| `ObjectFieldReference` | `ObjectFieldReference` | `/src/lib/types/index.ts` |
| `Field` | `Field` | `/src/lib/stores/initialData.ts` |
| `FieldValidator` | `FieldValidator` | `/src/lib/stores/initialData.ts` |
| `ValidatorBase` | `ValidatorBase` | `/src/lib/stores/initialData.ts` |

## Authentication

All endpoints require Clerk JWT authentication via Bearer token in the Authorization header.

```
Authorization: Bearer <your-clerk-jwt-token>
```

## Server URLs

- **Development:** `https://api.dev.mediancode.com/v1`
- **Production:** `https://api.mediancode.com/v1`

## Validation

To validate the OpenAPI spec:

```bash
npx @apidevtools/swagger-cli validate api-spec.yaml
```

To view in Swagger UI:
1. Visit https://editor.swagger.io/
2. Upload `api-spec.yaml`

## Frontend Integration

The frontend gathers data from all stores and sends it to the `/generate` endpoint:

```typescript
const requestPayload = {
    metadata: get(apiMetadataStore),
    tags: get(tagsStore),
    endpoints: get(endpointsStore),
    objects: get(objectsStore),
    fields: get(fieldsStore),
    validators: get(validatorsStore)
};
```

The response is a binary zip file that the frontend will offer for download.

## Error Responses

The API returns standard error responses:

- **400 Bad Request:** Invalid request - validation errors in API specification
- **401 Unauthorized:** Invalid or missing Clerk JWT token
- **422 Unprocessable Entity:** Semantic errors in API specification (e.g., missing references)

Error response format:
```json
{
    "detail": "Error message describing what went wrong"
}
```

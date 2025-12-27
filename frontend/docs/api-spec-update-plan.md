# API Spec Update Implementation Plan

**Purpose:** Update the OpenAPI specification to document the new `/generate` endpoint that will generate complete FastAPI applications from the frontend API generator state.

**Context:** This is a **frontend-only repository**. The actual backend implementation will be done in a separate repository using this OpenAPI spec as the contract. This plan focuses solely on updating the documentation and removing the obsolete mock API.

---

## Overview

This plan includes:
1. Removing the `/mock_api/` directory and all related references
2. Updating `/api-spec.yaml` with new server URLs and the `/generate` endpoint
3. Documenting the complete request/response schemas based on the frontend state structure

---

## Phase 1: Remove Mock API Implementation

### Step 1.1: Delete Mock API Directory

**Action:** Remove the entire `/mock_api/` directory

**Location:** `/Users/evgesha/Documents/Projects/median-code/mock_api/`

**Rationale:** The mock API was a prototype implementation that is no longer needed. The new approach will use a separate backend repository.

---

### Step 1.2: Remove Mock API Scripts from package.json

**File:** `/Users/evgesha/Documents/Projects/median-code/package.json`

**Actions:**
1. Locate the `scripts` section
2. Remove the following scripts:
   - `"mock-api": "cd mock_api && PYTHONPATH=src poetry run uvicorn mock_api.main:app --reload --port 8000"`
   - `"kill-mock-api": "./scripts/kill-mock-api.sh"`

**Expected Result:** No references to mock API in npm scripts

---

### Step 1.3: Remove Mock API Bash Scripts

**Action:** Delete mock API utility scripts

**Files to delete:**
- `/Users/evgesha/Documents/Projects/median-code/scripts/kill-mock-api.sh` (if it exists)

**Note:** Check if the `/scripts/` directory contains any mock API-related files and remove them.

---

### Step 1.4: Update Documentation References

**Files to check and update:**

1. **`/Users/evgesha/Documents/Projects/median-code/CLAUDE.md`**
   - Remove any references to the mock API
   - Remove the mock API plan reference from the structure
   - Update project structure diagram if it includes mock_api

2. **`/Users/evgesha/Documents/Projects/median-code/README.md`**
   - Remove any mock API setup instructions
   - Remove mock API from project structure diagram

3. **`/Users/evgesha/Documents/Projects/median-code/docs/mock-api-plan.md`**
   - Delete this file entirely as it's no longer relevant

**Action:** Search for any remaining references to `mock_api` or `mock-api` across the codebase and documentation.

---

## Phase 2: Update OpenAPI Specification

### Step 2.1: Update Server URLs

**File:** `/Users/evgesha/Documents/Projects/median-code/api-spec.yaml`

**Current servers section (lines 47-51):**
```yaml
servers:
  - url: http://localhost:8000/api/mock
    description: Local development server
  - url: https://api.mediancode.com/api/mock
    description: Production server (placeholder)
```

**Replace with:**
```yaml
servers:
  - url: https://api.dev.mediancode.com/v1
    description: Development server
  - url: https://api.mediancode.com/v1
    description: Production server
```

**Rationale:**
- Remove localhost (backend will be separate service)
- Use versioned API paths (`/v1`)
- Distinguish dev and prod environments

---

### Step 2.2: Remove Mock API Paths and Components

**File:** `/Users/evgesha/Documents/Projects/median-code/api-spec.yaml`

**Actions:**

1. **Remove all existing paths** (lines 68-424):
   - `/` (root health check)
   - `/health` (detailed health check)
   - `/types` and `/types/{type_id}`
   - `/validators` and `/validators/{validator_id}`
   - `/fields` and `/fields/{field_id}`
   - `/objects` and `/objects/{object_id}`

2. **Remove all existing schemas** under `components.schemas` (lines 433-732):
   - `Type`
   - `Validator`
   - `Field`
   - `Object`
   - `Error` (keep this, we'll reuse it)

3. **Keep the security configuration** (lines 426-432):
   - `BearerAuth` security scheme
   - We'll reuse this for the generate endpoint

---

### Step 2.3: Update API Description

**File:** `/Users/evgesha/Documents/Projects/median-code/api-spec.yaml`

**Current description** (lines 4-43): Documents the mock API with read-only endpoints

**Replace with:**
```yaml
info:
  title: Median Code API
  description: |
    Production-ready FastAPI code generation API with Clerk JWT authentication.

    ## Authentication

    All endpoints require Bearer JWT authentication via Clerk. Include your Clerk JWT token in the Authorization header:

    ```
    Authorization: Bearer <your-clerk-jwt-token>
    ```

    ## Code Generation

    The `/generate` endpoint accepts a complete API specification from the Median Code frontend and returns a production-ready FastAPI application as a downloadable zip file.

    ### Generated Application Structure

    The generated zip file contains:
    - `main.py` - FastAPI application with all defined endpoints
    - `models/` - Pydantic models for request/response validation
    - `requirements.txt` - Python dependencies
    - `README.md` - Setup and deployment instructions

    ## Request Schema

    The request body must include:
    - **metadata**: API metadata (title, version, description, base URL)
    - **tags**: Endpoint tags for OpenAPI organization
    - **endpoints**: Array of API endpoint definitions
    - **objects**: Object definitions used in requests/responses
    - **fields**: Field definitions used in objects
    - **validators**: Validator definitions applied to fields

    All IDs in the request are client-generated and used only for referencing relationships between entities (e.g., endpoint -> object -> fields).

  version: 1.0.0
  contact:
    name: Median Code Support
    url: https://app.mediancode.com
```

**Key changes:**
- Focus on code generation instead of mock data
- Explain the zip file structure
- Document the request schema at a high level
- Update version to 1.0.0 (this is the real API, not a mock)

---

### Step 2.4: Update Tags

**File:** `/Users/evgesha/Documents/Projects/median-code/api-spec.yaml`

**Current tags** (lines 56-66): Health, Types, Validators, Fields, Objects

**Replace with:**
```yaml
tags:
  - name: Code Generation
    description: Generate production-ready FastAPI applications
```

**Rationale:** Single tag for the single endpoint

---

### Step 2.5: Add Generate Endpoint

**File:** `/Users/evgesha/Documents/Projects/median-code/api-spec.yaml`

**Add under `paths:`**

```yaml
paths:
  /generate:
    post:
      tags:
        - Code Generation
      summary: Generate FastAPI application
      description: |
        Generates a complete, production-ready FastAPI application based on the provided API specification.

        The generated application includes:
        - Fully configured FastAPI app with all endpoints
        - Pydantic models for validation
        - Type hints throughout
        - OpenAPI documentation
        - Requirements file with dependencies
        - README with setup instructions

        **Returns:** A binary zip file containing the complete application structure.

        **Authentication:** Requires valid Clerk JWT token. Generated code is scoped to the authenticated user's namespace.
      operationId: generateFastAPI
      requestBody:
        required: true
        description: Complete API specification from the Median Code frontend
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateRequest'
            example:
              metadata:
                id: "api-metadata-global"
                namespaceId: "namespace-global"
                title: "My API"
                version: "1.0.0"
                description: "Example API"
                baseUrl: "/api/v1"
                serverUrl: "https://api.example.com"
              tags:
                - id: "tag-1"
                  namespaceId: "namespace-global"
                  name: "Users"
                  description: "User management endpoints"
              endpoints:
                - id: "endpoint-1"
                  namespaceId: "namespace-global"
                  method: "GET"
                  path: "/users/{user_id}"
                  description: "Get user by ID"
                  tagId: "tag-1"
                  pathParams:
                    - id: "param-1"
                      name: "user_id"
                      type: "uuid"
                      description: "User identifier"
                      required: true
                  queryParamsObjectId: null
                  requestBodyObjectId: null
                  responseBodyObjectId: "object-1"
                  useEnvelope: true
                  responseShape: "object"
              objects:
                - id: "object-1"
                  namespaceId: "namespace-global"
                  name: "User"
                  description: "User object"
                  fields:
                    - fieldId: "field-1"
                      required: true
                    - fieldId: "field-2"
                      required: false
                  usedInApis: ["endpoint-1"]
              fields:
                - id: "field-1"
                  namespaceId: "namespace-global"
                  name: "user_id"
                  type: "uuid"
                  description: "User identifier"
                  defaultValue: ""
                  validators: []
                  usedInApis: ["endpoint-1"]
                - id: "field-2"
                  namespaceId: "namespace-global"
                  name: "email"
                  type: "str"
                  description: "User email"
                  defaultValue: ""
                  validators:
                    - name: "email_format"
                      params: {}
                  usedInApis: ["endpoint-1"]
              validators:
                - name: "email_format"
                  namespaceId: "namespace-global"
                  type: "string"
                  description: "Validates email format"
                  category: "inline"
                  parameterType: "None"
                  exampleUsage: "EmailStr"
                  pydanticDocsUrl: "https://docs.pydantic.dev/"
      responses:
        '200':
          description: Successfully generated FastAPI application
          content:
            application/zip:
              schema:
                type: string
                format: binary
          headers:
            Content-Disposition:
              schema:
                type: string
                example: attachment; filename="fastapi-app.zip"
        '400':
          description: Invalid request - validation errors in API specification
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                detail: "Invalid endpoint path: must start with /"
        '401':
          $ref: '#/components/responses/Unauthorized'
        '422':
          description: Unprocessable entity - semantic errors in API specification
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                detail: "Referenced object 'object-999' not found in objects array"
```

---

### Step 2.6: Add Request/Response Schemas

**File:** `/Users/evgesha/Documents/Projects/median-code/api-spec.yaml`

**Add under `components.schemas:`**

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Clerk JWT token from authentication flow

  schemas:
    # ========================================================================
    # Main Request Schema
    # ========================================================================

    GenerateRequest:
      type: object
      required:
        - metadata
        - tags
        - endpoints
        - objects
        - fields
        - validators
      properties:
        metadata:
          $ref: '#/components/schemas/ApiMetadata'
        tags:
          type: array
          items:
            $ref: '#/components/schemas/EndpointTag'
          description: Tags for organizing endpoints in OpenAPI spec
        endpoints:
          type: array
          items:
            $ref: '#/components/schemas/ApiEndpoint'
          description: Array of API endpoint definitions
        objects:
          type: array
          items:
            $ref: '#/components/schemas/ObjectDefinition'
          description: Object definitions used in requests/responses
        fields:
          type: array
          items:
            $ref: '#/components/schemas/Field'
          description: Field definitions used in objects
        validators:
          type: array
          items:
            $ref: '#/components/schemas/ValidatorBase'
          description: Validator definitions applied to fields

    # ========================================================================
    # API Metadata
    # ========================================================================

    ApiMetadata:
      type: object
      required:
        - id
        - namespaceId
        - title
        - version
        - description
        - baseUrl
        - serverUrl
      properties:
        id:
          type: string
          description: Client-generated unique identifier
          example: "api-metadata-global"
        namespaceId:
          type: string
          description: Namespace this metadata belongs to
          example: "namespace-global"
        title:
          type: string
          description: API title for OpenAPI spec
          example: "My API"
        version:
          type: string
          description: API version (semantic versioning)
          example: "1.0.0"
        description:
          type: string
          description: API description for OpenAPI spec
          example: "Production API for user management"
        baseUrl:
          type: string
          description: Base path for all endpoints
          example: "/api/v1"
        serverUrl:
          type: string
          description: Full server URL
          example: "https://api.example.com"

    # ========================================================================
    # Endpoint Tag
    # ========================================================================

    EndpointTag:
      type: object
      required:
        - id
        - namespaceId
        - name
        - description
      properties:
        id:
          type: string
          description: Client-generated unique identifier
          example: "tag-1"
        namespaceId:
          type: string
          description: Namespace this tag belongs to
          example: "namespace-global"
        name:
          type: string
          description: Tag name for OpenAPI spec
          example: "Users"
        description:
          type: string
          description: Tag description
          example: "User management endpoints"

    # ========================================================================
    # API Endpoint
    # ========================================================================

    ApiEndpoint:
      type: object
      required:
        - id
        - namespaceId
        - method
        - path
        - description
        - pathParams
        - useEnvelope
        - responseShape
      properties:
        id:
          type: string
          description: Client-generated unique identifier
          example: "endpoint-1"
        namespaceId:
          type: string
          description: Namespace this endpoint belongs to
          example: "namespace-global"
        method:
          type: string
          enum: [GET, POST, PUT, PATCH, DELETE]
          description: HTTP method
          example: "GET"
        path:
          type: string
          description: URL path with optional parameters in {braces}
          example: "/users/{user_id}"
        description:
          type: string
          description: Endpoint description for OpenAPI spec
          example: "Retrieve user by ID"
        tagId:
          type: string
          nullable: true
          description: Reference to EndpointTag.id (optional)
          example: "tag-1"
        pathParams:
          type: array
          items:
            $ref: '#/components/schemas/EndpointParameter'
          description: Path parameters extracted from URL
        queryParamsObjectId:
          type: string
          nullable: true
          description: Reference to ObjectDefinition.id for query parameters (optional)
          example: "object-query-1"
        requestBodyObjectId:
          type: string
          nullable: true
          description: Reference to ObjectDefinition.id for request body (optional - only for POST/PUT/PATCH)
          example: "object-2"
        responseBodyObjectId:
          type: string
          nullable: true
          description: Reference to ObjectDefinition.id for response body (optional)
          example: "object-1"
        useEnvelope:
          type: boolean
          description: Whether to wrap response in standard envelope (success, data, message)
          example: true
        responseShape:
          type: string
          enum: [object, list]
          description: Response data shape - single object or array of objects
          example: "object"
        expanded:
          type: boolean
          description: UI state - whether endpoint is expanded in frontend (ignored during generation)
          example: false

    # ========================================================================
    # Endpoint Parameter
    # ========================================================================

    EndpointParameter:
      type: object
      required:
        - id
        - name
        - type
        - description
        - required
      properties:
        id:
          type: string
          description: Client-generated unique identifier
          example: "param-1"
        name:
          type: string
          description: Parameter name (extracted from path {braces})
          example: "user_id"
        type:
          type: string
          description: Primitive type name
          example: "uuid"
        description:
          type: string
          description: Parameter description
          example: "Unique user identifier"
        required:
          type: boolean
          description: Whether parameter is required (path params always true)
          example: true

    # ========================================================================
    # Object Definition
    # ========================================================================

    ObjectDefinition:
      type: object
      required:
        - id
        - namespaceId
        - name
        - fields
        - usedInApis
      properties:
        id:
          type: string
          description: Client-generated unique identifier
          example: "object-1"
        namespaceId:
          type: string
          description: Namespace this object belongs to
          example: "namespace-global"
        name:
          type: string
          description: Object name (will become Pydantic model class name)
          example: "User"
        description:
          type: string
          description: Object description
          example: "User account object"
        fields:
          type: array
          items:
            $ref: '#/components/schemas/ObjectFieldReference'
          description: Fields that compose this object
        usedInApis:
          type: array
          items:
            type: string
          description: Array of endpoint IDs that use this object
          example: ["endpoint-1", "endpoint-2"]

    # ========================================================================
    # Object Field Reference
    # ========================================================================

    ObjectFieldReference:
      type: object
      required:
        - fieldId
        - required
      properties:
        fieldId:
          type: string
          description: Reference to Field.id
          example: "field-1"
        required:
          type: boolean
          description: Whether this field is required in the object
          example: true

    # ========================================================================
    # Field Definition
    # ========================================================================

    Field:
      type: object
      required:
        - id
        - namespaceId
        - name
        - type
        - validators
        - usedInApis
      properties:
        id:
          type: string
          description: Client-generated unique identifier
          example: "field-1"
        namespaceId:
          type: string
          description: Namespace this field belongs to
          example: "namespace-global"
        name:
          type: string
          description: Field name (will become Pydantic field name)
          example: "email"
        type:
          type: string
          enum: [str, int, float, bool, datetime, uuid]
          description: Primitive type name
          example: "str"
        description:
          type: string
          description: Field description
          example: "User email address"
        defaultValue:
          type: string
          description: Default value expression (Python code)
          example: ""
        validators:
          type: array
          items:
            $ref: '#/components/schemas/FieldValidator'
          description: Validators applied to this field
        usedInApis:
          type: array
          items:
            type: string
          description: Array of endpoint IDs where this field is used
          example: ["endpoint-1"]

    # ========================================================================
    # Field Validator
    # ========================================================================

    FieldValidator:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          description: Validator name (references ValidatorBase.name)
          example: "max_length"
        params:
          type: object
          additionalProperties: true
          description: Validator parameters (optional)
          example:
            value: 255

    # ========================================================================
    # Validator Base
    # ========================================================================

    ValidatorBase:
      type: object
      required:
        - name
        - namespaceId
        - type
        - description
        - category
        - parameterType
        - exampleUsage
        - pydanticDocsUrl
      properties:
        name:
          type: string
          description: Validator name (unique within namespace)
          example: "email_format"
        namespaceId:
          type: string
          description: Namespace this validator belongs to
          example: "namespace-global"
        type:
          type: string
          enum: [string, numeric, collection]
          description: Validator type category
          example: "string"
        description:
          type: string
          description: Validator description
          example: "Validates email format"
        category:
          type: string
          enum: [inline, custom]
          description: Whether this is a Pydantic inline validator or custom
          example: "inline"
        parameterType:
          type: string
          description: Type of parameter this validator accepts
          example: "None"
        exampleUsage:
          type: string
          description: Example Pydantic code usage
          example: "EmailStr"
        pydanticDocsUrl:
          type: string
          description: URL to Pydantic documentation
          example: "https://docs.pydantic.dev/"

    # ========================================================================
    # Error Response
    # ========================================================================

    Error:
      type: object
      required:
        - detail
      properties:
        detail:
          type: string
          description: Error message describing what went wrong
          example: "Invalid API specification: endpoint path must start with /"

  responses:
    Unauthorized:
      description: Unauthorized - Invalid or missing Clerk JWT token
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            detail: "Not authenticated"

security:
  - BearerAuth: []
```

---

## Phase 3: Validation and Testing

### Step 3.1: Validate OpenAPI Spec

**Actions:**
1. Use an OpenAPI validator to ensure the spec is valid
2. Test the spec in Swagger Editor (https://editor.swagger.io/)
3. Verify all `$ref` references are correctly resolved
4. Ensure example request/response bodies are valid against schemas

**Tools:**
- Swagger Editor: https://editor.swagger.io/
- OpenAPI CLI validator: `npx @apidevtools/swagger-cli validate api-spec.yaml`

---

### Step 3.2: Verify Frontend Compatibility

**Actions:**
1. Check that the request schema matches the actual frontend state structure
2. Compare `GenerateRequest` schema fields with:
   - `apiMetadataStore` from `/src/lib/stores/apis.ts`
   - `tagsStore` from `/src/lib/stores/apis.ts`
   - `endpointsStore` from `/src/lib/stores/apis.ts`
   - `objectsStore` from `/src/lib/stores/objects.ts`
   - `fieldsStore` from `/src/lib/stores/fields.ts`
   - `validatorsStore` from `/src/lib/stores/validators.ts`

3. Verify that all TypeScript interfaces match the OpenAPI schemas:
   - `ApiMetadata` interface (lines 94-102 in `/src/lib/types/index.ts`)
   - `EndpointTag` interface (lines 104-109)
   - `ApiEndpoint` interface (lines 119-134)
   - `EndpointParameter` interface (lines 111-117)
   - `ObjectDefinition` interface (lines 142-149)
   - `ObjectFieldReference` interface (lines 137-140)
   - `Field` interface (lines 58-67 in `/src/lib/stores/initialData.ts`)
   - `FieldValidator` interface (lines 53-56 in `/src/lib/stores/initialData.ts`)
   - `ValidatorBase` interface (lines 229-238 in `/src/lib/stores/initialData.ts`)

**Expected Result:** 100% alignment between OpenAPI schemas and TypeScript interfaces

---

### Step 3.3: Document Schema Alignment

**Action:** Create a mapping document that shows the correspondence between:
- Frontend TypeScript types → OpenAPI schemas
- Frontend store structure → Request payload structure
- Frontend data flow → API consumption pattern

**Location:** Add this as a comment at the top of `api-spec.yaml` or in a separate `docs/api-spec-alignment.md` file

**Purpose:** Help backend developers understand how the frontend data maps to the API request

---

## Phase 4: Update Frontend to Use New Endpoint

### Step 4.1: Update Generate Code Handler

**File:** `/Users/evgesha/Documents/Projects/median-code/src/lib/stores/apiGeneratorState.svelte.ts`

**Current implementation** (line 444-446):
```typescript
function handleGenerateCode(): void {
    showToast(MESSAGES.CODE_GENERATION_SOON, 'info', 3000);
}
```

**Updated implementation:**
```typescript
function handleGenerateCode(): void {
    // Gather all data from stores
    const requestPayload = {
        metadata: get(apiMetadataStore),
        tags: get(tagsStore),
        endpoints: get(endpointsStore),
        objects: get(objectsStore),
        fields: get(fieldsStore),
        validators: get(validatorsStore)
    };

    // TODO: Make API call to /generate endpoint
    // This will be implemented when the backend is ready
    console.log('Generate request payload:', requestPayload);

    showToast('Code generation will be available when backend is deployed', 'info', 5000);
}
```

**Note:** This is a placeholder implementation. The actual API call will be implemented once the backend service is deployed.

---

### Step 4.2: Create API Client Module (Future)

**File to create:** `/Users/evgesha/Documents/Projects/median-code/src/lib/api/client.ts`

**Purpose:** Centralize API calls to the code generation backend

**Placeholder structure:**
```typescript
import { get } from 'svelte/store';
import type { GenerateRequest } from './types'; // Will need to create this

export async function generateFastAPI(payload: GenerateRequest): Promise<Blob> {
    const response = await fetch('https://api.mediancode.com/v1/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getClerkToken()}` // Get from Clerk
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
    }

    return await response.blob();
}

function getClerkToken(): string {
    // TODO: Get actual Clerk JWT token
    return '';
}
```

**Note:** This will be implemented in a future phase once the backend is deployed.

---

## Phase 5: Cleanup and Documentation

### Step 5.1: Update CLAUDE.md

**File:** `/Users/evgesha/Documents/Projects/median-code/CLAUDE.md`

**Actions:**
1. Remove references to mock API implementation
2. Add section about the API specification:

```markdown
## API Specification

The project includes an OpenAPI 3.0 specification (`api-spec.yaml`) that documents the code generation API. This spec serves as the contract between the frontend and the backend service (implemented in a separate repository).

### Code Generation Endpoint

- **Endpoint:** `POST /v1/generate`
- **Purpose:** Generate production-ready FastAPI applications
- **Input:** Complete API specification from the frontend (metadata, endpoints, objects, fields, validators)
- **Output:** Binary zip file containing FastAPI project structure
- **Authentication:** Clerk JWT required

### Frontend-Backend Contract

The OpenAPI spec defines the exact structure of the request payload. All frontend stores (apis, objects, fields, validators) are serialized into a JSON payload that matches the `GenerateRequest` schema.

Key alignment:
- TypeScript interfaces in `/src/lib/types/index.ts` match OpenAPI schemas
- Store structures in `/src/lib/stores/` correspond to request payload sections
- Frontend data relationships (IDs, references) are preserved in the backend generation
```

---

### Step 5.2: Update README.md

**File:** `/Users/evgesha/Documents/Projects/median-code/README.md`

**Actions:**
1. Remove mock API setup instructions
2. Add API specification information:

```markdown
## API Specification

This repository includes an OpenAPI 3.0 specification (`api-spec.yaml`) for the code generation API. The backend implementation lives in a separate repository.

To view the API documentation:
1. Open https://editor.swagger.io/
2. Upload `api-spec.yaml`
3. Explore the `/generate` endpoint documentation
```

---

### Step 5.3: Create API Spec Documentation

**File to create:** `/Users/evgesha/Documents/Projects/median-code/docs/api-spec-guide.md`

**Contents:**

```markdown
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
| `ObjectDefinition` | `ObjectDefinition` | `/src/lib/types/index.ts` |
| `Field` | `Field` | `/src/lib/stores/initialData.ts` |
| `ValidatorBase` | `ValidatorBase` | `/src/lib/stores/initialData.ts` |

## Authentication

All endpoints require Clerk JWT authentication via Bearer token in the Authorization header.

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
```

---

## Verification Checklist

Before considering this plan complete, verify:

- [ ] `/mock_api/` directory is completely removed
- [ ] No references to `mock-api` scripts in `package.json`
- [ ] No mock API bash scripts in `/scripts/`
- [ ] `docs/mock-api-plan.md` is deleted
- [ ] `api-spec.yaml` has updated server URLs
- [ ] `api-spec.yaml` has only the `/generate` endpoint
- [ ] All OpenAPI schemas match TypeScript interfaces exactly
- [ ] OpenAPI spec validates successfully (no syntax errors)
- [ ] Example request in OpenAPI spec is valid against the schema
- [ ] `CLAUDE.md` updated with API spec information
- [ ] `README.md` updated to remove mock API references
- [ ] `docs/api-spec-guide.md` created
- [ ] Frontend generate code handler logs payload for testing

---

## Key Files Modified

1. **Deleted:**
   - `/mock_api/` (entire directory)
   - `/docs/mock-api-plan.md`
   - `/scripts/kill-mock-api.sh` (if exists)

2. **Modified:**
   - `/api-spec.yaml` (complete rewrite)
   - `/package.json` (remove mock-api scripts)
   - `/CLAUDE.md` (remove mock API, add API spec info)
   - `/README.md` (remove mock API setup)

3. **Created:**
   - `/docs/api-spec-guide.md` (new documentation)
   - `/docs/api-spec-update-plan.md` (this file)

---

## Notes for LLM Execution

1. **Read before writing:** Always read the current state of files before modifying them
2. **Preserve existing patterns:** When updating YAML, maintain existing indentation and structure
3. **Validate references:** Ensure all `$ref` in OpenAPI spec resolve correctly
4. **Type alignment:** Cross-reference TypeScript types with OpenAPI schemas for exact match
5. **No code generation:** This plan documents the API, does not implement backend
6. **Frontend changes minimal:** Only update placeholder toast message in generate handler
7. **Keep security:** Preserve Clerk JWT authentication configuration
8. **Version consistency:** Use semantic versioning consistently (1.0.0 for production API)

---

## Success Criteria

This plan is complete when:

1. All mock API traces are removed from the codebase
2. OpenAPI spec validates without errors
3. OpenAPI spec accurately documents the generate endpoint
4. All schemas match frontend TypeScript types
5. Documentation is updated to reflect new API-only approach
6. Frontend can serialize current state into valid request payload
7. Backend developers can implement the API from the spec alone

---

## Future Work (Not in This Plan)

- Actual API client implementation in frontend
- Environment variable configuration for API URLs
- Error handling for API calls
- Progress indicators for zip file generation
- Backend service implementation (separate repository)
- Deployment configuration for API servers

"""Main FastAPI application."""

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from mock_api.routes import types_router, validators_router, fields_router, objects_router
from mock_api.data import get_data_store

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Median Code Mock API",
    description="""
Mock API for Median Code with Clerk JWT authentication.

## Authentication

All endpoints require Bearer JWT authentication via Clerk. Include your Clerk JWT token in the Authorization header:

```
Authorization: Bearer <your-clerk-jwt-token>
```

## Data Scoping

All data is automatically scoped to the authenticated user's `owner_id` and `account_id` claims from the JWT.
You can only access data that belongs to your user account.

## Resources

This API provides read-only access to the following resources:

- **Types**: Data types (e.g., string, int, bool) used in field definitions
- **Validators**: Validation rules that can be applied to fields
- **Fields**: Field definitions with types and validators
- **Objects**: Object definitions composed of fields

## Pagination

List endpoints support pagination via query parameters:
- `limit`: Maximum number of results to return (default: 100, max: 1000)
- `offset`: Number of results to skip (default: 0)

## Filtering

List endpoints support optional filtering:
- `namespace`: Filter results by namespace (where applicable)

## Default Values

All resources include default values as defined in the schema. Missing optional fields are automatically populated with their default values from the schema definition.
    """,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["GET"],  # Only GET methods for read-only API
    allow_headers=["*"],
)


# Custom OpenAPI schema with security
def custom_openapi():
    """Customize OpenAPI schema with security and examples."""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Clerk JWT token. Get this from your Clerk authentication flow."
        }
    }

    # Apply security globally
    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.on_event("startup")
async def startup_event():
    """Initialize data store on startup."""
    store = get_data_store()
    print(f"Loaded {len(store.types)} types")
    print(f"Loaded {len(store.validators)} validators")
    print(f"Loaded {len(store.fields)} fields")
    print(f"Loaded {len(store.objects)} objects")
    print("Mock API ready!")


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "Median Code Mock API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health():
    """Detailed health check."""
    store = get_data_store()
    return {
        "status": "ok",
        "data": {
            "types": len(store.types),
            "validators": len(store.validators),
            "fields": len(store.fields),
            "objects": len(store.objects)
        }
    }


# Include routers with /api/mock prefix
app.include_router(types_router, prefix="/api/mock")
app.include_router(validators_router, prefix="/api/mock")
app.include_router(fields_router, prefix="/api/mock")
app.include_router(objects_router, prefix="/api/mock")

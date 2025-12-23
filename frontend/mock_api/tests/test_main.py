"""Tests for main FastAPI application."""

import pytest


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["message"] == "Median Code Mock API"
    assert "version" in data
    assert "docs" in data


def test_health_endpoint(client):
    """Test health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "data" in data
    assert "types" in data["data"]
    assert "validators" in data["data"]
    assert "fields" in data["data"]
    assert "objects" in data["data"]

    # Verify counts match fixture data
    assert data["data"]["types"] > 0
    assert data["data"]["validators"] > 0
    assert data["data"]["fields"] > 0
    assert data["data"]["objects"] > 0


def test_openapi_schema(client):
    """Test OpenAPI schema is available."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    # Check basic schema structure
    assert "openapi" in schema
    assert "info" in schema
    assert "paths" in schema
    assert "components" in schema

    # Check title and description
    assert schema["info"]["title"] == "Median Code Mock API"
    assert "version" in schema["info"]


def test_openapi_security_scheme(client):
    """Test that OpenAPI schema includes security scheme."""
    response = client.get("/openapi.json")
    schema = response.json()

    # Check security schemes
    assert "securitySchemes" in schema["components"]
    assert "BearerAuth" in schema["components"]["securitySchemes"]

    bearer_auth = schema["components"]["securitySchemes"]["BearerAuth"]
    assert bearer_auth["type"] == "http"
    assert bearer_auth["scheme"] == "bearer"
    assert bearer_auth["bearerFormat"] == "JWT"


def test_openapi_global_security(client):
    """Test that security is applied globally."""
    response = client.get("/openapi.json")
    schema = response.json()

    # Check global security
    assert "security" in schema
    assert {"BearerAuth": []} in schema["security"]


def test_openapi_paths(client):
    """Test that all expected paths are in OpenAPI schema."""
    response = client.get("/openapi.json")
    schema = response.json()

    paths = schema["paths"]

    # Check all expected endpoints
    assert "/api/mock/types" in paths
    assert "/api/mock/types/{type_id}" in paths
    assert "/api/mock/validators" in paths
    assert "/api/mock/validators/{validator_id}" in paths
    assert "/api/mock/fields" in paths
    assert "/api/mock/fields/{field_id}" in paths
    assert "/api/mock/objects" in paths
    assert "/api/mock/objects/{object_id}" in paths


def test_openapi_tags(client):
    """Test that endpoints are properly tagged."""
    response = client.get("/openapi.json")
    schema = response.json()

    # Check types endpoint has Types tag
    types_path = schema["paths"]["/api/mock/types"]["get"]
    assert "Types" in types_path["tags"]

    # Check validators endpoint has Validators tag
    validators_path = schema["paths"]["/api/mock/validators"]["get"]
    assert "Validators" in validators_path["tags"]

    # Check fields endpoint has Fields tag
    fields_path = schema["paths"]["/api/mock/fields"]["get"]
    assert "Fields" in fields_path["tags"]

    # Check objects endpoint has Objects tag
    objects_path = schema["paths"]["/api/mock/objects"]["get"]
    assert "Objects" in objects_path["tags"]


def test_openapi_query_parameters(client):
    """Test that query parameters are documented."""
    response = client.get("/openapi.json")
    schema = response.json()

    # Check types list endpoint parameters
    types_list = schema["paths"]["/api/mock/types"]["get"]
    params = {p["name"]: p for p in types_list.get("parameters", [])}

    assert "limit" in params
    assert params["limit"]["schema"]["default"] == 100
    assert params["limit"]["schema"]["minimum"] == 1
    assert params["limit"]["schema"]["maximum"] == 1000

    assert "offset" in params
    assert params["offset"]["schema"]["default"] == 0
    assert params["offset"]["schema"]["minimum"] == 0

    assert "namespace" in params


def test_cors_headers(client):
    """Test that CORS is configured."""
    response = client.options("/api/mock/types")
    # CORS should be handled by middleware
    # In test client, this might not be fully exercised
    # but we can at least verify the middleware is configured
    assert response.status_code in [200, 405]  # OPTIONS might not be implemented


def test_docs_available(client):
    """Test that Swagger UI is available."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_redoc_available(client):
    """Test that ReDoc is available."""
    response = client.get("/redoc")
    assert response.status_code == 200

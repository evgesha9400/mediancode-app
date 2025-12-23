"""Tests for types API routes."""

import pytest


def test_list_types(client, auth_headers):
    """Test listing types."""
    response = client.get("/api/mock/types", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3  # user_test123 has 3 types


def test_list_types_pagination(client, auth_headers):
    """Test types pagination."""
    # Get first 2 types
    response = client.get("/api/mock/types?limit=2&offset=0", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    # Get next type
    response = client.get("/api/mock/types?limit=2&offset=2", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_list_types_invalid_pagination(client, auth_headers):
    """Test invalid pagination parameters."""
    # Negative offset
    response = client.get("/api/mock/types?offset=-1", headers=auth_headers)
    assert response.status_code == 422

    # Invalid limit (too high)
    response = client.get("/api/mock/types?limit=2000", headers=auth_headers)
    assert response.status_code == 422

    # Invalid limit (zero)
    response = client.get("/api/mock/types?limit=0", headers=auth_headers)
    assert response.status_code == 422


def test_get_type(client, auth_headers):
    """Test getting a specific type."""
    response = client.get("/api/mock/types/type_1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "type_1"
    assert data["name"] == "String"
    assert data["python_type"] == "str"
    assert data["is_builtin"] is True
    assert data["is_nullable"] is False


def test_get_type_not_found(client, auth_headers):
    """Test getting a non-existent type."""
    response = client.get("/api/mock/types/type_nonexistent", headers=auth_headers)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_get_type_access_denied(client, auth_headers):
    """Test that users can't access other users' types."""
    # type_4 belongs to user_other456
    response = client.get("/api/mock/types/type_4", headers=auth_headers)
    assert response.status_code == 404


def test_types_without_auth(client):
    """Test that types endpoint requires authentication."""
    # With REQUIRE_AUTH=false, this should still work with Bearer token
    # but without token it should fail
    response = client.get("/api/mock/types")
    assert response.status_code == 403  # Forbidden without auth header


def test_types_response_structure(client, auth_headers):
    """Test that types response has correct structure."""
    response = client.get("/api/mock/types/type_1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Check all required fields are present
    assert "id" in data
    assert "name" in data
    assert "python_type" in data
    assert "description" in data
    assert "is_builtin" in data
    assert "is_nullable" in data
    assert "default_value" in data
    assert "owner_id" in data
    assert "account_id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_types_default_values(client, auth_headers):
    """Test that default values are applied correctly."""
    response = client.get("/api/mock/types/type_1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Check defaults
    assert data["is_builtin"] is True  # Explicit in fixture
    assert data["is_nullable"] is False  # Explicit in fixture
    assert data["default_value"] == ""  # Explicit in fixture
    assert data["description"] == "Text string type"  # Explicit in fixture

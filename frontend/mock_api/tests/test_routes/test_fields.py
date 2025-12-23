"""Tests for fields API routes."""

import pytest


def test_list_fields(client, auth_headers):
    """Test listing fields."""
    response = client.get("/api/mock/fields", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 4  # user_test123 has 4 fields


def test_list_fields_namespace_filter(client, auth_headers):
    """Test filtering fields by namespace."""
    response = client.get("/api/mock/fields?namespace=user", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    assert all(field["namespace"] == "user" for field in data)

    # Non-existent namespace
    response = client.get("/api/mock/fields?namespace=nonexistent", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0


def test_list_fields_pagination(client, auth_headers):
    """Test fields pagination."""
    response = client.get("/api/mock/fields?limit=2", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_get_field(client, auth_headers):
    """Test getting a specific field."""
    response = client.get("/api/mock/fields/field_1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "field_1"
    assert data["name"] == "email"
    assert data["type_id"] == "type_1"
    assert data["is_required"] is True
    assert data["is_unique"] is True
    assert data["is_indexed"] is True
    assert data["namespace"] == "user"


def test_get_field_not_found(client, auth_headers):
    """Test getting a non-existent field."""
    response = client.get("/api/mock/fields/field_nonexistent", headers=auth_headers)
    assert response.status_code == 404


def test_get_field_access_denied(client, auth_headers):
    """Test that users can't access other users' fields."""
    # field_5 belongs to user_other456
    response = client.get("/api/mock/fields/field_5", headers=auth_headers)
    assert response.status_code == 404


def test_fields_without_auth(client):
    """Test that fields endpoint requires authentication."""
    response = client.get("/api/mock/fields")
    assert response.status_code == 403


def test_fields_response_structure(client, auth_headers):
    """Test that fields response has correct structure."""
    response = client.get("/api/mock/fields/field_1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Check all required fields
    assert "id" in data
    assert "name" in data
    assert "type_id" in data
    assert "description" in data
    assert "is_required" in data
    assert "is_unique" in data
    assert "is_indexed" in data
    assert "default_value" in data
    assert "validator_ids" in data
    assert "namespace" in data
    assert "owner_id" in data
    assert "account_id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_fields_validator_ids_array(client, auth_headers):
    """Test that validator_ids is an array."""
    response = client.get("/api/mock/fields/field_1", headers=auth_headers)
    data = response.json()
    assert isinstance(data["validator_ids"], list)
    assert len(data["validator_ids"]) == 2
    assert "val_1" in data["validator_ids"]
    assert "val_2" in data["validator_ids"]

    # Field with no validators
    response = client.get("/api/mock/fields/field_3", headers=auth_headers)
    data = response.json()
    assert isinstance(data["validator_ids"], list)
    assert len(data["validator_ids"]) == 0


def test_fields_default_values(client, auth_headers):
    """Test that default values are applied."""
    response = client.get("/api/mock/fields/field_4", headers=auth_headers)
    data = response.json()

    # Field 4 has some defaults
    assert data["is_indexed"] is False  # Default when not specified
    assert isinstance(data["validator_ids"], list)


def test_fields_boolean_flags(client, auth_headers):
    """Test field boolean flags."""
    # Field with all flags
    response = client.get("/api/mock/fields/field_1", headers=auth_headers)
    data = response.json()
    assert data["is_required"] is True
    assert data["is_unique"] is True
    assert data["is_indexed"] is True

    # Field with different flags
    response = client.get("/api/mock/fields/field_2", headers=auth_headers)
    data = response.json()
    assert data["is_required"] is False
    assert data["is_unique"] is False
    assert data["is_indexed"] is False

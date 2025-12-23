"""Tests for validators API routes."""

import pytest


def test_list_validators(client, auth_headers):
    """Test listing validators."""
    response = client.get("/api/mock/validators", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3  # user_test123 has 3 validators


def test_list_validators_pagination(client, auth_headers):
    """Test validators pagination."""
    response = client.get("/api/mock/validators?limit=2", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


def test_get_validator(client, auth_headers):
    """Test getting a specific validator."""
    response = client.get("/api/mock/validators/val_1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "val_1"
    assert data["name"] == "Email Format"
    assert data["validator_type"] == "pattern"
    assert "pattern" in data["config"]
    assert data["error_message"] == "Invalid email format"


def test_get_validator_not_found(client, auth_headers):
    """Test getting a non-existent validator."""
    response = client.get("/api/mock/validators/val_nonexistent", headers=auth_headers)
    assert response.status_code == 404


def test_get_validator_access_denied(client, auth_headers):
    """Test that users can't access other users' validators."""
    # val_4 belongs to user_other456
    response = client.get("/api/mock/validators/val_4", headers=auth_headers)
    assert response.status_code == 404


def test_validators_without_auth(client):
    """Test that validators endpoint requires authentication."""
    response = client.get("/api/mock/validators")
    assert response.status_code == 403


def test_validators_response_structure(client, auth_headers):
    """Test that validators response has correct structure."""
    response = client.get("/api/mock/validators/val_1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Check all required fields
    assert "id" in data
    assert "name" in data
    assert "validator_type" in data
    assert "description" in data
    assert "config" in data
    assert "error_message" in data
    assert "owner_id" in data
    assert "account_id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_validators_config_structure(client, auth_headers):
    """Test different validator config structures."""
    # Pattern validator
    response = client.get("/api/mock/validators/val_1", headers=auth_headers)
    data = response.json()
    assert "pattern" in data["config"]

    # Range validator
    response = client.get("/api/mock/validators/val_3", headers=auth_headers)
    data = response.json()
    assert "min" in data["config"]
    assert "max" in data["config"]
    assert data["config"]["min"] == 0
    assert data["config"]["max"] == 150


def test_validator_types_enum(client, auth_headers):
    """Test that validator_type is one of the allowed enums."""
    response = client.get("/api/mock/validators", headers=auth_headers)
    data = response.json()

    allowed_types = ["length", "range", "pattern", "custom"]
    for validator in data:
        assert validator["validator_type"] in allowed_types


def test_validators_default_values(client, auth_headers):
    """Test that default values are applied."""
    response = client.get("/api/mock/validators/val_1", headers=auth_headers)
    data = response.json()

    # Config should be dict (even if empty by default)
    assert isinstance(data["config"], dict)
    # Error message has a default in the model
    assert isinstance(data["error_message"], str)

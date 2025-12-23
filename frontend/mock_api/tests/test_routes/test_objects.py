"""Tests for objects API routes."""

import pytest


def test_list_objects(client, auth_headers):
    """Test listing objects."""
    response = client.get("/api/mock/objects", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2  # user_test123 has 2 objects


def test_list_objects_namespace_filter(client, auth_headers):
    """Test filtering objects by namespace."""
    response = client.get("/api/mock/objects?namespace=user", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(obj["namespace"] == "user" for obj in data)

    # Non-existent namespace
    response = client.get("/api/mock/objects?namespace=game", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 0  # user_test123 has no objects in 'game' namespace


def test_list_objects_pagination(client, auth_headers):
    """Test objects pagination."""
    response = client.get("/api/mock/objects?limit=1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_get_object(client, auth_headers):
    """Test getting a specific object."""
    response = client.get("/api/mock/objects/obj_1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "obj_1"
    assert data["name"] == "User"
    assert data["namespace"] == "user"
    assert data["table_name"] == "users"
    assert data["is_active"] is True
    assert len(data["field_ids"]) == 4


def test_get_object_not_found(client, auth_headers):
    """Test getting a non-existent object."""
    response = client.get("/api/mock/objects/obj_nonexistent", headers=auth_headers)
    assert response.status_code == 404


def test_get_object_access_denied(client, auth_headers):
    """Test that users can't access other users' objects."""
    # obj_3 belongs to user_other456
    response = client.get("/api/mock/objects/obj_3", headers=auth_headers)
    assert response.status_code == 404


def test_objects_without_auth(client):
    """Test that objects endpoint requires authentication."""
    response = client.get("/api/mock/objects")
    assert response.status_code == 403


def test_objects_response_structure(client, auth_headers):
    """Test that objects response has correct structure."""
    response = client.get("/api/mock/objects/obj_1", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    # Check all required fields
    assert "id" in data
    assert "name" in data
    assert "description" in data
    assert "field_ids" in data
    assert "namespace" in data
    assert "table_name" in data
    assert "is_active" in data
    assert "owner_id" in data
    assert "account_id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_objects_field_ids_array(client, auth_headers):
    """Test that field_ids is an array."""
    response = client.get("/api/mock/objects/obj_1", headers=auth_headers)
    data = response.json()
    assert isinstance(data["field_ids"], list)
    assert len(data["field_ids"]) == 4
    assert "field_1" in data["field_ids"]
    assert "field_2" in data["field_ids"]

    # Object with fewer fields
    response = client.get("/api/mock/objects/obj_2", headers=auth_headers)
    data = response.json()
    assert isinstance(data["field_ids"], list)
    assert len(data["field_ids"]) == 1


def test_objects_default_values(client, auth_headers):
    """Test that default values are applied."""
    response = client.get("/api/mock/objects/obj_1", headers=auth_headers)
    data = response.json()

    # is_active has default True
    assert data["is_active"] is True
    # field_ids should be list
    assert isinstance(data["field_ids"], list)


def test_objects_is_active_flag(client, auth_headers):
    """Test object is_active flag."""
    response = client.get("/api/mock/objects/obj_1", headers=auth_headers)
    data = response.json()
    assert data["is_active"] is True

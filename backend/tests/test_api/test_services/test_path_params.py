# tests/test_api/test_services/test_path_params.py
"""Tests for endpoint path parameter helpers."""

from uuid import uuid4

from api.services.path_params import get_path_param_field_id


def test_get_path_param_field_id_returns_uuid_value():
    """Return UUID values stored in endpoint path parameter payloads."""
    field_id = uuid4()

    assert get_path_param_field_id({"fieldId": field_id}) == field_id


def test_get_path_param_field_id_parses_string_value():
    """Parse string UUID values stored in endpoint path parameter payloads."""
    field_id = uuid4()

    assert get_path_param_field_id({"fieldId": str(field_id)}) == field_id


def test_get_path_param_field_id_returns_none_for_invalid_value():
    """Return None for missing or invalid endpoint path parameter field IDs."""
    assert get_path_param_field_id({"fieldId": "invalid"}) is None
    assert get_path_param_field_id({}) is None

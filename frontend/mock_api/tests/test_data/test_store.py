"""Tests for data store."""

import pytest
from mock_api.data import DataStore


def test_data_store_initialization():
    """Test that data store initializes empty."""
    store = DataStore()
    assert len(store.types) == 0
    assert len(store.validators) == 0
    assert len(store.fields) == 0
    assert len(store.objects) == 0


def test_load_fixtures(data_store):
    """Test that fixtures are loaded correctly."""
    assert len(data_store.types) > 0
    assert len(data_store.validators) > 0
    assert len(data_store.fields) > 0
    assert len(data_store.objects) > 0


def test_list_types_scoped(data_store):
    """Test listing types scoped to user."""
    # User test123 should see their types
    types = data_store.list_types("user_test123", "acct_test123")
    assert len(types) == 3  # type_1, type_2, type_3

    # User other456 should see their types
    types = data_store.list_types("user_other456", "acct_other456")
    assert len(types) == 1  # type_4

    # Non-existent user should see nothing
    types = data_store.list_types("user_nonexistent", "acct_nonexistent")
    assert len(types) == 0


def test_list_types_pagination(data_store):
    """Test pagination for types."""
    # Get first 2 types
    types = data_store.list_types("user_test123", "acct_test123", limit=2, offset=0)
    assert len(types) == 2

    # Get next type
    types = data_store.list_types("user_test123", "acct_test123", limit=2, offset=2)
    assert len(types) == 1


def test_get_type(data_store):
    """Test getting a specific type."""
    # Get existing type
    type_obj = data_store.get_type("type_1", "user_test123", "acct_test123")
    assert type_obj is not None
    assert type_obj.id == "type_1"
    assert type_obj.name == "String"

    # Try to get type with wrong user (should fail)
    type_obj = data_store.get_type("type_1", "user_other456", "acct_other456")
    assert type_obj is None

    # Try to get non-existent type
    type_obj = data_store.get_type("type_nonexistent", "user_test123", "acct_test123")
    assert type_obj is None


def test_list_validators_scoped(data_store):
    """Test listing validators scoped to user."""
    validators = data_store.list_validators("user_test123", "acct_test123")
    assert len(validators) == 3  # val_1, val_2, val_3

    validators = data_store.list_validators("user_other456", "acct_other456")
    assert len(validators) == 1  # val_4


def test_get_validator(data_store):
    """Test getting a specific validator."""
    validator = data_store.get_validator("val_1", "user_test123", "acct_test123")
    assert validator is not None
    assert validator.id == "val_1"
    assert validator.validator_type.value == "pattern"

    # Access denied
    validator = data_store.get_validator("val_1", "user_other456", "acct_other456")
    assert validator is None


def test_list_fields_scoped(data_store):
    """Test listing fields scoped to user."""
    fields = data_store.list_fields("user_test123", "acct_test123")
    assert len(fields) == 4  # field_1, field_2, field_3, field_4

    fields = data_store.list_fields("user_other456", "acct_other456")
    assert len(fields) == 1  # field_5


def test_list_fields_namespace_filter(data_store):
    """Test filtering fields by namespace."""
    # Filter by user namespace
    fields = data_store.list_fields("user_test123", "acct_test123", namespace="user")
    assert len(fields) == 4
    assert all(f.namespace == "user" for f in fields)

    # Non-existent namespace
    fields = data_store.list_fields("user_test123", "acct_test123", namespace="nonexistent")
    assert len(fields) == 0


def test_get_field(data_store):
    """Test getting a specific field."""
    field = data_store.get_field("field_1", "user_test123", "acct_test123")
    assert field is not None
    assert field.id == "field_1"
    assert field.name == "email"
    assert field.is_required is True
    assert field.is_unique is True

    # Access denied
    field = data_store.get_field("field_1", "user_other456", "acct_other456")
    assert field is None


def test_list_objects_scoped(data_store):
    """Test listing objects scoped to user."""
    objects = data_store.list_objects("user_test123", "acct_test123")
    assert len(objects) == 2  # obj_1, obj_2

    objects = data_store.list_objects("user_other456", "acct_other456")
    assert len(objects) == 1  # obj_3


def test_list_objects_namespace_filter(data_store):
    """Test filtering objects by namespace."""
    # Filter by user namespace
    objects = data_store.list_objects("user_test123", "acct_test123", namespace="user")
    assert len(objects) == 2
    assert all(o.namespace == "user" for o in objects)

    # Filter by game namespace (for other user)
    objects = data_store.list_objects("user_other456", "acct_other456", namespace="game")
    assert len(objects) == 1
    assert objects[0].namespace == "game"


def test_get_object(data_store):
    """Test getting a specific object."""
    obj = data_store.get_object("obj_1", "user_test123", "acct_test123")
    assert obj is not None
    assert obj.id == "obj_1"
    assert obj.name == "User"
    assert obj.is_active is True
    assert len(obj.field_ids) == 4

    # Access denied
    obj = data_store.get_object("obj_1", "user_other456", "acct_other456")
    assert obj is None


def test_field_defaults_applied(data_store):
    """Test that default values are applied to fields."""
    field = data_store.get_field("field_1", "user_test123", "acct_test123")
    assert field.description == "User email address"  # Explicit value
    assert field.validator_ids == ["val_1", "val_2"]  # Explicit list

    # Field with minimal data should have defaults
    field = data_store.get_field("field_5", "user_other456", "acct_other456")
    assert field.is_indexed is False  # Default value
    assert field.validator_ids == []  # Default empty list


def test_validator_defaults_applied(data_store):
    """Test that default values are applied to validators."""
    validator = data_store.get_validator("val_4", "user_other456", "acct_other456")
    assert validator.description == "Custom validation logic"  # Explicit value
    assert validator.error_message == "Validation failed"  # Default value from model

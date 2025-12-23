"""Tests for Pydantic models."""

import pytest
from datetime import datetime
from mock_api.models import Type, Validator, ValidatorType, Field, Object


def test_type_model():
    """Test Type model."""
    type_obj = Type(
        id="type_test",
        name="Test Type",
        python_type="str",
        owner_id="user_123",
        account_id="acct_123",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    assert type_obj.id == "type_test"
    assert type_obj.name == "Test Type"
    assert type_obj.python_type == "str"
    assert type_obj.description == ""  # Default
    assert type_obj.is_builtin is True  # Default
    assert type_obj.is_nullable is False  # Default
    assert type_obj.default_value is None  # Default


def test_type_model_with_all_fields():
    """Test Type model with all fields."""
    type_obj = Type(
        id="type_test",
        name="Test Type",
        python_type="str",
        description="Test description",
        is_builtin=False,
        is_nullable=True,
        default_value="test",
        owner_id="user_123",
        account_id="acct_123",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    assert type_obj.description == "Test description"
    assert type_obj.is_builtin is False
    assert type_obj.is_nullable is True
    assert type_obj.default_value == "test"


def test_validator_model():
    """Test Validator model."""
    validator = Validator(
        id="val_test",
        name="Test Validator",
        validator_type=ValidatorType.PATTERN,
        owner_id="user_123",
        account_id="acct_123",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    assert validator.id == "val_test"
    assert validator.name == "Test Validator"
    assert validator.validator_type == ValidatorType.PATTERN
    assert validator.description == ""  # Default
    assert validator.config == {}  # Default
    assert validator.error_message == "Validation failed"  # Default


def test_validator_model_with_config():
    """Test Validator model with config."""
    validator = Validator(
        id="val_test",
        name="Test Validator",
        validator_type=ValidatorType.RANGE,
        config={"min": 0, "max": 100},
        error_message="Custom error",
        owner_id="user_123",
        account_id="acct_123",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    assert validator.config == {"min": 0, "max": 100}
    assert validator.error_message == "Custom error"


def test_validator_type_enum():
    """Test ValidatorType enum."""
    assert ValidatorType.LENGTH == "length"
    assert ValidatorType.RANGE == "range"
    assert ValidatorType.PATTERN == "pattern"
    assert ValidatorType.CUSTOM == "custom"


def test_field_model():
    """Test Field model."""
    field = Field(
        id="field_test",
        name="test_field",
        type_id="type_1",
        owner_id="user_123",
        account_id="acct_123",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    assert field.id == "field_test"
    assert field.name == "test_field"
    assert field.type_id == "type_1"
    assert field.description == ""  # Default
    assert field.is_required is False  # Default
    assert field.is_unique is False  # Default
    assert field.is_indexed is False  # Default
    assert field.default_value is None  # Default
    assert field.validator_ids == []  # Default
    assert field.namespace == ""  # Default


def test_field_model_with_all_fields():
    """Test Field model with all fields."""
    field = Field(
        id="field_test",
        name="test_field",
        type_id="type_1",
        description="Test field",
        is_required=True,
        is_unique=True,
        is_indexed=True,
        default_value="test",
        validator_ids=["val_1", "val_2"],
        namespace="user",
        owner_id="user_123",
        account_id="acct_123",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    assert field.is_required is True
    assert field.is_unique is True
    assert field.is_indexed is True
    assert field.default_value == "test"
    assert field.validator_ids == ["val_1", "val_2"]
    assert field.namespace == "user"


def test_object_model():
    """Test Object model."""
    obj = Object(
        id="obj_test",
        name="Test Object",
        owner_id="user_123",
        account_id="acct_123",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    assert obj.id == "obj_test"
    assert obj.name == "Test Object"
    assert obj.description == ""  # Default
    assert obj.field_ids == []  # Default
    assert obj.namespace == ""  # Default
    assert obj.table_name == ""  # Default
    assert obj.is_active is True  # Default


def test_object_model_with_all_fields():
    """Test Object model with all fields."""
    obj = Object(
        id="obj_test",
        name="Test Object",
        description="Test description",
        field_ids=["field_1", "field_2"],
        namespace="user",
        table_name="test_table",
        is_active=False,
        owner_id="user_123",
        account_id="acct_123",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    assert obj.description == "Test description"
    assert obj.field_ids == ["field_1", "field_2"]
    assert obj.namespace == "user"
    assert obj.table_name == "test_table"
    assert obj.is_active is False


def test_model_json_serialization():
    """Test that models can be serialized to JSON."""
    type_obj = Type(
        id="type_test",
        name="Test Type",
        python_type="str",
        owner_id="user_123",
        account_id="acct_123",
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    # Should be able to convert to dict
    data = type_obj.model_dump()
    assert isinstance(data, dict)
    assert data["id"] == "type_test"

    # Should be able to convert to JSON
    json_str = type_obj.model_dump_json()
    assert isinstance(json_str, str)
    assert "type_test" in json_str

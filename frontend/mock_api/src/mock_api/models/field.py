"""Field model definition."""

from datetime import datetime
from typing import Optional, Union, List
from pydantic import BaseModel, Field as PydanticField


class Field(BaseModel):
    """Represents a field in an object (e.g., column in a table)."""

    id: str = PydanticField(..., description="Unique identifier for the field")
    name: str = PydanticField(..., description="Display name of the field")
    type_id: str = PydanticField(..., description="Reference to a Type ID")
    description: str = PydanticField(default="", description="Optional description of the field")
    is_required: bool = PydanticField(default=False, description="Whether this field is required")
    is_unique: bool = PydanticField(default=False, description="Whether this field must be unique")
    is_indexed: bool = PydanticField(
        default=False,
        description="Whether this field should be indexed in database"
    )
    default_value: Optional[Union[str, int, float, bool]] = PydanticField(
        default=None,
        description="Default value for this field"
    )
    validator_ids: List[str] = PydanticField(
        default_factory=list,
        description="Array of Validator IDs applied to this field"
    )
    namespace: str = PydanticField(default="", description="Optional namespace for organizing fields")
    owner_id: str = PydanticField(..., description="User ID from Clerk JWT")
    account_id: str = PydanticField(..., description="Account ID from Clerk JWT")
    created_at: datetime = PydanticField(..., description="ISO 8601 timestamp of creation")
    updated_at: datetime = PydanticField(..., description="ISO 8601 timestamp of last update")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "field_1",
                    "name": "email",
                    "type_id": "type_1",
                    "description": "User email address",
                    "is_required": True,
                    "is_unique": True,
                    "is_indexed": True,
                    "default_value": None,
                    "validator_ids": ["val_1", "val_2"],
                    "namespace": "user",
                    "owner_id": "user_test123",
                    "account_id": "acct_test123",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
            ]
        }
    }

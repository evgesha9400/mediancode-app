"""Type model definition."""

from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, Field


class Type(BaseModel):
    """Represents a data type (e.g., string, int, bool)."""

    id: str = Field(..., description="Unique identifier for the type")
    name: str = Field(..., description="Display name of the type")
    python_type: str = Field(..., description="Python type representation (e.g., 'str', 'int', 'bool')")
    description: str = Field(default="", description="Optional description of the type")
    is_builtin: bool = Field(default=True, description="Whether this is a built-in Python type")
    is_nullable: bool = Field(default=False, description="Whether this type can be null/None")
    default_value: Optional[Union[str, int, float, bool]] = Field(
        default=None,
        description="Default value for this type"
    )
    owner_id: str = Field(..., description="User ID from Clerk JWT")
    account_id: str = Field(..., description="Account ID from Clerk JWT")
    created_at: datetime = Field(..., description="ISO 8601 timestamp of creation")
    updated_at: datetime = Field(..., description="ISO 8601 timestamp of last update")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "type_1",
                    "name": "String",
                    "python_type": "str",
                    "description": "Text string type",
                    "is_builtin": True,
                    "is_nullable": False,
                    "default_value": "",
                    "owner_id": "user_test123",
                    "account_id": "acct_test123",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
            ]
        }
    }

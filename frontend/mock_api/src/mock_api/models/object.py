"""Object model definition."""

from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class Object(BaseModel):
    """Represents a data object (e.g., database table)."""

    id: str = Field(..., description="Unique identifier for the object")
    name: str = Field(..., description="Display name of the object")
    description: str = Field(default="", description="Optional description of the object")
    field_ids: List[str] = Field(
        default_factory=list,
        description="Array of Field IDs that belong to this object"
    )
    namespace: str = Field(default="", description="Optional namespace for organizing objects")
    table_name: str = Field(default="", description="Database table name for this object")
    is_active: bool = Field(default=True, description="Whether this object is active")
    owner_id: str = Field(..., description="User ID from Clerk JWT")
    account_id: str = Field(..., description="Account ID from Clerk JWT")
    created_at: datetime = Field(..., description="ISO 8601 timestamp of creation")
    updated_at: datetime = Field(..., description="ISO 8601 timestamp of last update")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "obj_1",
                    "name": "User",
                    "description": "User account object",
                    "field_ids": ["field_1", "field_2", "field_3", "field_4"],
                    "namespace": "user",
                    "table_name": "users",
                    "is_active": True,
                    "owner_id": "user_test123",
                    "account_id": "acct_test123",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
            ]
        }
    }

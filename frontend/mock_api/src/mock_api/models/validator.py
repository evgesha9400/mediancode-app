"""Validator model definition."""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class ValidatorType(str, Enum):
    """Types of validators available."""
    LENGTH = "length"
    RANGE = "range"
    PATTERN = "pattern"
    CUSTOM = "custom"


class Validator(BaseModel):
    """Represents a validation rule for fields."""

    id: str = Field(..., description="Unique identifier for the validator")
    name: str = Field(..., description="Display name of the validator")
    validator_type: ValidatorType = Field(..., description="Type of validation to perform")
    description: str = Field(default="", description="Optional description of the validator")
    config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Configuration for the validator (e.g., min/max for range, regex for pattern)"
    )
    error_message: str = Field(
        default="Validation failed",
        description="Error message to display on validation failure"
    )
    owner_id: str = Field(..., description="User ID from Clerk JWT")
    account_id: str = Field(..., description="Account ID from Clerk JWT")
    created_at: datetime = Field(..., description="ISO 8601 timestamp of creation")
    updated_at: datetime = Field(..., description="ISO 8601 timestamp of last update")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "val_1",
                    "name": "Email Format",
                    "validator_type": "pattern",
                    "description": "Validates email addresses",
                    "config": {
                        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                    },
                    "error_message": "Invalid email format",
                    "owner_id": "user_test123",
                    "account_id": "acct_test123",
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
            ]
        }
    }

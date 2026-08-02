# src/api/schemas/members.py
"""Pydantic schemas for unified object members (field + relationship)."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from api.schemas.literals import FieldRole, RelationshipKind

# ---------------------------------------------------------------------------
# Input schemas (create/update)
# ---------------------------------------------------------------------------


class FieldMemberInput(BaseModel):
    """Input schema for a field-backed member.

    :ivar id: Existing member ID for reconcile-by-ID updates (omit for new).
    :ivar member_type: Discriminator, always ``"field"``.
    :ivar name: Member name on the object.
    :ivar field_id: Reference to the field definition.
    :ivar role: Structural role of the field.
    :ivar is_nullable: Whether the field is nullable.
    :ivar default_value: Optional literal default value.
    """

    id: UUID | None = None
    member_type: Literal["field"] = Field("field", alias="memberType")
    name: str
    field_id: UUID = Field(..., alias="fieldId")
    role: FieldRole = Field(default="writable")
    is_nullable: bool = Field(default=False, alias="isNullable")
    default_value: str | None = Field(default=None, alias="defaultValue")

    model_config = ConfigDict(populate_by_name=True)


class RelationshipMemberInput(BaseModel):
    """Input schema for a relationship member.

    :ivar id: Existing member ID for reconcile-by-ID updates (omit for new).
    :ivar member_type: Discriminator, always ``"relationship"``.
    :ivar name: Relationship name on the source object.
    :ivar target_object_id: Reference to the target object.
    :ivar kind: Relationship kind.
    :ivar inverse_name: Name for the derived reverse field on the target.
    :ivar required: Whether the target relationship is required.
    """

    id: UUID | None = None
    member_type: Literal["relationship"] = Field("relationship", alias="memberType")
    name: str
    target_object_id: UUID = Field(..., alias="targetObjectId")
    kind: RelationshipKind
    inverse_name: str = Field(..., alias="inverseName")
    required: bool = True

    model_config = ConfigDict(populate_by_name=True)


MemberInput = Annotated[
    FieldMemberInput | RelationshipMemberInput,
    Field(discriminator="member_type"),
]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class FieldMemberResponse(BaseModel):
    """Response schema for a field member.

    :ivar id: Unique identifier.
    :ivar member_type: Discriminator, always ``"field"``.
    :ivar name: Member name.
    :ivar field_id: Reference to the field definition.
    :ivar role: Structural role.
    :ivar is_nullable: Whether the field is nullable.
    :ivar default_value: Optional literal default value.
    """

    id: UUID
    member_type: Literal["field"] = Field("field", alias="memberType")
    name: str
    field_id: UUID = Field(..., alias="fieldId")
    role: str
    is_nullable: bool = Field(default=False, alias="isNullable")
    default_value: str | None = Field(default=None, alias="defaultValue")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class RelationshipMemberResponse(BaseModel):
    """Response schema for a relationship member.

    :ivar id: Unique identifier.
    :ivar member_type: Discriminator, always ``"relationship"``.
    :ivar name: Relationship name.
    :ivar target_object_id: Reference to the target object.
    :ivar kind: Relationship kind.
    :ivar inverse_name: Derived reverse field name.
    :ivar required: Whether the target relationship is required.
    """

    id: UUID
    member_type: Literal["relationship"] = Field("relationship", alias="memberType")
    name: str
    target_object_id: UUID = Field(..., alias="targetObjectId")
    kind: str
    inverse_name: str = Field(..., alias="inverseName")
    required: bool = True

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


MemberResponse = Annotated[
    FieldMemberResponse | RelationshipMemberResponse,
    Field(discriminator="member_type"),
]


class DerivedRelationshipResponse(BaseModel):
    """Read-only derived (incoming) relationship computed from other objects.

    :ivar name: Inverse field name on this object.
    :ivar source_object: Name of the object that authored the relationship.
    :ivar source_object_id: ID of the object that authored the relationship.
    :ivar source_field: Authored relationship field name on the source.
    :ivar kind: Relationship kind.
    :ivar side: Which side of the relationship this object is on.
    :ivar required: Whether the target-side relationship is required.
    """

    name: str
    source_object: str = Field(..., alias="sourceObject")
    source_object_id: UUID = Field(..., alias="sourceObjectId")
    source_field: str = Field(..., alias="sourceField")
    kind: str
    side: str
    required: bool = True

    model_config = ConfigDict(populate_by_name=True)

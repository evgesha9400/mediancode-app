# src/api/services/object_membership.py
"""Object Membership module for object member lifecycle rules."""

from typing import cast
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.database import (
    AppliedModelValidatorModel,
    FieldModel,
    ModelValidatorTemplateModel,
    ObjectDefinition,
    TypeModel,
)
from api.models.members import FieldMember, ObjectMember, RelationshipMember
from api.schemas.members import (
    DerivedRelationshipResponse,
    FieldMemberInput,
    FieldMemberResponse,
    MemberResponse,
    RelationshipMemberInput,
    RelationshipMemberResponse,
)
from api.schemas.object import ModelValidatorInput, ModelValidatorResponse
from api_craft.models.enums import RelationshipKind
from api_craft.models.validation_catalog import ALLOWED_PK_TYPES
from api_craft.relationship_derivation import derive_relationship


class ObjectMembership:
    """Own Object Membership validation, persistence, and response facts.

    :ivar db: Async database session.
    """

    _GENERATED_ROLES = {
        "pk",
        "created_timestamp",
        "updated_timestamp",
        "generated_uuid",
    }

    _ROLE_TYPE_CONSTRAINTS: dict[str, set[str]] = {
        "pk": ALLOWED_PK_TYPES,
        "created_timestamp": {"datetime", "date"},
        "updated_timestamp": {"datetime", "date"},
        "generated_uuid": {"uuid"},
    }

    def __init__(self, db: AsyncSession) -> None:
        """Initialize Object Membership for a database session.

        :param db: Async database session.
        """
        self.db = db

    async def validate_members(
        self,
        members: list[FieldMemberInput | RelationshipMemberInput],
        object_id: UUID,
    ) -> None:
        """Validate Object Members before persisting.

        :param members: List of member inputs.
        :param object_id: The owning Object ID.
        :raises HTTPException: On validation failure.
        """
        scalars = [m for m in members if isinstance(m, FieldMemberInput)]
        relationships = [m for m in members if isinstance(m, RelationshipMemberInput)]

        names = [m.name for m in members]
        if len(names) != len(set(names)):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Duplicate member names are not allowed.",
            )

        await self._validate_role_field_types(scalars)

        for rel in relationships:
            await self._validate_relationship_member(rel, object_id)

        for member in members:
            if member.id is None:
                continue
            existing = await self.db.get(ObjectMember, member.id)
            expected_type = (
                "field" if isinstance(member, FieldMemberInput) else "relationship"
            )
            if existing and existing.member_type != expected_type:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=(
                        f"Cannot change member type for id '{member.id}': "
                        f"was '{existing.member_type}', got '{expected_type}'."
                    ),
                )

    async def set_members(
        self,
        obj: ObjectDefinition,
        members: list[FieldMemberInput | RelationshipMemberInput],
    ) -> None:
        """Create Object Members for a new Object.

        :param obj: The Object to create members for.
        :param members: Ordered list of member inputs.
        """
        for position, member in enumerate(members):
            self._create_member(obj.id, member, position)
        await self.db.flush()

    async def reconcile_members(
        self,
        obj: ObjectDefinition,
        members: list[FieldMemberInput | RelationshipMemberInput],
    ) -> None:
        """Reconcile Object Members by ID.

        :param obj: The Object to update members for.
        :param members: Complete members array from the request.
        :raises HTTPException: If an incoming member ID is unknown or mis-owned.
        """
        incoming_ids = {m.id for m in members if m.id is not None}

        existing_members = await self.db.execute(
            select(ObjectMember).where(ObjectMember.object_id == obj.id)
        )
        for existing_member in existing_members.scalars().all():
            if existing_member.id not in incoming_ids:
                await self.db.delete(existing_member)
        await self.db.flush()

        for position, member in enumerate(members):
            if member.id is None:
                self._create_member(obj.id, member, position)
                continue

            stored = await self.db.get(ObjectMember, member.id)
            if stored is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Unknown member id {member.id}. "
                        "New members must be sent without an `id` field."
                    ),
                )
            if stored.object_id != obj.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Member id {member.id} belongs to a different object; "
                        "cannot move members across objects via update."
                    ),
                )

            stored.name = member.name
            stored.position = position
            if isinstance(member, FieldMemberInput):
                if not isinstance(stored, FieldMember):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=(
                            f"Cannot change member type for id '{member.id}': "
                            "was 'relationship', got 'field'."
                        ),
                    )
                stored.field_id = member.field_id
                stored.role = member.role
                is_nullable, default_value = self._scalar_storage_values(member)
                stored.is_nullable = is_nullable
                stored.default_value = default_value
            else:
                if not isinstance(stored, RelationshipMember):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=(
                            f"Cannot change member type for id '{member.id}': "
                            "was 'field', got 'relationship'."
                        ),
                    )
                stored.target_object_id = member.target_object_id
                stored.kind = member.kind
                stored.inverse_name = member.inverse_name
                stored.required = member.required

        await self.db.flush()

    async def set_validators(
        self, obj: ObjectDefinition, validators: list[ModelValidatorInput]
    ) -> None:
        """Replace model validators for an Object.

        :param obj: The Object model.
        :param validators: New validator inputs; empty list clears all.
        :raises ValueError: If a validator template does not exist.
        """
        await self.db.execute(
            delete(AppliedModelValidatorModel).where(
                AppliedModelValidatorModel.object_id == obj.id
            )
        )
        for position, validator_input in enumerate(validators):
            template = await self.db.get(
                ModelValidatorTemplateModel, validator_input.template_id
            )
            if not template:
                raise ValueError(
                    f"Model validator template not found: {validator_input.template_id}"
                )
            validator = AppliedModelValidatorModel(
                object_id=obj.id,
                template_id=validator_input.template_id,
                parameters=validator_input.parameters,
                field_mappings=validator_input.field_mappings,
                position=position,
            )
            self.db.add(validator)
        await self.db.flush()

    async def delete_incoming_relationship_members(self, object_id: UUID) -> None:
        """Delete Relationship Members that target an Object.

        :param object_id: Target Object ID.
        """
        incoming_ids_subq = (
            select(RelationshipMember.id)
            .where(RelationshipMember.target_object_id == object_id)
            .scalar_subquery()
        )
        await self.db.execute(
            delete(ObjectMember).where(ObjectMember.id.in_(incoming_ids_subq))
        )

    async def derived_relationships(
        self, object_id: UUID
    ) -> list[DerivedRelationshipResponse]:
        """Compute derived relationships targeting an Object.

        :param object_id: Target Object ID.
        :returns: List of derived relationship response schemas.
        """
        query = (
            select(RelationshipMember)
            .where(RelationshipMember.target_object_id == object_id)
            .options(selectinload(RelationshipMember.parent_object))
        )
        result = await self.db.execute(query)
        incoming = result.scalars().all()

        derived: list[DerivedRelationshipResponse] = []
        for rel in incoming:
            source_obj = rel.parent_object
            source_name = source_obj.name if source_obj else "Unknown"
            source_obj_id = source_obj.id if source_obj else rel.object_id

            try:
                derivation = derive_relationship(
                    source_object_name=source_name,
                    target_object_name="Unknown",
                    source_member_name=rel.name,
                    target_member_name=rel.inverse_name,
                    kind=cast(RelationshipKind, rel.kind),
                    required=rel.required,
                    source_object_id=source_obj_id,
                    target_object_id=object_id,
                )
            except ValueError:
                continue

            derived.append(
                DerivedRelationshipResponse(
                    name=derivation.target_member_name,
                    sourceObject=derivation.source_object_name,
                    sourceObjectId=source_obj_id,
                    sourceField=derivation.source_member_name,
                    kind=derivation.kind,
                    side=derivation.target_object_side,
                    required=rel.required,
                )
            )
        return derived

    def member_responses(self, obj: ObjectDefinition) -> list[MemberResponse]:
        """Build ordered response schemas for an Object's members.

        :param obj: Object model with members loaded.
        :returns: Ordered member response schemas.
        """
        responses: list[MemberResponse] = []
        for member in sorted(obj.members, key=lambda item: item.position):
            if isinstance(member, FieldMember):
                responses.append(
                    FieldMemberResponse(
                        id=member.id,
                        memberType="field",
                        name=member.name,
                        fieldId=member.field_id,
                        role=member.role,
                        isNullable=member.is_nullable,
                        defaultValue=member.default_value,
                    )
                )
            elif isinstance(member, RelationshipMember):
                responses.append(
                    RelationshipMemberResponse(
                        id=member.id,
                        memberType="relationship",
                        name=member.name,
                        targetObjectId=member.target_object_id,
                        kind=member.kind,
                        inverseName=member.inverse_name,
                        required=member.required,
                    )
                )
        return responses

    def validator_responses(
        self, obj: ObjectDefinition
    ) -> list[ModelValidatorResponse]:
        """Build ordered response schemas for an Object's model validators.

        :param obj: Object model with validators loaded.
        :returns: Ordered model validator response schemas.
        """
        return [
            ModelValidatorResponse(
                id=validator.id,
                templateId=validator.template_id,
                parameters=validator.parameters,
                fieldMappings=validator.field_mappings,
            )
            for validator in sorted(obj.validators, key=lambda item: item.position)
        ]

    async def _validate_relationship_member(
        self,
        rel: RelationshipMemberInput,
        object_id: UUID,
    ) -> None:
        """Validate one Relationship Member.

        :param rel: Relationship member input.
        :param object_id: Owning Object ID.
        :raises HTTPException: On validation failure.
        """
        if rel.kind == "many_to_many" and rel.required:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="many_to_many relationships cannot be required.",
            )

        if rel.target_object_id == object_id and rel.inverse_name == rel.name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"Self-referential relationship '{rel.name}' "
                    f"must have a different inverse_name."
                ),
            )

        existing_inverse_query = (
            select(func.count())
            .select_from(RelationshipMember)
            .where(
                RelationshipMember.target_object_id == rel.target_object_id,
                RelationshipMember.inverse_name == rel.inverse_name,
            )
        )
        if rel.id:
            existing_inverse_query = existing_inverse_query.where(
                RelationshipMember.id != rel.id
            )
        result = await self.db.execute(existing_inverse_query)
        if (result.scalar() or 0) > 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"inverse_name '{rel.inverse_name}' already exists "
                    f"on target object '{rel.target_object_id}'."
                ),
            )

        name_collision_query = (
            select(func.count())
            .select_from(ObjectMember)
            .where(
                ObjectMember.object_id == rel.target_object_id,
                ObjectMember.name == rel.inverse_name,
            )
        )
        result = await self.db.execute(name_collision_query)
        if (result.scalar() or 0) > 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"inverse_name '{rel.inverse_name}' collides with an existing "
                    f"member name on target object '{rel.target_object_id}'."
                ),
            )

        incoming_inverse_query = (
            select(func.count())
            .select_from(RelationshipMember)
            .where(
                RelationshipMember.target_object_id == object_id,
                RelationshipMember.inverse_name == rel.name,
            )
        )
        if rel.id:
            incoming_inverse_query = incoming_inverse_query.where(
                RelationshipMember.id != rel.id
            )
        result = await self.db.execute(incoming_inverse_query)
        if (result.scalar() or 0) > 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"Member name '{rel.name}' collides with an incoming "
                    f"inverse_name targeting this object."
                ),
            )

    async def _validate_role_field_types(self, scalars: list[FieldMemberInput]) -> None:
        """Validate constrained field member roles against field types.

        :param scalars: Scalar member inputs.
        :raises HTTPException: If role and field type are incompatible.
        """
        role_field_ids: dict[str, list[UUID]] = {}
        for scalar in scalars:
            if scalar.role in self._ROLE_TYPE_CONSTRAINTS:
                role_field_ids.setdefault(scalar.role, []).append(scalar.field_id)

        pk_count = sum(1 for scalar in scalars if scalar.role == "pk")
        if pk_count > 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="An object may have at most one primary key field.",
            )

        all_constrained_ids = [
            field_id for field_ids in role_field_ids.values() for field_id in field_ids
        ]
        if not all_constrained_ids:
            return

        result = await self.db.execute(
            select(FieldModel.id, TypeModel.name)
            .join(TypeModel, FieldModel.type_id == TypeModel.id)
            .where(FieldModel.id.in_(all_constrained_ids))
        )
        field_type_map = {
            row[0]: (row[1].split(".")[0] if "." in row[1] else row[1])
            for row in result.all()
        }

        for role, field_ids in role_field_ids.items():
            allowed = self._ROLE_TYPE_CONSTRAINTS[role]
            for field_id in field_ids:
                base_type = field_type_map.get(field_id)
                if base_type and base_type not in allowed:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=(
                            f"Field type '{base_type}' is not compatible with "
                            f"role '{role}'. Allowed types: "
                            f"{', '.join(sorted(allowed))}."
                        ),
                    )

    def _create_member(
        self,
        object_id: UUID,
        member: FieldMemberInput | RelationshipMemberInput,
        position: int,
    ) -> None:
        """Create one Object Member row.

        :param object_id: Owning Object ID.
        :param member: Member input schema.
        :param position: Position index.
        """
        row: ObjectMember
        if isinstance(member, FieldMemberInput):
            is_nullable, default_value = self._scalar_storage_values(member)
            row = FieldMember(
                object_id=object_id,
                name=member.name,
                position=position,
                field_id=member.field_id,
                role=member.role,
                is_nullable=is_nullable,
                default_value=default_value,
            )
        else:
            row = RelationshipMember(
                object_id=object_id,
                name=member.name,
                position=position,
                target_object_id=member.target_object_id,
                kind=member.kind,
                inverse_name=member.inverse_name,
                required=member.required,
            )
        self.db.add(row)

    def _scalar_storage_values(
        self, member: FieldMemberInput
    ) -> tuple[bool, str | None]:
        """Return normalized persistence values for a Field Member.

        :param member: Scalar member input.
        :returns: Tuple of ``is_nullable`` and ``default_value``.
        """
        if member.role in self._GENERATED_ROLES:
            return False, None
        return member.is_nullable, member.default_value

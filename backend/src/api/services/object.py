# src/api/services/object.py
"""Service layer for Object operations."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectin_polymorphic, selectinload

from api.models.database import (
    ApiEndpoint,
    AppliedModelValidatorModel,
    Namespace,
    ObjectDefinition,
)
from api.models.members import FieldMember, ObjectMember, RelationshipMember
from api.schemas.object import ObjectCreate, ObjectResponse, ObjectUpdate
from api.services.base import BaseService
from api.services.object_membership import ObjectMembership


class ObjectService(BaseService[ObjectDefinition]):
    """Service for Object CRUD operations.

    :ivar model_class: The ObjectDefinition model class.
    :ivar membership: Object Membership module for member lifecycle rules.
    """

    model_class = ObjectDefinition

    def __init__(self, db: AsyncSession) -> None:
        """Initialize the service with its Object Membership module.

        :param db: Async database session.
        """
        super().__init__(db)
        self.membership = ObjectMembership(db)

    def _object_load_options(self):
        """Standard eager-load options for object queries."""
        return [
            selectinload(ObjectDefinition.members).options(
                selectin_polymorphic(ObjectMember, [FieldMember, RelationshipMember]),
                selectinload(FieldMember.field),
            ),
            selectinload(ObjectDefinition.validators).selectinload(
                AppliedModelValidatorModel.template
            ),
        ]

    async def list_for_user(
        self,
        user_id: UUID,
        namespace_id: str | None = None,
    ) -> list[ObjectDefinition]:
        """List Objects owned by a user.

        :param user_id: The authenticated user's ID.
        :param namespace_id: Optional namespace filter.
        :returns: List of user's Objects with members and validators loaded.
        """
        query = (
            select(ObjectDefinition)
            .join(Namespace)
            .options(*self._object_load_options())
            .where(self.namespace_access.owned_namespace_filter(user_id))
        )
        if namespace_id:
            query = query.where(ObjectDefinition.namespace_id == namespace_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id_for_user(
        self, object_id: str, user_id: UUID
    ) -> ObjectDefinition | None:
        """Get an Object if owned by the user.

        :param object_id: The Object's unique identifier.
        :param user_id: The authenticated user's ID.
        :returns: The Object if owned by user, None otherwise.
        """
        query = (
            select(ObjectDefinition)
            .join(Namespace)
            .options(*self._object_load_options())
            .where(
                ObjectDefinition.id == object_id,
                self.namespace_access.owned_namespace_filter(user_id),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_for_user(
        self, user_id: UUID, data: ObjectCreate
    ) -> ObjectDefinition:
        """Create a new Object for a user.

        :param user_id: The authenticated user's ID.
        :param data: Object creation data.
        :returns: The created Object.
        :raises HTTPException: If namespace not owned by user.
        """
        await self.namespace_access.require_owned_namespace(data.namespace_id, user_id)

        obj = ObjectDefinition(
            namespace_id=data.namespace_id,
            user_id=user_id,
            name=data.name,
            description=data.description,
        )
        self.db.add(obj)
        await self.db.flush()

        await self.membership.validate_members(data.members, obj.id)
        await self.membership.set_members(obj, data.members)

        if data.validators:
            await self.membership.set_validators(obj, data.validators)

        await self.db.refresh(obj)
        return obj

    async def update_object(
        self, obj: ObjectDefinition, data: ObjectUpdate
    ) -> ObjectDefinition:
        """Update an Object.

        :param obj: The Object to update.
        :param data: Update data.
        :returns: The updated Object.
        """
        if data.name is not None:
            obj.name = data.name
        if data.description is not None:
            obj.description = data.description
        if data.members is not None:
            await self.membership.validate_members(data.members, obj.id)
            await self.membership.reconcile_members(obj, data.members)

        if data.validators is not None:
            await self.membership.set_validators(obj, data.validators)

        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete_object(self, obj: ObjectDefinition) -> None:
        """Delete an Object if not in use.

        :param obj: The Object to delete.
        :raises HTTPException: If Object is used in endpoints.
        """
        usage_count = await self._count_endpoint_usage(obj.id)

        if usage_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete object: used in {usage_count} endpoints",
            )

        await self.membership.delete_incoming_relationship_members(obj.id)
        await self.db.delete(obj)
        await self.db.flush()

    async def to_response(self, obj: ObjectDefinition) -> ObjectResponse:
        """Convert an Object model to a response schema.

        :param obj: Object database model.
        :returns: Object response schema.
        """
        return ObjectResponse(
            id=obj.id,
            namespaceId=obj.namespace_id,
            name=obj.name,
            description=obj.description,
            members=self.membership.member_responses(obj),
            derivedRelationships=await self.membership.derived_relationships(obj.id),
            usedInApis=await self.get_used_in_apis(obj.id),
            validators=self.membership.validator_responses(obj),
        )

    async def get_used_in_apis(self, object_id: UUID) -> list[UUID]:
        """Get API IDs where an Object is used.

        :param object_id: The Object's ID.
        :returns: List of API IDs.
        """
        query = (
            select(ApiEndpoint.api_id)
            .where(ApiEndpoint.target_object_id == object_id)
            .distinct()
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def _count_endpoint_usage(self, object_id: UUID) -> int:
        """Count endpoints where an Object is used.

        :param object_id: The Object's ID.
        :returns: Endpoint usage count.
        """
        count_query = (
            select(func.count())
            .select_from(ApiEndpoint)
            .where(ApiEndpoint.target_object_id == object_id)
        )
        result = await self.db.execute(count_query)
        return result.scalar() or 0


def get_object_service(db: AsyncSession) -> ObjectService:
    """Factory function for ObjectService.

    :param db: Database session.
    :returns: ObjectService instance.
    """
    return ObjectService(db)

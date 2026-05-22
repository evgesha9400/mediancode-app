# src/api/services/field_constraint.py
"""Service layer for Field Constraint operations."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.database import (
    FieldConstraintModel,
    FieldConstraintValueAssociation,
    FieldModel,
    Namespace,
)
from api.schemas.field_constraint import FieldConstraintResponse
from api.services.base import BaseService


class FieldConstraintService(BaseService[FieldConstraintModel]):
    """Service for Field Constraint read operations.

    :ivar model_class: The FieldConstraintModel model class.
    """

    model_class = FieldConstraintModel

    async def list_for_user(
        self,
        user_id: UUID,
        namespace_id: str | None = None,
    ) -> list[FieldConstraintModel]:
        """List field constraints visible to a user (own namespaces + system namespace).

        :param user_id: The authenticated user's ID.
        :param namespace_id: Optional namespace filter.
        :returns: List of visible field constraints.
        """
        query = (
            select(FieldConstraintModel)
            .join(Namespace)
            .where(self.namespace_access.visible_catalog_filter(user_id))
        )
        if namespace_id:
            query = query.where(FieldConstraintModel.namespace_id == namespace_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id_for_user(
        self, constraint_id: str, user_id: UUID
    ) -> FieldConstraintModel | None:
        """Get a field constraint if owned by the user.

        System namespace constraints (``user_id IS NULL``) are excluded, so
        this method returns ``None`` for them — making it safe to use as a gate
        before mutation operations.

        :param constraint_id: The constraint's unique identifier.
        :param user_id: The authenticated user's ID.
        :returns: The constraint if owned by user, None otherwise.
        """
        query = (
            select(FieldConstraintModel)
            .join(Namespace)
            .where(
                FieldConstraintModel.id == constraint_id,
                self.namespace_access.owned_namespace_filter(user_id),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_field_counts_for_user(self, user_id: UUID) -> dict[str, int]:
        """Get count of fields per constraint, scoped to the current user's fields.

        :param user_id: The authenticated user's ID.
        :returns: Dict mapping constraint ID (as string) to field count.
        """
        query = (
            select(
                FieldConstraintValueAssociation.constraint_id,
                func.count(FieldConstraintValueAssociation.id),
            )
            .join(FieldModel)
            .join(Namespace)
            .where(self.namespace_access.owned_namespace_filter(user_id))
            .group_by(FieldConstraintValueAssociation.constraint_id)
        )
        result = await self.db.execute(query)
        return {str(row[0]): row[1] for row in result.fetchall()}

    async def list_responses_for_user(
        self,
        user_id: UUID,
        namespace_id: str | None = None,
    ) -> list[FieldConstraintResponse]:
        """List field constraint response schemas visible to a user.

        :param user_id: The authenticated user's ID.
        :param namespace_id: Optional namespace filter.
        :returns: List of field constraint response schemas.
        """
        constraints = await self.list_for_user(user_id, namespace_id)
        field_counts = await self.get_field_counts_for_user(user_id)
        return [
            self.to_response(constraint, field_counts) for constraint in constraints
        ]

    def to_response(
        self,
        constraint: FieldConstraintModel,
        field_counts: dict[str, int],
    ) -> FieldConstraintResponse:
        """Convert a Field Constraint model to a response schema.

        :param constraint: Field Constraint database model.
        :param field_counts: Field usage counts keyed by constraint ID.
        :returns: Field Constraint response schema.
        """
        return FieldConstraintResponse(
            id=constraint.id,
            namespaceId=constraint.namespace_id,
            name=constraint.name,
            description=constraint.description,
            parameterTypes=constraint.parameter_types,
            docsUrl=constraint.docs_url,
            compatibleTypes=constraint.compatible_types,
            usedInFields=field_counts.get(str(constraint.id), 0),
        )


def get_field_constraint_service(db: AsyncSession) -> FieldConstraintService:
    """Factory function for FieldConstraintService.

    :param db: Database session.
    :returns: FieldConstraintService instance.
    """
    return FieldConstraintService(db)

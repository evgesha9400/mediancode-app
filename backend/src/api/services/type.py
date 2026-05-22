# src/api/services/type.py
"""Service layer for Type operations."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.database import FieldModel, Namespace, TypeModel
from api.services.base import BaseService


class TypeService(BaseService[TypeModel]):
    """Service for Type read operations.

    :ivar model_class: The TypeModel model class.
    """

    model_class = TypeModel

    async def list_for_user(
        self,
        user_id: UUID,
        namespace_id: str | None = None,
    ) -> list[TypeModel]:
        """List types visible to a user (own namespaces + system namespace).

        :param user_id: The authenticated user's ID.
        :param namespace_id: Optional namespace filter.
        :returns: List of visible types.
        """
        query = (
            select(TypeModel)
            .join(Namespace)
            .where(self.namespace_access.visible_catalog_filter(user_id))
        )
        if namespace_id:
            query = query.where(TypeModel.namespace_id == namespace_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id_for_user(
        self, type_id: str, user_id: UUID
    ) -> TypeModel | None:
        """Get a type if owned by the user.

        System namespace types (``user_id IS NULL``) are excluded, so this
        method returns ``None`` for them — making it safe to use as a gate
        before mutation operations.

        :param type_id: The type's unique identifier.
        :param user_id: The authenticated user's ID.
        :returns: The type if owned by user, None otherwise.
        """
        query = (
            select(TypeModel)
            .join(Namespace)
            .where(
                TypeModel.id == type_id,
                self.namespace_access.owned_namespace_filter(user_id),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_field_counts_for_user(self, user_id: UUID) -> dict[str, int]:
        """Get count of fields per type, scoped to the current user's fields.

        :param user_id: The authenticated user's ID.
        :returns: Dict mapping type ID (as string) to field count.
        """
        query = (
            select(FieldModel.type_id, func.count(FieldModel.id))
            .join(Namespace)
            .where(self.namespace_access.owned_namespace_filter(user_id))
            .group_by(FieldModel.type_id)
        )
        result = await self.db.execute(query)
        return {str(row[0]): row[1] for row in result.fetchall()}


def get_type_service(db: AsyncSession) -> TypeService:
    """Factory function for TypeService.

    :param db: Database session.
    :returns: TypeService instance.
    """
    return TypeService(db)

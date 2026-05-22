# src/api/services/namespace_access.py
"""Namespace visibility and mutability rules."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from api.models.database import Namespace
from api.settings import get_settings


class NamespaceAccess:
    """Centralized namespace access rules for service-layer queries.

    :ivar db: Async database session.
    """

    def __init__(self, db: AsyncSession) -> None:
        """Initialize namespace access with a database session.

        :param db: Async database session.
        """
        self.db = db

    def owned_namespace_filter(self, user_id: UUID) -> ColumnElement[bool]:
        """Build a filter for namespaces owned by a user.

        :param user_id: The authenticated user's ID.
        :returns: SQLAlchemy filter expression.
        """
        return Namespace.user_id == user_id

    def visible_catalog_filter(self, user_id: UUID) -> ColumnElement[bool]:
        """Build a filter for user-owned plus system catalog namespaces.

        :param user_id: The authenticated user's ID.
        :returns: SQLAlchemy filter expression.
        """
        settings = get_settings()
        return or_(
            Namespace.user_id == user_id,
            Namespace.id == settings.system_namespace_id,
        )

    async def list_owned_namespaces(self, user_id: UUID) -> list[Namespace]:
        """List namespaces owned by a user.

        :param user_id: The authenticated user's ID.
        :returns: List of owned namespaces.
        """
        result = await self.db.execute(
            select(Namespace).where(self.owned_namespace_filter(user_id))
        )
        return list(result.scalars().all())

    async def get_owned_namespace(
        self, namespace_id: Any, user_id: UUID
    ) -> Namespace | None:
        """Get a namespace only if the user owns it.

        :param namespace_id: The namespace ID to load.
        :param user_id: The authenticated user's ID.
        :returns: The namespace if owned by user, None otherwise.
        """
        result = await self.db.execute(
            select(Namespace).where(
                Namespace.id == namespace_id,
                self.owned_namespace_filter(user_id),
            )
        )
        return result.scalar_one_or_none()

    async def require_owned_namespace(
        self, namespace_id: Any, user_id: UUID
    ) -> Namespace:
        """Return a namespace or raise when it is absent or not owned.

        :param namespace_id: The namespace ID to validate.
        :param user_id: The authenticated user's ID.
        :returns: The validated namespace.
        :raises HTTPException: If namespace not found or not owned by user.
        """
        namespace = await self.get_owned_namespace(namespace_id, user_id)
        if namespace is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Namespace not found or not owned by user",
            )
        return namespace

    def assert_mutable(self, entity: Any) -> None:
        """Raise 403 if an entity belongs to the system namespace.

        :param entity: The entity to check.
        :raises HTTPException: If entity belongs to the system namespace.
        """
        namespace_id = getattr(entity, "namespace_id", None)
        if namespace_id is None:
            return

        settings = get_settings()
        if str(namespace_id) == str(settings.system_namespace_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="System namespace entities are immutable",
            )

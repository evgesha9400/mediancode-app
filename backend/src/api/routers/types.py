# src/api/routers/types.py
"""Router for Type endpoints (read-only)."""

from fastapi import APIRouter

from api.deps import DbSession, ProvisionedUser
from api.schemas.type import TypeResponse
from api.services.type import TypeService, get_type_service

router = APIRouter(prefix="/types", tags=["Types"])


def get_service(db: DbSession) -> TypeService:
    """Get type service instance.

    :param db: Database session.
    :returns: TypeService instance.
    """
    return get_type_service(db)


@router.get(
    "",
    response_model=list[TypeResponse],
    summary="List all types",
    description="Retrieve all type definitions accessible to the authenticated user.",
)
async def list_types(
    user: ProvisionedUser,
    db: DbSession,
    namespace_id: str | None = None,
) -> list[TypeResponse]:
    """List all types accessible to the user.

    :param user: Authenticated user.
    :param db: Database session.
    :param namespace_id: Optional namespace filter.
    :returns: List of type responses.
    """
    service = get_service(db)
    return await service.list_responses_for_user(user.id, namespace_id)

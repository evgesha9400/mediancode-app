# src/api/routers/field_constraints.py
"""Router for Field Constraint endpoints (read-only)."""

from fastapi import APIRouter

from api.deps import DbSession, ProvisionedUser
from api.schemas.field_constraint import FieldConstraintResponse
from api.services.field_constraint import (
    FieldConstraintService,
    get_field_constraint_service,
)

router = APIRouter(prefix="/field-constraints", tags=["Field Constraints"])


def get_service(db: DbSession) -> FieldConstraintService:
    """Get field constraint service instance.

    :param db: Database session.
    :returns: FieldConstraintService instance.
    """
    return get_field_constraint_service(db)


@router.get(
    "",
    response_model=list[FieldConstraintResponse],
    summary="List all field constraints",
    description="Retrieve all field constraint definitions accessible to the authenticated user.",
)
async def list_field_constraints(
    user: ProvisionedUser,
    db: DbSession,
    namespace_id: str | None = None,
) -> list[FieldConstraintResponse]:
    """List all field constraints accessible to the user.

    :param user: Authenticated user.
    :param db: Database session.
    :param namespace_id: Optional namespace filter.
    :returns: List of field constraint responses.
    """
    service = get_service(db)
    return await service.list_responses_for_user(user.id, namespace_id)

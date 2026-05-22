# src/api/routers/objects.py
"""Router for Object endpoints."""

from fastapi import APIRouter, HTTPException, status

from api.deps import DbSession, ProvisionedUser
from api.schemas.object import (
    ObjectCreate,
    ObjectResponse,
    ObjectUpdate,
)
from api.services.object import ObjectService, get_object_service

router = APIRouter(prefix="/objects", tags=["Objects"])


def get_service(db: DbSession) -> ObjectService:
    """Get object service instance.

    :param db: Database session.
    :returns: ObjectService instance.
    """
    return get_object_service(db)


@router.get(
    "",
    response_model=list[ObjectResponse],
    summary="List all objects",
    description="Retrieve all object definitions accessible to the authenticated user.",
)
async def list_objects(
    user: ProvisionedUser,
    db: DbSession,
    namespace_id: str | None = None,
) -> list[ObjectResponse]:
    """List all objects accessible to the user.

    :param user: Authenticated user.
    :param db: Database session.
    :param namespace_id: Optional namespace filter.
    :returns: List of object responses.
    """
    service = get_service(db)
    objects = await service.list_for_user(user.id, namespace_id)
    return [await service.to_response(obj) for obj in objects]


@router.post(
    "",
    response_model=ObjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new object",
    description="Create a new object definition.",
)
async def create_object(
    data: ObjectCreate,
    user: ProvisionedUser,
    db: DbSession,
) -> ObjectResponse:
    """Create a new object.

    :param data: Object creation data.
    :param user: Authenticated user.
    :param db: Database session.
    :returns: Created object response.
    """
    service = get_service(db)
    created = await service.create_for_user(user.id, data)
    # Reload with members
    obj = await service.get_by_id_for_user(str(created.id), user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Object not found after creation",
        )
    return await service.to_response(obj)


@router.get(
    "/{object_id}",
    response_model=ObjectResponse,
    summary="Get object by ID",
    description="Retrieve a specific object by its ID.",
)
async def get_object(
    object_id: str,
    user: ProvisionedUser,
    db: DbSession,
) -> ObjectResponse:
    """Get an object by ID.

    :param object_id: Object unique identifier.
    :param user: Authenticated user.
    :param db: Database session.
    :returns: Object response.
    :raises HTTPException: If object not found.
    """
    service = get_service(db)
    obj = await service.get_by_id_for_user(object_id, user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Object with ID '{object_id}' not found",
        )
    return await service.to_response(obj)


@router.put(
    "/{object_id}",
    response_model=ObjectResponse,
    summary="Update object",
    description="Update an existing object definition.",
)
async def update_object(
    object_id: str,
    data: ObjectUpdate,
    user: ProvisionedUser,
    db: DbSession,
) -> ObjectResponse:
    """Update an object.

    :param object_id: Object unique identifier.
    :param data: Object update data.
    :param user: Authenticated user.
    :param db: Database session.
    :returns: Updated object response.
    :raises HTTPException: If object not found.
    """
    service = get_service(db)
    obj = await service.get_by_id_for_user(object_id, user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Object with ID '{object_id}' not found",
        )

    updated = await service.update_object(obj, data)
    # Reload with members
    reloaded = await service.get_by_id_for_user(str(updated.id), user.id)
    if not reloaded:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Object with ID '{object_id}' not found",
        )
    return await service.to_response(reloaded)


@router.delete(
    "/{object_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete object",
    description="Delete an object. Cannot delete if used in endpoints.",
)
async def delete_object(
    object_id: str,
    user: ProvisionedUser,
    db: DbSession,
) -> None:
    """Delete an object.

    :param object_id: Object unique identifier.
    :param user: Authenticated user.
    :param db: Database session.
    :raises HTTPException: If object not found or in use.
    """
    service = get_service(db)
    obj = await service.get_by_id_for_user(object_id, user.id)
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Object with ID '{object_id}' not found",
        )

    await service.delete_object(obj)

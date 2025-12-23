"""API routes for Objects resource."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from mock_api.auth import get_current_user, UserClaims
from mock_api.data import get_data_store, DataStore
from mock_api.models import Object

router = APIRouter(prefix="/objects", tags=["Objects"])


@router.get(
    "",
    response_model=List[Object],
    summary="List all objects",
    description="Get a list of all objects scoped to the authenticated user/account. Supports pagination and namespace filtering."
)
async def list_objects(
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of results to return"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip"),
    namespace: Optional[str] = Query(default=None, description="Filter by namespace"),
    current_user: UserClaims = Depends(get_current_user),
    store: DataStore = Depends(get_data_store)
) -> List[Object]:
    """List all objects for the authenticated user."""
    return store.list_objects(
        owner_id=current_user.user_id,
        account_id=current_user.account_id,
        limit=limit,
        offset=offset,
        namespace=namespace
    )


@router.get(
    "/{object_id}",
    response_model=Object,
    summary="Get an object by ID",
    description="Get a specific object by ID, scoped to the authenticated user/account.",
    responses={
        404: {"description": "Object not found or access denied"}
    }
)
async def get_object(
    object_id: str,
    current_user: UserClaims = Depends(get_current_user),
    store: DataStore = Depends(get_data_store)
) -> Object:
    """Get an object by ID."""
    object_obj = store.get_object(
        object_id=object_id,
        owner_id=current_user.user_id,
        account_id=current_user.account_id
    )

    if not object_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Object with ID '{object_id}' not found or access denied"
        )

    return object_obj

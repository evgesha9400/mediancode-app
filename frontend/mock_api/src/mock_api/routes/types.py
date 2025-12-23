"""API routes for Types resource."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from mock_api.auth import get_current_user, UserClaims
from mock_api.data import get_data_store, DataStore
from mock_api.models import Type

router = APIRouter(prefix="/types", tags=["Types"])


@router.get(
    "",
    response_model=List[Type],
    summary="List all types",
    description="Get a list of all types scoped to the authenticated user/account. Supports pagination via limit and offset parameters."
)
async def list_types(
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of results to return"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip"),
    namespace: Optional[str] = Query(default=None, description="Filter by namespace"),
    current_user: UserClaims = Depends(get_current_user),
    store: DataStore = Depends(get_data_store)
) -> List[Type]:
    """List all types for the authenticated user."""
    return store.list_types(
        owner_id=current_user.user_id,
        account_id=current_user.account_id,
        limit=limit,
        offset=offset,
        namespace=namespace
    )


@router.get(
    "/{type_id}",
    response_model=Type,
    summary="Get a type by ID",
    description="Get a specific type by ID, scoped to the authenticated user/account.",
    responses={
        404: {"description": "Type not found or access denied"}
    }
)
async def get_type(
    type_id: str,
    current_user: UserClaims = Depends(get_current_user),
    store: DataStore = Depends(get_data_store)
) -> Type:
    """Get a type by ID."""
    type_obj = store.get_type(
        type_id=type_id,
        owner_id=current_user.user_id,
        account_id=current_user.account_id
    )

    if not type_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Type with ID '{type_id}' not found or access denied"
        )

    return type_obj

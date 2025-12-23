"""API routes for Fields resource."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from mock_api.auth import get_current_user, UserClaims
from mock_api.data import get_data_store, DataStore
from mock_api.models import Field

router = APIRouter(prefix="/fields", tags=["Fields"])


@router.get(
    "",
    response_model=List[Field],
    summary="List all fields",
    description="Get a list of all fields scoped to the authenticated user/account. Supports pagination and namespace filtering."
)
async def list_fields(
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of results to return"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip"),
    namespace: Optional[str] = Query(default=None, description="Filter by namespace"),
    current_user: UserClaims = Depends(get_current_user),
    store: DataStore = Depends(get_data_store)
) -> List[Field]:
    """List all fields for the authenticated user."""
    return store.list_fields(
        owner_id=current_user.user_id,
        account_id=current_user.account_id,
        limit=limit,
        offset=offset,
        namespace=namespace
    )


@router.get(
    "/{field_id}",
    response_model=Field,
    summary="Get a field by ID",
    description="Get a specific field by ID, scoped to the authenticated user/account.",
    responses={
        404: {"description": "Field not found or access denied"}
    }
)
async def get_field(
    field_id: str,
    current_user: UserClaims = Depends(get_current_user),
    store: DataStore = Depends(get_data_store)
) -> Field:
    """Get a field by ID."""
    field_obj = store.get_field(
        field_id=field_id,
        owner_id=current_user.user_id,
        account_id=current_user.account_id
    )

    if not field_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID '{field_id}' not found or access denied"
        )

    return field_obj

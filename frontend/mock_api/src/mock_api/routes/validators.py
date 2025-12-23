"""API routes for Validators resource."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

from mock_api.auth import get_current_user, UserClaims
from mock_api.data import get_data_store, DataStore
from mock_api.models import Validator

router = APIRouter(prefix="/validators", tags=["Validators"])


@router.get(
    "",
    response_model=List[Validator],
    summary="List all validators",
    description="Get a list of all validators scoped to the authenticated user/account. Supports pagination via limit and offset parameters."
)
async def list_validators(
    limit: int = Query(default=100, ge=1, le=1000, description="Maximum number of results to return"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip"),
    namespace: Optional[str] = Query(default=None, description="Filter by namespace"),
    current_user: UserClaims = Depends(get_current_user),
    store: DataStore = Depends(get_data_store)
) -> List[Validator]:
    """List all validators for the authenticated user."""
    return store.list_validators(
        owner_id=current_user.user_id,
        account_id=current_user.account_id,
        limit=limit,
        offset=offset,
        namespace=namespace
    )


@router.get(
    "/{validator_id}",
    response_model=Validator,
    summary="Get a validator by ID",
    description="Get a specific validator by ID, scoped to the authenticated user/account.",
    responses={
        404: {"description": "Validator not found or access denied"}
    }
)
async def get_validator(
    validator_id: str,
    current_user: UserClaims = Depends(get_current_user),
    store: DataStore = Depends(get_data_store)
) -> Validator:
    """Get a validator by ID."""
    validator_obj = store.get_validator(
        validator_id=validator_id,
        owner_id=current_user.user_id,
        account_id=current_user.account_id
    )

    if not validator_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validator with ID '{validator_id}' not found or access denied"
        )

    return validator_obj

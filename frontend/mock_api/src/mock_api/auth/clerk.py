"""Clerk JWT authentication dependency."""

import os
import time
from typing import Optional, Dict, Any
from functools import lru_cache

import jwt
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel


class UserClaims(BaseModel):
    """User claims extracted from Clerk JWT."""
    user_id: str
    account_id: str
    email: Optional[str] = None


# Security scheme for Bearer token
security = HTTPBearer()

# Cache for JWKS (JSON Web Key Set)
_jwks_cache: Dict[str, Any] = {}
_jwks_cache_time: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour in seconds


@lru_cache(maxsize=1)
def get_clerk_config() -> Dict[str, str]:
    """Get Clerk configuration from environment variables."""
    jwks_url = os.getenv("CLERK_JWKS_URL")
    issuer = os.getenv("CLERK_ISSUER")
    require_auth = os.getenv("REQUIRE_AUTH", "true").lower() == "true"

    if require_auth and (not jwks_url or not issuer):
        raise ValueError(
            "CLERK_JWKS_URL and CLERK_ISSUER environment variables must be set when REQUIRE_AUTH=true"
        )

    return {
        "jwks_url": jwks_url or "",
        "issuer": issuer or "",
        "require_auth": "true" if require_auth else "false"
    }


def fetch_jwks() -> Dict[str, Any]:
    """Fetch JWKS from Clerk and cache it."""
    global _jwks_cache, _jwks_cache_time

    current_time = time.time()

    # Return cached JWKS if still valid
    if _jwks_cache and (current_time - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    # Fetch new JWKS
    config = get_clerk_config()
    jwks_url = config["jwks_url"]

    if not jwks_url:
        return {}

    try:
        response = httpx.get(jwks_url, timeout=10.0)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = current_time
        return _jwks_cache
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch JWKS: {str(e)}"
        )


def get_signing_key(token: str) -> str:
    """Get the signing key from JWKS for the given token."""
    jwks = fetch_jwks()

    if not jwks:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWKS not available"
        )

    # Get the key ID from token header
    try:
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token header: {str(e)}"
        )

    # Find the matching key in JWKS
    keys = jwks.get("keys", [])
    signing_key = None

    for key in keys:
        if key.get("kid") == kid:
            signing_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
            break

    if not signing_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find signing key"
        )

    return signing_key


def verify_token(token: str) -> Dict[str, Any]:
    """Verify Clerk JWT token and return claims."""
    config = get_clerk_config()

    # For testing/development: allow bypassing auth
    if config["require_auth"] == "false":
        # Return test user claims
        return {
            "sub": "user_test123",
            "org_id": "acct_test123",
            "email": "test@example.com"
        }

    try:
        signing_key = get_signing_key(token)

        # Verify and decode the token
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=config["issuer"],
            options={"verify_aud": False}  # Clerk JWTs may not have audience
        )

        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserClaims:
    """
    FastAPI dependency that extracts and verifies the Bearer token,
    returning the user claims.
    """
    config = get_clerk_config()

    # For testing/development: allow bypassing auth entirely
    if config["require_auth"] == "false":
        # Return test user claims without verifying token
        return UserClaims(
            user_id="user_test123",
            account_id="acct_test123",
            email="test@example.com"
        )

    token = credentials.credentials
    claims = verify_token(token)

    # Extract user_id and account_id from Clerk claims
    # Clerk uses 'sub' for user_id and 'org_id' for organization/account_id
    user_id = claims.get("sub")
    account_id = claims.get("org_id") or claims.get("sub")  # Fallback to user_id if no org
    email = claims.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims: missing user_id"
        )

    return UserClaims(
        user_id=user_id,
        account_id=account_id,
        email=email
    )

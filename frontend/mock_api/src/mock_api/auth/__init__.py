"""Authentication module for Clerk JWT verification."""

from .clerk import get_current_user, UserClaims

__all__ = ["get_current_user", "UserClaims"]

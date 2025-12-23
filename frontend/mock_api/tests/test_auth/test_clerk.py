"""Tests for Clerk authentication."""

import os
import pytest
from mock_api.auth import UserClaims


def test_user_claims_model():
    """Test UserClaims model."""
    claims = UserClaims(
        user_id="user_123",
        account_id="acct_123",
        email="test@example.com"
    )
    assert claims.user_id == "user_123"
    assert claims.account_id == "acct_123"
    assert claims.email == "test@example.com"


def test_user_claims_without_email():
    """Test UserClaims model without email."""
    claims = UserClaims(
        user_id="user_123",
        account_id="acct_123"
    )
    assert claims.user_id == "user_123"
    assert claims.account_id == "acct_123"
    assert claims.email is None


def test_auth_disabled_in_tests():
    """Test that auth is disabled in test environment."""
    assert os.getenv("REQUIRE_AUTH") == "false"

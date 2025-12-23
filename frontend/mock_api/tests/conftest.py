"""Pytest configuration and fixtures."""

import os
import pytest
from fastapi.testclient import TestClient

# Set environment variables for testing BEFORE importing anything
os.environ["REQUIRE_AUTH"] = "false"  # Disable auth for most tests

from mock_api.main import app
from mock_api.data import DataStore
from mock_api.auth.clerk import get_clerk_config

# Clear the lru_cache to pick up the environment variable
get_clerk_config.cache_clear()


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def data_store():
    """Fresh data store for testing."""
    store = DataStore()
    store.load_fixtures()
    return store


@pytest.fixture
def test_user_claims():
    """Test user claims for authentication."""
    from mock_api.auth import UserClaims
    return UserClaims(
        user_id="user_test123",
        account_id="acct_test123",
        email="test@example.com"
    )


@pytest.fixture
def other_user_claims():
    """Other user claims for testing scoping."""
    from mock_api.auth import UserClaims
    return UserClaims(
        user_id="user_other456",
        account_id="acct_other456",
        email="other@example.com"
    )


@pytest.fixture
def auth_headers():
    """Authentication headers with test token."""
    return {"Authorization": "Bearer test-token"}

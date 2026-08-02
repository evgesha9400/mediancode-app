# tests/test_api/test_services/test_namespace_access.py
"""Tests for namespace access rules."""

from types import SimpleNamespace
from uuid import UUID, uuid4

from fastapi import HTTPException
import pytest

from api.services.namespace_access import NamespaceAccess

SYSTEM_NAMESPACE_ID = UUID("00000000-0000-0000-0000-000000000001")


class _Result:
    """Minimal async SQLAlchemy result double."""

    def __init__(self, value):
        """Store a scalar or scalar list result.

        :param value: Result value returned by the fake methods.
        """
        self.value = value

    def scalar_one_or_none(self):
        """Return the configured scalar value."""
        return self.value

    def scalars(self):
        """Return self for chained ``.scalars().all()`` calls."""
        return self

    def all(self):
        """Return the configured scalar list."""
        return self.value


class _DbSession:
    """Minimal async session double."""

    def __init__(self, result):
        """Store the result returned from ``execute``.

        :param result: Fake SQLAlchemy result.
        """
        self.result = result
        self.statement = None

    async def execute(self, statement):
        """Capture and return the configured result.

        :param statement: SQLAlchemy statement being executed.
        :returns: Fake SQLAlchemy result.
        """
        self.statement = statement
        return self.result


@pytest.fixture
def user_id():
    """Return an authenticated user ID."""
    return uuid4()


@pytest.fixture
def namespace(user_id):
    """Return an owned namespace object."""
    return SimpleNamespace(id=uuid4(), user_id=user_id)


@pytest.mark.asyncio
async def test_list_owned_namespaces_returns_result(namespace, user_id):
    """List owned namespaces through the central access module."""
    db = _DbSession(_Result([namespace]))
    access = NamespaceAccess(db)

    result = await access.list_owned_namespaces(user_id)

    assert result == [namespace]
    assert db.statement is not None


@pytest.mark.asyncio
async def test_require_owned_namespace_returns_namespace(namespace, user_id):
    """Return an owned namespace when it exists."""
    db = _DbSession(_Result(namespace))
    access = NamespaceAccess(db)

    result = await access.require_owned_namespace(namespace.id, user_id)

    assert result is namespace
    assert db.statement is not None


@pytest.mark.asyncio
async def test_require_owned_namespace_raises_for_missing_namespace(user_id):
    """Raise the existing 400 response for absent or unowned namespaces."""
    db = _DbSession(_Result(None))
    access = NamespaceAccess(db)

    with pytest.raises(HTTPException) as exc_info:
        await access.require_owned_namespace(uuid4(), user_id)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Namespace not found or not owned by user"


def test_assert_mutable_allows_entities_without_namespace(namespace):
    """Entities without namespace ownership are considered mutable."""
    db = _DbSession(_Result(namespace))
    access = NamespaceAccess(db)

    access.assert_mutable(SimpleNamespace())


def test_assert_mutable_rejects_system_namespace(namespace):
    """Reject writes to system namespace entities."""
    db = _DbSession(_Result(namespace))
    access = NamespaceAccess(db)

    with pytest.raises(HTTPException) as exc_info:
        access.assert_mutable(SimpleNamespace(namespace_id=SYSTEM_NAMESPACE_ID))

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == "System namespace entities are immutable"

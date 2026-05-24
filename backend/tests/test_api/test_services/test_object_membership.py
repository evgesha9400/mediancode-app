# tests/test_api/test_services/test_object_membership.py
"""Tests for Object Membership lifecycle rules."""

from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException
import pytest

from api.models.members import FieldMember, ObjectMember, RelationshipMember
from api.schemas.members import FieldMemberInput, RelationshipMemberInput
from api.services.object_membership import ObjectMembership


class _Result:
    """Minimal async SQLAlchemy result double."""

    def __init__(self, value=None, scalar_value=0):
        """Store scalar-list and scalar results.

        :param value: Value returned from ``.all()``.
        :param scalar_value: Value returned from ``.scalar()``.
        """
        self.value = [] if value is None else value
        self.scalar_value = scalar_value

    def scalars(self):
        """Return self for chained ``.scalars().all()`` calls."""
        return self

    def all(self):
        """Return the configured list value."""
        return self.value

    def scalar(self):
        """Return the configured scalar value."""
        return self.scalar_value


class _DbSession:
    """Minimal async session double."""

    def __init__(self, result=None, get_result=None):
        """Store fake query and get results.

        :param result: Fake result returned from ``execute``.
        :param get_result: Fake model returned from ``get``.
        """
        self.result = result or _Result()
        self.get_result = get_result
        self.added = []
        self.deleted = []
        self.flushed = 0

    async def execute(self, statement):
        """Capture and return the configured result.

        :param statement: SQLAlchemy statement being executed.
        :returns: Fake SQLAlchemy result.
        """
        self.statement = statement
        return self.result

    async def get(self, model, entity_id):
        """Return the configured model.

        :param model: SQLAlchemy model class.
        :param entity_id: Entity ID.
        :returns: Configured model or None.
        """
        self.get_call = (model, entity_id)
        return self.get_result

    def add(self, row):
        """Capture a row added to the session.

        :param row: SQLAlchemy model instance.
        """
        self.added.append(row)

    async def delete(self, row):
        """Capture a row deleted from the session.

        :param row: SQLAlchemy model instance.
        """
        self.deleted.append(row)

    async def flush(self):
        """Record a flush call."""
        self.flushed += 1


def _scalar_input(**overrides):
    """Build a Field Member input.

    :param overrides: Field overrides for the input.
    :returns: FieldMemberInput instance.
    """
    values = {
        "name": "title",
        "field_id": uuid4(),
        "role": "writable",
        "is_nullable": False,
        "default_value": None,
    }
    values.update(overrides)
    return FieldMemberInput(**values)


def test_member_responses_order_and_map_member_types():
    """Build ordered response schemas for scalar and relationship members."""
    object_id = uuid4()
    field_id = uuid4()
    target_id = uuid4()
    scalar = FieldMember(
        id=uuid4(),
        object_id=object_id,
        name="title",
        position=1,
        field_id=field_id,
        role="writable",
        is_nullable=True,
        default_value="Untitled",
    )
    relationship = RelationshipMember(
        id=uuid4(),
        object_id=object_id,
        name="orders",
        position=0,
        target_object_id=target_id,
        kind="one_to_many",
        inverse_name="customer",
        required=True,
    )
    obj = SimpleNamespace(members=[scalar, relationship])

    responses = ObjectMembership(_DbSession()).member_responses(obj)

    assert [response.name for response in responses] == ["orders", "title"]
    assert responses[0].member_type == "relationship"
    assert responses[0].target_object_id == target_id
    assert responses[1].member_type == "field"
    assert responses[1].field_id == field_id


@pytest.mark.asyncio
async def test_validate_members_rejects_duplicate_names():
    """Reject duplicate Object Member names before persistence."""
    membership = ObjectMembership(_DbSession())
    first = _scalar_input(name="title")
    second = _scalar_input(name="title")

    with pytest.raises(HTTPException) as exc_info:
        await membership.validate_members([first, second], uuid4())

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Duplicate member names are not allowed."


@pytest.mark.asyncio
async def test_set_members_forces_generated_role_storage_values():
    """Force generated roles to non-null without literal defaults."""
    db = _DbSession()
    membership = ObjectMembership(db)
    obj = SimpleNamespace(id=uuid4())
    member = _scalar_input(
        name="created_at",
        role="created_timestamp",
        is_nullable=True,
        default_value="client-value",
    )

    await membership.set_members(obj, [member])

    assert len(db.added) == 1
    assert isinstance(db.added[0], FieldMember)
    assert db.added[0].is_nullable is False
    assert db.added[0].default_value is None
    assert db.added[0].position == 0
    assert db.flushed == 1


@pytest.mark.asyncio
async def test_reconcile_members_rejects_unknown_member_id():
    """Reject reconcile-by-ID updates for unknown Object Member IDs."""
    db = _DbSession(result=_Result([]), get_result=None)
    membership = ObjectMembership(db)
    obj = SimpleNamespace(id=uuid4())
    member_id = uuid4()
    member = _scalar_input(id=member_id)

    with pytest.raises(HTTPException) as exc_info:
        await membership.reconcile_members(obj, [member])

    assert exc_info.value.status_code == 400
    assert f"Unknown member id {member_id}" in exc_info.value.detail
    assert db.get_call == (ObjectMember, member_id)


@pytest.mark.asyncio
async def test_derived_relationships_describes_many_to_many():
    """Describe incoming many-to-many Relationship Members."""
    target_id = uuid4()
    source_id = uuid4()
    source = SimpleNamespace(id=source_id, name="BlogPost")
    rel = SimpleNamespace(
        parent_object=source,
        object_id=source_id,
        name="tags",
        kind="many_to_many",
        inverse_name="posts",
        required=False,
    )
    membership = ObjectMembership(_DbSession(result=_Result([rel])))

    result = await membership.derived_relationships(target_id)

    assert len(result) == 1
    assert result[0].name == "posts"
    assert result[0].source_object == "BlogPost"
    assert result[0].source_object_id == source_id
    assert result[0].source_field == "tags"
    assert result[0].kind == "many_to_many"
    assert result[0].side == "many"
    assert not hasattr(result[0], "implies_fk")
    assert not hasattr(result[0], "junction_table")

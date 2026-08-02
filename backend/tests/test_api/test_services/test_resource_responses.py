# tests/test_api/test_services/test_resource_responses.py
"""Tests for resource response assembly in service modules."""

from types import SimpleNamespace
from uuid import uuid4

import pytest

from api.services.endpoint import EndpointService
from api.services.field import FieldService
from api.services.field_constraint import FieldConstraintService
from api.services.type import TypeService


class _Result:
    """Minimal async SQLAlchemy result double."""

    def __init__(self, value=None):
        """Store a fetchall-compatible value.

        :param value: Result rows returned from ``fetchall``.
        """
        self.value = [] if value is None else value

    def fetchall(self):
        """Return the configured result rows."""
        return self.value


class _DbSession:
    """Minimal async session double."""

    def __init__(self, result=None):
        """Store the result returned from ``execute``.

        :param result: Fake SQLAlchemy result.
        """
        self.result = result or _Result()

    async def execute(self, statement):
        """Capture and return the configured result.

        :param statement: SQLAlchemy statement being executed.
        :returns: Fake SQLAlchemy result.
        """
        self.statement = statement
        return self.result


class _FieldService(FieldService):
    """Field service double with fixed API usage."""

    async def get_used_in_apis(self, field_id):
        """Return fixed API IDs for response assembly.

        :param field_id: Field ID.
        :returns: List of API IDs.
        """
        return [uuid4()]


def test_endpoint_to_response_maps_path_params():
    """Build endpoint responses inside EndpointService."""
    target_object_id = uuid4()
    field_member_id = uuid4()
    endpoint = SimpleNamespace(
        id=uuid4(),
        api_id=uuid4(),
        method="GET",
        path="/users/{user_id}",
        description="Get user",
        tag_name="Users",
        target_object_id=target_object_id,
        path_params=[SimpleNamespace(name="user_id", field_member_id=field_member_id)],
        query_params=[],
        pagination=False,
        use_envelope=True,
        response_shape="object",
    )

    response = EndpointService(_DbSession()).to_response(endpoint)

    assert response.id == endpoint.id
    assert response.api_id == endpoint.api_id
    assert response.target_object_id == target_object_id
    assert response.path_params[0].name == "user_id"
    assert response.path_params[0].field_member_id == field_member_id


@pytest.mark.asyncio
async def test_field_to_response_maps_usage_constraints_and_validators():
    """Build Field responses inside FieldService."""
    constraint_id = uuid4()
    validator_id = uuid4()
    field = SimpleNamespace(
        id=uuid4(),
        namespace_id=uuid4(),
        name="email",
        type_id=uuid4(),
        description="Email address",
        default_value=None,
    )
    field.constraint_values = [
        SimpleNamespace(
            constraint_id=constraint_id,
            constraint=SimpleNamespace(name="max_length"),
            value="255",
        )
    ]
    field.validators = [
        SimpleNamespace(id=validator_id, template_id=uuid4(), parameters={}, position=0)
    ]

    response = await _FieldService(_DbSession()).to_response(field)

    assert response.id == field.id
    assert response.namespace_id == field.namespace_id
    assert len(response.used_in_apis) == 1
    assert response.constraints[0].constraint_id == constraint_id
    assert response.constraints[0].name == "max_length"
    assert response.validators[0].id == validator_id


def test_type_to_response_maps_field_counts():
    """Build Type responses inside TypeService."""
    type_model = SimpleNamespace(
        id=uuid4(),
        namespace_id=uuid4(),
        name="EmailStr",
        python_type="EmailStr",
        description="Email",
        import_path="from pydantic import EmailStr",
        parent_type_id=uuid4(),
    )

    response = TypeService(_DbSession()).to_response(
        type_model, {str(type_model.id): 3}
    )

    assert response.id == type_model.id
    assert response.namespace_id == type_model.namespace_id
    assert response.python_type == "EmailStr"
    assert response.used_in_fields == 3


def test_field_constraint_to_response_maps_field_counts():
    """Build Field Constraint responses inside FieldConstraintService."""
    constraint = SimpleNamespace(
        id=uuid4(),
        namespace_id=uuid4(),
        name="max_length",
        description="Maximum length",
        parameter_types=["int"],
        docs_url="https://docs.example.test",
        compatible_types=["str"],
    )

    response = FieldConstraintService(_DbSession()).to_response(
        constraint, {str(constraint.id): 2}
    )

    assert response.id == constraint.id
    assert response.namespace_id == constraint.namespace_id
    assert response.parameter_types == ["int"]
    assert response.compatible_types == ["str"]
    assert response.used_in_fields == 2


@pytest.mark.asyncio
async def test_field_get_used_in_apis_reads_fetchall_rows():
    """Keep Field usage lookup behavior covered at its service seam."""
    api_id = uuid4()
    service = FieldService(_DbSession(_Result([(api_id,)])))

    result = await service.get_used_in_apis(uuid4())

    assert result == [api_id]

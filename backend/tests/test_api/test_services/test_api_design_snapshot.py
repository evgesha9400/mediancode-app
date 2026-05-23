# tests/test_api/test_services/test_api_design_snapshot.py
"""Tests for API Design Snapshot assembly."""

from types import SimpleNamespace
from uuid import uuid4

from api.models.members import FieldMember, RelationshipMember
from api.services.api_design_snapshot import build_api_design_snapshot


def _field_model(
    *,
    name: str = "title",
    python_type: str = "str",
    container: str | None = None,
    description: str | None = "Title",
):
    """Build a FieldModel-like test double.

    :param name: Field name.
    :param python_type: Python type name.
    :param container: Optional container name.
    :param description: Field description.
    :returns: FieldModel-like object.
    """
    return SimpleNamespace(
        name=name,
        field_type=SimpleNamespace(python_type=python_type),
        container=container,
        description=description,
        constraint_values=[
            SimpleNamespace(
                constraint=SimpleNamespace(
                    name="max_length",
                    parameter_types=["int"],
                ),
                value="40",
            )
        ],
        validators=[
            SimpleNamespace(
                position=1,
                parameters={"suffix": "!"},
                template=SimpleNamespace(
                    name="Append Suffix",
                    mode="after",
                    body_template="return value + '{{ suffix }}'",
                ),
            )
        ],
    )


def _object_model(object_id, name, members=None, validators=None):
    """Build an ObjectDefinition-like test double.

    :param object_id: Object ID.
    :param name: Object name.
    :param members: Optional Object Members.
    :param validators: Optional Object validators.
    :returns: ObjectDefinition-like object.
    """
    return SimpleNamespace(
        id=object_id,
        name=name,
        description=f"{name} object",
        members=members or [],
        validators=validators or [],
    )


def test_build_api_design_snapshot_maps_objects_and_members():
    """Map persisted Object Members to portable snapshot facts."""
    field_id = uuid4()
    source_id = uuid4()
    target_id = uuid4()
    field_member = FieldMember(
        object_id=source_id,
        name="display_title",
        position=1,
        field_id=field_id,
        role="writable",
        is_nullable=True,
        default_value="Untitled",
    )
    relationship = RelationshipMember(
        object_id=source_id,
        name="categories",
        position=0,
        target_object_id=target_id,
        kind="many_to_many",
        inverse_name="items",
        required=False,
    )
    source = _object_model(source_id, "Item", [field_member, relationship])
    target = _object_model(target_id, "Category")
    api = SimpleNamespace(
        title="ShopApi",
        version="1.0.0",
        description="Shop",
        endpoints=[],
    )

    snapshot = build_api_design_snapshot(
        api,
        {source_id: source, target_id: target},
        {field_id: _field_model()},
    )

    item = snapshot.objects[0]
    assert item.name == "Item"
    assert item.field_members[0].member_name == "display_title"
    assert item.field_members[0].field_name == "title"
    assert item.field_members[0].constraints[0].value == "40"
    assert item.field_members[0].field_validators[0].name == "Append Suffix"
    assert item.relationship_members[0].target_object_name == "Category"
    assert item.relationship_members[0].kind == "many_to_many"


def test_build_api_design_snapshot_resolves_endpoint_params():
    """Resolve endpoint path and query parameters without api_craft models."""
    path_member_id = uuid4()
    path_field_id = uuid4()
    query_member_id = uuid4()
    query_field_id = uuid4()
    item_id = uuid4()
    path_member = FieldMember(
        id=path_member_id,
        object_id=item_id,
        name="id",
        position=0,
        field_id=path_field_id,
        role="pk",
        is_nullable=False,
        default_value=None,
    )
    query_member = FieldMember(
        id=query_member_id,
        object_id=item_id,
        name="search",
        position=1,
        field_id=query_field_id,
        role="writable",
        is_nullable=False,
        default_value=None,
    )
    item = _object_model(item_id, "Item", [path_member, query_member])
    endpoint = SimpleNamespace(
        method="GET",
        path="/items",
        tag_name="Items",
        target_object_id=item_id,
        path_params=[],
        query_params=[
            SimpleNamespace(
                position=0,
                name="q",
                field_member_id=query_member_id,
                operator="ilike",
                required=False,
            )
        ],
        pagination=True,
        description="Get item",
        use_envelope=True,
        response_shape="list",
    )
    api = SimpleNamespace(
        title="ShopApi",
        version="1.0.0",
        description="Shop",
        endpoints=[endpoint],
    )

    snapshot = build_api_design_snapshot(
        api,
        {item_id: item},
        {
            path_field_id: _field_model(
                name="id",
                python_type="uuid.UUID",
                description="Item ID",
            ),
            query_field_id: _field_model(
                name="query",
                python_type="str",
                description="Search query",
            ),
        },
    )

    endpoint_snapshot = snapshot.endpoints[0]
    assert snapshot.tag_names == ["Items"]
    assert endpoint_snapshot.target_object_name == "Item"
    assert endpoint_snapshot.query_params[0].name == "q"
    assert endpoint_snapshot.query_params[0].field_member_name == "search"
    assert endpoint_snapshot.query_params[0].type == "str"
    assert endpoint_snapshot.query_params[0].operator == "ilike"
    assert endpoint_snapshot.query_params[0].required is False
    assert endpoint_snapshot.pagination is True

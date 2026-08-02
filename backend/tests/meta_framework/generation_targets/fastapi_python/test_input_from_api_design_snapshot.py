"""Tests for the FastAPI Python API Design Snapshot input adapter."""

from uuid import uuid4

from api.schemas.api import GenerateOptions
from meta_framework.api_design.snapshot import (
    APIDesignEndpoint,
    APIDesignFieldConstraint,
    APIDesignFieldMember,
    APIDesignFieldValidator,
    APIDesignObject,
    APIDesignPathParam,
    APIDesignSnapshot,
)
from meta_framework.generation_targets.fastapi_python.input_from_api_design_snapshot import (
    build_fastapi_python_input_from_api_design_snapshot,
)


def test_build_fastapi_python_input_from_api_design_snapshot_maps_models():
    """Map portable snapshot facts into FastAPI Python input models."""
    item = APIDesignObject(
        id=uuid4(),
        name="Item",
        description="Item object",
        field_members=[
            APIDesignFieldMember(
                member_name="identifier",
                field_name="id",
                field_type="uuid.UUID",
                container=None,
                nullable=False,
                description="Item ID",
                role="pk",
                default_value=None,
            ),
            APIDesignFieldMember(
                member_name="display_title",
                field_name="title",
                field_type="str",
                container=None,
                nullable=False,
                description="Item title",
                role="writable",
                default_value="Untitled",
                constraints=[
                    APIDesignFieldConstraint(
                        name="max_length",
                        value="40",
                        parameter_types=["int"],
                    )
                ],
                field_validators=[
                    APIDesignFieldValidator(
                        name="Append Suffix",
                        mode="after",
                        body_template="return value + '{{ suffix }}'",
                        parameters={"suffix": "!"},
                    )
                ],
            ),
        ],
    )
    snapshot = APIDesignSnapshot(
        name="ShopApi",
        version="1.0.0",
        description="Shop",
        objects=[item],
        endpoints=[
            APIDesignEndpoint(
                method="GET",
                path="/items/{item_id}",
                tag_name="Items",
                path_params=[
                    APIDesignPathParam(
                        name="item_id",
                        field_member_name="identifier",
                        type="uuid.UUID",
                        description="Item ID",
                    )
                ],
                query_params=[],
                target_object_name="Item",
                description="Get item",
                use_envelope=True,
                response_shape="object",
                pagination=False,
            )
        ],
        tag_names=["Items"],
    )

    input_api = build_fastapi_python_input_from_api_design_snapshot(
        snapshot,
        GenerateOptions(database_enabled=True, response_placeholders=False),
    )

    item_model = input_api.objects[0]
    id_field = item_model.fields[0]
    title_field = item_model.fields[1]
    assert input_api.name == "ShopApi"
    assert input_api.config.database.enabled is True
    assert input_api.config.response_placeholders is False
    assert id_field.name == "identifier"
    assert id_field.pk is True
    assert title_field.name == "display_title"
    assert title_field.default is not None
    assert title_field.default.kind == "literal"
    assert title_field.validators[0].params == {"value": 40}
    assert (
        title_field.field_validators[0].function_name == "append_suffix_display_title"
    )
    assert title_field.field_validators[0].function_body == "return value + '!'"
    assert input_api.endpoints[0].name == "GetItemsByItemId"
    assert input_api.endpoints[0].path_params[0].type == "uuid.UUID"

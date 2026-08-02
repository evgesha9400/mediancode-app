# tests/test_meta_framework.generation_targets.fastapi_python/test_prepared_views.py
"""Tests for prepared endpoint/view semantics."""

from typing import Any

import pytest

from meta_framework.generation_targets.fastapi_python.models.input import (
    InputEndpoint,
    InputField,
    InputModel,
    InputPathParam,
    InputQueryParam,
)
from meta_framework.generation_targets.fastapi_python.models.orm_types import (
    TemplateDatabaseConfig,
)
from meta_framework.generation_targets.fastapi_python.prepared_views import (
    prepare_endpoint_view_semantics,
)

pytestmark = pytest.mark.unit


def _product_object() -> InputModel:
    """Build the Product object used by prepared view tests.

    :returns: Product input model with primary key and filterable fields.
    """
    return InputModel(
        name="Product",
        fields=[
            InputField(name="id", type="uuid.UUID", pk=True, exposure="read_only"),
            InputField(name="store_id", type="uuid.UUID"),
            InputField(name="name", type="str"),
            InputField(name="price", type="float"),
        ],
    )


def _placeholder_values(model_name: str) -> dict[str, Any]:
    """Return deterministic placeholder values for prepared view tests.

    :param model_name: Response model name.
    :returns: Placeholder mapping.
    """
    return {"model": model_name}


def test_prepare_endpoint_view_semantics_infers_detail_pk_and_type():
    """Infer detail endpoint path parameter field and type from the target object."""
    semantics = prepare_endpoint_view_semantics(
        endpoints=[
            InputEndpoint(
                name="GetProduct",
                path="/products/{product_id}",
                method="GET",
                response="Product",
                response_shape="object",
                path_params=[InputPathParam(name="product_id", type="str")],
            )
        ],
        objects_by_name={"Product": _product_object()},
        split_model_names=set(),
        use_split=False,
        response_placeholders=False,
        generate_response_placeholders=_placeholder_values,
        database_config=None,
        orm_model_map=None,
        orm_pk_map=None,
    )

    view = semantics.views[0]
    assert view.target == "Product"
    assert view.path_params[0].field == "id"
    assert view.path_params[0].type == "uuid.UUID"
    assert semantics.imports.model_names == ["Product"]
    assert semantics.imports.has_path_params is True


def test_prepare_endpoint_view_semantics_remaps_split_schema_refs():
    """Remap request and response models when split schema mode is active."""
    semantics = prepare_endpoint_view_semantics(
        endpoints=[
            InputEndpoint(
                name="PatchProduct",
                path="/products/{id}",
                method="PATCH",
                request="Product",
                response="Product",
                path_params=[InputPathParam(name="id", type="uuid.UUID")],
            )
        ],
        objects_by_name={"Product": _product_object()},
        split_model_names={"Product"},
        use_split=True,
        response_placeholders=False,
        generate_response_placeholders=_placeholder_values,
        database_config=None,
        orm_model_map=None,
        orm_pk_map=None,
    )

    view = semantics.views[0]
    assert view.request_model == "ProductUpdate"
    assert view.response_model == "ProductResponse"
    assert semantics.imports.model_names == ["ProductResponse", "ProductUpdate"]


def test_prepare_endpoint_view_semantics_enriches_database_list_filters():
    """Build ORM-backed list filters, pagination, signatures, and imports."""
    semantics = prepare_endpoint_view_semantics(
        endpoints=[
            InputEndpoint(
                name="ListProducts",
                path="/stores/{store_id}/products",
                method="GET",
                response="ProductList",
                response_shape="list",
                target="Product",
                pagination=True,
                path_params=[
                    InputPathParam(
                        name="store_id",
                        type="uuid.UUID",
                        field="store_id",
                    )
                ],
                query_params=[
                    InputQueryParam(
                        name="min_price",
                        type="float",
                        field="price",
                        operator="gte",
                    )
                ],
            )
        ],
        objects_by_name={
            "Product": _product_object(),
            "ProductList": InputModel(
                name="ProductList",
                fields=[InputField(name="items", type="List[Product]")],
            ),
        },
        split_model_names=set(),
        use_split=False,
        response_placeholders=False,
        generate_response_placeholders=_placeholder_values,
        database_config=TemplateDatabaseConfig(
            enabled=True,
            default_url="postgresql+asyncpg://postgres:postgres@localhost:5433/shop",
            db_port=5433,
        ),
        orm_model_map={"Product": "ProductRecord"},
        orm_pk_map={"id": "ProductRecord"},
    )

    view = semantics.views[0]
    assert view.has_orm is True
    assert any(
        "session: AsyncSession = Depends(get_session)" in line
        for line in view.signature_lines
    )
    assert view.list_path_where == "ProductRecord.store_id == store_id"
    assert view.query_filters[0].filter_expr == "ProductRecord.price >= min_price"
    assert [param.snake_name for param in view.pagination_params] == [
        "limit",
        "offset",
    ]
    assert semantics.imports.orm_names == ["ProductRecord"]
    assert semantics.imports.has_query_params is True


def test_prepare_endpoint_view_semantics_skips_placeholders_for_orm_views():
    """Generate placeholders only for non-ORM response views."""
    semantics = prepare_endpoint_view_semantics(
        endpoints=[
            InputEndpoint(
                name="GetProduct",
                path="/products/{id}",
                method="GET",
                response="Product",
                path_params=[InputPathParam(name="id", type="uuid.UUID")],
            ),
            InputEndpoint(
                name="GetStatus",
                path="/status",
                method="GET",
                response="Status",
            ),
        ],
        objects_by_name={
            "Product": _product_object(),
            "Status": InputModel(
                name="Status",
                fields=[InputField(name="message", type="str")],
            ),
        },
        split_model_names=set(),
        use_split=False,
        response_placeholders=True,
        generate_response_placeholders=_placeholder_values,
        database_config=TemplateDatabaseConfig(
            enabled=True,
            default_url="postgresql+asyncpg://postgres:postgres@localhost:5433/shop",
            db_port=5433,
        ),
        orm_model_map={"Product": "ProductRecord"},
        orm_pk_map={"id": "ProductRecord"},
    )

    product_view = semantics.views[0]
    status_view = semantics.views[1]
    assert product_view.response_placeholders is None
    assert status_view.response_placeholders == {"model": "Status"}

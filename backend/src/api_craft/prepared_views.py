# src/api_craft/prepared_views.py
"""Prepared endpoint and view semantics for template rendering."""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from api_craft.models.enums import ResponseShape
from api_craft.models.input import (
    InputEndpoint,
    InputField,
    InputModel,
    InputPathParam,
    InputQueryParam,
)
from api_craft.models.orm_types import TemplateDatabaseConfig
from api_craft.utils import (
    add_spaces_to_camel_case,
    camel_to_snake,
    remove_duplicates,
    snake_to_camel,
)


@dataclass
class PreparedQueryParam:
    """Query parameter ready for template rendering."""

    camel_name: str
    snake_name: str
    type: str
    title: str
    required: bool
    description: str | None = None
    field: str | None = None
    operator: str | None = None
    constraints: dict[str, int | float] | None = None


@dataclass
class PreparedPathParam:
    """Path parameter ready for template rendering."""

    snake_name: str
    camel_name: str
    type: str
    title: str
    description: str | None = None
    field: str | None = None


@dataclass
class PreparedFilter:
    """A pre-computed query filter expression for views.mako."""

    param_name: str
    filter_expr: str


@dataclass
class PreparedView:
    """Endpoint/view ready for template rendering."""

    snake_name: str
    camel_name: str
    path: str
    method: str
    response_model: str | None
    request_model: str | None
    response_placeholders: dict[str, Any] | None
    query_params: list[PreparedQueryParam]
    path_params: list[PreparedPathParam]
    tag: str | None = None
    description: str | None = None
    use_envelope: bool = True
    response_shape: ResponseShape = "object"
    target: str | None = None
    pagination: bool = False
    # Pre-computed fields for template rendering
    signature_lines: list[str] = field(default_factory=list)
    has_signature: bool = False
    orm_class: str = ""
    has_orm: bool = False
    pk_param: str = "id"
    # Filter pre-computations for list endpoints
    list_path_where: str | None = None
    query_filters: list[PreparedFilter] = field(default_factory=list)
    pagination_params: list[PreparedQueryParam] = field(default_factory=list)
    # Detail endpoint pre-computations
    detail_where: str = ""


@dataclass(frozen=True)
class PreparedViewImports:
    """Import-related view data ready for views.mako.

    :ivar model_names: Pydantic model names imported by ``views.py``.
    :ivar orm_names: ORM model names imported by ``views.py``.
    :ivar has_path_params: Whether any view uses generated path parameter types.
    :ivar has_query_params: Whether any view uses generated query parameter types.
    :ivar has_no_response: Whether any view returns a raw 204 response.
    """

    model_names: list[str]
    orm_names: list[str]
    has_path_params: bool
    has_query_params: bool
    has_no_response: bool


@dataclass(frozen=True)
class PreparedEndpointViewSemantics:
    """Prepared endpoint/view semantics for the generated FastAPI project.

    :ivar views: Prepared views ready for templates.
    :ivar imports: Import-related view data.
    """

    views: list[PreparedView]
    imports: PreparedViewImports


def prepare_endpoint_view_semantics(
    endpoints: list[InputEndpoint],
    objects_by_name: dict[str, InputModel],
    split_model_names: set[str],
    use_split: bool,
    response_placeholders: bool,
    generate_response_placeholders: Callable[[str], dict[str, Any]],
    database_config: TemplateDatabaseConfig | None,
    orm_model_map: dict[str, str] | None,
    orm_pk_map: dict[str, str] | None,
) -> PreparedEndpointViewSemantics:
    """Prepare all endpoint/view semantics used by views.mako.

    :param endpoints: Input endpoints from the API.
    :param objects_by_name: Declared Objects keyed by name.
    :param split_model_names: Object names split into create/update/response schemas.
    :param use_split: Whether split schema mode is active.
    :param response_placeholders: Whether placeholder responses are enabled.
    :param generate_response_placeholders: Function that returns placeholder values
        for a response model name.
    :param database_config: Database configuration when database generation is enabled.
    :param orm_model_map: Mapping of response/target model names to ORM class names.
    :param orm_pk_map: Mapping of primary key field names to ORM class names.
    :returns: Prepared endpoint/view semantics.
    """
    views: list[PreparedView] = []
    for endpoint in endpoints:
        view = _prepare_view(endpoint, objects_by_name=objects_by_name)
        _apply_split_schema_refs(view, endpoint, split_model_names, use_split)

        if (
            response_placeholders
            and endpoint.response
            and not endpoint_has_orm(endpoint, orm_model_map, orm_pk_map)
        ):
            view.response_placeholders = generate_response_placeholders(
                endpoint.response
            )

        views.append(view)

    enrich_prepared_views(views, database_config, orm_model_map, orm_pk_map)

    return PreparedEndpointViewSemantics(
        views=views,
        imports=compute_prepared_view_imports(views, orm_model_map, orm_pk_map),
    )


def endpoint_has_orm(
    endpoint: InputEndpoint,
    orm_model_map: dict[str, str] | None,
    orm_pk_map: dict[str, str] | None,
) -> bool:
    """Return whether an endpoint will use an ORM-backed view body.

    :param endpoint: Input endpoint.
    :param orm_model_map: Mapping of response/target model names to ORM class names.
    :param orm_pk_map: Mapping of primary key field names to ORM class names.
    :returns: ``True`` when the endpoint resolves to an ORM model.
    """
    _, has_orm = _resolve_orm_name(
        endpoint.response,
        endpoint.target,
        endpoint.method.lower(),
        [str(p.name) for p in endpoint.path_params or []],
        orm_model_map,
        orm_pk_map,
    )
    return has_orm


def enrich_prepared_views(
    views: list[PreparedView],
    database_config: TemplateDatabaseConfig | None,
    orm_model_map: dict[str, str] | None,
    orm_pk_map: dict[str, str] | None,
) -> None:
    """Enrich views with pre-computed template data.

    Mutates the provided views in place.

    :param views: Prepared views to enrich.
    :param database_config: Database configuration when database generation is enabled.
    :param orm_model_map: Mapping of response/target model names to ORM class names.
    :param orm_pk_map: Mapping of primary key field names to ORM class names.
    """
    has_database = database_config is not None
    for view in views:
        view.orm_class, view.has_orm = _resolve_orm_class(
            view, orm_model_map, orm_pk_map
        )
        view.signature_lines = _build_signature_lines(
            view, has_database and view.has_orm
        )
        view.has_signature = bool(view.signature_lines)
        view.pk_param = view.path_params[0].snake_name if view.path_params else "id"

        if (
            view.has_orm
            and view.method == "get"
            and view.response_shape == "list"
            and view.target
        ):
            _enrich_list_view(view)

        if view.has_orm and view.path_params and view.response_shape != "list":
            _enrich_detail_view(view)


def compute_prepared_view_imports(
    views: list[PreparedView],
    orm_model_map: dict[str, str] | None,
    orm_pk_map: dict[str, str] | None,
) -> PreparedViewImports:
    """Compute import-related data from views for views.mako header.

    :param views: Prepared views.
    :param orm_model_map: Mapping of response/target model names to ORM class names.
    :param orm_pk_map: Mapping of primary key field names to ORM class names.
    :returns: Prepared view import data.
    """
    model_names: list[str] = []
    for view in views:
        if view.response_model and view.response_model not in model_names:
            model_names.append(view.response_model)
        if view.request_model and view.request_model not in model_names:
            model_names.append(view.request_model)

    orm_names_from_response = {
        orm_model_map[view.response_model]
        for view in views
        if view.response_model
        and orm_model_map
        and view.response_model in orm_model_map
    }
    orm_names_from_pk: set[str] = set()
    if orm_pk_map:
        for view in views:
            if view.method == "delete" and not view.response_model and view.path_params:
                for p in view.path_params:
                    if p.snake_name in orm_pk_map:
                        orm_names_from_pk.add(orm_pk_map[p.snake_name])

    orm_names_from_target: set[str] = set()
    if orm_model_map:
        for view in views:
            if view.target and view.target in orm_model_map:
                orm_names_from_target.add(orm_model_map[view.target])

    return PreparedViewImports(
        model_names=model_names,
        orm_names=sorted(
            orm_names_from_response | orm_names_from_pk | orm_names_from_target
        ),
        has_path_params=any(view.path_params for view in views),
        has_query_params=any(view.query_params for view in views),
        has_no_response=any(not view.response_model for view in views),
    )


def _prepare_query_params(
    input_query_params: list[InputQueryParam] | None,
    target_fields: dict[str, InputField] | None = None,
) -> list[PreparedQueryParam]:
    """Prepare endpoint query parameters for template rendering."""
    if not input_query_params:
        return []

    result = []
    for param in input_query_params:
        param_type = param.type
        required = param.required

        if param.field and target_fields and param.field in target_fields:
            field_type = target_fields[param.field].type
            if param.operator == "in":
                param_type = f"List[{field_type}]"
            else:
                param_type = field_type

        result.append(
            PreparedQueryParam(
                type=param_type,
                snake_name=str(param.name),
                camel_name=snake_to_camel(param.name),
                title=snake_to_camel(param.name),
                required=required,
                description=param.description,
                field=param.field,
                operator=param.operator,
            )
        )
    return result


def _pagination_params() -> list[PreparedQueryParam]:
    """Return generated pagination parameters."""
    return [
        PreparedQueryParam(
            type="int",
            snake_name="limit",
            camel_name="Limit",
            title="Limit",
            required=False,
            description="Maximum number of results to return (1-100).",
            constraints={"ge": 1, "le": 100},
        ),
        PreparedQueryParam(
            type="int",
            snake_name="offset",
            camel_name="Offset",
            title="Offset",
            required=False,
            description="Number of results to skip.",
            constraints={"ge": 0},
        ),
    ]


def _prepare_path_params(
    input_path_params: list[InputPathParam] | None,
    target_fields: dict[str, InputField] | None = None,
) -> list[PreparedPathParam]:
    """Prepare endpoint path parameters for template rendering."""
    if not input_path_params:
        return []

    result = []
    for param in input_path_params:
        param_type = param.type
        if param.field and target_fields and param.field in target_fields:
            param_type = target_fields[param.field].type

        result.append(
            PreparedPathParam(
                type=param_type,
                snake_name=str(param.name),
                camel_name=snake_to_camel(param.name),
                title=add_spaces_to_camel_case(snake_to_camel(param.name)),
                description=param.description,
                field=param.field,
            )
        )
    return result


def _prepare_view(
    endpoint: InputEndpoint,
    objects_by_name: dict[str, InputModel] | None = None,
) -> PreparedView:
    """Prepare one endpoint as a view for template rendering."""
    response_name = endpoint.response
    if response_name and objects_by_name and response_name not in objects_by_name:
        raise ValueError(f"Response object '{response_name}' is not declared")

    request_name = endpoint.request
    if request_name and objects_by_name and request_name not in objects_by_name:
        raise ValueError(f"Request object '{request_name}' is not declared")

    camel_name = remove_duplicates(endpoint.name)
    if not camel_name:
        raise ValueError(
            f"Endpoint name '{endpoint.name}' resolved to an empty identifier"
        )
    snake_name = camel_to_snake(camel_name)

    target_fields: dict[str, InputField] | None = None
    target_name: str | None = endpoint.target
    if objects_by_name:
        if endpoint.response_shape == "object" and not target_name:
            target_name = endpoint.response
        if target_name and target_name in objects_by_name:
            target_obj = objects_by_name[target_name]
            target_fields = {str(f.name): f for f in target_obj.fields}

    path_params_input = _infer_detail_path_param_field(
        endpoint=endpoint,
        objects_by_name=objects_by_name,
        target_name=target_name,
    )
    if path_params_input is not endpoint.path_params and target_fields is None:
        target_fields = (
            {str(f.name): f for f in objects_by_name[target_name].fields}
            if objects_by_name and target_name
            else None
        )

    query_params = _prepare_query_params(endpoint.query_params, target_fields)
    if endpoint.pagination:
        query_params.extend(_pagination_params())

    return PreparedView(
        snake_name=snake_name,
        camel_name=camel_name,
        path=endpoint.path,
        method=endpoint.method.lower(),
        response_model=response_name,
        request_model=request_name,
        response_placeholders=None,
        query_params=query_params,
        path_params=_prepare_path_params(path_params_input, target_fields),
        tag=endpoint.tag,
        description=endpoint.description,
        use_envelope=endpoint.use_envelope,
        response_shape=endpoint.response_shape,
        target=target_name,
        pagination=endpoint.pagination,
    )


def _infer_detail_path_param_field(
    endpoint: InputEndpoint,
    objects_by_name: dict[str, InputModel] | None,
    target_name: str | None,
) -> list[InputPathParam] | None:
    """Infer the PK field for the last path parameter on detail endpoints."""
    path_params_input = endpoint.path_params
    if (
        endpoint.response_shape != "object"
        or not path_params_input
        or path_params_input[-1].field
        or not objects_by_name
        or not target_name
        or target_name not in objects_by_name
    ):
        return path_params_input

    target_obj_for_pk = objects_by_name[target_name]
    pk_fields = [f for f in target_obj_for_pk.fields if f.pk]
    last_param = path_params_input[-1]
    non_pk_field_names = {str(f.name) for f in target_obj_for_pk.fields if not f.pk}
    if not pk_fields or str(last_param.name) in non_pk_field_names:
        return path_params_input

    inferred = last_param.model_copy(update={"field": str(pk_fields[0].name)})
    return list(path_params_input[:-1]) + [inferred]


def _apply_split_schema_refs(
    view: PreparedView,
    endpoint: InputEndpoint,
    split_model_names: set[str],
    use_split: bool,
) -> None:
    """Remap view request/response models to split schema names."""
    if not use_split:
        return

    if view.request_model and view.request_model in split_model_names:
        base_name = view.request_model
        if endpoint.method in ("PUT", "PATCH"):
            view.request_model = f"{base_name}Update"
        else:
            view.request_model = f"{base_name}Create"

    if view.response_model and view.response_model in split_model_names:
        base_name = view.response_model
        view.response_model = f"{base_name}Response"


def _build_signature_lines(view: PreparedView, inject_session: bool) -> list[str]:
    """Build the function signature lines for a view."""
    lines = []
    for p_param in view.path_params:
        lines.append(f"    {p_param.snake_name}: path.{p_param.camel_name},")
    if view.request_model:
        lines.append(f"    request: {view.request_model},")
    for q_param in view.query_params:
        suffix = "" if q_param.required else " = None"
        lines.append(f"    {q_param.snake_name}: query.{q_param.camel_name}{suffix},")
    if inject_session:
        lines.append("    session: AsyncSession = Depends(get_session),")
    return lines


def _resolve_orm_name(
    response_model: str | None,
    target: str | None,
    method: str,
    path_param_names: list[str],
    orm_model_map: dict[str, str] | None,
    orm_pk_map: dict[str, str] | None,
) -> tuple[str, bool]:
    """Resolve the ORM class name for endpoint-like data."""
    if not orm_model_map:
        return "", False

    if response_model and response_model in orm_model_map:
        return orm_model_map[response_model], True

    if target and target in orm_model_map:
        return orm_model_map[target], True

    if method == "delete" and orm_pk_map:
        for path_param_name in path_param_names:
            if path_param_name in orm_pk_map:
                return orm_pk_map[path_param_name], True

    return "", False


def _resolve_orm_class(
    view: PreparedView,
    orm_model_map: dict[str, str] | None,
    orm_pk_map: dict[str, str] | None,
) -> tuple[str, bool]:
    """Resolve the ORM class name for a view."""
    return _resolve_orm_name(
        view.response_model,
        view.target,
        view.method,
        [p.snake_name for p in view.path_params],
        orm_model_map,
        orm_pk_map,
    )


def _build_filter_expr(
    orm_class: str, field: str, operator: str, param_name: str
) -> str:
    """Build a SQLAlchemy filter expression string."""
    match operator:
        case "eq":
            return f"{orm_class}.{field} == {param_name}"
        case "gte":
            return f"{orm_class}.{field} >= {param_name}"
        case "lte":
            return f"{orm_class}.{field} <= {param_name}"
        case "gt":
            return f"{orm_class}.{field} > {param_name}"
        case "lt":
            return f"{orm_class}.{field} < {param_name}"
        case "like":
            return f'{orm_class}.{field}.like(f"%{{{param_name}}}%")'
        case "ilike":
            return f'{orm_class}.{field}.ilike(f"%{{{param_name}}}%")'
        case "in":
            return f"{orm_class}.{field}.in_({param_name})"
        case _:
            return f"{orm_class}.{field} == {param_name}"


def _enrich_list_view(view: PreparedView) -> None:
    """Pre-compute filter and pagination data for a list view."""
    path_where_clauses = []
    for pp in view.path_params:
        if pp.field:
            path_where_clauses.append(f"{view.orm_class}.{pp.field} == {pp.snake_name}")
    view.list_path_where = ", ".join(path_where_clauses) if path_where_clauses else None

    for qp in view.query_params:
        if qp.snake_name in ("limit", "offset") and view.pagination:
            view.pagination_params.append(qp)
        elif qp.field and qp.operator:
            view.query_filters.append(
                PreparedFilter(
                    param_name=qp.snake_name,
                    filter_expr=_build_filter_expr(
                        view.orm_class, qp.field, qp.operator, qp.snake_name
                    ),
                )
            )


def _enrich_detail_view(view: PreparedView) -> None:
    """Pre-compute the where clause for a detail view."""
    where_clauses = []
    for pp in view.path_params:
        if pp.field:
            where_clauses.append(f"{view.orm_class}.{pp.field} == {pp.snake_name}")
        else:
            where_clauses.append(f"{view.orm_class}.{pp.snake_name} == {pp.snake_name}")
    view.detail_where = ", ".join(where_clauses)

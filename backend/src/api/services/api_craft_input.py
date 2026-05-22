# src/api/services/api_craft_input.py
"""Adapter from database API entities to api_craft input models."""

import re
from typing import cast
from uuid import UUID

from jinja2 import Environment

from api.models.database import (
    ApiEndpoint,
    ApiModel,
    FieldModel,
    ObjectDefinition,
)
from api.models.members import RelationshipMember, ScalarMember
from api.schemas.api import GenerateOptions
from api.services.path_params import get_path_param_field_id
from api_craft.models.enums import (
    CdkCompute,
    FieldExposure,
    GeneratedStrategy,
    HttpMethod,
    RelationshipKind,
    ResponseShape,
)
from api_craft.models.input import (
    FieldDefault,
    FieldDefaultGenerated,
    FieldDefaultLiteral,
    InputAPI,
    InputApiConfig,
    InputCdkConfig,
    InputDatabaseConfig,
    InputEndpoint,
    InputField,
    InputModel,
    InputPathParam,
    InputQueryParam,
    InputRelationship,
    InputResolvedFieldValidator,
    InputResolvedModelValidator,
    InputTag,
    InputValidator,
)
from api_craft.models.types import PascalCaseName, SnakeCaseName


def build_input_api(
    api: ApiModel,
    objects_map: dict[UUID, ObjectDefinition],
    fields_map: dict[UUID, FieldModel],
    options: GenerateOptions,
) -> InputAPI:
    """Build the api_craft input model from loaded database entities.

    :param api: The API model.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param fields_map: Map of field ID to FieldModel.
    :param options: Generation options.
    :returns: InputAPI for code generation.
    """
    input_objects: list[InputModel] = []
    for obj in objects_map.values():
        fields: list[InputField] = []
        input_relationships: list[InputRelationship] = []

        for member in sorted(obj.members, key=lambda x: x.position):
            if isinstance(member, ScalarMember):
                field = fields_map.get(member.field_id)
                if field:
                    pk, exposure, default = _derive_input_field_props(member)
                    input_field = InputField(
                        name=SnakeCaseName(_scalar_member_field_name(field)),
                        type=_build_field_type(
                            field.field_type.python_type, field.container
                        ),
                        nullable=member.is_nullable,
                        description=field.description,
                        default=default,
                        validators=_build_field_validators(field),
                        field_validators=[
                            InputResolvedFieldValidator(**rv)
                            for rv in _build_resolved_field_validators(field)
                        ],
                        pk=pk,
                        exposure=exposure,
                    )
                    fields.append(input_field)
            elif isinstance(member, RelationshipMember):
                target_obj = objects_map.get(member.target_object_id)
                target_name = target_obj.name if target_obj else "Unknown"
                input_relationships.append(
                    InputRelationship(
                        name=member.name,
                        target_model=target_name,
                        kind=cast(RelationshipKind, member.kind),
                        inverse_name=member.inverse_name,
                        required=member.required,
                    )
                )

        input_objects.append(
            InputModel(
                name=PascalCaseName(obj.name),
                fields=fields,
                description=obj.description,
                model_validators=[
                    InputResolvedModelValidator(**rv)
                    for rv in _build_resolved_model_validators(obj)
                ],
                relationships=input_relationships,
            )
        )

    tag_names = {ep.tag_name for ep in api.endpoints if ep.tag_name}
    input_tags = [InputTag(name=name, description="") for name in sorted(tag_names)]

    input_endpoints: list[InputEndpoint] = []
    for endpoint in api.endpoints:
        object_name = _object_name(endpoint.object_id, objects_map)
        method = endpoint.method.upper()
        request_name = object_name if method in ("POST", "PUT", "PATCH") else None
        response_name = None if method == "DELETE" else object_name

        input_endpoints.append(
            InputEndpoint(
                name=PascalCaseName(
                    _build_endpoint_name(endpoint.method, endpoint.path)
                ),
                path=endpoint.path,
                method=cast(HttpMethod, endpoint.method),
                tag=endpoint.tag_name,
                request=request_name,
                response=response_name,
                query_params=_build_query_params(endpoint, objects_map, fields_map),
                path_params=_build_path_params(endpoint, fields_map),
                description=endpoint.description,
                use_envelope=endpoint.use_envelope,
                response_shape=cast(ResponseShape, endpoint.response_shape),
                target=object_name,
            )
        )

    return InputAPI(
        name=PascalCaseName(api.title),
        version=api.version,
        author="Median Code",
        description=api.description or "API Generated by Median Code",
        objects=input_objects,
        endpoints=input_endpoints,
        tags=input_tags,
        config=InputApiConfig(
            response_placeholders=options.response_placeholders,
            database=InputDatabaseConfig(
                enabled=options.database_enabled,
            ),
            cdk=InputCdkConfig(
                enabled=options.cdk_enabled,
                compute=cast(CdkCompute, options.cdk_compute),
            ),
        ),
    )


_ROLE_TO_EXPOSURE: dict[str, FieldExposure] = {
    "pk": "read_only",
    "writable": "read_write",
    "write_only": "write_only",
    "read_only": "read_only",
    "created_timestamp": "read_only",
    "updated_timestamp": "read_only",
    "generated_uuid": "read_only",
}

_ROLE_GENERATED_STRATEGY: dict[str, GeneratedStrategy] = {
    "created_timestamp": "now",
    "updated_timestamp": "now_on_update",
    "generated_uuid": "uuid4",
}

_ROLE_IS_PK = {"pk"}


def _derive_input_field_props(
    member: ScalarMember,
) -> tuple[bool, FieldExposure, FieldDefault | None]:
    """Derive InputField properties from a scalar member.

    :param member: A ScalarMember record.
    :returns: Tuple of (pk, exposure, default).
    """
    pk = member.role in _ROLE_IS_PK
    exposure = _ROLE_TO_EXPOSURE[member.role]

    if member.role in _ROLE_GENERATED_STRATEGY:
        default: FieldDefault | None = FieldDefaultGenerated(
            kind="generated", strategy=_ROLE_GENERATED_STRATEGY[member.role]
        )
    elif member.default_value is not None:
        default = FieldDefaultLiteral(kind="literal", value=member.default_value)
    else:
        default = None

    return pk, exposure, default


def _scalar_member_field_name(field: FieldModel) -> str:
    """Return the scalar field name used in generated api_craft input.

    Current behavior uses FieldModel.name, not ScalarMember.name. Preserve that
    policy until the product naming decision is made explicitly.

    :param field: The field model referenced by the scalar member.
    :returns: Field name for InputField/InputQueryParam.
    """
    return field.name


def _build_path_params(
    endpoint: ApiEndpoint,
    fields_map: dict[UUID, FieldModel],
) -> list[InputPathParam] | None:
    """Build api_craft path parameters from endpoint JSONB data.

    :param endpoint: Endpoint model with path_params JSONB data.
    :param fields_map: Map of field ID to FieldModel.
    :returns: List of InputPathParam objects, or None when absent.
    """
    if not endpoint.path_params:
        return None

    path_params: list[InputPathParam] = []
    for param in endpoint.path_params:
        if not isinstance(param, dict):
            continue
        field_id = get_path_param_field_id(param)
        field = fields_map.get(field_id) if field_id else None
        field_type = _build_field_type(field.field_type.python_type) if field else "str"
        description = field.description or "" if field else ""
        path_params.append(
            InputPathParam(
                name=SnakeCaseName(str(param["name"])),
                type=field_type,
                description=description,
            )
        )
    return path_params


def _build_query_params(
    endpoint: ApiEndpoint,
    objects_map: dict[UUID, ObjectDefinition],
    fields_map: dict[UUID, FieldModel],
) -> list[InputQueryParam] | None:
    """Build api_craft query parameters from the endpoint query object.

    :param endpoint: Endpoint model with optional query object reference.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param fields_map: Map of field ID to FieldModel.
    :returns: List of InputQueryParam objects, or None when absent.
    """
    if not endpoint.query_params_object_id:
        return None

    query_obj = objects_map.get(endpoint.query_params_object_id)
    if not query_obj:
        return None

    query_params: list[InputQueryParam] = []
    for member in sorted(query_obj.members, key=lambda x: x.position):
        if isinstance(member, ScalarMember):
            field = fields_map.get(member.field_id)
            if field:
                query_params.append(
                    InputQueryParam(
                        name=SnakeCaseName(_scalar_member_field_name(field)),
                        type=_build_field_type(field.field_type.python_type),
                        optional=member.is_nullable,
                        description=field.description,
                    )
                )
    return query_params


def _object_name(
    object_id: UUID | None,
    objects_map: dict[UUID, ObjectDefinition],
) -> str | None:
    """Return an object name for an optional endpoint object reference.

    :param object_id: Optional object ID referenced by an endpoint.
    :param objects_map: Map of object ID to ObjectDefinition.
    :returns: Object name, or None when no matching object exists.
    """
    if not object_id:
        return None
    obj = objects_map.get(object_id)
    if not obj:
        return None
    return obj.name


def _build_field_type(python_type: str, container: str | None = None) -> str:
    """Build a Python type annotation from a base type and optional container.

    :param python_type: Base Python type annotation.
    :param container: Optional container type, such as ``List``.
    :returns: Python type annotation for api_craft input.
    """
    if container:
        return f"{container}[{python_type}]"
    return python_type


def _build_endpoint_name(method: str, path: str) -> str:
    """Build a PascalCase endpoint name from HTTP method and path.

    :param method: HTTP method.
    :param path: Endpoint path.
    :returns: PascalCase endpoint name.
    """
    parts = []
    for segment in path.strip("/").split("/"):
        if segment.startswith("{") and segment.endswith("}"):
            param_name = segment[1:-1]
            words = re.split(r"[^a-zA-Z0-9]+", param_name)
            parts.append("By" + "".join(w.capitalize() for w in words if w))
        else:
            words = re.split(r"[^a-zA-Z0-9]+", segment)
            parts.append("".join(w.capitalize() for w in words if w))

    method_prefix = method.lower().capitalize()
    path_part = "".join(parts)
    if path_part:
        return f"{method_prefix}{path_part}"
    return f"{method_prefix}Root"


def _build_field_validators(field: FieldModel) -> list[InputValidator]:
    """Convert field constraints to api_craft validators.

    :param field: Field model with constraint values loaded.
    :returns: Input validators for Field() parameters.
    """
    validators = []
    for constraint_value in field.constraint_values:
        parsed = _parse_constraint_value(
            constraint_value.value,
            constraint_value.constraint.parameter_types,
        )
        params = {"value": parsed} if parsed is not None else None
        validators.append(
            InputValidator(name=constraint_value.constraint.name, params=params)
        )
    return validators


def _parse_constraint_value(value: str | None, parameter_types: list[str]) -> object:
    """Parse a string constraint value to its typed Python representation.

    :param value: Raw string value from the database.
    :param parameter_types: Declared parameter type names.
    :returns: Typed Python value, or None when value is None.
    """
    if value is None:
        return None
    if "int" in parameter_types:
        try:
            return int(value)
        except ValueError:
            pass
    if "float" in parameter_types:
        try:
            return float(value)
        except ValueError:
            pass
    return value


def _build_resolved_field_validators(field: FieldModel) -> list[dict]:
    """Resolve applied field validators to function definitions.

    :param field: Field model with validators and templates loaded.
    :returns: Resolved field validator dictionaries for api_craft input.
    """
    resolved = []
    for validator in sorted(field.validators, key=lambda x: x.position):
        template = validator.template
        context = validator.parameters or {}
        function_body = _render_template(template.body_template, context)
        function_name = (
            f"{template.name.lower().replace(' ', '_').replace('&', 'and')}"
            f"_{field.name}"
        )
        resolved.append(
            {
                "function_name": function_name,
                "mode": template.mode,
                "function_body": function_body,
            }
        )
    return resolved


def _build_resolved_model_validators(obj: ObjectDefinition) -> list[dict]:
    """Resolve applied model validators to function definitions.

    :param obj: Object model with validators and templates loaded.
    :returns: Resolved model validator dictionaries for api_craft input.
    """
    resolved = []
    for validator in sorted(obj.validators, key=lambda x: x.position):
        template = validator.template
        context = {**(validator.parameters or {}), **validator.field_mappings}
        function_body = _render_template(template.body_template, context)
        function_name = (
            f"validate_{template.name.lower().replace(' ', '_').replace('&', 'and')}"
        )
        resolved.append(
            {
                "function_name": function_name,
                "mode": template.mode,
                "function_body": function_body,
            }
        )
    return resolved


def _render_template(body_template: str, context: dict[str, str]) -> str:
    """Render a Jinja2 body template with the given context.

    :param body_template: Jinja2 template string.
    :param context: Template variables to substitute.
    :returns: Rendered Python code string.
    """
    env = Environment()
    template = env.from_string(body_template)
    return template.render(**context)

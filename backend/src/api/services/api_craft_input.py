# src/api/services/api_craft_input.py
"""Adapter from API Design Snapshot facts to api_craft input models."""

import re
from typing import Any, cast
from uuid import UUID

from jinja2 import Environment

from api.models.database import (
    ApiModel,
    FieldModel,
    ObjectDefinition,
)
from api.schemas.api import GenerateOptions
from api.services.api_design_snapshot import (
    APIDesignEndpoint,
    APIDesignObject,
    APIDesignScalarMember,
    APIDesignSnapshot,
    build_api_design_snapshot,
)
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
    """Build the api_craft input model from loaded persisted entities.

    :param api: The API model.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param fields_map: Map of field ID to FieldModel.
    :param options: Generation options.
    :returns: InputAPI for code generation.
    """
    snapshot = build_api_design_snapshot(api, objects_map, fields_map)
    return build_input_api_from_snapshot(snapshot, options)


def build_input_api_from_snapshot(
    snapshot: APIDesignSnapshot,
    options: GenerateOptions,
) -> InputAPI:
    """Build the current api_craft input model from an API Design Snapshot.

    :param snapshot: Portable API Design Snapshot.
    :param options: Generation options for the current FastAPI target.
    :returns: InputAPI for code generation.
    """
    input_objects: list[InputModel] = []
    for obj in snapshot.objects:
        fields: list[InputField] = []
        input_relationships: list[InputRelationship] = []

        for scalar_member in obj.scalar_members:
            pk, exposure, default = _derive_input_field_props(scalar_member)
            input_field = InputField(
                name=SnakeCaseName(scalar_member.field_name),
                type=_build_field_type(
                    scalar_member.field_type, scalar_member.container
                ),
                nullable=scalar_member.nullable,
                description=scalar_member.description,
                default=default,
                validators=_build_field_validators(scalar_member),
                field_validators=_build_resolved_field_validators(scalar_member),
                pk=pk,
                exposure=exposure,
            )
            fields.append(input_field)

        for relationship_member in obj.relationship_members:
            input_relationships.append(
                InputRelationship(
                    name=relationship_member.name,
                    target_model=relationship_member.target_object_name,
                    kind=cast(RelationshipKind, relationship_member.kind),
                    inverse_name=relationship_member.inverse_name,
                    required=relationship_member.required,
                )
            )

        input_objects.append(
            InputModel(
                name=PascalCaseName(obj.name),
                fields=fields,
                description=obj.description,
                model_validators=_build_resolved_model_validators(obj),
                relationships=input_relationships,
            )
        )

    input_tags = [InputTag(name=name, description="") for name in snapshot.tag_names]

    input_endpoints: list[InputEndpoint] = []
    for endpoint in snapshot.endpoints:
        object_name = endpoint.object_name
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
                query_params=_build_query_params(endpoint),
                path_params=_build_path_params(endpoint),
                description=endpoint.description,
                use_envelope=endpoint.use_envelope,
                response_shape=cast(ResponseShape, endpoint.response_shape),
                target=object_name,
            )
        )

    return InputAPI(
        name=PascalCaseName(snapshot.name),
        version=snapshot.version,
        author="Median Code",
        description=snapshot.description,
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
    member: APIDesignScalarMember,
) -> tuple[bool, FieldExposure, FieldDefault | None]:
    """Derive InputField properties from a scalar member.

    :param member: API Design Snapshot scalar member.
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


def _build_path_params(
    endpoint: APIDesignEndpoint,
) -> list[InputPathParam] | None:
    """Build api_craft path parameters from snapshot facts.

    :param endpoint: API Design Snapshot endpoint.
    :returns: List of InputPathParam objects, or None when absent.
    """
    if not endpoint.path_params:
        return None

    return [
        InputPathParam(
            name=SnakeCaseName(param.name),
            type=param.type,
            description=param.description,
        )
        for param in endpoint.path_params
    ]


def _build_query_params(endpoint: APIDesignEndpoint) -> list[InputQueryParam] | None:
    """Build api_craft query parameters from snapshot facts.

    :param endpoint: API Design Snapshot endpoint.
    :returns: List of InputQueryParam objects, or None when absent.
    """
    if not endpoint.query_params:
        return None

    return [
        InputQueryParam(
            name=SnakeCaseName(param.name),
            type=param.type,
            optional=param.optional,
            description=param.description,
        )
        for param in endpoint.query_params
    ]


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


def _build_field_validators(
    member: APIDesignScalarMember,
) -> list[InputValidator]:
    """Convert field constraints to api_craft validators.

    :param member: API Design Snapshot scalar member.
    :returns: Input validators for Field() parameters.
    """
    validators = []
    for constraint in member.constraints:
        parsed = _parse_constraint_value(
            constraint.value,
            constraint.parameter_types,
        )
        params = {"value": parsed} if parsed is not None else None
        validators.append(InputValidator(name=constraint.name, params=params))
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


def _build_resolved_field_validators(
    member: APIDesignScalarMember,
) -> list[InputResolvedFieldValidator]:
    """Resolve applied field validators to api_craft function definitions.

    :param member: API Design Snapshot scalar member.
    :returns: Resolved field validator dictionaries for api_craft input.
    """
    resolved = []
    for validator in member.field_validators:
        function_body = _render_template(validator.body_template, validator.parameters)
        function_name = (
            f"{validator.name.lower().replace(' ', '_').replace('&', 'and')}"
            f"_{member.field_name}"
        )
        resolved.append(
            InputResolvedFieldValidator(
                function_name=function_name,
                mode=validator.mode,
                function_body=function_body,
            )
        )
    return resolved


def _build_resolved_model_validators(
    obj: APIDesignObject,
) -> list[InputResolvedModelValidator]:
    """Resolve applied model validators to api_craft function definitions.

    :param obj: API Design Snapshot Object.
    :returns: Resolved model validator dictionaries for api_craft input.
    """
    resolved = []
    for validator in obj.model_validators:
        context = {**validator.parameters, **validator.field_mappings}
        function_body = _render_template(validator.body_template, context)
        function_name = (
            f"validate_{validator.name.lower().replace(' ', '_').replace('&', 'and')}"
        )
        resolved.append(
            InputResolvedModelValidator(
                function_name=function_name,
                mode=validator.mode,
                function_body=function_body,
            )
        )
    return resolved


def _render_template(body_template: str, context: dict[str, Any]) -> str:
    """Render a Jinja2 body template with the given context.

    :param body_template: Jinja2 template string.
    :param context: Template variables to substitute.
    :returns: Rendered Python code string.
    """
    env = Environment()
    template = env.from_string(body_template)
    return template.render(**context)

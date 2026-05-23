# src/api/services/api_design_snapshot.py
"""Portable API Design Snapshot assembled from persisted API entities."""

from dataclasses import dataclass, field
from typing import Any, cast
from uuid import UUID

from api.models.database import (
    ApiEndpoint,
    ApiModel,
    FieldModel,
    ObjectDefinition,
)
from api.models.members import RelationshipMember, ScalarMember
from api.schemas.literals import (
    Container,
    FieldRole,
    HttpMethod,
    RelationshipKind,
    ResponseShape,
    ValidatorMode,
)
from api.services.path_params import get_path_param_field_id


@dataclass(frozen=True)
class APIDesignFieldConstraint:
    """Portable field constraint selected for generation.

    :ivar name: Constraint name.
    :ivar value: Raw persisted constraint value.
    :ivar parameter_types: Declared parameter type names.
    """

    name: str
    value: str | None
    parameter_types: list[str]


@dataclass(frozen=True)
class APIDesignFieldValidator:
    """Portable field validator template application.

    :ivar name: Validator template name.
    :ivar mode: Validator execution mode.
    :ivar body_template: Template body for the current validator catalogue.
    :ivar parameters: User-selected template parameters.
    """

    name: str
    mode: ValidatorMode
    body_template: str
    parameters: dict[str, Any]


@dataclass(frozen=True)
class APIDesignModelValidator:
    """Portable model validator template application.

    :ivar name: Validator template name.
    :ivar mode: Validator execution mode.
    :ivar body_template: Template body for the current validator catalogue.
    :ivar parameters: User-selected template parameters.
    :ivar field_mappings: User-selected field mappings.
    """

    name: str
    mode: ValidatorMode
    body_template: str
    parameters: dict[str, Any]
    field_mappings: dict[str, Any]


@dataclass(frozen=True)
class APIDesignScalarMember:
    """Portable scalar Object Member facts.

    :ivar member_name: Scalar Member name on the Object.
    :ivar field_name: Referenced Field name used by current generation.
    :ivar field_type: Referenced Field type.
    :ivar container: Optional Field container.
    :ivar nullable: Whether the Scalar Member is nullable.
    :ivar description: Referenced Field description.
    :ivar role: Scalar Member role.
    :ivar default_value: Persisted literal default value.
    :ivar constraints: Referenced Field constraints.
    :ivar field_validators: Referenced Field validators.
    """

    member_name: str
    field_name: str
    field_type: str
    container: Container | None
    nullable: bool
    description: str | None
    role: FieldRole
    default_value: str | None
    constraints: list[APIDesignFieldConstraint] = field(default_factory=list)
    field_validators: list[APIDesignFieldValidator] = field(default_factory=list)


@dataclass(frozen=True)
class APIDesignRelationshipMember:
    """Portable Relationship Member facts.

    :ivar name: Relationship Member name on the source Object.
    :ivar target_object_name: Target Object name.
    :ivar kind: Authored relationship kind.
    :ivar inverse_name: Derived inverse member name.
    :ivar required: Whether the target reference is required.
    """

    name: str
    target_object_name: str
    kind: RelationshipKind
    inverse_name: str
    required: bool


@dataclass(frozen=True)
class APIDesignObject:
    """Portable Object facts used by Generation Targets.

    :ivar id: Object identifier.
    :ivar name: Object name.
    :ivar description: Object description.
    :ivar scalar_members: Scalar Object Members.
    :ivar relationship_members: Relationship Object Members.
    :ivar model_validators: Object-level validator applications.
    """

    id: UUID
    name: str
    description: str | None
    scalar_members: list[APIDesignScalarMember] = field(default_factory=list)
    relationship_members: list[APIDesignRelationshipMember] = field(
        default_factory=list
    )
    model_validators: list[APIDesignModelValidator] = field(default_factory=list)


@dataclass(frozen=True)
class APIDesignPathParam:
    """Portable endpoint path parameter facts.

    :ivar name: Path parameter name.
    :ivar type: Parameter type.
    :ivar description: Parameter description.
    """

    name: str
    type: str
    description: str


@dataclass(frozen=True)
class APIDesignQueryParam:
    """Portable endpoint query parameter facts.

    :ivar name: Query parameter name.
    :ivar type: Parameter type.
    :ivar optional: Whether the query parameter is optional.
    :ivar description: Query parameter description.
    """

    name: str
    type: str
    optional: bool
    description: str | None


@dataclass(frozen=True)
class APIDesignEndpoint:
    """Portable Endpoint facts used by Generation Targets.

    :ivar method: HTTP method.
    :ivar path: Endpoint path.
    :ivar tag_name: Optional tag name.
    :ivar path_params: Resolved path parameters.
    :ivar query_params: Resolved query parameters.
    :ivar object_name: Referenced Object name.
    :ivar description: Endpoint description.
    :ivar use_envelope: Whether responses use the standard envelope.
    :ivar response_shape: Endpoint response shape.
    """

    method: HttpMethod
    path: str
    tag_name: str | None
    path_params: list[APIDesignPathParam]
    query_params: list[APIDesignQueryParam]
    object_name: str | None
    description: str | None
    use_envelope: bool
    response_shape: ResponseShape


@dataclass(frozen=True)
class APIDesignSnapshot:
    """Portable API facts assembled from persisted entities.

    :ivar name: API name.
    :ivar version: API version.
    :ivar description: API description.
    :ivar objects: Objects in the API namespace.
    :ivar endpoints: API endpoints.
    :ivar tag_names: Sorted endpoint tag names.
    """

    name: str
    version: str
    description: str
    objects: list[APIDesignObject]
    endpoints: list[APIDesignEndpoint]
    tag_names: list[str]


def build_api_design_snapshot(
    api: ApiModel,
    objects_map: dict[UUID, ObjectDefinition],
    fields_map: dict[UUID, FieldModel],
) -> APIDesignSnapshot:
    """Build a portable API Design Snapshot from loaded persisted entities.

    :param api: The API model.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param fields_map: Map of field ID to FieldModel.
    :returns: Portable API Design Snapshot.
    """
    return APIDesignSnapshot(
        name=api.title,
        version=api.version,
        description=api.description or "API Generated by Median Code",
        objects=[
            _build_object_snapshot(obj, objects_map, fields_map)
            for obj in objects_map.values()
        ],
        endpoints=[
            _build_endpoint_snapshot(endpoint, objects_map, fields_map)
            for endpoint in api.endpoints
        ],
        tag_names=sorted(
            {endpoint.tag_name for endpoint in api.endpoints if endpoint.tag_name}
        ),
    )


def _build_object_snapshot(
    obj: ObjectDefinition,
    objects_map: dict[UUID, ObjectDefinition],
    fields_map: dict[UUID, FieldModel],
) -> APIDesignObject:
    """Build one Object snapshot.

    :param obj: Persisted Object.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param fields_map: Map of field ID to FieldModel.
    :returns: Portable Object facts.
    """
    scalar_members: list[APIDesignScalarMember] = []
    relationship_members: list[APIDesignRelationshipMember] = []

    for member in sorted(obj.members, key=lambda x: x.position):
        if isinstance(member, ScalarMember):
            field_model = fields_map.get(member.field_id)
            if field_model:
                scalar_members.append(
                    _build_scalar_member_snapshot(member, field_model)
                )
        elif isinstance(member, RelationshipMember):
            target_obj = objects_map.get(member.target_object_id)
            target_name = target_obj.name if target_obj else "Unknown"
            relationship_members.append(
                APIDesignRelationshipMember(
                    name=member.name,
                    target_object_name=target_name,
                    kind=cast(RelationshipKind, member.kind),
                    inverse_name=member.inverse_name,
                    required=member.required,
                )
            )

    return APIDesignObject(
        id=obj.id,
        name=obj.name,
        description=obj.description,
        scalar_members=scalar_members,
        relationship_members=relationship_members,
        model_validators=[
            _build_model_validator_snapshot(validator)
            for validator in sorted(obj.validators, key=lambda x: x.position)
        ],
    )


def _build_scalar_member_snapshot(
    member: ScalarMember,
    field_model: FieldModel,
) -> APIDesignScalarMember:
    """Build one Scalar Member snapshot.

    :param member: Persisted Scalar Member.
    :param field_model: Referenced Field model.
    :returns: Portable Scalar Member facts.
    """
    return APIDesignScalarMember(
        member_name=member.name,
        field_name=field_model.name,
        field_type=field_model.field_type.python_type,
        container=cast(Container | None, field_model.container),
        nullable=member.is_nullable,
        description=field_model.description,
        role=cast(FieldRole, member.role),
        default_value=member.default_value,
        constraints=[
            APIDesignFieldConstraint(
                name=constraint_value.constraint.name,
                value=constraint_value.value,
                parameter_types=constraint_value.constraint.parameter_types,
            )
            for constraint_value in field_model.constraint_values
        ],
        field_validators=[
            _build_field_validator_snapshot(validator)
            for validator in sorted(field_model.validators, key=lambda x: x.position)
        ],
    )


def _build_field_validator_snapshot(validator) -> APIDesignFieldValidator:
    """Build one field validator snapshot.

    :param validator: Applied field validator model.
    :returns: Portable field validator facts.
    """
    template = validator.template
    return APIDesignFieldValidator(
        name=template.name,
        mode=cast(ValidatorMode, template.mode),
        body_template=template.body_template,
        parameters=validator.parameters or {},
    )


def _build_model_validator_snapshot(validator) -> APIDesignModelValidator:
    """Build one model validator snapshot.

    :param validator: Applied model validator model.
    :returns: Portable model validator facts.
    """
    template = validator.template
    return APIDesignModelValidator(
        name=template.name,
        mode=cast(ValidatorMode, template.mode),
        body_template=template.body_template,
        parameters=validator.parameters or {},
        field_mappings=validator.field_mappings,
    )


def _build_endpoint_snapshot(
    endpoint: ApiEndpoint,
    objects_map: dict[UUID, ObjectDefinition],
    fields_map: dict[UUID, FieldModel],
) -> APIDesignEndpoint:
    """Build one Endpoint snapshot.

    :param endpoint: Persisted Endpoint.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param fields_map: Map of field ID to FieldModel.
    :returns: Portable Endpoint facts.
    """
    return APIDesignEndpoint(
        method=cast(HttpMethod, endpoint.method),
        path=endpoint.path,
        tag_name=endpoint.tag_name,
        path_params=_build_path_params(endpoint, fields_map),
        query_params=_build_query_params(endpoint, objects_map, fields_map),
        object_name=_object_name(endpoint.object_id, objects_map),
        description=endpoint.description,
        use_envelope=endpoint.use_envelope,
        response_shape=cast(ResponseShape, endpoint.response_shape),
    )


def _build_path_params(
    endpoint: ApiEndpoint,
    fields_map: dict[UUID, FieldModel],
) -> list[APIDesignPathParam]:
    """Build path parameters from endpoint JSONB data.

    :param endpoint: Persisted Endpoint.
    :param fields_map: Map of field ID to FieldModel.
    :returns: Portable path parameter facts.
    """
    if not endpoint.path_params:
        return []

    path_params: list[APIDesignPathParam] = []
    for param in endpoint.path_params:
        if not isinstance(param, dict):
            continue
        field_id = get_path_param_field_id(param)
        field_model = fields_map.get(field_id) if field_id else None
        field_type = _build_field_type(field_model) if field_model else "str"
        description = field_model.description or "" if field_model else ""
        path_params.append(
            APIDesignPathParam(
                name=str(param["name"]),
                type=field_type,
                description=description,
            )
        )
    return path_params


def _build_query_params(
    endpoint: ApiEndpoint,
    objects_map: dict[UUID, ObjectDefinition],
    fields_map: dict[UUID, FieldModel],
) -> list[APIDesignQueryParam]:
    """Build query parameters from the endpoint query Object reference.

    :param endpoint: Persisted Endpoint.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param fields_map: Map of field ID to FieldModel.
    :returns: Portable query parameter facts.
    """
    if not endpoint.query_params_object_id:
        return []

    query_obj = objects_map.get(endpoint.query_params_object_id)
    if not query_obj:
        return []

    query_params: list[APIDesignQueryParam] = []
    for member in sorted(query_obj.members, key=lambda x: x.position):
        if isinstance(member, ScalarMember):
            field_model = fields_map.get(member.field_id)
            if field_model:
                query_params.append(
                    APIDesignQueryParam(
                        name=field_model.name,
                        type=_build_field_type(field_model),
                        optional=member.is_nullable,
                        description=field_model.description,
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


def _build_field_type(field_model: FieldModel) -> str:
    """Build a portable type annotation from a Field model.

    :param field_model: Persisted Field model.
    :returns: Type annotation string.
    """
    if field_model.container:
        return f"{field_model.container}[{field_model.field_type.python_type}]"
    return field_model.field_type.python_type

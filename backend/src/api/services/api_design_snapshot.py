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
from api.models.members import FieldMember, RelationshipMember
from api.schemas.literals import (
    Container,
    FieldRole,
    FilterOperator,
    HttpMethod,
    RelationshipKind,
    ResponseShape,
    ValidatorMode,
)


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
class APIDesignFieldMember:
    """Portable Field Member facts.

    :ivar member_name: Field Member name on the Object.
    :ivar field_name: Referenced Field name.
    :ivar field_type: Referenced Field type.
    :ivar container: Optional Field container.
    :ivar nullable: Whether the Field Member is nullable.
    :ivar description: Referenced Field description.
    :ivar role: Field Member role.
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
    :ivar field_members: Field Members.
    :ivar relationship_members: Relationship Members.
    :ivar model_validators: Object-level validator applications.
    """

    id: UUID
    name: str
    description: str | None
    field_members: list[APIDesignFieldMember] = field(default_factory=list)
    relationship_members: list[APIDesignRelationshipMember] = field(
        default_factory=list
    )
    model_validators: list[APIDesignModelValidator] = field(default_factory=list)


@dataclass(frozen=True)
class APIDesignPathParam:
    """Portable endpoint path parameter facts.

    :ivar name: Path parameter name.
    :ivar field_member_name: Target Field Member name.
    :ivar type: Parameter type.
    :ivar description: Parameter description.
    """

    name: str
    field_member_name: str
    type: str
    description: str


@dataclass(frozen=True)
class APIDesignQueryParam:
    """Portable endpoint query parameter facts.

    :ivar name: Query parameter name.
    :ivar field_member_name: Target Field Member name.
    :ivar type: Parameter type.
    :ivar description: Query parameter description.
    :ivar operator: Query filter operator.
    :ivar required: Whether clients must provide this query parameter.
    """

    name: str
    field_member_name: str
    type: str
    description: str | None
    operator: FilterOperator
    required: bool


@dataclass(frozen=True)
class APIDesignEndpoint:
    """Portable Endpoint facts used by Generation Targets.

    :ivar method: HTTP method.
    :ivar path: Endpoint path.
    :ivar tag_name: Optional tag name.
    :ivar path_params: Resolved path parameters.
    :ivar query_params: Resolved query parameters.
    :ivar target_object_name: Referenced target Object name.
    :ivar description: Endpoint description.
    :ivar use_envelope: Whether responses use the standard envelope.
    :ivar response_shape: Endpoint response shape.
    :ivar pagination: Whether generated list endpoints include pagination.
    """

    method: HttpMethod
    path: str
    tag_name: str | None
    path_params: list[APIDesignPathParam]
    query_params: list[APIDesignQueryParam]
    target_object_name: str
    description: str | None
    use_envelope: bool
    response_shape: ResponseShape
    pagination: bool


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
    field_members: list[APIDesignFieldMember] = []
    relationship_members: list[APIDesignRelationshipMember] = []

    for member in sorted(obj.members, key=lambda x: x.position):
        if isinstance(member, FieldMember):
            field_members.append(
                _build_field_member_snapshot(
                    member, _field_for_member(member, fields_map)
                )
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
        field_members=field_members,
        relationship_members=relationship_members,
        model_validators=[
            _build_model_validator_snapshot(validator)
            for validator in sorted(obj.validators, key=lambda x: x.position)
        ],
    )


def _build_field_member_snapshot(
    member: FieldMember,
    field_model: FieldModel,
) -> APIDesignFieldMember:
    """Build one Field Member snapshot.

    :param member: Persisted Field Member.
    :param field_model: Referenced Field model.
    :returns: Portable Field Member facts.
    """
    return APIDesignFieldMember(
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
        path_params=_build_path_params(endpoint, objects_map, fields_map),
        query_params=_build_query_params(endpoint, objects_map, fields_map),
        target_object_name=_target_object(endpoint, objects_map).name,
        description=endpoint.description,
        use_envelope=endpoint.use_envelope,
        response_shape=cast(ResponseShape, endpoint.response_shape),
        pagination=endpoint.pagination,
    )


def _build_path_params(
    endpoint: ApiEndpoint,
    objects_map: dict[UUID, ObjectDefinition],
    fields_map: dict[UUID, FieldModel],
) -> list[APIDesignPathParam]:
    """Build path parameters from endpoint-owned parameter rows.

    :param endpoint: Persisted Endpoint.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param fields_map: Map of field ID to FieldModel.
    :returns: Portable path parameter facts.
    """
    if not endpoint.path_params:
        return []

    target_object = _target_object(endpoint, objects_map)
    path_params: list[APIDesignPathParam] = []
    for param in sorted(endpoint.path_params, key=lambda x: x.position):
        field_member = _target_field_member(target_object, param.field_member_id)
        field_model = _field_for_member(field_member, fields_map)
        path_params.append(
            APIDesignPathParam(
                name=param.name,
                field_member_name=field_member.name,
                type=_build_field_type(field_model),
                description=field_model.description or "",
            )
        )
    return path_params


def _build_query_params(
    endpoint: ApiEndpoint,
    objects_map: dict[UUID, ObjectDefinition],
    fields_map: dict[UUID, FieldModel],
) -> list[APIDesignQueryParam]:
    """Build query parameters from endpoint-owned parameter rows.

    :param endpoint: Persisted Endpoint.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param fields_map: Map of field ID to FieldModel.
    :returns: Portable query parameter facts.
    """
    if not endpoint.query_params:
        return []

    target_object = _target_object(endpoint, objects_map)
    query_params: list[APIDesignQueryParam] = []
    for param in sorted(endpoint.query_params, key=lambda x: x.position):
        field_member = _target_field_member(target_object, param.field_member_id)
        field_model = _field_for_member(field_member, fields_map)
        query_params.append(
            APIDesignQueryParam(
                name=param.name,
                field_member_name=field_member.name,
                type=_build_field_type(field_model),
                description=field_model.description,
                operator=cast(FilterOperator, param.operator),
                required=param.required,
            )
        )
    return query_params


def _target_object(
    endpoint: ApiEndpoint,
    objects_map: dict[UUID, ObjectDefinition],
) -> ObjectDefinition:
    """Return the target Object referenced by an Endpoint.

    :param endpoint: Persisted Endpoint.
    :param objects_map: Map of object ID to ObjectDefinition.
    :returns: Target Object.
    :raises ValueError: If the target Object is missing.
    """
    target_object = objects_map.get(endpoint.target_object_id)
    if target_object is None:
        raise ValueError(
            f"Endpoint '{endpoint.path}' references unknown target Object "
            f"'{endpoint.target_object_id}'"
        )
    return target_object


def _target_field_member(
    target_object: ObjectDefinition,
    field_member_id: UUID,
) -> FieldMember:
    """Return a target Object Field Member or raise.

    :param target_object: Endpoint target Object.
    :param field_member_id: Field Member ID referenced by an endpoint parameter.
    :returns: Field Member.
    :raises ValueError: If the Field Member is missing from the target Object.
    """
    for member in target_object.members:
        if isinstance(member, FieldMember) and member.id == field_member_id:
            return member
    raise ValueError(
        f"Endpoint parameter references Field Member '{field_member_id}' "
        f"outside target Object '{target_object.name}'"
    )


def _field_for_member(
    field_member: FieldMember,
    fields_map: dict[UUID, FieldModel],
) -> FieldModel:
    """Return the Field referenced by a Field Member or raise.

    :param field_member: Field Member.
    :param fields_map: Map of field ID to FieldModel.
    :returns: Referenced Field.
    :raises ValueError: If the Field is missing.
    """
    field_model = fields_map.get(field_member.field_id)
    if field_model is None:
        raise ValueError(
            f"Field Member '{field_member.name}' references unknown Field "
            f"'{field_member.field_id}'"
        )
    return field_model


def _build_field_type(field_model: FieldModel) -> str:
    """Build a portable type annotation from a Field model.

    :param field_model: Persisted Field model.
    :returns: Type annotation string.
    """
    if field_model.container:
        return f"{field_model.container}[{field_model.field_type.python_type}]"
    return field_model.field_type.python_type

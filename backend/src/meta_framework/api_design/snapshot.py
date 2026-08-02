"""Portable API Design Snapshot facts consumed by Generation Targets."""

from dataclasses import dataclass, field
from typing import Any, Literal
from uuid import UUID

HttpMethod = Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
ResponseShape = Literal["object", "list"]
Container = Literal["List"]
ValidatorMode = Literal["before", "after"]
RelationshipKind = Literal["one_to_one", "one_to_many", "many_to_many"]
FilterOperator = Literal["eq", "gte", "lte", "gt", "lt", "like", "ilike", "in"]
FieldRole = Literal[
    "pk",
    "writable",
    "write_only",
    "read_only",
    "created_timestamp",
    "updated_timestamp",
    "generated_uuid",
]


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

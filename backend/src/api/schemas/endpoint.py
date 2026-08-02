# src/api/schemas/endpoint.py
"""Pydantic schemas for ApiEndpoint entity."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from api.schemas.literals import FilterOperator, HttpMethod, ResponseShape
from meta_framework.generation_targets.fastapi_python.models.types import SnakeCaseName


class PathParamSchema(BaseModel):
    """Schema for an endpoint-owned path parameter.

    :ivar name: Parameter name extracted from path braces.
    :ivar field_member_id: Target Object Field Member reference.
    """

    name: SnakeCaseName = Field(..., examples=["user_id"])
    field_member_id: UUID = Field(
        ..., alias="fieldMemberId", examples=["00000000-0000-0000-0003-000000000001"]
    )

    model_config = ConfigDict(populate_by_name=True)


class QueryParamSchema(BaseModel):
    """Schema for an endpoint-owned query parameter.

    :ivar name: Query parameter name.
    :ivar field_member_id: Target Object Field Member reference.
    :ivar operator: Filter operator.
    :ivar required: Whether clients must provide this query parameter.
    """

    name: SnakeCaseName = Field(..., examples=["min_price"])
    field_member_id: UUID = Field(
        ..., alias="fieldMemberId", examples=["00000000-0000-0000-0003-000000000002"]
    )
    operator: FilterOperator = Field(default="eq", examples=["eq"])
    required: bool = Field(default=False, examples=[False])

    model_config = ConfigDict(populate_by_name=True)


class ApiEndpointCreate(BaseModel):
    """Request schema for creating an endpoint.

    :ivar api_id: API this endpoint belongs to.
    :ivar method: HTTP method.
    :ivar path: URL path with optional parameters.
    :ivar description: Endpoint description.
    :ivar tag_name: Optional tag name.
    :ivar target_object_id: Endpoint target Object.
    :ivar path_params: Endpoint-owned path parameters.
    :ivar query_params: Endpoint-owned query parameters.
    :ivar pagination: Whether generated list endpoints include pagination.
    :ivar use_envelope: Whether to wrap response in envelope.
    :ivar response_shape: Response shape.
    """

    api_id: UUID = Field(
        ..., alias="apiId", examples=["00000000-0000-0000-0005-000000000001"]
    )
    method: HttpMethod = Field(..., examples=["GET"])
    path: str = Field(..., examples=["/users/{user_id}"])
    description: str = Field(default="", examples=["Get user by ID"])
    tag_name: str | None = Field(default=None, alias="tagName", examples=["Users"])
    target_object_id: UUID = Field(
        ..., alias="targetObjectId", examples=["00000000-0000-0000-0007-000000000001"]
    )
    path_params: list[PathParamSchema] = Field(default_factory=list, alias="pathParams")
    query_params: list[QueryParamSchema] = Field(
        default_factory=list, alias="queryParams"
    )
    pagination: bool = Field(default=False, examples=[False])
    use_envelope: bool = Field(default=True, alias="useEnvelope", examples=[True])
    response_shape: ResponseShape = Field(
        default="object", alias="responseShape", examples=["object"]
    )

    model_config = ConfigDict(populate_by_name=True)


class ApiEndpointUpdate(BaseModel):
    """Request schema for updating an endpoint.

    :ivar api_id: Updated API reference.
    :ivar method: Updated HTTP method.
    :ivar path: Updated URL path.
    :ivar description: Updated description.
    :ivar tag_name: Updated tag name.
    :ivar target_object_id: Updated endpoint target Object.
    :ivar path_params: Updated endpoint-owned path parameters.
    :ivar query_params: Updated endpoint-owned query parameters.
    :ivar pagination: Updated pagination flag.
    :ivar use_envelope: Updated envelope setting.
    :ivar response_shape: Updated response shape.
    """

    api_id: UUID | None = Field(
        default=None, alias="apiId", examples=["00000000-0000-0000-0005-000000000001"]
    )
    method: HttpMethod | None = Field(default=None, examples=["POST"])
    path: str | None = Field(default=None, examples=["/users"])
    description: str | None = Field(
        default=None, examples=["Updated endpoint description"]
    )
    tag_name: str | None = Field(default=None, alias="tagName")
    target_object_id: UUID | None = Field(default=None, alias="targetObjectId")
    path_params: list[PathParamSchema] | None = Field(default=None, alias="pathParams")
    query_params: list[QueryParamSchema] | None = Field(
        default=None, alias="queryParams"
    )
    pagination: bool | None = None
    use_envelope: bool | None = Field(default=None, alias="useEnvelope")
    response_shape: ResponseShape | None = Field(default=None, alias="responseShape")

    model_config = ConfigDict(populate_by_name=True)


class ApiEndpointResponse(BaseModel):
    """Response schema for endpoint data.

    :ivar id: Unique identifier for the endpoint.
    :ivar api_id: API this endpoint belongs to.
    :ivar method: HTTP method.
    :ivar path: URL path.
    :ivar description: Endpoint description.
    :ivar tag_name: Tag name.
    :ivar target_object_id: Endpoint target Object.
    :ivar path_params: Endpoint-owned path parameters.
    :ivar query_params: Endpoint-owned query parameters.
    :ivar pagination: Whether generated list endpoints include pagination.
    :ivar use_envelope: Whether response is wrapped in envelope.
    :ivar response_shape: Response shape.
    """

    id: UUID = Field(..., examples=["00000000-0000-0000-0004-000000000001"])
    api_id: UUID = Field(
        ..., alias="apiId", examples=["00000000-0000-0000-0005-000000000001"]
    )
    method: HttpMethod = Field(..., examples=["GET"])
    path: str = Field(..., examples=["/users/{user_id}"])
    description: str = Field(..., examples=["Retrieve user by ID"])
    tag_name: str | None = Field(default=None, alias="tagName", examples=["Users"])
    target_object_id: UUID = Field(
        ..., alias="targetObjectId", examples=["00000000-0000-0000-0007-000000000001"]
    )
    path_params: list[PathParamSchema] = Field(default_factory=list, alias="pathParams")
    query_params: list[QueryParamSchema] = Field(
        default_factory=list, alias="queryParams"
    )
    pagination: bool = Field(default=False, examples=[False])
    use_envelope: bool = Field(..., alias="useEnvelope", examples=[True])
    response_shape: ResponseShape = Field(
        ..., alias="responseShape", examples=["object"]
    )

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

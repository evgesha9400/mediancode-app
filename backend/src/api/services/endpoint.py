# src/api/services/endpoint.py
"""Service layer for ApiEndpoint operations."""

import re
from typing import cast
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.database import (
    ApiEndpoint,
    ApiModel,
    EndpointPathParam,
    EndpointQueryParam,
    FieldModel,
    Namespace,
    ObjectDefinition,
)
from api.models.members import FieldMember
from api.schemas.endpoint import (
    ApiEndpointCreate,
    ApiEndpointResponse,
    ApiEndpointUpdate,
    PathParamSchema,
    QueryParamSchema,
)
from api.schemas.literals import FilterOperator, HttpMethod, ResponseShape
from api.services.base import BaseService
from api_craft.models.types import SnakeCaseName
from api_craft.models.validation_catalog import OPERATOR_VALID_TYPES

PATH_PARAM_PATTERN = re.compile(r"\{([^}]+)\}")


class EndpointService(BaseService[ApiEndpoint]):
    """Service for ApiEndpoint CRUD operations.

    :ivar model_class: The ApiEndpoint model class.
    """

    model_class = ApiEndpoint

    def _path_param_schema(self, param: EndpointPathParam) -> PathParamSchema:
        """Convert a path parameter row to its schema form."""
        return PathParamSchema(
            name=cast(SnakeCaseName, param.name),
            fieldMemberId=param.field_member_id,
        )

    def _query_param_schema(self, param: EndpointQueryParam) -> QueryParamSchema:
        """Convert a query parameter row to its schema form."""
        return QueryParamSchema(
            name=cast(SnakeCaseName, param.name),
            fieldMemberId=param.field_member_id,
            operator=cast(FilterOperator, param.operator),
            required=param.required,
        )

    def _endpoint_load_options(self):
        """Standard eager-load options for endpoint parameter rows."""
        return [
            selectinload(ApiEndpoint.path_params),
            selectinload(ApiEndpoint.query_params),
        ]

    async def list_for_user(
        self,
        user_id: UUID,
        namespace_id: str | None = None,
    ) -> list[ApiEndpoint]:
        """List endpoints owned by a user.

        :param user_id: The authenticated user's ID.
        :param namespace_id: Optional namespace filter.
        :returns: List of user's endpoints.
        """
        query = (
            select(ApiEndpoint)
            .join(ApiModel)
            .join(Namespace)
            .options(*self._endpoint_load_options())
            .where(self.namespace_access.owned_namespace_filter(user_id))
        )
        if namespace_id:
            query = query.where(ApiModel.namespace_id == namespace_id)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id_for_user(
        self, endpoint_id: str, user_id: UUID
    ) -> ApiEndpoint | None:
        """Get an endpoint if owned by the user.

        :param endpoint_id: The endpoint's unique identifier.
        :param user_id: The authenticated user's ID.
        :returns: The endpoint if owned by user, None otherwise.
        """
        query = (
            select(ApiEndpoint)
            .join(ApiModel)
            .join(Namespace)
            .options(*self._endpoint_load_options())
            .where(
                ApiEndpoint.id == endpoint_id,
                self.namespace_access.owned_namespace_filter(user_id),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_for_user(
        self, user_id: UUID, data: ApiEndpointCreate
    ) -> ApiEndpoint:
        """Create a new endpoint for a user.

        :param user_id: The authenticated user's ID.
        :param data: Endpoint creation data.
        :returns: The created endpoint.
        """
        api = await self._get_owned_api(data.api_id, user_id)
        await self._validate_endpoint_semantics(
            api=api,
            method=data.method,
            path=data.path,
            target_object_id=data.target_object_id,
            path_params=data.path_params,
            query_params=data.query_params,
            pagination=data.pagination,
            response_shape=data.response_shape,
        )

        endpoint = ApiEndpoint(
            api_id=data.api_id,
            method=data.method,
            path=data.path,
            description=data.description,
            tag_name=data.tag_name,
            target_object_id=data.target_object_id,
            pagination=data.pagination,
            use_envelope=data.use_envelope,
            response_shape=data.response_shape,
            path_params=[
                EndpointPathParam(
                    position=position,
                    name=param.name,
                    field_member_id=param.field_member_id,
                )
                for position, param in enumerate(data.path_params)
            ],
            query_params=[
                EndpointQueryParam(
                    position=position,
                    name=param.name,
                    field_member_id=param.field_member_id,
                    operator=param.operator,
                    required=param.required,
                )
                for position, param in enumerate(data.query_params)
            ],
        )
        self.db.add(endpoint)
        await self.db.flush()
        await self.db.refresh(endpoint, attribute_names=["path_params", "query_params"])
        return endpoint

    async def update_endpoint(
        self,
        endpoint: ApiEndpoint,
        data: ApiEndpointUpdate,
        user_id: UUID | None = None,
    ) -> ApiEndpoint:
        """Update an endpoint.

        :param endpoint: The endpoint to update.
        :param data: Update data.
        :param user_id: Optional user ID used when the API reference changes.
        :returns: The updated endpoint.
        """
        api_id = data.api_id if data.api_id is not None else endpoint.api_id
        api = await self._get_api_for_endpoint(api_id, user_id)
        method = (
            data.method
            if data.method is not None
            else cast(HttpMethod, endpoint.method)
        )
        path = data.path if data.path is not None else endpoint.path
        target_object_id = (
            data.target_object_id
            if data.target_object_id is not None
            else endpoint.target_object_id
        )
        path_params = (
            data.path_params
            if data.path_params is not None
            else [self._path_param_schema(param) for param in endpoint.path_params]
        )
        query_params = (
            data.query_params
            if data.query_params is not None
            else [self._query_param_schema(param) for param in endpoint.query_params]
        )
        pagination = (
            data.pagination if data.pagination is not None else endpoint.pagination
        )
        response_shape = (
            data.response_shape
            if data.response_shape is not None
            else cast(ResponseShape, endpoint.response_shape)
        )

        await self._validate_endpoint_semantics(
            api=api,
            method=method,
            path=path,
            target_object_id=target_object_id,
            path_params=path_params,
            query_params=query_params,
            pagination=pagination,
            response_shape=response_shape,
        )

        endpoint.api_id = api_id
        endpoint.method = method
        endpoint.path = path
        if "description" in data.model_fields_set:
            endpoint.description = data.description or ""
        if "tag_name" in data.model_fields_set:
            endpoint.tag_name = data.tag_name
        endpoint.target_object_id = target_object_id
        endpoint.pagination = pagination
        if data.use_envelope is not None:
            endpoint.use_envelope = data.use_envelope
        endpoint.response_shape = response_shape
        if data.path_params is not None:
            endpoint.path_params.clear()
            await self.db.flush()
            endpoint.path_params.extend(
                [
                    EndpointPathParam(
                        position=position,
                        name=param.name,
                        field_member_id=param.field_member_id,
                    )
                    for position, param in enumerate(data.path_params)
                ]
            )
        if data.query_params is not None:
            endpoint.query_params.clear()
            await self.db.flush()
            endpoint.query_params.extend(
                [
                    EndpointQueryParam(
                        position=position,
                        name=param.name,
                        field_member_id=param.field_member_id,
                        operator=param.operator,
                        required=param.required,
                    )
                    for position, param in enumerate(data.query_params)
                ]
            )

        await self.db.flush()
        await self.db.refresh(endpoint, attribute_names=["path_params", "query_params"])
        return endpoint

    async def delete_endpoint(self, endpoint: ApiEndpoint) -> None:
        """Delete an endpoint.

        :param endpoint: The endpoint to delete.
        """
        await self.db.delete(endpoint)
        await self.db.flush()

    def to_response(self, endpoint: ApiEndpoint) -> ApiEndpointResponse:
        """Convert an endpoint model to a response schema.

        :param endpoint: Endpoint database model.
        :returns: Endpoint response schema.
        """
        return ApiEndpointResponse(
            id=endpoint.id,
            apiId=endpoint.api_id,
            method=cast(HttpMethod, endpoint.method),
            path=endpoint.path,
            description=endpoint.description,
            tagName=endpoint.tag_name,
            targetObjectId=endpoint.target_object_id,
            pathParams=[
                self._path_param_schema(param) for param in endpoint.path_params
            ],
            queryParams=[
                self._query_param_schema(param) for param in endpoint.query_params
            ],
            pagination=endpoint.pagination,
            useEnvelope=endpoint.use_envelope,
            responseShape=cast(ResponseShape, endpoint.response_shape),
        )

    async def _get_owned_api(self, api_id: UUID, user_id: UUID) -> ApiModel:
        """Return an API owned by the user or raise.

        :param api_id: API ID.
        :param user_id: User ID.
        :returns: Owned API.
        :raises HTTPException: If API is not owned by the user.
        """
        query = (
            select(ApiModel)
            .join(Namespace)
            .where(
                ApiModel.id == api_id,
                self.namespace_access.owned_namespace_filter(user_id),
            )
        )
        result = await self.db.execute(query)
        api = result.scalar_one_or_none()
        if api is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="API not found or not owned by user",
            )
        return api

    async def _get_api_for_endpoint(
        self, api_id: UUID, user_id: UUID | None
    ) -> ApiModel:
        """Return the endpoint API, using ownership validation when available."""
        if user_id is not None:
            return await self._get_owned_api(api_id, user_id)

        api = await self.db.get(ApiModel, api_id)
        if api is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="API not found",
            )
        return api

    async def _validate_endpoint_semantics(
        self,
        *,
        api: ApiModel,
        method: HttpMethod,
        path: str,
        target_object_id: UUID,
        path_params: list[PathParamSchema],
        query_params: list[QueryParamSchema],
        pagination: bool,
        response_shape: ResponseShape,
    ) -> None:
        """Validate endpoint-owned parameter semantics.

        :param api: Parent API.
        :param method: HTTP method.
        :param path: Endpoint path.
        :param target_object_id: Target Object ID.
        :param path_params: Path parameter rows.
        :param query_params: Query parameter rows.
        :param pagination: Endpoint pagination flag.
        :param response_shape: Endpoint response shape.
        :raises HTTPException: On validation failure.
        """
        await self._require_target_object(target_object_id, api.namespace_id)
        field_members = await self._target_field_members(target_object_id)

        path_tokens = set(PATH_PARAM_PATTERN.findall(path))
        path_param_names = {str(param.name) for param in path_params}
        if path_tokens != path_param_names:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    "Path parameter names must exactly match the endpoint path "
                    f"tokens. Expected {sorted(path_tokens)}, got {sorted(path_param_names)}."
                ),
            )

        for path_param in path_params:
            if path_param.field_member_id not in field_members:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=(
                        f"Path param '{path_param.name}' must reference a Field Member "
                        "on the target Object."
                    ),
                )

        if method == "DELETE" and query_params:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="DELETE endpoints cannot define query parameters.",
            )

        if method != "GET" and response_shape == "list":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Only GET endpoints can use list response shape.",
            )

        if pagination and response_shape != "list":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Pagination is only valid on list endpoints.",
            )

        if response_shape == "object" and query_params:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Detail endpoints cannot define query parameters.",
            )

        for query_param in query_params:
            field_member = field_members.get(query_param.field_member_id)
            if field_member is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=(
                        f"Query param '{query_param.name}' must reference a Field Member "
                        "on the target Object."
                    ),
                )
            self._validate_operator_type(query_param, field_member)

    async def _require_target_object(
        self, target_object_id: UUID, namespace_id: UUID
    ) -> ObjectDefinition:
        """Return a target Object in the API namespace or raise."""
        result = await self.db.execute(
            select(ObjectDefinition).where(
                ObjectDefinition.id == target_object_id,
                ObjectDefinition.namespace_id == namespace_id,
            )
        )
        target_object = result.scalar_one_or_none()
        if target_object is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Target Object must exist in the API namespace.",
            )
        return target_object

    async def _target_field_members(
        self, target_object_id: UUID
    ) -> dict[UUID, FieldMember]:
        """Return Field Members belonging to the target Object."""
        result = await self.db.execute(
            select(FieldMember)
            .where(FieldMember.object_id == target_object_id)
            .options(
                selectinload(FieldMember.field).selectinload(FieldModel.field_type)
            )
        )
        return {member.id: member for member in result.scalars().all()}

    def _validate_operator_type(
        self, param: QueryParamSchema, field_member: FieldMember
    ) -> None:
        """Validate query operator compatibility with the referenced Field type."""
        field_type = field_member.field.field_type.python_type
        valid_types = OPERATOR_VALID_TYPES.get(param.operator)
        if valid_types is None or not valid_types:
            return

        base_type = field_type.split(".")[0] if "." in field_type else field_type
        if field_type in valid_types or base_type in valid_types:
            return

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                f"Operator '{param.operator}' is not valid for field type "
                f"'{field_type}' on query param '{param.name}'."
            ),
        )


def get_endpoint_service(db: AsyncSession) -> EndpointService:
    """Factory function for EndpointService.

    :param db: Database session.
    :returns: EndpointService instance.
    """
    return EndpointService(db)

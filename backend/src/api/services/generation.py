# src/api/services/generation.py
"""Service for generating FastAPI code from API entities."""

import io
import os
import tempfile
from uuid import UUID
import zipfile

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectin_polymorphic, selectinload

from api.models.database import (
    ApiModel,
    AppliedFieldValidatorModel,
    AppliedModelValidatorModel,
    FieldConstraintValueAssociation,
    FieldModel,
    ObjectDefinition,
)
from api.models.members import FieldMember, ObjectMember, RelationshipMember
from api.schemas.api import GenerateOptions
from api.services.api_craft_input import build_input_api
from api_craft.main import APIGenerator


async def generate_api_zip(
    api: ApiModel, db: AsyncSession, options: GenerateOptions | None = None
) -> io.BytesIO:
    """Generate a ZIP file containing the FastAPI application for an API.

    :param api: The API model with loaded relations.
    :param db: Database session for fetching related entities.
    :param options: Optional generation options.
    :returns: BytesIO buffer containing the ZIP file.
    """
    # Fetch ALL objects (not just endpoint-selected) for full-graph FK derivation
    objects_map = await _fetch_objects(api, db)
    fields_map = await _fetch_fields(api, objects_map, db)

    # Convert to api_craft InputAPI format
    if options is None:
        options = GenerateOptions()
    input_api = build_input_api(api, objects_map, fields_map, options)

    # Generate files to a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        generator = APIGenerator()
        generator.generate(input_api, path=temp_dir)

        # Create ZIP file
        zip_buffer = io.BytesIO()
        # api_craft uses kebab-case for directory name
        from api_craft.utils import camel_to_kebab

        project_dir = os.path.join(temp_dir, camel_to_kebab(input_api.name))

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(project_dir):
                dirs[:] = [d for d in dirs if d != "__pycache__"]
                for file in files:
                    file_path = os.path.join(root, file)
                    arc_name = os.path.relpath(file_path, project_dir)
                    zf.write(file_path, arc_name)

        zip_buffer.seek(0)
        return zip_buffer


async def _fetch_objects(
    api: ApiModel, db: AsyncSession
) -> dict[UUID, ObjectDefinition]:
    """Fetch ALL objects in the user's namespace for full-graph FK derivation.

    All objects are needed (not just endpoint-selected) because any object
    may have a relationship whose target is an endpoint-selected object,
    and that relationship determines FK columns on the target.

    :param api: The API model.
    :param db: Database session.
    :returns: Map of object ID to ObjectDefinition.
    """
    # Fetch all objects in the same namespace as the API, with members loaded
    query = (
        select(ObjectDefinition)
        .where(ObjectDefinition.namespace_id == api.namespace_id)
        .options(
            selectinload(ObjectDefinition.members).options(
                selectin_polymorphic(ObjectMember, [FieldMember, RelationshipMember]),
                selectinload(FieldMember.field),
            ),
            selectinload(ObjectDefinition.validators).selectinload(
                AppliedModelValidatorModel.template
            ),
        )
    )
    result = await db.execute(query)
    objects = result.scalars().all()

    return {obj.id: obj for obj in objects}


async def _fetch_fields(
    api: ApiModel,
    objects_map: dict[UUID, ObjectDefinition],
    db: AsyncSession,
) -> dict[UUID, FieldModel]:
    """Fetch all fields referenced by object Field Members.

    :param api: The API model with endpoints loaded.
    :param objects_map: Map of object ID to ObjectDefinition.
    :param db: Database session.
    :returns: Map of field ID to FieldModel.
    """
    # Collect all field IDs from field members
    field_ids: set[UUID] = set()
    for obj in objects_map.values():
        for member in obj.members:
            if isinstance(member, FieldMember):
                field_ids.add(member.field_id)

    if not field_ids:
        return {}

    # Fetch fields with type, constraint values, and validator templates
    query = (
        select(FieldModel)
        .options(
            selectinload(FieldModel.field_type),
            selectinload(FieldModel.constraint_values).selectinload(
                FieldConstraintValueAssociation.constraint
            ),
            selectinload(FieldModel.validators).selectinload(
                AppliedFieldValidatorModel.template
            ),
        )
        .where(FieldModel.id.in_(field_ids))
    )
    result = await db.execute(query)
    fields = result.scalars().all()

    return {f.id: f for f in fields}

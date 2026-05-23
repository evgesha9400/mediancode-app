# src/api_craft/prepare.py
# src/api_craft/prepare.py
"""Prepare InputAPI for template rendering.

Replaces the transform layer (transformers.py) by passing Input models
directly to templates and only creating new types where the template
interface genuinely diverges from the input interface.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import re

from api_craft.models.input import (
    InputAPI,
    InputField,
    InputModel,
    InputTag,
)
from api_craft.models.orm_types import (
    TemplateDatabaseConfig,
    TemplateORMModel,
)
from api_craft.orm_builder import transform_orm_models
from api_craft.placeholders import PlaceholderGenerator
from api_craft.prepared_views import (
    PreparedPathParam,
    PreparedQueryParam,
    PreparedView,
    prepare_endpoint_view_semantics,
)
from api_craft.schema_splitter import (
    _has_appears_flags,
    _model_needs_split,
    split_model_schemas,
)
from api_craft.utils import (
    add_spaces_to_camel_case,
    camel_to_kebab,
    camel_to_snake,
)

# ---------------------------------------------------------------------------
# Prepared dataclasses — only for types where Template diverges from Input
# ---------------------------------------------------------------------------


@dataclass
class PreparedAPIConfig:
    """Configuration subset needed by templates."""

    healthcheck: str | None
    response_placeholders: bool


@dataclass
class PreparedAPI:
    """Root API object passed to Mako templates.

    Field names match the former TemplateAPI so templates need zero changes.
    """

    snake_name: str
    camel_name: str
    kebab_name: str
    spaced_name: str
    version: str
    author: str
    description: str
    app_port: int
    models: list[InputModel]
    views: list[PreparedView]
    tags: list[InputTag]
    config: PreparedAPIConfig
    orm_models: list[TemplateORMModel] = field(default_factory=list)
    database_config: TemplateDatabaseConfig | None = None
    # Pre-computed fields for views.mako imports (Phase 2)
    view_model_names: list[str] = field(default_factory=list)
    view_orm_names: list[str] = field(default_factory=list)
    has_path_params: bool = False
    has_query_params: bool = False
    has_no_response: bool = False
    # Pre-computed fields for models.mako imports
    pydantic_imports: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Template helper functions (passed to models.mako as context)
# ---------------------------------------------------------------------------


def indent_body(body: str, spaces: int = 4) -> str:
    """Add extra indentation to each line of a function body."""
    prefix = " " * spaces
    lines = body.split("\n")
    return "\n".join(prefix + line if line.strip() else line for line in lines)


def render_field_constraint(validator) -> str | None:
    """Render a validator as a Pydantic Field constraint string."""
    name = validator.name
    params = validator.params or {}
    value = params.get("value")

    constraint_map = {
        "min_length": "min_length",
        "max_length": "max_length",
        "pattern": "pattern",
        "gt": "gt",
        "ge": "ge",
        "lt": "lt",
        "le": "le",
        "multiple_of": "multiple_of",
    }

    pydantic_name = constraint_map.get(name)
    if not pydantic_name:
        return None

    if pydantic_name == "pattern":
        return f'{pydantic_name}=r"{value}"'
    elif isinstance(value, str):
        return f'{pydantic_name}="{value}"'
    else:
        return f"{pydantic_name}={value}"


def render_field(field, force_optional: bool = False) -> str:
    """Render a complete field definition with validators.

    :param field: InputField to render.
    :param force_optional: When True, render as ``Type | None = None``
        (used for Update schemas where every field is optional).
    :returns: Python field definition string.
    """
    constraints = []
    for v in field.validators:
        constraint = render_field_constraint(v)
        if constraint:
            constraints.append(constraint)

    type_annotation = field.type
    field_args = ", ".join(constraints)

    if force_optional:
        # Update schema: all fields become Type | None = None
        # Never apply literal defaults on Update (exclude_unset=True in PATCH)
        if field_args:
            return f"{field.name}: {type_annotation} | None = Field(default=None, {field_args})"
        return f"{field.name}: {type_annotation} | None = None"

    # Create/Response schema
    if field.default and field.default.kind == "literal":
        # Literal default: field is omittable, Pydantic schema default
        value = repr(field.default.value)
        if field_args:
            return f"{field.name}: {type_annotation} = Field(default={value}, {field_args})"
        return f"{field.name}: {type_annotation} = {value}"

    if field.nullable:
        if field_args:
            return f"{field.name}: {type_annotation} | None = Field(default=None, {field_args})"
        return f"{field.name}: {type_annotation} | None = None"

    # Required field
    if field_args:
        return f"{field.name}: {type_annotation} = Field({field_args})"
    return f"{field.name}: {type_annotation}"


def _compute_pydantic_imports(models: list[InputModel]) -> list[str]:
    """Compute the sorted list of pydantic imports needed by the models."""
    has_field_constraints = any(
        any(f.validators for f in model.fields) for model in models
    )
    has_field_validators = any(
        any(f.field_validators for f in model.fields) for model in models
    )
    has_model_validators = any(model.model_validators for model in models)
    has_response_model = any(str(model.name).endswith("Response") for model in models)

    imports = ["BaseModel"]
    if has_response_model:
        imports.append("ConfigDict")
    if has_field_constraints:
        imports.append("Field")
    if has_field_validators:
        imports.append("field_validator")
    if has_model_validators:
        imports.append("model_validator")
    return sorted(imports)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def prepare_api(input_api: InputAPI) -> PreparedAPI:
    """Prepare an InputAPI for template rendering.

    This replaces transform_api() from transformers.py. Input models pass
    through directly — no identity-copy transforms.
    """
    use_split = _has_appears_flags(input_api)

    if use_split:
        prepared_models: list[InputModel] = []
        split_model_names: set[str] = set()
        for model in input_api.objects:
            if _model_needs_split(model):
                prepared_models.extend(split_model_schemas(model, input_api.objects))
                split_model_names.add(str(model.name))
            else:
                prepared_models.append(model)

        # Rewrite field types in unsplit models that reference split model names
        if split_model_names:
            for i, model in enumerate(prepared_models):
                if str(model.name) in split_model_names or any(
                    str(model.name).endswith(s)
                    for s in ("Create", "Update", "Response")
                ):
                    continue
                updated_fields = []
                changed = False
                for f in model.fields:
                    new_type = str(f.type)
                    for name in split_model_names:
                        new_type = re.sub(
                            rf"\b{re.escape(name)}\b",
                            f"{name}Response",
                            new_type,
                        )
                    if new_type != str(f.type):
                        updated_fields.append(f.model_copy(update={"type": new_type}))
                        changed = True
                    else:
                        updated_fields.append(f)
                if changed:
                    prepared_models[i] = model.model_copy(
                        update={"fields": updated_fields}
                    )
    else:
        prepared_models = list(input_api.objects)
        split_model_names = set()

    # Build field map for placeholder generation
    if use_split:
        field_map: dict[str, list] = {}
        for model in prepared_models:
            if (
                str(model.name).endswith("Response")
                and str(model.name).removesuffix("Response") in split_model_names
            ):
                base_name = str(model.name).removesuffix("Response")
                field_map[base_name] = model.fields
            elif str(model.name) not in split_model_names and not any(
                str(model.name).endswith(suffix) for suffix in ("Create", "Update")
            ):
                field_map[str(model.name)] = model.fields
    else:
        field_map = {str(model.name): model.fields for model in prepared_models}

    # Include validator-referenced fields in placeholders
    validator_fields: dict[str, set[str]] = {}
    for model in prepared_models:
        referenced: set[str] = set()
        optional_names = {str(f.name) for f in model.fields if f.nullable}
        for mv in model.model_validators:
            if mv.mode != "before":
                continue
            for match in re.finditer(r'data\.get\(["\'](\w+)["\']\)', mv.function_body):
                name = match.group(1)
                if name in optional_names:
                    referenced.add(name)
                    break
        if referenced:
            key = str(model.name)
            if use_split and key.endswith("Create"):
                key = key.removesuffix("Create")
            validator_fields[key] = referenced
    placeholder_generator = PlaceholderGenerator(field_map, validator_fields)

    orm_models: list[TemplateORMModel] = []
    database_config = None
    if input_api.config.database.enabled:
        orm_models = transform_orm_models(input_api.objects)
        snake_name = camel_to_snake(input_api.name)
        db_port = 5433
        database_config = TemplateDatabaseConfig(
            enabled=True,
            default_url=f"postgresql+asyncpg://postgres:postgres@localhost:{db_port}/{snake_name}",
            db_port=db_port,
        )

    # Build ORM maps for view enrichment
    orm_model_map = None
    orm_pk_map = None
    if database_config and orm_models:
        orm_model_map = {m.source_model: m.class_name for m in orm_models}
        orm_model_map.update(
            {f"{m.source_model}Response": m.class_name for m in orm_models}
        )
        orm_pk_map = {
            f.name: m.class_name for m in orm_models for f in m.fields if f.primary_key
        }

    # Build objects lookup for type derivation
    objects_by_name = {str(obj.name): obj for obj in input_api.objects}

    endpoint_view_semantics = prepare_endpoint_view_semantics(
        endpoints=input_api.endpoints,
        objects_by_name=objects_by_name,
        split_model_names=split_model_names,
        use_split=use_split,
        response_placeholders=input_api.config.response_placeholders,
        generate_response_placeholders=placeholder_generator.generate_for_model,
        database_config=database_config,
        orm_model_map=orm_model_map,
        orm_pk_map=orm_pk_map,
    )

    return PreparedAPI(
        snake_name=camel_to_snake(input_api.name),
        camel_name=str(input_api.name),
        kebab_name=camel_to_kebab(input_api.name),
        spaced_name=add_spaces_to_camel_case(input_api.name),
        version=input_api.version,
        models=prepared_models,
        views=endpoint_view_semantics.views,
        tags=list(input_api.tags),
        author=input_api.author,
        description=input_api.description,
        config=PreparedAPIConfig(
            healthcheck=input_api.config.healthcheck,
            response_placeholders=input_api.config.response_placeholders,
        ),
        orm_models=orm_models,
        database_config=database_config,
        app_port=8001,
        view_model_names=endpoint_view_semantics.imports.model_names,
        view_orm_names=endpoint_view_semantics.imports.orm_names,
        has_path_params=endpoint_view_semantics.imports.has_path_params,
        has_query_params=endpoint_view_semantics.imports.has_query_params,
        has_no_response=endpoint_view_semantics.imports.has_no_response,
        pydantic_imports=_compute_pydantic_imports(prepared_models),
    )

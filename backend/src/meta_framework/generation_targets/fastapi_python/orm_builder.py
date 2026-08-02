# src/meta_framework.generation_targets.fastapi_python/orm_builder.py
"""ORM model generation: converts InputModels into SQLAlchemy TemplateORMModels.

Full-graph approach: collects all relationships across all models, then for each
model emits authored relationships, incoming FK columns, and inverse relationships.
"""

from meta_framework.generation_targets.fastapi_python.models.input import InputModel
from meta_framework.generation_targets.fastapi_python.models.orm_types import (
    TemplateORMField,
    TemplateORMModel,
    TemplateRelationship,
)
from meta_framework.generation_targets.fastapi_python.relationship_derivation import (
    derive_input_model_relationships,
)
from meta_framework.generation_targets.fastapi_python.sqlalchemy_relationships import (
    association_table_name,
    foreign_key_field_name,
    object_table_name,
)

# Map input type names to Python type annotations for Mapped[].
ORM_PYTHON_TYPE_MAP = {
    "str": "str",
    "int": "int",
    "float": "float",
    "bool": "bool",
    "datetime": "datetime.datetime",
    "datetime.date": "datetime.date",
    "datetime.time": "datetime.time",
    "uuid": "uuid.UUID",
    "decimal": "decimal.Decimal",
    "EmailStr": "str",
    "HttpUrl": "str",
}


def _get_max_length(validators):
    """Extract max_length value from validators list."""
    for v in validators:
        if v.name == "max_length" and v.params and "value" in v.params:
            return v.params["value"]
    return None


def map_column_type(type_str: str, validators: list) -> str | None:
    """Map a Python type string to a SQLAlchemy column type string.

    Returns None for types that cannot be mapped to columns (List, Dict, model refs).
    """
    if type_str.startswith(("List[", "Dict[", "Set[", "Tuple[")):
        return None

    type_map = {
        "str": lambda: (
            f"String({ml})" if (ml := _get_max_length(validators)) else "Text"
        ),
        "int": lambda: "Integer",
        "float": lambda: "Float",
        "bool": lambda: "Boolean",
        "datetime": lambda: "DateTime(timezone=True)",
        "datetime.date": lambda: "Date",
        "datetime.time": lambda: "Time",
        "uuid": lambda: "Uuid",
        "decimal": lambda: "Numeric",
        "EmailStr": lambda: "String(320)",
        "HttpUrl": lambda: "Text",
    }

    factory = type_map.get(type_str)
    if factory is None:
        base = type_str.split(".")[0] if "." in type_str else type_str
        factory = type_map.get(base)
    if factory is None:
        return None
    return factory()


def _sort_by_dependencies(orm_models: list[TemplateORMModel]) -> list[TemplateORMModel]:
    """Sort ORM models so tables with FK dependencies come after referenced tables.

    Uses Kahn's algorithm for topological sort.
    """
    if not orm_models:
        return orm_models

    model_by_table: dict[str, TemplateORMModel] = {m.table_name: m for m in orm_models}
    deps: dict[str, set[str]] = {m.table_name: set() for m in orm_models}

    for model in orm_models:
        for field in model.fields:
            if field.foreign_key:
                ref_table = field.foreign_key.split(".")[0]
                if ref_table in model_by_table and ref_table != model.table_name:
                    deps[model.table_name].add(ref_table)

    sorted_tables: list[str] = []
    input_order = [m.table_name for m in orm_models]

    while input_order:
        ready = None
        for table in input_order:
            if not deps[table]:
                ready = table
                break

        if ready is None:
            remaining = ", ".join(input_order)
            raise ValueError(
                f"Circular foreign key dependency detected among tables: {remaining}"
            )

        sorted_tables.append(ready)
        input_order.remove(ready)
        for d in deps.values():
            d.discard(ready)

    return [model_by_table[t] for t in sorted_tables]


def transform_orm_models(input_models: list[InputModel]) -> list[TemplateORMModel]:
    """Convert InputModels into TemplateORMModels using full-graph FK derivation.

    FK columns are derived from relationships and placed on the target side.
    No dedup logic needed -- one clean pass.
    """
    # Build entity lookup: model_name -> (table_name, pk_field, class_name)
    entity_lookup: dict[str, tuple[str, "InputModel", str]] = {}
    for model in input_models:
        pk_fields = [f for f in model.fields if f.pk]
        if pk_fields:
            table_name = object_table_name(str(model.name))
            class_name = f"{model.name}Record"
            entity_lookup[str(model.name)] = (table_name, model, class_name)
    relationship_derivations = derive_input_model_relationships(input_models)

    # Build per-model data: fields + relationships + incoming FK columns
    model_fields: dict[str, list[TemplateORMField]] = {}
    model_rels: dict[str, list[TemplateRelationship]] = {}

    # First pass: build base fields for all models
    for model in input_models:
        pk_fields = [f for f in model.fields if f.pk]
        if not pk_fields:
            continue

        orm_fields = []

        for field in model.fields:
            column_type = map_column_type(field.type, field.validators)
            if column_type is None:
                continue

            base_type = field.type.split(".")[0] if "." in field.type else field.type
            orm_type = ORM_PYTHON_TYPE_MAP.get(field.type) or ORM_PYTHON_TYPE_MAP.get(
                base_type, base_type
            )
            python_type = orm_type if not field.nullable else f"{orm_type} | None"

            sd = None
            on_update = None
            default_literal = None

            if field.pk:
                if base_type in ("uuid", "UUID"):
                    sd = "uuid4"
                elif base_type in ("int",):
                    sd = "auto_increment"
            elif field.default:
                if field.default.kind == "literal":
                    sd = "literal"
                    default_literal = field.default.value
                elif field.default.kind == "generated":
                    strategy = field.default.strategy
                    if strategy == "now_on_update":
                        sd = "now"
                        on_update = "now"
                    else:
                        sd = strategy

            if (
                sd == "literal"
                and default_literal
                and base_type in ("str", "EmailStr", "HttpUrl")
            ):
                default_literal = f"'{default_literal}'"

            orm_fields.append(
                TemplateORMField(
                    name=str(field.name),
                    python_type=python_type,
                    column_type=column_type,
                    primary_key=field.pk,
                    nullable=field.nullable,
                    server_default=sd,
                    on_update=on_update,
                    default_literal=default_literal,
                )
            )

        model_fields[str(model.name)] = orm_fields
        model_rels[str(model.name)] = []

    # Second pass: process relationships (full graph)
    for derivation in relationship_derivations:
        source_info = entity_lookup.get(derivation.source_object_name)
        target_info = entity_lookup.get(derivation.target_object_name)
        if not source_info or not target_info:
            continue

        source_table, source_model, source_class = source_info
        _target_table, _target_model, target_class = target_info
        is_self_referential = (
            derivation.source_object_name == derivation.target_object_name
        )

        # Get source PK for FK type derivation
        source_pk_field = next((f for f in source_model.fields if f.pk), None)
        if not source_pk_field:
            continue

        if derivation.reference_owner == "target":
            # FK goes on the target side for the current SQLAlchemy target.
            fk_col_name = foreign_key_field_name(derivation)
            if fk_col_name is None:
                continue
            fk_ref = f"{source_table}.{source_pk_field.name}"

            # Derive FK column type from source PK
            fk_base_type = (
                source_pk_field.type.split(".")[0]
                if "." in source_pk_field.type
                else source_pk_field.type
            )
            fk_col_type = map_column_type(
                source_pk_field.type, source_pk_field.validators
            )
            fk_orm_type = ORM_PYTHON_TYPE_MAP.get(
                source_pk_field.type
            ) or ORM_PYTHON_TYPE_MAP.get(fk_base_type, fk_base_type)

            nullable = not derivation.required
            fk_python_type = f"{fk_orm_type} | None" if nullable else fk_orm_type

            if fk_col_type and derivation.target_object_name in model_fields:
                # Add FK column to target model
                model_fields[derivation.target_object_name].append(
                    TemplateORMField(
                        name=fk_col_name,
                        python_type=fk_python_type,
                        column_type=fk_col_type,
                        nullable=nullable,
                        foreign_key=fk_ref,
                    )
                )

            # Source-side relationship (authored)
            source_rel = TemplateRelationship(
                name=derivation.source_member_name,
                target_model=derivation.target_object_name,
                target_class_name=target_class,
                kind=derivation.kind,
                back_populates=derivation.target_member_name,
                uselist=derivation.source_field_cardinality == "many",
            )
            if is_self_referential:
                source_rel = source_rel.model_copy(update={"fk_column": None})
            model_rels[derivation.source_object_name].append(source_rel)

            # Target-side relationship (inverse)
            inverse_rel = TemplateRelationship(
                name=derivation.target_member_name,
                target_model=derivation.source_object_name,
                target_class_name=source_class,
                kind=derivation.kind,
                back_populates=derivation.source_member_name,
                fk_column=fk_col_name,
                uselist=derivation.target_field_cardinality == "many",
            )
            if is_self_referential:
                # Self-referential: target-side uses remote_side
                inverse_rel = inverse_rel.model_copy(
                    update={
                        "remote_side": str(source_pk_field.name),
                        "uselist": False,
                    }
                )
            model_rels[derivation.target_object_name].append(inverse_rel)

        elif derivation.reference_owner == "association":
            assoc_table = association_table_name(derivation)
            if assoc_table is None:
                continue

            # Source-side
            model_rels[derivation.source_object_name].append(
                TemplateRelationship(
                    name=derivation.source_member_name,
                    target_model=derivation.target_object_name,
                    target_class_name=target_class,
                    kind="many_to_many",
                    back_populates=derivation.target_member_name,
                    association_table=assoc_table,
                )
            )

            # Target-side (inverse)
            model_rels[derivation.target_object_name].append(
                TemplateRelationship(
                    name=derivation.target_member_name,
                    target_model=derivation.source_object_name,
                    target_class_name=source_class,
                    kind="many_to_many",
                    back_populates=derivation.source_member_name,
                    association_table=assoc_table,
                )
            )

    # Build final ORM models
    orm_models = []
    for model in input_models:
        name = str(model.name)
        if name not in model_fields:
            continue

        table_name = object_table_name(str(model.name))
        orm_models.append(
            TemplateORMModel(
                class_name=f"{model.name}Record",
                table_name=table_name,
                source_model=name,
                fields=model_fields[name],
                relationships=model_rels.get(name, []),
            )
        )

    return _sort_by_dependencies(orm_models)

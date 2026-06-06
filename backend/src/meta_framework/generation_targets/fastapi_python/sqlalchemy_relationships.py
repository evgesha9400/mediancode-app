"""Current FastAPI SQLAlchemy target relationship artifact names."""

from meta_framework.generation_targets.fastapi_python.relationship_derivation import (
    RelationshipDerivation,
)
from meta_framework.generation_targets.fastapi_python.utils import (
    camel_to_snake,
    snake_to_plural,
)


def object_table_name(object_name: str) -> str:
    """Return the SQLAlchemy table name for an Object.

    :param object_name: PascalCase Object name.
    :returns: Generated table name.
    """
    return snake_to_plural(camel_to_snake(object_name))


def foreign_key_field_name(
    derivation: RelationshipDerivation,
) -> str | None:
    """Return the target-side FK field name for a relationship derivation.

    :param derivation: Portable relationship derivation facts.
    :returns: FK field name, or ``None`` when the relationship uses an
        association table.
    """
    if derivation.reference_owner != "target":
        return None
    return f"{derivation.target_member_name}_id"


def association_table_name(
    derivation: RelationshipDerivation,
) -> str | None:
    """Return the association table name for a relationship derivation.

    :param derivation: Portable relationship derivation facts.
    :returns: Association table name, or ``None`` when no association table is
        needed.
    """
    if derivation.reference_owner != "association":
        return None
    return f"{object_table_name(derivation.source_object_name)}_{derivation.source_member_name}"


def association_fk_column_name(table_name: str) -> str:
    """Return the FK column name used in association tables.

    :param table_name: Generated table name.
    :returns: Association-table FK column name.
    """
    return f"{table_name.rstrip('s')}_id"

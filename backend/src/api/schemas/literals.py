# src/api/schemas/literals.py
"""Re-export canonical Literal types from the FastAPI Python target.

Downstream API code imports these aliases from the service layer while the
canonical values remain owned by the current Generation Target.
"""

from meta_framework.generation_targets.fastapi_python.models.enums import (  # noqa: F401
    Cardinality,
    Container,
    FieldAppearance,
    FieldExposure,
    FieldRole,
    FilterOperator,
    GeneratedStrategy,
    HttpMethod,
    OnDeleteAction,
    RelationshipKind,
    ResponseShape,
    ServerDefault,
    ValidatorMode,
    check_constraint_sql,
)

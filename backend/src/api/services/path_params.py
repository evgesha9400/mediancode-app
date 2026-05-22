# src/api/services/path_params.py
"""Shared helpers for endpoint path parameter payloads."""

from collections.abc import Mapping
from uuid import UUID


def get_path_param_field_id(path_param: Mapping[str, object]) -> UUID | None:
    """Return the field ID stored in an endpoint path parameter payload.

    :param path_param: Path parameter payload from ``ApiEndpoint.path_params``.
    :returns: Parsed field UUID, or ``None`` when the payload has no valid field ID.
    """
    field_id = path_param.get("fieldId")
    if isinstance(field_id, UUID):
        return field_id
    if isinstance(field_id, str):
        try:
            return UUID(field_id)
        except ValueError:
            return None
    return None

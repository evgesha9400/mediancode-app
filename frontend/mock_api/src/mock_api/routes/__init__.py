"""API routes for Mock API."""

from .types import router as types_router
from .validators import router as validators_router
from .fields import router as fields_router
from .objects import router as objects_router

__all__ = ["types_router", "validators_router", "fields_router", "objects_router"]

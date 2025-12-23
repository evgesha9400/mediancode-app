"""Data access layer for in-memory storage."""

from .store import DataStore, get_data_store

__all__ = ["DataStore", "get_data_store"]

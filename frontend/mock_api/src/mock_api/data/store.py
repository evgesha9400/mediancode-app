"""In-memory data store with owner/account scoping."""

import json
from pathlib import Path
from typing import List, Optional, Dict, Any, TypeVar, Generic
from collections import defaultdict

from mock_api.models import Type, Validator, Field, Object

T = TypeVar('T', Type, Validator, Field, Object)


class DataStore:
    """In-memory store for mock data with user/account scoping."""

    def __init__(self):
        """Initialize empty data store."""
        self.types: Dict[str, Type] = {}
        self.validators: Dict[str, Validator] = {}
        self.fields: Dict[str, Field] = {}
        self.objects: Dict[str, Object] = {}

        # Indexes for quick filtering by owner/account
        self.types_by_owner: Dict[str, List[str]] = defaultdict(list)
        self.validators_by_owner: Dict[str, List[str]] = defaultdict(list)
        self.fields_by_owner: Dict[str, List[str]] = defaultdict(list)
        self.objects_by_owner: Dict[str, List[str]] = defaultdict(list)

        self.types_by_account: Dict[str, List[str]] = defaultdict(list)
        self.validators_by_account: Dict[str, List[str]] = defaultdict(list)
        self.fields_by_account: Dict[str, List[str]] = defaultdict(list)
        self.objects_by_account: Dict[str, List[str]] = defaultdict(list)

    def load_fixtures(self, fixtures_path: Optional[Path] = None) -> None:
        """Load data from fixtures file."""
        if fixtures_path is None:
            # Default to fixtures/data.json relative to this file
            fixtures_path = Path(__file__).parent.parent / "fixtures" / "data.json"

        if not fixtures_path.exists():
            raise FileNotFoundError(f"Fixtures file not found: {fixtures_path}")

        with open(fixtures_path, 'r') as f:
            data = json.load(f)

        # Load types
        for type_data in data.get("types", []):
            type_obj = Type(**type_data)
            self.types[type_obj.id] = type_obj
            self.types_by_owner[type_obj.owner_id].append(type_obj.id)
            self.types_by_account[type_obj.account_id].append(type_obj.id)

        # Load validators
        for validator_data in data.get("validators", []):
            validator_obj = Validator(**validator_data)
            self.validators[validator_obj.id] = validator_obj
            self.validators_by_owner[validator_obj.owner_id].append(validator_obj.id)
            self.validators_by_account[validator_obj.account_id].append(validator_obj.id)

        # Load fields
        for field_data in data.get("fields", []):
            field_obj = Field(**field_data)
            self.fields[field_obj.id] = field_obj
            self.fields_by_owner[field_obj.owner_id].append(field_obj.id)
            self.fields_by_account[field_obj.account_id].append(field_obj.id)

        # Load objects
        for object_data in data.get("objects", []):
            object_obj = Object(**object_data)
            self.objects[object_obj.id] = object_obj
            self.objects_by_owner[object_obj.owner_id].append(object_obj.id)
            self.objects_by_account[object_obj.account_id].append(object_obj.id)

    # Types
    def list_types(
        self,
        owner_id: str,
        account_id: str,
        limit: int = 100,
        offset: int = 0,
        namespace: Optional[str] = None
    ) -> List[Type]:
        """List types scoped to owner/account."""
        # Get all type IDs for this owner or account
        type_ids = set(self.types_by_owner.get(owner_id, []))
        type_ids.update(self.types_by_account.get(account_id, []))

        # Filter types
        result = [self.types[tid] for tid in type_ids]

        # Apply namespace filter if provided
        # Note: Types don't have namespace in schema, but keeping for consistency
        if namespace:
            result = [t for t in result if getattr(t, 'namespace', '') == namespace]

        # Apply pagination
        return result[offset:offset + limit]

    def get_type(self, type_id: str, owner_id: str, account_id: str) -> Optional[Type]:
        """Get a type by ID, scoped to owner/account."""
        type_obj = self.types.get(type_id)
        if not type_obj:
            return None

        # Check ownership
        if type_obj.owner_id == owner_id or type_obj.account_id == account_id:
            return type_obj

        return None

    # Validators
    def list_validators(
        self,
        owner_id: str,
        account_id: str,
        limit: int = 100,
        offset: int = 0,
        namespace: Optional[str] = None
    ) -> List[Validator]:
        """List validators scoped to owner/account."""
        validator_ids = set(self.validators_by_owner.get(owner_id, []))
        validator_ids.update(self.validators_by_account.get(account_id, []))

        result = [self.validators[vid] for vid in validator_ids]

        # Apply namespace filter if provided
        # Note: Validators don't have namespace in schema, but keeping for consistency
        if namespace:
            result = [v for v in result if getattr(v, 'namespace', '') == namespace]

        return result[offset:offset + limit]

    def get_validator(
        self,
        validator_id: str,
        owner_id: str,
        account_id: str
    ) -> Optional[Validator]:
        """Get a validator by ID, scoped to owner/account."""
        validator_obj = self.validators.get(validator_id)
        if not validator_obj:
            return None

        if validator_obj.owner_id == owner_id or validator_obj.account_id == account_id:
            return validator_obj

        return None

    # Fields
    def list_fields(
        self,
        owner_id: str,
        account_id: str,
        limit: int = 100,
        offset: int = 0,
        namespace: Optional[str] = None
    ) -> List[Field]:
        """List fields scoped to owner/account."""
        field_ids = set(self.fields_by_owner.get(owner_id, []))
        field_ids.update(self.fields_by_account.get(account_id, []))

        result = [self.fields[fid] for fid in field_ids]

        # Apply namespace filter
        if namespace:
            result = [f for f in result if f.namespace == namespace]

        return result[offset:offset + limit]

    def get_field(self, field_id: str, owner_id: str, account_id: str) -> Optional[Field]:
        """Get a field by ID, scoped to owner/account."""
        field_obj = self.fields.get(field_id)
        if not field_obj:
            return None

        if field_obj.owner_id == owner_id or field_obj.account_id == account_id:
            return field_obj

        return None

    # Objects
    def list_objects(
        self,
        owner_id: str,
        account_id: str,
        limit: int = 100,
        offset: int = 0,
        namespace: Optional[str] = None
    ) -> List[Object]:
        """List objects scoped to owner/account."""
        object_ids = set(self.objects_by_owner.get(owner_id, []))
        object_ids.update(self.objects_by_account.get(account_id, []))

        result = [self.objects[oid] for oid in object_ids]

        # Apply namespace filter
        if namespace:
            result = [o for o in result if o.namespace == namespace]

        return result[offset:offset + limit]

    def get_object(self, object_id: str, owner_id: str, account_id: str) -> Optional[Object]:
        """Get an object by ID, scoped to owner/account."""
        object_obj = self.objects.get(object_id)
        if not object_obj:
            return None

        if object_obj.owner_id == owner_id or object_obj.account_id == account_id:
            return object_obj

        return None


# Global data store instance
_data_store: Optional[DataStore] = None


def get_data_store() -> DataStore:
    """Get the global data store instance."""
    global _data_store
    if _data_store is None:
        _data_store = DataStore()
        _data_store.load_fixtures()
    return _data_store

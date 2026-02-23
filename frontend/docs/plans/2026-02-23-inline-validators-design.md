# Inline Validators Design

## Date: 2026-02-23

## Problem

Validators are modeled as standalone reusable entities with their own CRUD endpoints, stores, and pages. This is architecturally wrong:

- **Model validators** hardcode field names (`self.start_date`, `data.get('metadata')`) making them useless on any object other than the one they were written for.
- **Field validators** are technically reusable, but the *field* is already the unit of reuse. When a field is shared across objects, its validation travels with it.
- The standalone model forces users to create validators in one place, then wire them up in another — contrary to how developers think about validation.

## Decision

Move validators from standalone M2M entities to 1:many child rows on their parent entity:

- Field validators become child rows of `fields`
- Model validators become child rows of `objects`
- Standalone CRUD endpoints are removed
- Validators are created/updated/deleted inline through the parent entity's endpoints

## Scope

**In scope:** Backend schema, migration, API contract, services, routes, tests.

**Out of scope:** Frontend changes (separate plan), `api_craft` code generation templates (follow-up).

---

## Schema Changes

### Tables Dropped

| Table | Reason |
|---|---|
| `field_validators` (old schema) | Standalone entity replaced by child table |
| `field_validator_field_associations` | M2M junction no longer needed |
| `model_validators` (old schema) | Standalone entity replaced by child table |
| `model_validator_object_associations` | M2M junction no longer needed |

### Tables Created

Both child tables share an identical column structure (except the parent FK):

**`field_validators` (new)**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() |
| `field_id` | UUID | FK → fields(id), NOT NULL, ON DELETE CASCADE |
| `function_name` | Text | NOT NULL |
| `mode` | Text | NOT NULL (before, after, wrap, plain) |
| `function_body` | Text | NOT NULL |
| `description` | Text | nullable |
| `position` | Integer | NOT NULL, default 0 |

**`model_validators` (new)**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() |
| `object_id` | UUID | FK → objects(id), NOT NULL, ON DELETE CASCADE |
| `function_name` | Text | NOT NULL |
| `mode` | Text | NOT NULL (before, after) |
| `function_body` | Text | NOT NULL |
| `description` | Text | nullable |
| `position` | Integer | NOT NULL, default 0 |

### Columns Removed (vs. old schema)

| Dropped Column | Table | Reason |
|---|---|---|
| `namespace_id` | both | Inherited from parent field/object |
| `user_id` | both | Inherited from parent field/object |
| `name` | field_validators | Replaced by `function_name` as sole identifier |
| `compatible_types` | field_validators | Validator is on a typed field — inherently compatible |
| `required_fields` | model_validators | Validator is on a specific object — fields are known |
| `code` | model_validators | Renamed to `function_body` for consistency |

---

## API Contract Changes

### Endpoints Removed

All 10 standalone validator endpoints:

```
DELETE  GET    /v1/field-validators
DELETE  POST   /v1/field-validators
DELETE  GET    /v1/field-validators/{validator_id}
DELETE  PUT    /v1/field-validators/{validator_id}
DELETE  DELETE /v1/field-validators/{validator_id}
DELETE  GET    /v1/model-validators
DELETE  POST   /v1/model-validators
DELETE  GET    /v1/model-validators/{validator_id}
DELETE  PUT    /v1/model-validators/{validator_id}
DELETE  DELETE /v1/model-validators/{validator_id}
```

### Endpoints Modified

#### Fields — validators become inline definitions

**`POST /v1/fields` and `PUT /v1/fields/{id}` request body:**

```jsonc
{
  "namespaceId": "uuid",
  "name": "email",
  "typeId": "uuid",
  "description": "User email address",
  "defaultValue": null,
  "constraints": [/* unchanged */],
  "validators": [
    // OLD: { "validatorId": "uuid-of-standalone-validator" }
    // NEW: inline definition
    {
      "functionName": "validate_email_format",
      "mode": "after",
      "functionBody": "    if not re.match(r'^[a-zA-Z0-9._%+-]+@...', v):\n        raise ValueError('Invalid email')\n    return v",
      "description": "Validates email format with regex"
    }
  ]
}
```

**`GET /v1/fields` and `GET /v1/fields/{id}` response:**

```jsonc
{
  "id": "uuid",
  "namespaceId": "uuid",
  "name": "email",
  "typeId": "uuid",
  // ... other fields ...
  "validators": [
    {
      "id": "uuid",
      "functionName": "validate_email_format",
      "mode": "after",
      "functionBody": "    if not re.match(...",
      "description": "Validates email format with regex"
    }
  ]
}
```

#### Objects — model validators added to contract

**`POST /v1/objects` and `PUT /v1/objects/{id}` request body:**

```jsonc
{
  "namespaceId": "uuid",
  "name": "User",
  "description": "User account model",
  "fields": [
    { "fieldId": "uuid", "required": true }
  ],
  "validators": [
    {
      "functionName": "validate_date_range",
      "mode": "after",
      "functionBody": "    if self.end_date <= self.start_date:\n        raise ValueError('end_date must be after start_date')\n    return self",
      "description": "Ensures end_date is after start_date"
    }
  ]
}
```

**`GET /v1/objects` and `GET /v1/objects/{id}` response:**

```jsonc
{
  "id": "uuid",
  "namespaceId": "uuid",
  "name": "User",
  "description": "User account model",
  "fields": [/* unchanged */],
  "usedInApis": [/* unchanged */],
  "validators": [
    {
      "id": "uuid",
      "functionName": "validate_date_range",
      "mode": "after",
      "functionBody": "    if self.end_date <= ...",
      "description": "Ensures end_date is after start_date"
    }
  ]
}
```

#### Update Semantics (both fields and objects)

Matches existing field constraints pattern:

| `validators` value in PUT body | Behavior |
|---|---|
| `[{...}, {...}]` | Full replacement — delete all existing, insert new list |
| `[]` | Clear all validators |
| omitted / `null` | Leave validators unchanged |

---

## SQLAlchemy Model Changes

### File: `src/api/models/database.py`

**FieldValidatorModel — rewrite:**
- Drop columns: `namespace_id`, `user_id`, `name`, `compatible_types`
- Drop relationships: `user`, `namespace`, `field_associations`
- Add column: `field_id` (UUID FK → fields, CASCADE)
- Add column: `position` (Integer, default 0)
- Add relationship: `field` (back to FieldModel)

**FieldValidatorAssociation — delete entirely.**

**FieldModel — update relationship:**
- Replace `validator_associations` with `validators` (direct 1:many to FieldValidatorModel, order_by position)

**ModelValidatorModel — rewrite:**
- Drop columns: `namespace_id`, `user_id`, `required_fields`
- Drop relationships: `user`, `namespace`, `object_associations`
- Rename column: `code` → `function_body`
- Rename column: `name` → `function_name`
- Add column: `object_id` (UUID FK → objects, CASCADE)
- Add column: `position` (Integer, default 0)
- Add relationship: `object` (back to ObjectDefinition)

**ObjectModelValidatorAssociation — delete entirely.**

**ObjectDefinition — add relationship:**
- Add `validators` (direct 1:many to ModelValidatorModel, order_by position)

**UserModel — remove relationships:**
- Drop `field_validators` and `model_validators` backrefs (validators no longer reference users)

**Namespace — remove relationships:**
- Drop `field_validators` and `model_validators` backrefs (validators no longer reference namespaces)

---

## Pydantic Schema Changes

### Files Deleted

- `src/api/schemas/field_validator.py` — all standalone schemas
- `src/api/schemas/model_validator.py` — all standalone schemas

### File: `src/api/schemas/field.py`

Replace reference schemas with inline schemas:

```python
# DELETE
class FieldValidatorReferenceInput(BaseModel):
    validator_id: UUID = Field(alias="validatorId")

class FieldValidatorReferenceResponse(BaseModel):
    validator_id: UUID = Field(alias="validatorId")
    function_name: str = Field(alias="functionName")
    name: str | None = None

# ADD
class FieldValidatorInput(BaseModel):
    function_name: str = Field(alias="functionName")
    mode: str
    function_body: str = Field(alias="functionBody")
    description: str | None = None

class FieldValidatorResponse(BaseModel):
    id: UUID
    function_name: str = Field(alias="functionName")
    mode: str
    function_body: str = Field(alias="functionBody")
    description: str | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
```

Update `FieldCreate`, `FieldUpdate`, `FieldResponse` to use the new types.

### File: `src/api/schemas/object.py`

Add validator schemas (identical structure to field validators):

```python
class ModelValidatorInput(BaseModel):
    function_name: str = Field(alias="functionName")
    mode: str
    function_body: str = Field(alias="functionBody")
    description: str | None = None

class ModelValidatorResponse(BaseModel):
    id: UUID
    function_name: str = Field(alias="functionName")
    mode: str
    function_body: str = Field(alias="functionBody")
    description: str | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
```

Update `ObjectCreate`, `ObjectUpdate`, `ObjectResponse` to include `validators` field.

---

## Service Layer Changes

### Files Deleted

- `src/api/services/field_validator.py`
- `src/api/services/model_validator.py`

### File: `src/api/services/field.py`

**`_set_validator_associations()` — rewrite:**

Currently creates `FieldValidatorAssociation` junction records by validator ID lookup. New implementation:

1. Delete all `FieldValidatorModel` rows where `field_id = field.id`
2. For each validator in input list, create `FieldValidatorModel(field_id=field.id, function_name=..., mode=..., function_body=..., description=..., position=i)`
3. Flush to DB

No ownership check on validators — if you can edit the field, you own its validators.

No deletion guard on validators — they cascade-delete with the field.

### File: `src/api/services/object.py`

**Add `_set_validator_associations()` — new method:**

Same pattern as field service:

1. Delete all `ModelValidatorModel` rows where `object_id = obj.id`
2. For each validator in input list, create `ModelValidatorModel(object_id=obj.id, function_name=..., mode=..., function_body=..., description=..., position=i)`
3. Flush to DB

Call this in `create_for_user()` and `update_object()`, guarded by `if data.validators is not None`.

---

## Router Changes

### Files Deleted

- `src/api/routers/field_validators.py`
- `src/api/routers/model_validators.py`

### File: `src/api/routers/fields.py`

**`_to_response()` helper — simplify:**

Currently iterates `field.validator_associations` and accesses `va.validator.function_name`. New: iterate `field.validators` directly and serialize as `FieldValidatorResponse`.

### File: `src/api/routers/objects.py`

**Response builder — add validators:**

Currently objects don't include validators in responses. Add `validators` list by iterating `obj.validators` and serializing as `ModelValidatorResponse`.

### File: `src/api/main.py`

Remove router registrations:
```python
# DELETE
app.include_router(field_validators.router, prefix="/v1", tags=["Field Validators"])
app.include_router(model_validators.router, prefix="/v1", tags=["Model Validators"])
```

---

## Alembic Migration

Single migration (dev-only, no data preservation):

```python
def upgrade():
    # 1. Drop junction tables first (they have FKs to validator tables)
    op.drop_table("field_validator_field_associations")
    op.drop_table("model_validator_object_associations")

    # 2. Drop old validator tables
    op.drop_table("field_validators")
    op.drop_table("model_validators")

    # 3. Create new field_validators (child of fields)
    op.create_table("field_validators",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("field_id", sa.Uuid(), sa.ForeignKey("fields.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("function_name", sa.Text(), nullable=False),
        sa.Column("mode", sa.Text(), nullable=False),
        sa.Column("function_body", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )

    # 4. Create new model_validators (child of objects)
    op.create_table("model_validators",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("object_id", sa.Uuid(), sa.ForeignKey("objects.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("function_name", sa.Text(), nullable=False),
        sa.Column("mode", sa.Text(), nullable=False),
        sa.Column("function_body", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )

def downgrade():
    op.drop_table("model_validators")
    op.drop_table("field_validators")
    # Recreating old tables in downgrade is not required (dev-only, clean swap)
```

---

## Test Changes

### Test Files Deleted

All standalone validator test files:
- Tests for `GET/POST/PUT/DELETE /v1/field-validators`
- Tests for `GET/POST/PUT/DELETE /v1/model-validators`

### Test Files Modified

**Field CRUD tests — add inline validator coverage:**

| Test Case | Description |
|---|---|
| Create field with validators | POST /v1/fields with validators list, verify response includes validators with IDs |
| Create field without validators | POST /v1/fields with no validators, verify empty list in response |
| Update field — replace validators | PUT with new validators list, verify old replaced |
| Update field — clear validators | PUT with validators: [], verify empty |
| Update field — omit validators | PUT without validators key, verify unchanged |
| Delete field — cascade | DELETE field, verify its validators are gone |

**Object CRUD tests — add inline model validator coverage:**

| Test Case | Description |
|---|---|
| Create object with validators | POST /v1/objects with validators list, verify response |
| Create object without validators | POST /v1/objects with no validators, verify empty list |
| Update object — replace validators | PUT with new validators list |
| Update object — clear validators | PUT with validators: [] |
| Update object — omit validators | PUT without validators key |
| Delete object — cascade | DELETE object, verify validators gone |

### Standalone Endpoint Tests — verify removal

| Test Case | Description |
|---|---|
| GET /v1/field-validators returns 404 | Endpoint no longer exists |
| GET /v1/model-validators returns 404 | Endpoint no longer exists |

---

## File Inventory

### Backend Files Deleted (8 files)

| File | Purpose |
|---|---|
| `src/api/schemas/field_validator.py` | Standalone Pydantic schemas |
| `src/api/schemas/model_validator.py` | Standalone Pydantic schemas |
| `src/api/services/field_validator.py` | Standalone service layer |
| `src/api/services/model_validator.py` | Standalone service layer |
| `src/api/routers/field_validators.py` | Standalone route handlers |
| `src/api/routers/model_validators.py` | Standalone route handlers |
| Test file(s) for field validator endpoints | Standalone CRUD tests |
| Test file(s) for model validator endpoints | Standalone CRUD tests |

### Backend Files Modified (8+ files)

| File | Change |
|---|---|
| `src/api/models/database.py` | Rewrite validator models, drop junction models, update relationships |
| `src/api/schemas/field.py` | Replace reference schemas with inline schemas |
| `src/api/schemas/object.py` | Add model validator inline schemas |
| `src/api/services/field.py` | Rewrite `_set_validator_associations()` for child rows |
| `src/api/services/object.py` | Add `_set_validator_associations()` for model validators |
| `src/api/routers/fields.py` | Simplify `_to_response()` for direct child access |
| `src/api/routers/objects.py` | Add validators to response builder |
| `src/api/main.py` | Remove validator router registrations |
| Field CRUD test file(s) | Add inline validator test cases |
| Object CRUD test file(s) | Add inline model validator test cases |

### New Files (1)

| File | Purpose |
|---|---|
| Alembic migration | Drop old tables, create new child tables |

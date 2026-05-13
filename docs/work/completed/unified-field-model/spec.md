# Unified Field Model — Specification

## Origin

Duplicate column bug in generated code: `RelationshipService` creates both an FK
field and a relationship record, `generation.py` includes both, `orm_builder.py`
generates two columns with the same name → SQLAlchemy `DuplicateColumnError`.

Rather than patching the symptom, this spec redesigns how Median Code represents
object relationships end-to-end.

## Goals

1. Eliminate the duplicate-column bug class at the source.
2. Simplify the user's mental model — one concept per link between objects.
3. Simplify the codebase — fewer tables, fewer services, fewer side effects.
4. Make FK columns a pure code-generation artifact, never a design-time entity.
5. Support forward-compatible nesting and collection types.

## Non-Goals

- Backwards-compatible API. This is a big-bang migration.
- Embedded/JSON object types (future work).
- Nested write support in generated APIs (future work).
- Rename-safe incremental schema migrations. Renaming a relationship field or
  `inverse_name` will change generated column/table names. This is acceptable
  for a one-shot code generator.

---

## 1. Cardinality Model

Reduce from four cardinalities to three. Eliminate `references` entirely.

| Cardinality | Meaning | FK placement |
|---|---|---|
| `one_to_one` | Each source has exactly one target | Always on the target object |
| `one_to_many` | Each source has many targets | Always on the target (the "many" side) |
| `many_to_many` | Many-to-many | Junction table, no FK on either side |

`references` was not a true cardinality — it encoded FK ownership. That concern
is now eliminated: **FK always lives on the target side.** There is no `owner`
field. This removes all ambiguity.

For `one_to_one`: if the user needs the FK on the other side, they define the
relationship from the other direction (e.g., `Profile.user: one_to_one → User`
puts `user_id` on Profile).

---

## 2. Inverse Management

**Single-side authoring (Option C+).** The user authors one relationship field
per link. The inverse is derived at read time and code generation time. It is
never persisted.

Each authored relationship stores:
- `name` — the relationship field name on the source object (e.g., "orders")
- `target_object_id` — FK to the target object
- `kind` — `one_to_one | one_to_many | many_to_many`
- `inverse_name` — the name for the derived reverse field (e.g., "customer")
- `required` — whether the FK column is NOT NULL (default: true)

### FK column naming rule

For `one_to_one` and `one_to_many`, the FK column lives on the **target** table
and is named `{inverse_name}_id`. Examples:
- `inverse_name = "customer"` → FK column `customer_id`
- `inverse_name = "my_user"` → FK column `my_user_id`

### Junction table naming rule

For `many_to_many`, the junction table name is
`{source_table}_{relationship_name}`. Examples:
- `Post.tags: many_to_many → Tag` → junction table `posts_tags`
- `Post.categories: many_to_many → Tag` → junction table `posts_categories`

The relationship name disambiguates when multiple `many_to_many` relationships
exist between the same objects.

### Junction table schema

Each junction table has two FK columns and a composite PK:

```sql
CREATE TABLE {junction_table_name} (
    {source_fk_col}  {source_pk_type} NOT NULL REFERENCES {source_table}({source_pk}),
    {target_fk_col}  {target_pk_type} NOT NULL REFERENCES {target_table}({target_pk}),
    PRIMARY KEY ({source_fk_col}, {target_fk_col})
);
```

Column names are derived: `{source_table_singular}_id` and
`{target_table_singular}_id`. For self-referential M2M, use
`{source_table_singular}_id` and `related_{source_table_singular}_id`.

### Inverse name validation rules

To prevent collisions in generated code:

1. **Cross-object uniqueness**: `(target_object_id, inverse_name)` must be
   unique across all `relationship_members`. Enforced as a DB unique index.

2. **No collision with target's authored members**: when saving a relationship
   member, verify that `inverse_name` does not collide with any existing
   `object_members.name` on the target object.

3. **Reverse check on member creation**: when adding any member (scalar or
   relationship) to an object, verify its `name` does not collide with any
   `inverse_name` of incoming relationships targeting that object.

### Relationship optionality

The `required` field on relationship members controls whether the generated FK
column is `NOT NULL`:
- `required=true` (default): FK column is NOT NULL. `OrderCreate` schema has
  `customer_id: int` (required field).
- `required=false`: FK column is nullable. `OrderCreate` schema has
  `customer_id: int | None = None` (optional field).

For `many_to_many`, `required` is always `false` and not user-editable (no FK
column exists). The UI hides the required toggle for `many_to_many` relationships.
Backend validation rejects `required=true` for `many_to_many`.

### Self-referential relationships

Supported. Example: `Employee.reports: one_to_many → Employee,
inverse_name="manager", required=false`.

This means: an Employee has many reports (direct reports). The derived inverse
is `manager` — each report has one manager (or none, since `required=false`).
The FK column is `manager_id` on the `employees` table (per the
`{inverse_name}_id` rule, FK on the target which is also `employees`). The
column is nullable because `required=false`.

Generated ORM:
```python
class EmployeeRecord(Base):
    manager_id = mapped_column(Integer, ForeignKey("employees.id"), nullable=True)
    manager = relationship("EmployeeRecord", remote_side=[id], foreign_keys=[manager_id], back_populates="reports")
    reports = relationship("EmployeeRecord", back_populates="manager")
```

Rules:
- `inverse_name` must differ from `name`. Enforced by service-level validation
  (not by `UNIQUE(object_id, name)`, since only the authored name is stored as
  an `object_members` row — the inverse is derived).
- Self-referential `many_to_many`: junction table columns use
  `{table_singular}_id` and `related_{table_singular}_id` (e.g.,
  `employee_id` and `related_employee_id`).

### Derivation rules

Given `Customer.orders: one_to_many → Order, inverse_name="customer"`:

**UI read model**: Order shows a derived incoming relationship:
`"Customer.orders (has many) → implies customer_id column"`

**Code generation**:
- Order ORM: `customer_id` FK column +
  `customer = relationship("CustomerRecord", back_populates="orders", foreign_keys=[customer_id])`
- Customer ORM: `orders = relationship("OrderRecord", back_populates="customer")`

**API schemas**:
- `OrderCreate`: `customer_id: int` (required)
- `OrderUpdate`: `customer_id: int | None` (optional)
- `OrderResponse`: `customer_id: int`

### Derived relationship shape by kind

The `derivedRelationships` array in GET responses has different shapes per kind:

**`one_to_many`** (target sees "many" side):
```json
{"name": "customer", "sourceObject": "Customer", "sourceField": "orders",
 "kind": "one_to_many", "side": "many", "impliesFk": "customer_id",
 "required": true}
```

**`one_to_one`** (target sees "one" side):
```json
{"name": "user", "sourceObject": "User", "sourceField": "profile",
 "kind": "one_to_one", "side": "target", "impliesFk": "user_id",
 "required": true}
```

**`many_to_many`** (target sees reverse navigation):
```json
{"name": "posts", "sourceObject": "Post", "sourceField": "tags",
 "kind": "many_to_many", "side": "many", "impliesFk": null,
 "junctionTable": "posts_tags", "required": false}
```

For `many_to_many`, `impliesFk` is null (no FK on either object). Instead,
`junctionTable` names the association table.

---

## 3. Database Schema — Class Table Inheritance

Three tables replace the current `fields_on_objects` and `object_relationships`
tables. The pattern is CTI (Class Table Inheritance): a shared base table for
identity/ordering, with child tables for type-specific attributes.

### Tables to drop

- `object_relationships` — entirely
- `fields_on_objects` — replaced by `object_members` + `scalar_members`
- All `FieldModel` rows that were auto-created with role `fk`

### Tables unchanged

- `fields` (scalar definitions: name, type_id, constraints, validators)
- `objects`
- `types`, field `constraint_values`, field `validators`

### New: `object_members` (base table)

```sql
CREATE TABLE object_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_id   UUID NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    position    INTEGER NOT NULL,
    member_type TEXT NOT NULL CHECK (member_type IN ('scalar', 'relationship')),

    UNIQUE (object_id, name),
    UNIQUE (object_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX ix_object_members_object_position
    ON object_members (object_id, position);
```

### New: `scalar_members` (child table)

```sql
CREATE TABLE scalar_members (
    id              UUID PRIMARY KEY REFERENCES object_members(id) ON DELETE CASCADE,
    field_id        UUID NOT NULL REFERENCES fields(id),
    role            TEXT NOT NULL CHECK (role IN (
                        'pk', 'writable', 'write_only', 'read_only',
                        'created_timestamp', 'updated_timestamp', 'generated_uuid'
                    )),
    is_nullable     BOOLEAN NOT NULL DEFAULT false,
    default_value   TEXT
);
```

Note: `fk` is removed from the role enum.

### New: `relationship_members` (child table)

```sql
CREATE TABLE relationship_members (
    id                UUID PRIMARY KEY REFERENCES object_members(id) ON DELETE CASCADE,
    target_object_id  UUID NOT NULL REFERENCES objects(id) ON DELETE RESTRICT,
    kind              TEXT NOT NULL CHECK (kind IN ('one_to_one', 'one_to_many', 'many_to_many')),
    inverse_name      TEXT NOT NULL,
    required          BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX ix_relationship_members_target
    ON relationship_members (target_object_id);

CREATE UNIQUE INDEX ix_relationship_members_inverse_unique
    ON relationship_members (target_object_id, inverse_name);
```

- `ON DELETE RESTRICT` on `target_object_id`: deleting a target object fails if
  any relationship points to it. The user must remove the relationship first.
  This prevents silent breakage of authored relationships.
- `(target_object_id, inverse_name)` unique index enforces cross-object inverse
  name uniqueness at the DB level.

### SQLAlchemy mapping

Uses joined table inheritance with `polymorphic_on`. The base class omits
`polymorphic_identity` since no rows should have `member_type` outside of
`scalar` / `relationship`.

```python
class ObjectMember(Base):
    __tablename__ = "object_members"
    id          = mapped_column(UUID, primary_key=True, default=uuid4)
    object_id   = mapped_column(UUID, ForeignKey("objects.id", ondelete="CASCADE"))
    name        = mapped_column(Text, nullable=False)
    position    = mapped_column(Integer, nullable=False)
    member_type = mapped_column(Text, nullable=False)

    __mapper_args__ = {
        "polymorphic_on": member_type,
    }

class ScalarMember(ObjectMember):
    __tablename__ = "scalar_members"
    id            = mapped_column(UUID, ForeignKey("object_members.id", ondelete="CASCADE"), primary_key=True)
    field_id      = mapped_column(UUID, ForeignKey("fields.id"))
    role          = mapped_column(Text, nullable=False)
    is_nullable   = mapped_column(Boolean, default=False)
    default_value = mapped_column(Text, nullable=True)

    __mapper_args__ = {"polymorphic_identity": "scalar"}

class RelationshipMember(ObjectMember):
    __tablename__ = "relationship_members"
    id               = mapped_column(UUID, ForeignKey("object_members.id", ondelete="CASCADE"), primary_key=True)
    target_object_id = mapped_column(UUID, ForeignKey("objects.id", ondelete="RESTRICT"))
    kind             = mapped_column(Text, nullable=False)
    inverse_name     = mapped_column(Text, nullable=False)
    required         = mapped_column(Boolean, nullable=False, default=True)

    __mapper_args__ = {"polymorphic_identity": "relationship"}
```

---

## 4. Backend API Changes

### Services

**`RelationshipService` — eliminated.** Its responsibilities disappear:
- `_create_fk_field` — gone (FK fields are derived at generation time)
- `create_relationship` / `delete_relationship` — absorbed into `ObjectService`
- `INVERSE_MAP` — gone (inverses are derived)

**`ObjectService`** absorbs all member CRUD. Creating or updating an object
handles both scalar and relationship members through the unified
`object_members` table. One service, one transaction.

**Update strategy**: `PUT /objects/{id}` uses **reconcile-by-ID**. The client
sends the complete `members` array. Each member may include an `id` field:
- Members with a known `id`: matched to existing rows and updated in place.
- Members without an `id`: inserted as new rows.
- Existing rows not present in the request: deleted.

This preserves `object_members.id` stability across updates without needing a
separate `relation_key`.

**Validation on save** (both create and update):
- `inverse_name` uniqueness: `(target_object_id, inverse_name)` must be unique.
- `inverse_name` collision: must not match any `object_members.name` on target.
- Reverse collision: any member `name` must not match any incoming
  `inverse_name` targeting this object.

**`GenerationService._convert_to_input_api`** — simplifies:
- One loop over `object.members` instead of separate field + relationship loops
- `ScalarMember` → `InputField`
- `RelationshipMember` → `InputRelationship`
- No FK fields to skip or filter. No dedup needed.

**New utility: `compute_derived_relationships(object_id, all_members)`** —
scans all relationship members across all objects, returns those whose
`target_object_id` matches. Used by GET endpoints and code generation.

### API contract

**Object create/update** — `POST /objects`, `PUT /objects/{id}`:

```json
{
  "name": "Order",
  "members": [
    {"memberType": "scalar", "name": "id", "fieldId": "...", "role": "pk"},
    {"memberType": "scalar", "name": "total", "fieldId": "...", "role": "writable"},
    {"memberType": "relationship", "name": "line_items", "targetObjectId": "...",
     "kind": "one_to_many", "inverseName": "order"}
  ],
  "validators": [...]
}
```

Position is derived from array index.

**Object read** — `GET /objects/{id}`:

The `members` array contains both scalar and relationship members authored on
this object. `derivedRelationships` contains incoming (non-authored) inverse
relationships computed from other objects' relationship members.

```json
{
  "id": "...",
  "name": "Order",
  "members": [
    {"memberType": "scalar", "id": "m5", "name": "id", "role": "pk", "fieldId": "..."},
    {"memberType": "scalar", "id": "m6", "name": "total", "role": "writable", "fieldId": "..."},
    {"memberType": "relationship", "id": "m7", "name": "line_items",
     "targetObjectId": "...", "kind": "one_to_many", "inverseName": "order",
     "required": true}
  ],
  "derivedRelationships": [
    {"name": "customer", "sourceObject": "Customer", "sourceField": "orders",
     "kind": "one_to_many", "side": "many", "impliesFk": "customer_id",
     "required": true}
  ],
  "validators": [...]
}
```

### Eliminated endpoints and schemas

- `POST /objects/{id}/relationships` — gone
- `DELETE /objects/{id}/relationships/{rel_id}` — gone
- `GraphMutationResult` / `RelationshipMutationResponse` — gone
- `createdFields` / `deletedFieldIds` — gone
- `fkFieldId` on responses — gone
- `ObjectRelationshipCreate` / `ObjectRelationshipResponse` — gone
- `ObjectFieldReferenceSchema` — replaced by `MemberInput` (discriminated union)

---

## 5. Code Generation Pipeline Changes

### `InputRelationship` (new shape)

```python
class InputRelationship(BaseModel):
    name: str
    target_model: str
    kind: Literal["one_to_one", "one_to_many", "many_to_many"]
    inverse_name: str
    required: bool = True
```

Removed: `cardinality` (replaced by `kind`), `is_inferred` (no inferred
relationships exist), `owner` (FK always on target), `relation_key` (eliminated).

### `orm_builder.py` — rewritten

Current: dispatches on `references` / `has_many` / `has_one` / `many_to_many`
with dedup logic for FK columns.

New: processes the full graph of all models' relationships, emits per-table.
FK always goes on the target side.

**`one_to_many`** (e.g., `Customer.orders: List[Order]`):
- Customer ORM: `orders = relationship("OrderRecord", back_populates="customer")`
- Order ORM: derive FK column `customer_id` +
  `customer = relationship("CustomerRecord", back_populates="orders", foreign_keys=[customer_id])`
- FK column type derived from Customer's PK type
- FK column nullable if `required=false`

**`one_to_one`** (e.g., `User.profile: Profile`):
- User ORM: `profile = relationship("ProfileRecord", back_populates="user", uselist=False)`
- Profile ORM: derive FK column `user_id` (unique) +
  `user = relationship("UserRecord", back_populates="profile", foreign_keys=[user_id], uselist=False)`

**`many_to_many`** (e.g., `Post.tags: List[Tag]`):
- Junction table `posts_tags` with composite PK
- Post ORM: `tags = relationship(secondary=posts_tags, back_populates="posts")`
- Tag ORM: `posts = relationship(secondary=posts_tags, back_populates="tags")`

**Self-referential** (e.g., `Employee.reports: one_to_many → Employee,
inverse_name="manager"`):
- Employee ORM: `manager_id` FK column (self-referencing, nullable) +
  `manager = relationship(remote_side=[id], foreign_keys=[manager_id], back_populates="reports")`
- Employee ORM: `reports = relationship(back_populates="manager")`

No dedup check. No existing-field stamping. One clean pass.

### `schema_splitter.py` — same shift

Current: scans for `references` to inject FK fields.

New: scans all `one_to_many` and `one_to_one` relationships across the full
model graph. For each relationship targeting this model, injects
`{inverse_name}_id` into:
- Create schema: required if `required=true`, optional otherwise
- Update schema: always optional
- Response schema: required if `required=true`, optional otherwise

### Templates

Minimal changes. The `references` branch in `orm_models.mako` is removed.
Templates continue to render from `TemplateORMField` and `TemplateRelationship`.

### YAML spec format

The YAML spec uses separate `fields` and `relationships` keys for readability.
This is a convenience format — ordering is fields first, then relationships.
Round-tripping arbitrary mixed ordering is not supported in YAML (the API
`members` array is the canonical ordered format).

```yaml
objects:
  - name: Customer
    fields:
      - name: customer_id
        type: int
        pk: true
      - name: customer_name
        type: str
    relationships:
      - name: orders
        target: Order
        kind: one_to_many
        inverse_name: customer
```

The `InputAPI` loader maps `fields` → scalar members, `relationships` →
relationship members, concatenated in that order.

---

## 6. Frontend Changes

### Types

```typescript
type FieldRole = 'pk' | 'writable' | 'write_only' | 'read_only'
  | 'created_timestamp' | 'updated_timestamp' | 'generated_uuid';

type RelationshipKind = 'one_to_one' | 'one_to_many' | 'many_to_many';

type ScalarMember = {
  memberType: 'scalar';
  id?: string;
  name: string;
  fieldId: string;
  role: FieldRole;
  isNullable: boolean;
  defaultValue?: string | null;
};

type RelationshipMember = {
  memberType: 'relationship';
  id?: string;
  name: string;
  targetObjectId: string;
  kind: RelationshipKind;
  inverseName: string;
  required: boolean;
};

type ObjectMember = ScalarMember | RelationshipMember;

type DerivedRelationship = {
  name: string;
  sourceObject: string;
  sourceField: string;
  kind: RelationshipKind;
  side: 'one' | 'many' | 'target';
  impliesFk: string | null;
  junctionTable?: string;
  required: boolean;
};

type ObjectDefinition = {
  id: string;
  name: string;
  description?: string;
  members: ObjectMember[];
  derivedRelationships: DerivedRelationship[];
  validators: InlineModelValidator[];
  usedInApis: string[];
};
```

Eliminated types: `ObjectFieldReference`, `ObjectRelationship`, `Cardinality`,
`GraphMutationResult`, `FkHint`.

### Object form

One unified **Members** section — ordered list mixing scalars and relationships.
Each row renders based on `memberType`:

- **Scalar row**: field selector, role dropdown, nullable toggle, default value,
  drag handle
- **Relationship row**: target object selector, kind dropdown, inverse name
  input, required toggle (hidden for `many_to_many`), drag handle

All members are draggable for reordering.

**Derived relationships section** — read-only, below the members list. Shows
incoming relationships from other objects with implied FK column names. Styled
as muted badges. Clicking navigates to the source object.

### Stores

Save flow simplifies from three steps to one:
1. ~~Save object (fields only)~~ → Save object with full `members` array
2. ~~Diff relationships, send separate create/delete calls~~ → Done
3. ~~Reconcile GraphMutationResult side effects~~ → Done

Update sends member `id`s for existing members (reconcile-by-ID).

### Eliminated frontend code

- `reconciler.ts` — `applyGraphMutation` and all field-patching logic
- `relationships.ts` — `getFkHint` and FK hint display
- FK field filtering logic in `ObjectFormContent.svelte`
- FK field locked display (non-draggable, non-editable FK rows)
- Inferred relationship display (dashed borders, "auto" badge)
- Separate relationship API calls (`createRelationshipApi`,
  `deleteRelationshipApi`)
- `RelationshipMutationResponse` handling

---

## 7. Testing Strategy

### Backend — rewrite

| Current test | Action |
|---|---|
| `tests/http/test_relationships_and_fields.py` | Rewrite. Test relationship members as part of object CRUD. No `GraphMutationResult`. |
| `tests/codegen/test_codegen_domains.py` — relationship classes | Rewrite for `kind` cardinality. No `references`. |
| `tests/codegen/test_codegen_domains.py::TestReferencesWithExistingFkField` | Delete — bug class eliminated. |
| `tests/codegen/test_generated_project.py::TestFkFieldWithReferencesRelationship` | Delete — bug class eliminated. |

### Backend — new tests

- **CTI model**: mixed scalar + relationship members, correct child table rows,
  unified ordering, cascade delete.
- **Derived inverses**: create `one_to_many`, query target, verify
  `derived_relationships` with correct shape per kind.
- **FK derivation**: `one_to_many` → target gets FK column. `one_to_one` → FK
  on target. `many_to_many` → junction table, no FK.
- **Schema splitter**: Create/Update/Response schemas get correct FK fields with
  correct nullability based on `required`.
- **Name collisions**: `UNIQUE(object_id, name)` prevents duplicates across
  member types.
- **Inverse name validation**: verify `(target_object_id, inverse_name)` DB
  unique index. Verify no collision with target's authored member names. Verify
  reverse check: adding any member whose name matches an incoming
  `inverse_name` is rejected.
- **Self-referential**: `Employee.reports: one_to_many → Employee,
  inverse_name="manager"` generates correct `manager_id` FK and `remote_side`
  in ORM.
- **Target deletion**: verify `ON DELETE RESTRICT` — cannot delete an object
  that is a relationship target.
- **Reconcile-by-ID update**: verify PUT with member `id`s updates in place,
  new members are inserted, missing members are deleted.
- **Optionality**: `required=false` relationship generates nullable FK column
  and optional schema field.

### Codegen integration

- Generate with `one_to_many` → ORM compiles, migration compiles, no duplicate
  columns, FK present on target.
- Generate with `one_to_one` → FK on target with unique constraint.
- Generate with `many_to_many` → junction table with composite PK.
- Generate with self-referential → `remote_side` present.
- Generate with `required=false` → nullable FK column.

### Runtime / E2E

- Update `shop_api.yaml` to include relationships.
- Update product creation payloads to include `customer_id`.
- E2E test (`test_generated_stack.py`) exercises full generation → migration →
  runtime path with FK relationships.

### Seeding

- `shop_data.py`: relationship members inside object definitions, not separate.
- `runner.py`: no separate relationship creation step.

### Frontend

- Component tests for unified members form: add/remove/reorder mixed scalar and
  relationship members.
- Verify derived relationships display correctly for all three kinds.
- Verify removed code paths (reconciler, FK hint, inferred relationship display)
  are no longer reachable.

---

## 8. Migration

Alembic migration to:

1. Create `object_members`, `scalar_members`, `relationship_members` tables.
2. Migrate `fields_on_objects` → `object_members` + `scalar_members`:
   - Skip `role='fk'` rows (these are derived artifacts).
   - Position: preserve existing `position` values from `fields_on_objects`.
3. Migrate `object_relationships` → `object_members` + `relationship_members`:
   - Only migrate non-inferred rows (`is_inferred=False`).
   - Skip `references` rows that are user-authored (`is_inferred=False`):
     look up the corresponding inferred inverse (via `inverse_id`). The
     inverse's source object becomes the new relationship's owning object. The
     inverse's cardinality determines the new `kind`:
     - Inverse was `has_many` → `kind=one_to_many`
     - Inverse was `has_one` → `kind=one_to_one`
     The `references` row's `name` becomes the new `inverse_name`. The
     inverse's `name` becomes the new relationship `name`.
   - Migrate `has_many` → `kind=one_to_many`.
   - Migrate `has_one` → `kind=one_to_one`.
   - Migrate `many_to_many` → `kind=many_to_many`.
   - `inverse_name`: derive from the inferred inverse's `name` if available.
     If no inverse exists, use lowercase source object name (e.g., "Customer"
     → "customer"). Log a warning for manual review.
   - Positions: assign relationship members positions starting after the last
     scalar member position for each object. (e.g., if object has scalar
     members at positions 0-4, relationships start at position 5.)
   - `required`: default to `true` for all migrated relationships.
   - If a `references` row has no inverse and no clear mapping, log it as an
     error for manual resolution rather than silently defaulting.
4. Rename old tables to `fields_on_objects_old` and `object_relationships_old`.
5. Verify data integrity: run a check that every `object_members` row has
   exactly one child row in the correct child table.
6. Follow-up migration (separate, after verification): drop `_old` tables and
   delete orphaned `FieldModel` rows that were only used as FK fields (identified
   by having no remaining `scalar_members` references).

### Rollback strategy

The Alembic downgrade reverses table creation and restores from `_old` tables.
Old tables are renamed (not dropped) in the upgrade step, so data is preserved
until explicitly removed. Orphaned FK `FieldModel` deletion is deferred to the
follow-up migration, so downgrade from the primary migration preserves all
original data.

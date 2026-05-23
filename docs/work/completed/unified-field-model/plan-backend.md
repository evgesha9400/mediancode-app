# Unified Field Model — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dual field/relationship model with CTI-based unified object members, eliminating the duplicate FK column bug class.

**Architecture:** Three new DB tables (object_members, field_members, relationship_members) using SQLAlchemy joined table inheritance. RelationshipService eliminated. ObjectService absorbs all member CRUD with reconcile-by-ID updates. Code generation pipeline rewritten to derive FK columns from relationships at generation time.

**Tech Stack:** Python 3.13, SQLAlchemy 2.x (async), Alembic, FastAPI, Pydantic v2, Mako templates

**Spec:** `docs/work/unified-field-model/spec.md`

**Read before starting:** `../mediancode-backend/CLAUDE.md`, `../mediancode-backend/TESTING.md`

**Migration strategy:** Big-bang. The entire migration is developed locally, tested as a whole, and only pushed once complete. Intermediate states between phases do NOT need to be build-safe. The app does not need to compile or run between phases.

### Implementation Notes (from final review)

These items were flagged during review and should be addressed during implementation:

1. **Generation service graph scope:** `_fetch_objects()` currently fetches only endpoint-selected objects. For full-graph FK derivation, it must fetch ALL objects with relationship members so the codegen pipeline can compute incoming FK columns across the entire graph.
2. **CTI model-level tests:** Phase 4 should include tests for child-table integrity (every `object_members` row has exactly one child), cascade delete behavior, and unified position ordering — not just HTTP/codegen tests.
3. **`DerivedRelationshipResponse` must include `sourceObjectId`:** The frontend depends on this for navigation. Add `source_object_id: UUID` alongside `source_object: str` in the response schema.
4. **Reconcile-by-ID type change:** Define behavior if a member `id` is reused with a different `member_type` (e.g., field→relationship). Recommended: reject as validation error.

---

### Phase 1: Database Layer (Models + Migration + FieldService)

Everything that touches the database: new CTI models, updated enums, Alembic migration with data transfer, old table rename, and FieldService update for the new model.

**Files:**
- Create: `src/api/models/members.py`
- Modify: `src/api/models/database.py` (add `members` relationship to ObjectDefinition)
- Modify: `src/api/models/__init__.py` or `src/api/migrations/env.py` (import new member models for Alembic discovery)
- Modify: `src/api_craft/models/enums.py` (add RelationshipKind, update FieldRole, remove old Cardinality)
- Create: `src/api/migrations/versions/XXXX_unified_field_model.py`
- Modify: `src/api/services/field.py` (update ObjectFieldAssociation dependency)

#### Step 1: Create CTI models

- [ ] **Create `src/api/models/members.py` with CTI models**

Write `ObjectMember` (base), `FieldMember`, `RelationshipMember` exactly as specified in spec Section 3. Include `__table_args__` for unique constraints and deferrable position constraint.

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

class FieldMember(ObjectMember):
    __tablename__ = "field_members"
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

#### Step 2: Update enums and ObjectDefinition

- [ ] **Update enums in `src/api_craft/models/enums.py`**

Remove `"fk"` from `FieldRole`. Add `RelationshipKind = Literal["one_to_one", "one_to_many", "many_to_many"]`. Remove old `Cardinality` enum values (`references`, `has_many`, `has_one`, `many_to_many`). Update `src/api/migrations/versions/4141ad7f2255_initial_schema.py` to either inline the old values it needs or remove the `Cardinality` import.

- [ ] **Add `members` relationship to `ObjectDefinition` in `src/api/models/database.py`**

```python
members: Mapped[list["ObjectMember"]] = relationship(
    "ObjectMember",
    back_populates="parent_object",
    order_by="ObjectMember.position",
    cascade="all, delete-orphan",
)
```

- [ ] **Register new models for Alembic discovery**

Import `ObjectMember`, `FieldMember`, `RelationshipMember` in `src/api/models/__init__.py` (or `src/api/migrations/env.py` if that is where model imports are registered) so Alembic autogenerate detects the new tables.

#### Step 3: Alembic migration

- [ ] **Generate migration scaffold**

Run: `cd ../mediancode-backend && poetry run alembic revision -m "unified_field_model"`

- [ ] **Write upgrade function — table creation**

Create `object_members`, `field_members`, `relationship_members` tables with all constraints and indexes per spec Section 3.

- [ ] **Write upgrade function — scalar member data migration**

Migrate `fields_on_objects` to `object_members` + `field_members`:
- Skip `role='fk'` rows (derived artifacts)
- Preserve existing `position` values from `fields_on_objects`

- [ ] **Write upgrade function — relationship data migration**

Migrate `object_relationships` to `object_members` + `relationship_members`:
- Only migrate non-inferred rows (`is_inferred=False`)
- **References row flipping**: for `references` rows, look up the corresponding inferred inverse via `inverse_id`. The inverse's source object becomes the new relationship's owning object. Map the inverse's cardinality to the new `kind` (`has_many` -> `one_to_many`, `has_one` -> `one_to_one`). The `references` row's `name` becomes the new `inverse_name`. The inverse's `name` becomes the new relationship `name`.
- Migrate `has_many` -> `kind=one_to_many`
- Migrate `has_one` -> `kind=one_to_one`
- Migrate `many_to_many` -> `kind=many_to_many`
- **inverse_name fallback**: derive from the inferred inverse's `name` if available. If no inverse exists, use lowercase source object name (e.g., "Customer" -> "customer"). Log a warning for manual review.
- **Error logging**: if a `references` row has no inverse and no clear mapping, log it as an error for manual resolution rather than silently defaulting.
- **Position assignment**: relationship members start at position = (last scalar member position + 1) for each object. E.g., if object has scalar members at positions 0-4, relationships start at position 5.
- `required`: default to `true` for all migrated relationships.

- [ ] **Write upgrade function — integrity check and old table rename**

Verify data integrity: every `object_members` row has exactly one child row in the correct child table. Then rename `fields_on_objects` to `fields_on_objects_old` and `object_relationships` to `object_relationships_old`.

- [ ] **Write downgrade function**

Restore `_old` tables to original names, then drop new tables.

- [ ] **Test migration against a local DB**

Run: `cd ../mediancode-backend && poetry run alembic upgrade head`
Run: `cd ../mediancode-backend && poetry run alembic downgrade -1`
Run: `cd ../mediancode-backend && poetry run alembic upgrade head`

#### Step 4: Update FieldService

- [ ] **Update FieldService for new member model**

`src/api/services/field.py` depends on `ObjectFieldAssociation`. Update it to work with `FieldMember` instead, or adjust the dependency as needed for the new model.

#### Step 5: Verify and commit

- [ ] **Verify models load without errors**

Run: `cd ../mediancode-backend && poetry run python -c "from api.models.members import ObjectMember, FieldMember, RelationshipMember; print('OK')"`

- [ ] **Commit**

```
feat(db): add CTI member models, migration, and enum updates

- Create ObjectMember base, FieldMember, RelationshipMember with joined table inheritance
- Add RelationshipKind enum, remove fk from FieldRole, remove old Cardinality values
- Update initial migration import to inline old Cardinality if needed
- Add members relationship to ObjectDefinition
- Alembic migration: create new tables, migrate data, rename old tables to _old
- Update FieldService to use FieldMember instead of ObjectFieldAssociation
```

---

### Phase 2: API Layer (Schemas + ObjectService + Routes + Generation Service)

Everything that touches the API surface: Pydantic schemas, ObjectService rewrite with member CRUD and validation, route updates, generation service rewrite, and deletion of RelationshipService.

**Files:**
- Create: `src/api/schemas/members.py`
- Modify: `src/api/schemas/object.py`
- Check/modify: `src/api/schemas/literals.py`, `src/api/schemas/__init__.py`
- Modify: `src/api/services/object.py`
- Modify: `src/api/routers/objects.py`
- Modify: `src/api/services/generation.py`
- Delete: `src/api/services/relationship.py`
- Delete: `src/api/schemas/relationship.py`
- Modify: `src/api/models/database.py` (remove ObjectFieldAssociation, ObjectRelationship)
- Clean up: stale imports across `src/`

#### Step 1: Pydantic schemas

- [ ] **Create `src/api/schemas/members.py`**

Define:
- `FieldMemberInput` (id: str | None = None, memberType="field", name, fieldId, role, isNullable, defaultValue)
- `RelationshipMemberInput` (id: str | None = None, memberType="relationship", name, targetObjectId, kind, inverseName, required)
- `MemberInput = Annotated[FieldMemberInput | RelationshipMemberInput, Field(discriminator="memberType")]`
- `FieldMemberResponse`, `RelationshipMemberResponse`, `MemberResponse`
- `DerivedRelationshipResponse`

Include optional `id` field on both input schemas to support reconcile-by-ID updates.

- [ ] **Update `ObjectCreate`, `ObjectUpdate`, and `ObjectResponse` in `src/api/schemas/object.py`**

Replace `fields: list[ObjectFieldReferenceSchema]` with `members: list[MemberInput]`.
Add `ObjectUpdate` schema with `members: list[MemberInput]` to support the reconcile-by-ID PUT flow.
Replace `relationships: list[ObjectRelationshipResponse]` with `derivedRelationships: list[DerivedRelationshipResponse]`.

- [ ] **Clean up `src/api/schemas/literals.py` and `src/api/schemas/__init__.py`**

Update or remove references to old types (`Cardinality`, `ObjectRelationshipCreate`, etc.). Ensure no stale re-exports remain.

#### Step 2: ObjectService rewrite

- [ ] **Add eager loading options for members**

Update `ObjectService` query methods to use `selectinload` for `members` to avoid N+1 queries. Ensure `ObjectMember.position` ordering is preserved.

- [ ] **Rewrite `create_for_user` in ObjectService**

Process `members` array: for each member, create `ObjectMember` base row + appropriate child row (`FieldMember` or `RelationshipMember`). Position from array index.

- [ ] **Rewrite `update_object` with reconcile-by-ID**

Match by `id` (update in place), insert new (no `id`), delete missing. Use deferrable position constraint for reordering.

- [ ] **Add validation methods**

- `_validate_inverse_names()`: check `(target_object_id, inverse_name)` uniqueness, check inverse_name doesn't collide with target's member names, check member names don't collide with incoming inverse_names.
- `_validate_many_to_many_required()`: reject `required=true` for `many_to_many`.
- `_validate_self_referential()`: `inverse_name` != `name` for self-referential relationships.

- [ ] **Add `compute_derived_relationships()` utility**

Query all `RelationshipMember` rows where `target_object_id` matches, build `DerivedRelationshipResponse` list. Use `selectinload` or subquery prefetch to avoid N+1 — do not issue one query per object.

#### Step 3: Route updates

- [ ] **Update `_to_response()` helper in `src/api/routers/objects.py`**

Build response with `members` (from object.members) and `derivedRelationships` (from `compute_derived_relationships()`).

- [ ] **Update create/update endpoints**

Accept `members` array instead of `fields`. Remove relationship endpoints entirely.

- [ ] **Delete relationship endpoints and their imports**

Remove `create_relationship()` and `delete_relationship()` handlers and their route registrations. Remove imports of `RelationshipService`, `ObjectRelationshipCreate`, `RelationshipMutationResponse` from the router module.

#### Step 4: Generation service rewrite

- [ ] **Rewrite `_convert_to_input_api` in `src/api/services/generation.py`**

Single loop over `object.members`:
- `FieldMember` -> `InputField`
- `RelationshipMember` -> `InputRelationship(name, target_model, kind, inverse_name, required)`

No FK fields. No dedup.

- [ ] **Rewrite `_fetch_objects()` and `_fetch_fields()`**

These methods currently use `field_associations` and `relationships` from the old model. Update them to use `object.members` instead — iterate over `object.members`, discriminate by member type, and build the corresponding data structures.

#### Step 5: Delete old code

- [ ] **Delete `src/api/services/relationship.py` and `src/api/schemas/relationship.py`**

- [ ] **Remove old model classes from `src/api/models/database.py`**

Remove `ObjectFieldAssociation` and `ObjectRelationship` classes. Remove `fields_on_objects` and `object_relationships` references.

- [ ] **Clean up all stale imports across `src/`**

Grep for all imports of deleted classes/modules (`ObjectFieldAssociation`, `ObjectRelationship`, `RelationshipService`, `ObjectRelationshipCreate`, `RelationshipMutationResponse`, `GraphMutationResult`). Remove them all.

#### Step 6: Commit

- [ ] **Commit**

```
feat(api): rewrite API layer for unified member model

- Create discriminated union MemberInput schemas for scalar and relationship members
- Add ObjectUpdate schema with members array for reconcile-by-ID PUT flow
- Rewrite ObjectService: member persistence, reconcile-by-ID, validation, derived relationships
- Update routes: unified members endpoints, delete relationship endpoints
- Rewrite generation service: single loop over members, no FK emission or dedup
- Delete RelationshipService, relationship schemas, old model classes
- Clean up all stale imports
```

---

### Phase 3: Code Generation Pipeline

Everything in `src/api_craft/` that transforms the input model into generated code: InputRelationship shape, ORM builder, schema splitter, extractors, templates, orm_types, and YAML spec format.

**Files:**
- Modify: `src/api_craft/models/input.py` (InputRelationship)
- Modify: `src/api_craft/models/orm_types.py` (TemplateRelationship)
- Modify: `src/api_craft/orm_builder.py` (rewrite transform_orm_models)
- Modify: `src/api_craft/extractors.py` (association table extraction)
- Modify: `src/api_craft/schema_splitter.py` (FK injection)
- Modify: `src/api_craft/templates/orm_models.mako`
- Modify: `src/api_craft/templates/initial_migration.mako`
- Modify: `tests/support/generated_app.py` (YAML loading)
- Modify: `tests/runtime/test_generated_stack.py` (YAML loading)
- Modify: `tests/specs/shop_api.yaml`

**Note:** YAML loading is in `tests/support/generated_app.py` and `tests/runtime/test_generated_stack.py`, NOT in `src/api_craft/prepare.py`. Update the correct files.

#### Step 1: InputRelationship and template model changes

- [ ] **Update InputRelationship in `src/api_craft/models/input.py`**

```python
class InputRelationship(BaseModel):
    name: str
    target_model: str
    kind: Literal["one_to_one", "one_to_many", "many_to_many"]
    inverse_name: str
    required: bool = True
```

Removed: `cardinality` (replaced by `kind`), `is_inferred`, `owner`, `relation_key`.

- [ ] **Update TemplateRelationship in `src/api_craft/models/orm_types.py`**

Add or update fields on `TemplateRelationship` as needed to support the new kind-based rendering (e.g., `kind`, `inverse_name`, `required` if not already present).

#### Step 2: ORM builder graph rewrite

- [ ] **Rewrite `transform_orm_models` in `src/api_craft/orm_builder.py`**

Full-graph approach: collect all relationships across all models, then for each model emit:
- Its authored relationship as a `TemplateRelationship`
- For incoming one_to_many/one_to_one relationships: add FK column + inverse relationship
- For many_to_many: create association table + both-side relationships

**one_to_many** (e.g., `Customer.orders: List[Order]`):
- Customer ORM: `orders = relationship("OrderRecord", back_populates="customer")`
- Order ORM: derive FK column `customer_id` + `customer = relationship("CustomerRecord", back_populates="orders", foreign_keys=[customer_id])`

**one_to_one** (e.g., `User.profile: Profile`):
- User ORM: `profile = relationship("ProfileRecord", back_populates="user", uselist=False)`
- Profile ORM: derive FK column `user_id` (unique) + `user = relationship("UserRecord", back_populates="profile", foreign_keys=[user_id], uselist=False)`

**many_to_many** (e.g., `Post.tags: List[Tag]`):
- Junction table `posts_tags` with composite PK
- Post ORM: `tags = relationship(secondary=posts_tags, back_populates="posts")`
- Tag ORM: `posts = relationship(secondary=posts_tags, back_populates="tags")`

**Self-referential** (e.g., `Employee.reports: one_to_many → Employee, inverse_name="manager"`):
- Employee ORM: `manager_id` FK column (self-referencing, nullable) + `manager = relationship(remote_side=[id], foreign_keys=[manager_id], back_populates="reports")`
- Employee ORM: `reports = relationship(back_populates="manager")`

Self-referential many_to_many junction table uses `related_{singular}_id` column naming to avoid column name collision.

No dedup check. No existing-field stamping. One clean pass.

#### Step 3: Schema splitter rewrite

- [ ] **Rewrite FK injection logic in `src/api_craft/schema_splitter.py`**

Scan all relationships across the full model graph. For each one_to_one/one_to_many targeting this model, inject `{inverse_name}_id`:
- Create: required if required=true
- Update: always optional
- Response: required if required=true

#### Step 4: Extractors update

- [ ] **Update `src/api_craft/extractors.py` for new association table shape**

Update to work with the new junction table naming convention (`{source_table}_{relationship_name}`) and new relationship structure.

#### Step 5: Template updates

- [ ] **Remove `references` branch from `src/api_craft/templates/orm_models.mako`**

The template should handle: one_to_one, one_to_many (back_populates), many_to_many (secondary). No references.

- [ ] **Update `src/api_craft/templates/initial_migration.mako`**

Update for new relationship kinds if any migration template logic references old cardinalities.

#### Step 6: YAML spec format and loader

- [ ] **Update YAML spec format in `tests/specs/shop_api.yaml`**

Add `relationships` key with Customer->Product one_to_many relationship.

- [ ] **Update YAML loader in test support files**

Update `tests/support/generated_app.py` and `tests/runtime/test_generated_stack.py` to map `relationships` entries to `InputRelationship` with new `kind` field.

#### Step 7: Commit

- [ ] **Commit**

```
feat(codegen): rewrite code generation pipeline for unified model

- Update InputRelationship: replace cardinality/owner/relation_key with kind/inverse_name/required
- Update TemplateRelationship for kind-based template rendering
- Rewrite orm_builder: full-graph FK derivation, no dedup, FK always on target
- Rewrite schema_splitter: graph-based FK injection from incoming relationships
- Update extractors for new junction table naming convention
- Remove references branch from orm_models.mako
- Update YAML spec format and loader for new relationship shape
```

---

### Phase 4: Tests

Rewrite all tests for the new model. HTTP contract tests, codegen tests, seeding, runtime/E2E tests. Delete obsolete tests. Full suite verification.

**Files:**
- Rewrite: `tests/http/test_relationships_and_fields.py`
- Update: `tests/http/test_validation_and_errors.py`
- Update: `tests/http/test_happy_path_and_seeding.py`
- Update: `tests/support/shop_contract.py`
- Delete from: `tests/codegen/test_codegen_domains.py` (TestReferencesWithExistingFkField)
- Delete from: `tests/codegen/test_generated_project.py` (TestFkFieldWithReferencesRelationship)
- Update: `tests/codegen/test_input_and_transform.py`
- Rewrite: `tests/codegen/test_codegen_domains.py` (relationship test classes)
- Rewrite: `tests/seeding/shop_data.py`
- Rewrite: `tests/seeding/runner.py`
- Update: `tests/support/generated_app.py`
- Update: `tests/runtime/test_generated_stack.py`
- Update: `tests/runtime/test_generated_runtime.py`

#### Step 1: HTTP contract tests

- [ ] **Update shop test contract in `tests/support/shop_contract.py`**

Update to use the new members-based object format.

- [ ] **Rewrite `tests/http/test_relationships_and_fields.py`**

Test relationship members as part of object CRUD. No `GraphMutationResult`. Test all three kinds (one_to_one, one_to_many, many_to_many). Test inverse_name uniqueness and collision rules. Test `required=false` generates correct derived relationship shape. Test `ON DELETE RESTRICT` prevents deleting a target object. Test reconcile-by-ID: member `id`s update in place, new members inserted, missing members deleted.

- [ ] **Update `tests/http/test_validation_and_errors.py` and `tests/http/test_happy_path_and_seeding.py`**

Update for the new member-based API contract.

#### Step 2: Codegen tests

- [ ] **Delete obsolete tests**

Remove `TestReferencesWithExistingFkField` from `tests/codegen/test_codegen_domains.py`.
Remove `TestFkFieldWithReferencesRelationship` from `tests/codegen/test_generated_project.py`.
These test the bug class that is eliminated by this change.

- [ ] **Rewrite codegen domain relationship tests**

Update remaining relationship test classes in `tests/codegen/test_codegen_domains.py` for `kind` cardinality. No `references`. Test:
- one_to_many: source gets relationship, target gets FK column + inverse relationship
- one_to_one: target gets FK column (unique)
- many_to_many: junction table, no FK
- Self-referential: remote_side present
- Self-referential many_to_many: `related_{singular}_id` column naming
- required=false: nullable FK

- [ ] **Update `tests/codegen/test_input_and_transform.py`**

Update for the new `InputRelationship` shape and `transform_orm_models` behavior.

#### Step 3: Seeding and runtime tests

- [ ] **Rewrite seeding**

Update `tests/seeding/shop_data.py`: relationship members inside object definitions.
Update `tests/seeding/runner.py`: no separate relationship creation step.

- [ ] **Update runtime/E2E tests**

Update product creation payloads to include `customer_id`.
Verify E2E stack test exercises FK relationships.
Update `tests/support/generated_app.py` if not already done in Phase 3.

#### Step 4: Full suite verification

- [ ] **Run full test suite**

Run: `cd ../mediancode-backend && poetry run pytest tests/ -v`

- [ ] **Run type checking**

Run: `cd ../mediancode-backend && poetry run mypy src/`

- [ ] **Verify no stale imports**

Grep for all imports of deleted classes/modules (`ObjectFieldAssociation`, `ObjectRelationship`, `RelationshipService`, `ObjectRelationshipCreate`, `RelationshipMutationResponse`, `GraphMutationResult`). Ensure none remain.

- [ ] **Commit**

```
test: rewrite all tests for unified field model

- Rewrite HTTP tests for members-based object CRUD
- Delete obsolete duplicate-FK-column tests
- Rewrite codegen domain tests for kind-based cardinality
- Update input and transform tests for new InputRelationship shape
- Rewrite seeding with relationship members inside object definitions
- Update E2E tests to exercise FK relationships
```

---

### Phase 5: Cleanup

Drop old tables, clean up orphaned FK FieldModel rows, final verification.

**Files:**
- Create: `src/api/migrations/versions/XXXX_drop_old_tables_and_orphan_fk_fields.py`

#### Step 1: Cleanup migration

- [ ] **Create migration to drop _old tables and orphan FK fields**

Drop `fields_on_objects_old` and `object_relationships_old` tables. Delete orphaned `FieldModel` rows that were only used as FK fields — identified by having `role='fk'` in the old `fields_on_objects` data and no remaining `field_members` references.

- [ ] **Write downgrade function**

Restore tables from backup if needed, or document as non-reversible.

- [ ] **Test migration**

Run: `cd ../mediancode-backend && poetry run alembic upgrade head`
Run: `cd ../mediancode-backend && poetry run alembic downgrade -1`
Run: `cd ../mediancode-backend && poetry run alembic upgrade head`

#### Step 2: Final verification

- [ ] **Run full test suite**

Run: `cd ../mediancode-backend && poetry run pytest tests/ -v`

- [ ] **Run type checking**

Run: `cd ../mediancode-backend && poetry run mypy src/`

- [ ] **Verify clean codebase**

Grep for any remaining references to old model concepts: `ObjectFieldAssociation`, `ObjectRelationship`, `RelationshipService`, `fields_on_objects`, `object_relationships`, `GraphMutationResult`, `fkFieldId`, `is_inferred`, `relation_key`. Ensure none remain outside of migration files.

- [ ] **Commit**

```
chore: drop legacy tables and clean up orphaned FK fields

- Drop fields_on_objects_old and object_relationships_old
- Delete orphaned FieldModel rows that only served as FK fields
- Verify clean codebase with no stale references
```

---

### Implementation Order

```
Phase 1  (Database: models + enums + migration + FieldService)
  |
Phase 2  (API: schemas + ObjectService + routes + generation service + delete old code)
  |
Phase 3  (Codegen: InputRelationship + orm_builder + schema_splitter + extractors + templates + YAML)
  |
Phase 4  (Tests: HTTP + codegen + seeding + runtime + E2E + full verification)
  |
Phase 5  (Cleanup: drop _old tables + orphan FK fields + final verification)
```

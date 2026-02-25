# Container Types & Required→Optional Rename — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `List` container support to fields and rename the `required` boolean to `optional` (inverted semantics) on object-field references, across backend and frontend.

**Architecture:** Two independent changes sharing one migration update. Part A adds a nullable `container` column to fields. Part B renames `required` → `optional` on the object-field association and inverts the boolean semantics. Both changes span backend (DB model, schema, service, codegen) and frontend (types, API layer, stores, UI).

**Tech Stack:** Python/FastAPI/SQLAlchemy/Pydantic (backend), TypeScript/SvelteKit/Svelte 5 (frontend), Vitest (unit tests), Playwright (E2E tests)

---

## Part A: Container Types (List) — Backend

### Task A1: Add `container` column to FieldModel and migration

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/models/database.py` (FieldModel class, ~line 311-356)
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/migrations/versions/4141ad7f2255_initial_schema.py` (fields table, ~line 217-241)

**Step 1: Add column to FieldModel**

In `database.py`, add to `FieldModel` after the `default_value` column:

```python
container: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
```

**Step 2: Add column to migration**

In the initial schema migration, inside the `fields` table definition, add:

```python
sa.Column("container", sa.String(), nullable=True),
```

**Step 3: Run tests to verify model loads**

```bash
cd /Users/evgesha/Documents/Projects/median-code-backend
python -m pytest tests/test_api/test_models/ -v --timeout=10
```

**Step 4: Commit**

```bash
git add src/api/models/database.py src/api/migrations/versions/4141ad7f2255_initial_schema.py
git commit -m "feat(fields): add container column to FieldModel"
```

---

### Task A2: Add `container` to field API schemas

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/schemas/field.py` (FieldCreate ~line 65, FieldUpdate ~line 90, FieldResponse ~line 109)

**Step 1: Add `container` field to all three schemas**

Add to `FieldCreate`:
```python
container: str | None = Field(default=None, alias="container", examples=["List"])
```

Add to `FieldUpdate`:
```python
container: str | None = Field(default=None, alias="container", examples=["List"])
```

Add to `FieldResponse`:
```python
container: str | None = Field(default=None, alias="container")
```

**Step 2: Add container validation to FieldCreate and FieldUpdate**

Add a Pydantic validator to both schemas that rejects values other than `None` or `"List"`:

```python
from pydantic import field_validator

@field_validator("container")
@classmethod
def validate_container(cls, v: str | None) -> str | None:
    if v is not None and v not in ("List",):
        raise ValueError(f'Invalid container "{v}". Must be null or "List".')
    return v
```

**Step 3: Run schema tests**

```bash
python -m pytest tests/test_api/test_schemas/ -v --timeout=10
```

**Step 4: Commit**

```bash
git add src/api/schemas/field.py
git commit -m "feat(fields): add container field to field API schemas"
```

---

### Task A3: Pass `container` through field service layer

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/services/field.py` (create_for_user ~line 92, update_field ~line 122)

**Step 1: Pass `container` in create_for_user**

In the `FieldModel(...)` constructor call inside `create_for_user`, add:

```python
container=data.container,
```

**Step 2: Pass `container` in update_field**

In `update_field`, add container to the fields being updated:

```python
if data.container is not None:
    field.container = data.container
```

Note: Since `container` can legitimately be `None` (meaning "remove container"), use a sentinel or always set it. Check how other nullable fields are handled in this method. If the method uses `exclude_unset=True` pattern, `container` will only be set when explicitly provided.

**Step 3: Run field service tests**

```bash
python -m pytest tests/test_api/test_services/test_field.py -v --timeout=30
```

**Step 4: Commit**

```bash
git add src/api/services/field.py
git commit -m "feat(fields): pass container through field service layer"
```

---

### Task A4: Update generation service to compose container types

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/services/generation.py` (~line 316 `_map_field_type`, ~line 196 where InputField is built)

**Step 1: Update `_map_field_type` to accept container**

Change the function signature and logic:

```python
def _map_field_type(field_type: str, container: str | None = None) -> str:
    type_mapping = {
        "str": "str",
        "int": "int",
        "float": "float",
        "bool": "bool",
        "datetime": "datetime.datetime",
        "uuid": "str",
        "EmailStr": "EmailStr",
        "HttpUrl": "HttpUrl",
    }
    base = type_mapping.get(field_type, "str")
    if container:
        return f"{container}[{base}]"
    return base
```

**Step 2: Pass container from field model to `_map_field_type`**

Where `InputField` is constructed (~line 196), update the `type` argument:

```python
type=_map_field_type(field.field_type.name, field.container),
```

**Step 3: Run generation tests**

```bash
python -m pytest tests/test_api/test_services/test_generation.py -v --timeout=30
```

**Step 4: Commit**

```bash
git add src/api/services/generation.py
git commit -m "feat(codegen): compose container types in field type mapping"
```

---

### Task A5: Add/update backend tests for container feature

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/tests/test_api/test_services/test_field.py`
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/tests/test_api/test_services/test_generation.py`

**Step 1: Add test for creating a field with container**

```python
async def test_create_field_with_list_container(self, ...):
    # Create a field with container="List"
    field_data = FieldCreate(
        namespace_id=ns_id,
        name="tags",
        type_id=str_type_id,
        container="List"
    )
    field = await field_service.create_for_user(user_id, field_data)
    assert field.container == "List"
```

**Step 2: Add test for container validation**

```python
async def test_create_field_with_invalid_container_rejects(self, ...):
    with pytest.raises(ValidationError):
        FieldCreate(
            namespace_id=ns_id,
            name="bad",
            type_id=str_type_id,
            container="Set"  # Not allowed
        )
```

**Step 3: Add test for generation with container**

```python
async def test_generation_with_list_field(self, ...):
    # Create field with container="List", type=str
    # Generate code
    # Assert generated type string contains "List[str]"
```

**Step 4: Run all tests**

```bash
python -m pytest tests/ -v --timeout=60
```

**Step 5: Commit**

```bash
git add tests/
git commit -m "test(fields): add tests for container type support"
```

---

## Part A: Container Types (List) — Frontend

### Task A6: Add `container` to Field type and seed data

**Files:**
- Modify: `src/lib/types/index.ts` (~line 175, Field interface)
- Modify: `tests/fixtures/seedData.ts` (~line 125, initialFields)

**Step 1: Add `container` to Field interface**

In `src/lib/types/index.ts`, add to the `Field` interface after `type: string;`:

```typescript
container: string | null;
```

**Step 2: Add `container: null` to all seed fields**

In `tests/fixtures/seedData.ts`, add `container: null,` to every field in `initialFields`. For example:

```typescript
{
    id: SEED_FIELD_IDS.email,
    namespaceId: GLOBAL_NAMESPACE_ID,
    name: 'email',
    type: 'str',
    container: null,  // NEW
    description: 'User email address',
    ...
}
```

Do this for all 13 fields in `initialFields`.

**Step 3: Run type check to find all broken references**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

This will show every location that creates a `Field` object without `container`. Fix them all.

**Step 4: Commit**

```bash
git add src/lib/types/index.ts tests/fixtures/seedData.ts
git commit -m "feat(fields): add container property to Field type"
```

---

### Task A7: Add `container` to field API layer

**Files:**
- Modify: `src/lib/api/fields.ts` (~line 45 FieldResponse, ~line 83 transformField, ~line 130 CreateFieldRequest, ~line 143 UpdateFieldRequest)

**Step 1: Add `container` to FieldResponse**

```typescript
interface FieldResponse {
    id: string;
    namespaceId: string;
    name: string;
    typeId: string;
    container: string | null;  // NEW
    description: string | null;
    defaultValue: string | null;
    constraints: FieldConstraintValueResponse[];
    validators: FieldValidatorResponse[];
    usedInApis: string[];
}
```

**Step 2: Map `container` in transformField**

In the return object of `transformField()`, add:

```typescript
container: response.container,
```

**Step 3: Add `container` to CreateFieldRequest and UpdateFieldRequest**

```typescript
export interface CreateFieldRequest {
    namespaceId: string;
    name: string;
    typeId: string;
    container?: string | null;  // NEW
    description?: string;
    defaultValue?: string;
    constraints: { constraintId: string; value: string | null }[];
    validators?: { templateId: string; parameters?: Record<string, string> }[];
}

export interface UpdateFieldRequest {
    name?: string;
    typeId?: string;
    container?: string | null;  // NEW
    description?: string;
    defaultValue?: string;
    constraints?: { constraintId: string; value: string | null }[];
    validators?: { templateId: string; parameters?: Record<string, string> }[];
}
```

**Step 4: Update field API tests**

In `tests/unit/lib/api/fields.test.ts`, add `container: null` to `MOCK_FIELD_RESPONSE` and add a test:

```typescript
it('should transform field with List container', async () => {
    (apiGet as any).mockResolvedValue([{
        ...MOCK_FIELD_RESPONSE,
        container: 'List'
    }]);

    const result = await listFields();

    expect(result[0].container).toBe('List');
});
```

**Step 5: Run tests**

```bash
bunx vitest run tests/unit/lib/api/fields.test.ts
```

**Step 6: Commit**

```bash
git add src/lib/api/fields.ts tests/unit/lib/api/fields.test.ts
git commit -m "feat(fields): add container to field API layer"
```

---

### Task A8: Add `container` to fieldsModel (draft, payload, search)

**Files:**
- Modify: `src/lib/stores/fieldsModel.svelte.ts` (~line 172 createDraft, ~line 186 toCreatePayload, ~line 205 toUpdatePayload)
- Modify: `src/lib/stores/fields.ts` (~line 48 searchFields)

**Step 1: Add `container: null` to createDraft**

```typescript
function createDraft(): Field {
    return {
        id: '',
        namespaceId: getActiveNamespaceId(),
        name: '',
        type: getDefaultType(),
        container: null,  // NEW
        constraints: [],
        validators: [],
        usedInApis: [],
        description: '',
        defaultValue: ''
    };
}
```

**Step 2: Add `container` to toCreatePayload**

In the `data` object inside `toCreatePayload`, add:

```typescript
container: item.container,
```

**Step 3: Add `container` to toUpdatePayload**

In the `data` object inside `toUpdatePayload`, add:

```typescript
container: item.container,
```

**Step 4: Include container in searchFields**

In `src/lib/stores/fields.ts`, update the `searchFields` filter to also match container:

```typescript
return fields.filter(field =>
    field.name.toLowerCase().includes(lowerQuery) ||
    field.type.toLowerCase().includes(lowerQuery) ||
    (field.container && field.container.toLowerCase().includes(lowerQuery)) ||
    field.description?.toLowerCase().includes(lowerQuery) ||
    field.constraints.some(c => c.name.toLowerCase().includes(lowerQuery))
);
```

**Step 5: Run unit tests**

```bash
bunx vitest run tests/unit/lib/stores/fieldsModel.test.ts tests/unit/lib/stores/fields.test.ts
```

**Step 6: Commit**

```bash
git add src/lib/stores/fieldsModel.svelte.ts src/lib/stores/fields.ts
git commit -m "feat(fields): add container to fieldsModel and search"
```

---

### Task A9: Add container toggle to field drawer UI

**Files:**
- Modify: `src/routes/(dashboard)/fields/+page.svelte` (~line 100 handleTypeChange, ~line 350 Type section in drawer)

**Step 1: Add handleContainerChange function**

After `handleTypeChange` (~line 108), add:

```typescript
function handleContainerChange(container: string | null) {
    if (!workflow.editedItem) return;
    workflow.editedItem = {
        ...workflow.editedItem,
        container,
        constraints: [],
        defaultValue: ''
    };
}
```

**Step 2: Add container toggle UI above TypeSelectorDropdown**

Replace the Type `<div>` section (~lines 350-364) with:

```svelte
<!-- Container -->
<div>
    <FormLabel label="Container" />
    <div class="flex space-x-2">
        <button
            type="button"
            onclick={() => handleContainerChange(null)}
            class="px-3 py-1.5 text-sm rounded-md border transition-colors {workflow.editedItem.container === null ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}"
        >
            None
        </button>
        <button
            type="button"
            onclick={() => handleContainerChange('List')}
            class="px-3 py-1.5 text-sm rounded-md border transition-colors {workflow.editedItem.container === 'List' ? 'bg-mono-900 text-white border-mono-900' : 'bg-white text-mono-600 border-mono-300 hover:border-mono-400'}"
        >
            List
        </button>
    </div>
</div>

<!-- Type -->
<div>
    <FormLabel label="Type" forId="fields-type" required />
    <TypeSelectorDropdown
        id="fields-type"
        availableTypes={selectableTypes}
        selectedTypeName={workflow.editedItem.type}
        onSelect={handleTypeChange}
        placeholder="Search types..."
        error={!!workflow.visibleErrors.type}
    />
    {#if workflow.visibleErrors.type}
        <p class="text-xs text-red-500 mt-1">{workflow.visibleErrors.type}</p>
    {/if}
</div>
```

**Step 3: Update table type display**

Find where `field.type` is displayed in the table rows (search for the Type column rendering). Update it to show the composed type:

```svelte
{field.container ? `${field.container}[${field.type}]` : field.type}
```

**Step 4: Run type check and dev server**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
bun run dev
```

Manually verify the container toggle appears in the field drawer and works correctly.

**Step 5: Commit**

```bash
git add src/routes/(dashboard)/fields/+page.svelte
git commit -m "feat(fields): add container toggle to field drawer UI"
```

---

## Part B: Required → Optional Rename — Backend

### Task B1: Rename `required` → `optional` on ObjectFieldAssociation model and migration

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/models/database.py` (ObjectFieldAssociation ~line 454)
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/migrations/versions/4141ad7f2255_initial_schema.py` (fields_on_objects table ~line 307)

**Step 1: Rename column in model**

Change:
```python
required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
```
To:
```python
optional: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
```

Update the docstring to reflect: `optional: Whether this field is optional in the object (default False = required).`

**Step 2: Rename column in migration**

Change:
```python
sa.Column("required", sa.Boolean(), nullable=False),
```
To:
```python
sa.Column("optional", sa.Boolean(), nullable=False),
```

**Step 3: Commit**

```bash
git add src/api/models/database.py src/api/migrations/versions/4141ad7f2255_initial_schema.py
git commit -m "refactor(objects): rename required to optional on ObjectFieldAssociation"
```

---

### Task B2: Rename `required` → `optional` in object API schemas

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/schemas/object.py` (ObjectFieldReferenceSchema ~line 19)

**Step 1: Rename field**

Change:
```python
required: bool = Field(..., examples=[True])
```
To:
```python
optional: bool = Field(default=False, examples=[False])
```

Update the docstring: `:ivar optional: Whether this field is optional in the object.`

**Step 2: Commit**

```bash
git add src/api/schemas/object.py
git commit -m "refactor(objects): rename required to optional in object schemas"
```

---

### Task B3: Update object service to use `optional`

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/services/object.py` (_set_field_associations ~line 190)

**Step 1: Change field reference**

Change:
```python
required=field_ref.required,
```
To:
```python
optional=field_ref.optional,
```

**Step 2: Run object service tests**

```bash
python -m pytest tests/test_api/test_services/test_object.py -v --timeout=30
```

**Step 3: Commit**

```bash
git add src/api/services/object.py
git commit -m "refactor(objects): update service to use optional field"
```

---

### Task B4: Update generation service and codegen to use `optional`

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api/services/generation.py` (~line 196 where `required=assoc.required`)
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api_craft/models/input.py` (InputField ~line 65, InputQueryParam ~line 98)
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api_craft/transformers.py` (~line 91 and ~line 128)
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api_craft/templates/models.mako` (~line 49, 54)
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/src/api_craft/templates/views.mako` (~line 39)

**Step 1: Rename in InputField and InputQueryParam**

In `input.py`, change both classes:
```python
# InputField
optional: bool = False  # was: required: bool = False

# InputQueryParam
optional: bool = False  # was: required: bool = False
```

Update docstrings accordingly.

**Step 2: Update generation service**

Where InputField is constructed (~line 196), change:
```python
required=assoc.required,
```
To:
```python
optional=assoc.optional,
```

Similarly for InputQueryParam construction (~line 268).

**Step 3: Update transformers**

In `transformers.py`, update `transform_field` and `transform_query_params` to pass `optional` instead of `required`.

**Step 4: Update Mako templates**

In `models.mako`, change:
```mako
# Was: if field.required:
if not field.optional:
    return f'{field.name}: {type_annotation} = Field(...)'
else:
    return f'{field.name}: {type_annotation} | None = Field(default=None, ...)'
```

In `views.mako`, change:
```mako
# Was: suffix = "" if q_param.required else " = None"
suffix = " = None" if q_param.optional else ""
```

**Step 5: Run all backend tests**

```bash
python -m pytest tests/ -v --timeout=60
```

**Step 6: Commit**

```bash
git add src/api/services/generation.py src/api_craft/
git commit -m "refactor(codegen): rename required to optional across generation pipeline"
```

---

### Task B5: Update backend tests for required→optional rename

**Files:**
- Modify: `/Users/evgesha/Documents/Projects/median-code-backend/tests/test_api/test_services/test_object.py` (~line 121)
- Modify: Any other test files referencing `required` on object-field associations

**Step 1: Search and replace in tests**

Search all test files for `"required":` in object field reference contexts and replace with `"optional":`, inverting the boolean values:
- `"required": True` → `"optional": False`
- `"required": False` → `"optional": True`

**Step 2: Run all tests**

```bash
python -m pytest tests/ -v --timeout=60
```

**Step 3: Commit**

```bash
git add tests/
git commit -m "test(objects): update tests for required→optional rename"
```

---

## Part B: Required → Optional Rename — Frontend

### Task B6: Rename `required` → `optional` in frontend types

**Files:**
- Modify: `src/lib/types/index.ts` (~line 152, ObjectFieldReference)
- Modify: `tests/fixtures/seedData.ts` (~line 373, initialObjects)

**Step 1: Rename in ObjectFieldReference**

Change:
```typescript
export interface ObjectFieldReference {
    fieldId: string;
    required: boolean;
}
```
To:
```typescript
export interface ObjectFieldReference {
    fieldId: string;
    optional: boolean;
}
```

**Step 2: Update all seed objects — invert boolean values**

In `tests/fixtures/seedData.ts`, update every `required` to `optional` with inverted values. For example:

```typescript
// Was: { fieldId: SEED_FIELD_IDS.user_id, required: true }
{ fieldId: SEED_FIELD_IDS.user_id, optional: false }

// Was: { fieldId: SEED_FIELD_IDS.updated_at, required: false }
{ fieldId: SEED_FIELD_IDS.updated_at, optional: true }
```

Do this for all ~40 field references across the 9 seed objects.

**Step 3: Run type check to find all broken references**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

This will show every location still using `.required` — fix them all.

**Step 4: Commit**

```bash
git add src/lib/types/index.ts tests/fixtures/seedData.ts
git commit -m "refactor(objects): rename required to optional in ObjectFieldReference"
```

---

### Task B7: Rename `required` → `optional` in objects API layer

**Files:**
- Modify: `src/lib/api/objects.ts` (~line 13 ObjectFieldReferenceResponse, ~line 44 transformFieldReference)

**Step 1: Update ObjectFieldReferenceResponse**

Change:
```typescript
interface ObjectFieldReferenceResponse {
    fieldId: string;
    required: boolean;
}
```
To:
```typescript
interface ObjectFieldReferenceResponse {
    fieldId: string;
    optional: boolean;
}
```

**Step 2: Update transformFieldReference**

Change:
```typescript
function transformFieldReference(response: ObjectFieldReferenceResponse): ObjectFieldReference {
    return {
        fieldId: response.fieldId,
        required: response.required
    };
}
```
To:
```typescript
function transformFieldReference(response: ObjectFieldReferenceResponse): ObjectFieldReference {
    return {
        fieldId: response.fieldId,
        optional: response.optional
    };
}
```

**Step 3: Update objects API tests**

In `tests/unit/lib/api/objects.test.ts`, update `MOCK_OBJECT_RESPONSE`:

```typescript
const MOCK_OBJECT_RESPONSE = {
    id: 'o-1',
    namespaceId: 'ns-1',
    name: 'User',
    description: 'User model',
    fields: [
        { fieldId: 'f-1', optional: false },   // was: required: true
        { fieldId: 'f-2', optional: true }      // was: required: false
    ],
    validators: [],
    usedInApis: ['api-1']
};
```

Also update the `createObjectApi` test:
```typescript
fields: [{ fieldId: 'f-1', optional: false }]  // was: required: true
```

**Step 4: Run tests**

```bash
bunx vitest run tests/unit/lib/api/objects.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/api/objects.ts tests/unit/lib/api/objects.test.ts
git commit -m "refactor(objects): rename required to optional in objects API layer"
```

---

### Task B8: Update objects page UI and handlers

**Files:**
- Modify: `src/routes/(dashboard)/objects/+page.svelte` (~line 76 addField, ~line 88 toggleFieldRequired, ~line 324 checkbox)

**Step 1: Update addField default**

Change:
```typescript
fields: [...workflow.editedItem.fields, { fieldId, required: false }]
```
To:
```typescript
fields: [...workflow.editedItem.fields, { fieldId, optional: false }]
```

**Step 2: Rename toggleFieldRequired → toggleFieldOptional**

Change:
```typescript
function toggleFieldRequired(fieldId: string) {
    if (!workflow.editedItem) return;
    const newFields = workflow.editedItem.fields.map(f =>
        f.fieldId === fieldId ? { ...f, required: !f.required } : f
    );
    workflow.editedItem = {
        ...workflow.editedItem,
        fields: newFields
    };
}
```
To:
```typescript
function toggleFieldOptional(fieldId: string) {
    if (!workflow.editedItem) return;
    const newFields = workflow.editedItem.fields.map(f =>
        f.fieldId === fieldId ? { ...f, optional: !f.optional } : f
    );
    workflow.editedItem = {
        ...workflow.editedItem,
        fields: newFields
    };
}
```

**Step 3: Update checkbox UI**

Change:
```svelte
<label class="flex items-center space-x-2 cursor-pointer">
    <input
        type="checkbox"
        checked={fieldRef.required}
        onchange={() => toggleFieldRequired(fieldRef.fieldId)}
        class="h-4 w-4 border-mono-300 rounded text-mono-900 focus:ring-2 focus:ring-mono-400"
    />
    <span class="text-sm text-mono-600 whitespace-nowrap">Required</span>
</label>
```
To:
```svelte
<label class="flex items-center space-x-2 cursor-pointer">
    <input
        type="checkbox"
        checked={fieldRef.optional}
        onchange={() => toggleFieldOptional(fieldRef.fieldId)}
        class="h-4 w-4 border-mono-300 rounded text-mono-900 focus:ring-2 focus:ring-mono-400"
    />
    <span class="text-sm text-mono-600 whitespace-nowrap">Optional</span>
</label>
```

**Step 4: Search for any remaining `required` references on ObjectFieldReference**

```bash
grep -rn "\.required" src/routes/\(dashboard\)/objects/ src/lib/stores/objects
```

Fix any remaining references.

**Step 5: Run type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

**Step 6: Commit**

```bash
git add src/routes/(dashboard)/objects/+page.svelte
git commit -m "refactor(objects): rename required to optional in objects page UI"
```

---

### Task B9: Update objectsModel and remaining stores

**Files:**
- Modify: `src/lib/stores/objectsModel.svelte.ts` (if any direct references to `required`)
- Modify: `src/lib/stores/objects.ts` (if any direct references to `required`)

**Step 1: Grep for remaining `required` references in stores**

Search for any remaining `.required` references that relate to `ObjectFieldReference`:

```bash
grep -rn "required" src/lib/stores/objects*.ts
```

**Step 2: Fix any remaining references**

The payload builders (`toCreatePayload`, `toUpdatePayload`) pass `item.fields` directly, so they should automatically use the renamed property. But verify.

**Step 3: Update objectsModel tests**

In `tests/unit/lib/stores/objectsModel.test.ts`, search for `required` and update all field references to use `optional` with inverted values.

**Step 4: Run all unit tests**

```bash
bunx vitest run
```

**Step 5: Commit**

```bash
git add src/lib/stores/ tests/unit/
git commit -m "refactor(objects): update stores and tests for required→optional rename"
```

---

## Final Verification

### Task C1: Full test suite

**Step 1: Type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

Expected: 0 errors.

**Step 2: Unit tests**

```bash
bunx vitest run
```

Expected: All pass.

**Step 3: E2E smoke tests**

```bash
pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke
```

Expected: All pass.

**Step 4: E2E CRUD tests**

```bash
pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

Expected: All pass. Note — these will fail until the backend is deployed with the matching changes. Run backend tests first, deploy backend, then run E2E CRUD.

**Step 5: Commit any remaining fixes**

```bash
git add -A && git commit -m "fix: address test failures from container and optional rename"
```

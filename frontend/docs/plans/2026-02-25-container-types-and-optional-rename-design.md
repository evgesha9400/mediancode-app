# Container Types & Required→Optional Rename

Two related changes to the field/object contract, bundled into one migration update.

## Part 1: Container Types (List)

### Problem

The frontend has no way to express composite field types like `List[str]` or `List[Address]`. The backend API accepts only a scalar `type_id` UUID. Users cannot define list fields, which appear in the vast majority of real-world APIs.

### Decision Record

- **Containers supported (v1):** `List` only
- **Optional handling:** Not a container — handled by the `optional` flag on object-field references (see Part 2)
- **Nesting depth:** One level only (`List[str]` yes, `List[List[str]]` no)
- **Forward-compatible with Dict:** Same `container` + `type_id` structure works for `Dict[str, V]` later (JSON keys are always strings)
- **Philosophy alignment:** Structural, deterministic, repeats in >80% of projects, not faster via LLM post-generation. UI is dropdown/toggle (cheap in complexity budget).

### Backend Changes

**Database — update existing migration:**
- Add `container` column to `FieldModel`: `Mapped[str | None]`, nullable, default `None`
- Valid values: `None` (plain type), `"List"`
- Add `CHECK` constraint: `CHECK (container IN ('List'))` — DB-level validation without PG enum rigidity
- Three-layer validation: DB CHECK constraint → Pydantic `@field_validator` → Frontend toggle UI

**API schemas (`src/api/schemas/field.py`):**
- `FieldCreate`: add `container: str | None = None`
- `FieldUpdate`: add `container: str | None = None`
- `FieldResponse`: add `container: str | None`

**Validation:** Backend should reject invalid container values (only `None` or `"List"` for v1).

**Generation service (`src/api/services/generation.py`):**
- `_map_field_type(field_type, container)`: if `container == "List"`, return `f"List[{base_type}]"`
- Codegen layer (`api_craft`) already handles `List[str]` import resolution — no changes needed there

### Frontend Changes

**Type definition (`src/lib/types/index.ts`):**
```typescript
export interface Field {
  // ... existing fields ...
  type: string;              // base type name (unchanged)
  container: string | null;  // NEW: "List" or null
}
```

**API layer (`src/lib/api/fields.ts`):**
- `FieldResponse`: add `container: string | null`
- `transformField()`: map `container` through from response
- `CreateFieldRequest` / `UpdateFieldRequest`: add `container` field
- `toCreatePayload` / `toUpdatePayload` in `fieldsModel.svelte.ts`: pass `container`

**Field drawer UI (`src/routes/(dashboard)/fields/+page.svelte`):**
- Add container toggle above `TypeSelectorDropdown`: two-state segmented control ("None" / "List")
- Selecting "List" sets `editedItem.container = "List"`, deselecting sets `null`
- When container changes: clear constraints and default value (same as type change behavior)

**Table display:** Compose display string where type is shown: `container ? \`${container}[${type}]\` : type`

**Store (`src/lib/stores/fields.ts`):**
- `searchFields`: include container in search matching
- `createDraft()` in `fieldsModel.svelte.ts`: set `container: null` default

**Types store (`src/lib/stores/types.ts`):**
- `usedInFields` derivation: match on base type name (unchanged — `field.type` stays the base name)

### Data Flow

```
UI: container="List", type="str"
  → API: { container: "List", type_id: "<uuid-of-str>" }
  → DB: FieldModel(container="List", type_id=<uuid>)
  → Generation: _map_field_type("str", "List") → "List[str]"
  → Codegen: renders List[str], auto-imports from typing
```

---

## Part 2: Required → Optional Rename

### Problem

The current `required` boolean on `ObjectFieldAssociation` defaults to `false`, meaning fields are optional by default. This is backwards — in most APIs, fields are required unless explicitly marked optional. The naming also reads awkwardly: checking a "Required" box to make a field required is a double-positive.

### Change Summary

Rename `required: bool` to `optional: bool` across all layers. Default stays `false`, but the meaning flips: fields are now **required by default** unless marked optional.

### Backend Changes

**Database — update existing migration:**
- Rename column: `required` → `optional` on `fields_on_objects` table
- Type: `Boolean`, default `False`, not nullable
- **Data inversion:** existing `required=true` rows become `optional=false`, existing `required=false` rows become `optional=true`

**API schemas (`src/api/schemas/object.py`):**
- `ObjectFieldReferenceSchema`: rename `required: bool` to `optional: bool`
- Update alias from `required` to `optional` (camelCase stays `optional` since it's the same)
- Update examples

**Service (`src/api/services/object.py`):**
- `_set_field_associations()`: read `field_ref.optional` instead of `field_ref.required`

**Generation service (`src/api/services/generation.py`):**
- Where `assoc.required` is read, change to `not assoc.optional` (or rename the `InputField.required` to `optional` too)
- `InputField` and `InputQueryParam` in `src/api_craft/models/input.py`: rename `required` → `optional`, update default

**Codegen templates:** Update any template logic that checks `required` to check `optional` instead.

### Frontend Changes

**Type definition (`src/lib/types/index.ts`):**
```typescript
export interface ObjectFieldReference {
  fieldId: string;
  optional: boolean;  // renamed from required, default false (= required)
}
```

**API layer (`src/lib/api/objects.ts`):**
- Update request/response types: `required` → `optional`
- Update `transformObject` mapping

**Objects page (`src/routes/(dashboard)/objects/+page.svelte`):**
- Adding a field: `{ fieldId, optional: false }` (was `required: false`)
- Toggle function: rename `toggleFieldRequired` → `toggleFieldOptional`, flip logic
- Checkbox label: "Optional" instead of "Required"
- Checkbox binding: `checked={fieldRef.optional}`

**Objects store (`src/lib/stores/objects.ts`):**
- Update any references to `required` on `ObjectFieldReference`

**Objects model (`src/lib/stores/objectsModel.svelte.ts`):**
- Update payload builders to send `optional` instead of `required`

### Locations to Update (Full List)

**Backend:**
- `src/api/models/database.py` — `ObjectFieldAssociation.required` → `.optional`
- `src/api/schemas/object.py` — `ObjectFieldReferenceSchema.required` → `.optional`
- `src/api/services/object.py` — `_set_field_associations()`
- `src/api/services/generation.py` — field building logic
- `src/api_craft/models/input.py` — `InputField.required`, `InputQueryParam.required`
- `src/api_craft/transformers.py` — if it references `required`
- `src/api_craft/templates/` — any Mako templates checking `required`
- All related test files

**Frontend:**
- `src/lib/types/index.ts` — `ObjectFieldReference`
- `src/lib/api/objects.ts` — request/response types and transforms
- `src/lib/stores/objects.ts` — store functions
- `src/lib/stores/objectsModel.svelte.ts` — payload builders
- `src/routes/(dashboard)/objects/+page.svelte` — UI, handlers
- All related test files

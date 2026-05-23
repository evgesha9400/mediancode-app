# Unified Field Model -- Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dual fields + relationships UI with a unified members model. Eliminate the reconciler, FK field display, and separate relationship CRUD calls.

**Architecture:** Single `members` array on ObjectDefinition replaces `fields` + `relationships`. Save flow simplifies to one API call. Derived relationships are read-only, computed by backend.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), TypeScript

**Spec:** `docs/work/unified-field-model/spec.md` (relative to workspace root)

**Dependency:** Backend Tasks 1-5 must be complete before frontend work begins (API contract must be live).

**Read before starting:** `../../../../mediancode-frontend/CLAUDE.md` (relative to this file; absolute: `/Users/evgesha/Projects/dev-tools/mediancode/repos/mediancode-frontend/CLAUDE.md`)

**Migration strategy:** This is a big-bang migration with no backwards compatibility. The entire migration is developed locally, tested as a whole, and only pushed once complete. Intermediate states between phases do NOT need to compile or run. There are no additive-only constraints, no optional transition properties, and no null-safety guards for transition periods.

### Implementation Notes (from final review)

These items were flagged during review and should be addressed during implementation:

1. **Temp ID → save flow ownership:** `toApiMembers()` should live in the form component (or a shared helper called by the form). The store's `handleSave`/`handleCreate` receives already-sanitized members from the form. The form owns temp IDs; the store never sees them.
2. **`DerivedRelationship.sourceObjectId`:** The backend must provide `sourceObjectId: string` in the derived relationship response. If missing from the backend API, add it — the frontend needs it for navigation.
3. **Validator field options:** `ObjectFormContent.svelte` currently derives validator field options from `editedItem.fields`. During the rewrite, update this to derive from field members: `editedItem.members.filter(m => m.memberType === 'field')`.
4. **Test coverage:** Phase 4 should include behavior tests for mixed-member editing (add scalar, add relationship, reorder, delete) and derived relationship display for all three kinds — not just type-shape fixture updates.

---

## Consumer Inventory

Every file that touches `ObjectDefinition.fields`, `ObjectDefinition.relationships`, `ObjectRelationship`, `ObjectFieldReference`, `GraphMutationResult`, `Cardinality`, `FieldRole` (specifically `'fk'`), `getFkHint`, or `applyGraphMutation` must be updated. The verified list:

### Types and domain logic
- `src/lib/types/index.ts` -- type definitions for all removed and added types
- `src/lib/domain/relationships.ts` -- `getFkHint()` (DELETE)
- `src/lib/domain/paramInference.ts` -- uses `obj.fields` (update to filter scalars from `members`)

### API layer
- `src/lib/api/objects.ts` -- transformers, request/response types, relationship API functions

### Stores
- `src/lib/stores/objectsModel.svelte.ts` -- save/create flows, relationship diffing, reconciler usage, `fieldCount` derivation, validation
- `src/lib/stores/reconciler.ts` -- `applyGraphMutation` (DELETE)

### Route consumers (use `.fields`, `.relationships`, or `.fields.length`)
- `src/routes/(dashboard)/objects/+page.svelte` -- `object.fields.length` in table display
- `src/routes/(dashboard)/apis/[id]/+page.svelte` -- `editedNewObject.fields`, `relationships: []` in object creation
- `src/routes/(dashboard)/namespaces/+page.svelte` -- `details.fields` (namespace field count, not ObjectDefinition -- NO CHANGE)

### Component consumers
- `src/lib/components/form/ObjectFormContent.svelte` -- fields section, relationships section, FK handling, self-target exclusion, duplicate-target blocking, cardinality options, `getFkHint`
- `src/lib/components/api-generator/ObjectSelectorDropdown.svelte` -- `selectedObject.fields.length`
- `src/lib/components/api-generator/ResponsePreview.svelte` -- `selectedObject.fields`, iterates field refs

### Utility consumers
- `src/lib/utils/examples.ts` -- `objectDef.fields`, `objectDef.relationships`, fk role filtering, `references` cardinality

### Test files
- `tests/unit/lib/types/fieldRoles.test.ts` -- tests fk role existence, `getAvailableRoles` fk exclusion
- `tests/unit/lib/utils/examples.test.ts` -- fixtures with `role: 'fk'`, `relationships: []`
- `tests/unit/lib/api/objects.test.ts` -- `transformRelationship`, `transformGraphMutation` tests
- `tests/unit/lib/stores/objectsModel.test.ts` -- mocks `createRelationshipApi`, `deleteRelationshipApi`
- `tests/unit/lib/stores/objects.test.ts` -- `makeObject` helper uses `fields: []`, `relationships: []` shape; tests `getObjectById`, `searchObjects`, etc.
- `tests/unit/lib/stores/reconciler.test.ts` -- `applyGraphMutation` tests (DELETE)
- `tests/unit/lib/domain/relationships.test.ts` -- `getFkHint` tests (DELETE)
- `tests/unit/lib/domain/paramInference.test.ts` -- `resolveTargetFields` tests use `fields: [...]` and `relationships: []` fixture shape
- `tests/unit/lib/components/form/ObjectFormContent.test.ts` -- type-level tests reference `fields: []` in `ObjectFormContentProps` fixture
- `tests/unit/lib/components/api-generator/ObjectSelectorDropdown.test.ts` -- type-level tests reference `ObjectSelectorDropdownProps` with object fixtures
- `tests/fixtures/seedData.ts` -- `ObjectDefinition` fixtures with `fields`/`relationships` shape

### E2E
- `tests/page-objects/ObjectsPage.ts` -- field count helpers, `addField`/`getFieldCount`/`getFieldNames`
- `tests/e2e/crud/objects.spec.ts` -- object CRUD lifecycle with field add/reorder

---

## Design Decisions

### D1: DnD `id` property for unsaved members

The drag-and-drop library (`svelte-dnd-action`) requires an `id` property on each item. Unsaved members have no persisted `id` from the backend. Solution: assign a temporary `id` using `crypto.randomUUID()` at add-time. Persisted members keep their real backend `id`. On save, strip the temporary `id` from new members before sending to the API. The `{#each items as item (item.id)}` keyed block works directly.

At save time, use an `originalMembers` snapshot (captured when the form opens) to distinguish backend-assigned IDs from temporary ones. Members whose `id` exists in `originalMembers` keep their `id` for reconcile-by-ID; new members omit `id` so the backend assigns one.

### D2: `many_to_many` forces `required=false`

When the user changes a relationship's kind to `many_to_many`, the UI must set `required` to `false` and hide the toggle. If the user switches back from `many_to_many`, `required` stays `false` until explicitly toggled.

### D3: Derived relationship navigation needs `sourceObjectId`

The spec's `DerivedRelationship` has `sourceObject` (a name string) but navigation requires an ID. The frontend `DerivedRelationship` type includes `sourceObjectId: string` in addition to `sourceObject: string`. The backend API must provide this field.

### D4: Scalar member name auto-population

When a scalar member is added with a field selector, the member's `name` is populated from the selected field's `name`. The user can override it, but the default is the field name.

### D5: Object list/count UIs

`object.fields.length` is used in multiple places to show a count pill. Decision: use `members.length` (total members, field + relationship). Update `fieldCount` in the store's `deriveExtra` to use `obj.members.length` and rename to `memberCount`. Rename the table column header from "Fields" to "Members".

### D6: Self-referential relationships must be allowed

The current UI filters out self-target (`o.id !== editedItem.id`) when listing available relationship targets. Per the spec (Section 2, "Self-referential relationships"), this must be removed. An object can target itself.

### D7: Multiple relationships to same target must be allowed

The current UI tracks `relatedObjectIds` and excludes already-targeted objects. Per the spec, multiple relationships to the same target are valid (e.g., `Post.author: one_to_many -> User` and `Post.editor: one_to_many -> User`). The duplicate-target exclusion must be removed.

---

## Phase 1: Types + API Layer

**Scope:** Replace all type definitions, rewrite the API layer (response transformers, request types, mutation functions), and delete the relationship API functions. This phase touches types, API client, and domain logic files only.

**Files:**
- Modify: `src/lib/types/index.ts`
- Modify: `src/lib/api/objects.ts`
- Delete: `src/lib/domain/relationships.ts`

### Types (`src/lib/types/index.ts`)

- [ ] **Step 1: Replace `FieldRole` -- remove `fk`**

Remove `'fk'` from `FieldRole` union type:
```typescript
export type FieldRole =
  | 'pk'
  | 'writable'
  | 'write_only'
  | 'read_only'
  | 'created_timestamp'
  | 'updated_timestamp'
  | 'generated_uuid';
```

Remove `'fk'` from `FIELD_ROLES` array, `ROLE_LABELS`, `ROLE_TOOLTIPS`, `ROLE_TYPE_CONSTRAINTS`. Remove the `if (role === 'fk') return false` guard from `getAvailableRoles()` (no longer needed since `fk` no longer exists). Remove the FK comment from `roleHasModifiers()`.

- [ ] **Step 2: Add new member types**

Add the following types:
```typescript
export type RelationshipKind = 'one_to_one' | 'one_to_many' | 'many_to_many';

export type FieldMember = {
  memberType: 'field';
  id?: string;
  name: string;
  fieldId: string;
  role: FieldRole;
  isNullable: boolean;
  defaultValue?: string | null;
};

export type RelationshipMember = {
  memberType: 'relationship';
  id?: string;
  name: string;
  targetObjectId: string;
  kind: RelationshipKind;
  inverseName: string;
  required: boolean;
};

export type ObjectMember = FieldMember | RelationshipMember;

export type DerivedRelationship = {
  name: string;
  sourceObjectId: string;
  sourceObject: string;
  sourceField: string;
  kind: RelationshipKind;
  side: 'one' | 'many' | 'target';
  impliesFk: string | null;
  junctionTable?: string;
  required: boolean;
};
```

Note: `DerivedRelationship` includes `sourceObjectId` for navigation (D3) and `sourceObject` for display.

- [ ] **Step 3: Replace `ObjectDefinition`**

Replace the `ObjectDefinition` interface. Remove `fields` and `relationships`, add `members` and `derivedRelationships` as required properties:
```typescript
export interface ObjectDefinition {
  id: string;
  namespaceId: string;
  name: string;
  description?: string;
  members: ObjectMember[];
  derivedRelationships: DerivedRelationship[];
  validators: InlineModelValidator[];
  usedInApis: string[];
}
```

- [ ] **Step 4: Delete old types**

Remove these types entirely:
- `ObjectFieldReference` interface
- `ObjectRelationship` interface
- `Cardinality` type
- `GraphMutationResult` interface

### API Layer (`src/lib/api/objects.ts`)

- [ ] **Step 5: Replace API response interfaces**

Remove `ObjectFieldReferenceResponse`, `ObjectRelationshipResponse`, `GraphMutationResponse`. Add:
```typescript
interface FieldMemberResponse {
  memberType: 'field';
  id: string;
  name: string;
  fieldId: string;
  role: string;
  isNullable: boolean;
  defaultValue?: string | null;
}

interface RelationshipMemberResponse {
  memberType: 'relationship';
  id: string;
  name: string;
  targetObjectId: string;
  kind: string;
  inverseName: string;
  required: boolean;
}

type MemberResponse = FieldMemberResponse | RelationshipMemberResponse;

interface DerivedRelationshipResponse {
  name: string;
  sourceObjectId: string;
  sourceObject: string;
  sourceField: string;
  kind: string;
  side: string;
  impliesFk: string | null;
  junctionTable?: string;
  required: boolean;
}
```

Update `ObjectResponse` to use `members: MemberResponse[]` and `derivedRelationships: DerivedRelationshipResponse[]` instead of `fields` and `relationships`.

- [ ] **Step 6: Replace response transformers**

Remove `transformFieldReference()`, `transformRelationship()`, `transformGraphMutation()`. Add:
- `transformMember(response: MemberResponse): ObjectMember` -- dispatches on `memberType` to produce `FieldMember` or `RelationshipMember` with correct type casts (`role as FieldRole`, `kind as RelationshipKind`)
- `transformDerivedRelationship(response: DerivedRelationshipResponse): DerivedRelationship` -- maps response to domain type

Update `transformObject()` to use the new transformers:
```typescript
function transformObject(response: ObjectResponse): ObjectDefinition {
  return {
    id: response.id,
    namespaceId: response.namespaceId,
    name: response.name,
    description: response.description ?? undefined,
    members: response.members.map(transformMember),
    derivedRelationships: (response.derivedRelationships ?? []).map(transformDerivedRelationship),
    validators: (response.validators ?? []).map(transformModelValidator),
    usedInApis: response.usedInApis
  };
}
```

- [ ] **Step 7: Replace request types**

Remove `CreateObjectRequest` and `UpdateObjectRequest`. Add:
```typescript
export interface CreateObjectRequest {
  namespaceId: string;
  name: string;
  description?: string;
  members: Omit<ObjectMember, 'id'>[];
  validators?: { templateId: string; parameters?: Record<string, string>; fieldMappings: Record<string, string> }[];
}

export interface UpdateObjectRequest {
  name?: string;
  description?: string;
  members?: ObjectMember[];
  validators?: { templateId: string; parameters?: Record<string, string>; fieldMappings: Record<string, string> }[];
}
```

- [ ] **Step 8: Delete relationship API functions**

Delete `createRelationshipApi()`, `deleteRelationshipApi()`. Remove the `GraphMutationResponse` interface. Remove stale imports (`ObjectFieldReference`, `ObjectRelationship`, `Cardinality`, `GraphMutationResult`).

### Domain Logic Deletion

- [ ] **Step 9: Delete `src/lib/domain/relationships.ts`**

`getFkHint()` is no longer needed. FK hints are replaced by the derived relationships section in Phase 2.

- [ ] **Step 10: Commit**

```
feat(types/api): replace field/relationship model with unified members

- Remove ObjectFieldReference, ObjectRelationship, Cardinality, GraphMutationResult
- Remove fk from FieldRole, FIELD_ROLES, ROLE_LABELS, ROLE_TOOLTIPS, ROLE_TYPE_CONSTRAINTS
- Add FieldMember, RelationshipMember, ObjectMember, DerivedRelationship, RelationshipKind
- Replace ObjectDefinition: members + derivedRelationships replace fields + relationships
- Rewrite API transformers for member model
- Delete createRelationshipApi, deleteRelationshipApi, transformGraphMutation
- Delete relationships.ts domain logic (getFkHint)
```

---

## Phase 2: Stores + Form UI

**Scope:** Rewrite the objects model save/create flow to use a single API call with the `members` array. Delete the reconciler. Rewrite `ObjectFormContent` with a unified members section (scalar rows + relationship rows inline), derived relationships section, and updated DnD model. Update store validation and payload builders.

**Files:**
- Modify: `src/lib/stores/objectsModel.svelte.ts`
- Delete: `src/lib/stores/reconciler.ts`
- Modify: `src/lib/components/form/ObjectFormContent.svelte`

### Store Rewrite (`src/lib/stores/objectsModel.svelte.ts`)

- [ ] **Step 1: Remove relationship diffing from `handleSave()`**

Remove the entire relationship diffing block (lines 331-360):
- Remove `originalRels` / `editedRels` computation
- Remove `addedRels` / `removedRels` diffing
- Remove the `for (const rel of removedRels)` loop calling `deleteRelationshipApi`
- Remove the `for (const rel of addedRels)` loop calling `createRelationshipApi`
- Remove all `applyGraphMutation(result)` calls

The save flow becomes: call `updateObjectApi()` with the payload, done.

- [ ] **Step 2: Remove relationship persistence from `handleCreate()`**

Remove the relationship persistence loop (lines 399-414):
- Remove `userRelationships` computation
- Remove the `for (const rel of userRelationships)` loop calling `createRelationshipApi`
- Remove all `applyGraphMutation(result)` calls

The create flow becomes: call `createObjectApi()` with the payload, done.

- [ ] **Step 3: Remove stale imports**

Remove imports of `createRelationshipApi`, `deleteRelationshipApi` from `'../api/objects'`. Remove import of `applyGraphMutation` from `'./reconciler'`.

- [ ] **Step 4: Update `createDraft()`**

Replace `fields: []` and `relationships: []` with `members: []` and `derivedRelationships: []`:
```typescript
function createDraft(): ObjectDefinition {
  return {
    id: '',
    namespaceId: getActiveNamespaceId(),
    name: '',
    description: '',
    members: [],
    derivedRelationships: [],
    validators: [],
    usedInApis: []
  };
}
```

- [ ] **Step 5: Switch `toCreatePayload()` to send `members`**

Update to use the new `CreateObjectRequest` shape. The payload sends the `members` array with `id` stripped (handled by the form's `toApiMembers()` function at call time):
```typescript
function toCreatePayload(item: ObjectDefinition): { ok: true; data: CreateObjectRequest } | { ok: false; error: string } {
  return {
    ok: true,
    data: {
      namespaceId: item.namespaceId,
      name: item.name,
      description: item.description,
      members: item.members.map(({ id, ...rest }) => rest),
      validators: item.validators.length > 0
        ? item.validators.map(v => ({
            templateId: v.templateId,
            parameters: v.parameters ?? undefined,
            fieldMappings: v.fieldMappings
          }))
        : undefined
    }
  };
}
```

Note: The `id` stripping here is a simple approach. For update payloads where backend-assigned IDs must be preserved, the form's `toApiMembers()` handles the distinction (see Step 12).

- [ ] **Step 6: Switch `toUpdatePayload()` to send `members`**

Update to use the new `UpdateObjectRequest` shape. The payload sends the `members` array with backend-assigned IDs preserved for reconcile-by-ID:
```typescript
function toUpdatePayload(item: ObjectDefinition): { ok: true; data: UpdateObjectRequest } | { ok: false; error: string } {
  const { memberCount, usedInApisCount, namespaceName, ...clean } = item as ObjectWithCounts;
  return {
    ok: true,
    data: {
      name: clean.name,
      description: clean.description,
      members: clean.members,
      validators: clean.validators.map(v => ({
        templateId: v.templateId,
        parameters: v.parameters ?? undefined,
        fieldMappings: v.fieldMappings
      }))
    }
  };
}
```

- [ ] **Step 7: Switch store validation to use `members`**

Update `validate()` to iterate `item.members` (filtering for scalars) instead of `item.fields`:
```typescript
for (const member of item.members) {
  if (member.memberType !== 'field') continue;
  const field = getFieldById(member.fieldId);
  if (!field) continue;

  const fieldName = field.name;
  const fieldType = field.type;

  if (member.role === 'pk') {
    if (fieldType !== 'int' && fieldType !== 'uuid' && fieldType !== 'uuid.UUID') {
      errors[`field_${member.fieldId}_role`] =
        `Field "${fieldName}" (${fieldType}) cannot be a primary key -- only int and uuid types are supported`;
    }
  } else if (member.role === 'created_timestamp' || member.role === 'updated_timestamp') {
    if (!['datetime', 'date', 'datetime.datetime', 'datetime.date'].includes(fieldType)) {
      errors[`field_${member.fieldId}_role`] =
        `Field "${fieldName}" (${fieldType}) cannot be a ${member.role === 'created_timestamp' ? 'created' : 'updated'} timestamp -- only datetime and date types are supported`;
    }
  } else if (member.role === 'generated_uuid') {
    if (fieldType !== 'uuid' && fieldType !== 'uuid.UUID') {
      errors[`field_${member.fieldId}_role`] =
        `Field "${fieldName}" (${fieldType}) cannot be a generated UUID -- only uuid types are supported`;
    }
  }
}
```

- [ ] **Step 8: Update `deriveExtra()` and `ObjectWithCounts`**

Change `fieldCount: obj.fields.length` to `memberCount: obj.members.length`. Update `numericColumns`, `sortColumnMap` to use `'memberCount'` instead of `'fieldCount'`. Update the `ObjectWithCounts` type:
```typescript
type ObjectWithCounts = ObjectDefinition & {
  memberCount: number;
  usedInApisCount: number;
  namespaceName: string;
};
```

### Reconciler Deletion

- [ ] **Step 9: Delete `src/lib/stores/reconciler.ts`**

The `applyGraphMutation` function and its entire module are dead code after Steps 1-3.

### Form Rewrite (`src/lib/components/form/ObjectFormContent.svelte`)

- [ ] **Step 10: Replace DnD item type**

Replace:
```typescript
type DndItem = ObjectFieldReference & { id: string };
```
With:
```typescript
type DndItem = ObjectMember & { id: string };
```

The `id` is the stable DnD identifier required by `svelte-dnd-action`. For persisted members, `id` is the backend-assigned ID. For new (unsaved) members, `id = crypto.randomUUID()`.

- [ ] **Step 11: Replace DnD state initialization**

Capture original members snapshot and initialize DnD items from `members`:
```typescript
const originalMembers: ObjectMember[] = [...editedItem.members];

let dndItems = $state<DndItem[]>(
  editedItem.members.map(m => ({
    ...m,
    id: m.id ?? crypto.randomUUID()
  }))
);
```

Update the `$effect` re-sync block similarly, and re-capture `originalMembers` when `editedItem` changes.

- [ ] **Step 12: Replace `toDomainFields()` with `toApiMembers()`**

Called at save time only. Strips temporary `id` from new members:
```typescript
function toApiMembers(items: DndItem[]): (ObjectMember | Omit<ObjectMember, 'id'>)[] {
  return items.map(({ id, ...member }) => {
    const isBackendAssigned = originalMembers.some(m => m.id === id);
    return isBackendAssigned ? { ...member, id } : member;
  });
}
```

- [ ] **Step 13: Replace member management functions**

Remove `addField`/`removeField`/`addRelationship`/`removeRelationship` and replace with:

- `addFieldMember(fieldId: string)`: lookup field by ID, create a scalar member with `name` populated from the field's name (D4), `role: 'writable'`, `isNullable: false`, assign `id = crypto.randomUUID()`.
- `addRelationshipMember(targetObjectId: string)`: lookup target object, create a relationship member with `name` as lowercase plural of target name, `kind: 'one_to_many'`, `inverseName` as lowercase singular of source object name, `required: true`, assign `id = crypto.randomUUID()`.
- `removeMember(id: string)`: remove by `id` from DnD items.
- `updateMember(id: string, updates: Partial<ObjectMember>)`: update by `id`. When `kind` changes to `many_to_many`, force `required = false` (D2).
- `reorderMembers(fromIndex, toIndex)`: DnD reorder callback.

- [ ] **Step 14: Remove self-target exclusion (D6)**

Remove `o.id !== editedItem.id` from the `availableTargetObjects` filter. Self-referential relationships are valid.

- [ ] **Step 15: Remove duplicate-target exclusion (D7)**

Remove the `relatedObjectIds` derived set and the `!relatedObjectIds.has(o.id)` filter. Multiple relationships to the same target are valid. The target selector should show all objects (including self).

- [ ] **Step 16: Remove FK-related derived state**

Remove:
- `fkFieldIds` derived set
- `selectedFieldIds` derived set (if FK-related)

Replace `selectedFieldIds` to track scalar member `fieldId`s:
```typescript
let selectedFieldIds = $derived(
  editedItem.members
    .filter(m => m.memberType === 'field')
    .map(m => m.fieldId)
);
```

- [ ] **Step 17: Remove `getFkHint` import**

Delete `import { getFkHint } from '$lib/domain/relationships'`.

- [ ] **Step 18: Rewrite fields section as unified members section**

Replace the "Fields" section with a unified "Members" section. The section iterates all DnD items and renders based on `memberType`:

**Scalar row** (`memberType === 'field'`):
- Field name (from the field lookup by `member.fieldId`) -- displayed as read-only text
- Member name input (editable, defaults to field name per D4)
- Role dropdown (using `getAvailableRoles` -- no FK option since it no longer exists)
- Nullable toggle (when `roleHasModifiers(member.role)`)
- Default value input (when `roleHasModifiers(member.role)`)
- Drag handle
- Remove button

Delete all FK-specific rendering: FK badge/icon, FK field non-editable/non-draggable logic, FK field delete button hiding, any `isFk` checks.

**Relationship row** (`memberType === 'relationship'`):
- Target object badge (from object lookup by `member.targetObjectId`)
- Relationship name input (editable)
- Kind dropdown: `one_to_one` ("has one"), `one_to_many` ("has many"), `many_to_many` ("many to many")
- Inverse name input (editable)
- Required toggle (hidden when `kind === 'many_to_many'` per D2)
- Drag handle
- Remove button

- [ ] **Step 19: Update cardinality options**

Replace old `CARDINALITY_OPTIONS` with:
```typescript
const KIND_OPTIONS: { value: RelationshipKind; label: string }[] = [
  { value: 'one_to_one', label: 'has one' },
  { value: 'one_to_many', label: 'has many' },
  { value: 'many_to_many', label: 'many to many' }
];
```

- [ ] **Step 20: Update relationship name auto-generation**

When kind changes, auto-update name:
- `one_to_many` or `many_to_many`: target name lowercase + 's' (plural)
- `one_to_one`: target name lowercase (singular)

- [ ] **Step 21: Remove inferred relationship display**

Delete all rendering of inferred relationships: dashed-border inferred relationship rows (`rel.isInferred`), "auto . on {target}" badge, non-editable inferred relationship UI. Inverses are now derived and shown in the derived relationships section.

- [ ] **Step 22: Remove FK hint display**

Delete all `fkHint` usage in the relationship rows: `{@const fkHint = getFkHint(...)}`, the conditional FK hint badge (`via {fkName}` / `missing {fkName}`).

- [ ] **Step 23: Add derived relationships section**

Read-only section below the members list:
```svelte
{#if editedItem.derivedRelationships.length > 0}
  <div>
    <h3 class="text-sm text-mono-300 mb-2 font-medium">
      Incoming Relationships ({editedItem.derivedRelationships.length})
    </h3>
    <div class="space-y-1">
      {#each editedItem.derivedRelationships as dr}
        <div class="flex items-center space-x-2 px-2 py-1.5 bg-mono-800 rounded border border-dashed border-mono-600">
          <button
            type="button"
            onclick={() => navigateToObject(dr.sourceObjectId)}
            class="text-xs text-blue-400 hover:underline"
          >
            {dr.sourceObject}.{dr.sourceField}
          </button>
          <span class="text-xs text-mono-400 bg-mono-700 px-2 py-0.5 rounded">
            {dr.kind.replace(/_/g, ' ')}
          </span>
          {#if dr.impliesFk}
            <span class="text-xs text-mono-500">implies {dr.impliesFk}</span>
          {:else if dr.junctionTable}
            <span class="text-xs text-mono-500">via {dr.junctionTable}</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}
```

Navigation uses `dr.sourceObjectId` (D3).

- [ ] **Step 24: Implement `navigateToObject` helper**

Use SvelteKit's `goto()` or dispatch a custom event to navigate to `/objects?highlight={sourceObjectId}`.

- [ ] **Step 25: Update type imports**

Replace `Cardinality, ObjectRelationship, ObjectFieldReference` imports with `RelationshipKind, FieldMember, RelationshipMember, ObjectMember, DerivedRelationship`.

- [ ] **Step 26: Commit**

```
feat(stores/form): rewrite object model and form for unified members

- Simplify save/create to single API call with members array
- Delete reconciler module
- Rewrite ObjectFormContent with unified DnD members section
- Scalar rows with field lookup, name, role, nullable, default value
- Relationship rows inline with kind, inverseName, required toggle
- Add derived relationships read-only section
- Remove self-target and duplicate-target exclusions
- Remove FK field display, inferred relationship display, getFkHint
- Update store validation, payload builders, createDraft, deriveExtra
```

---

## Phase 3: Route Pages + Utilities

**Scope:** Update all remaining consumers outside the stores and form: route pages, utility functions, preview components. Delete the relationships domain logic file.

**Files:**
- Modify: `src/routes/(dashboard)/objects/+page.svelte`
- Modify: `src/routes/(dashboard)/apis/[id]/+page.svelte`
- Modify: `src/lib/utils/examples.ts`
- Modify: `src/lib/domain/paramInference.ts`
- Modify: `src/lib/components/api-generator/ObjectSelectorDropdown.svelte`
- Modify: `src/lib/components/api-generator/ResponsePreview.svelte`

- [ ] **Step 1: Update objects list page**

In `src/routes/(dashboard)/objects/+page.svelte`:
- Replace `object.fields.length` (line 231) with `object.members.length`
- Update the label text from "fields" to "members"
- Update the `ObjectWithCounts` local type annotation if present: `fieldCount` to `memberCount`
- In the inline object creation (line 144), replace `fields: [...]` with `members: [{ memberType: 'field' as const, name: field.name, fieldId: field.id, role: 'writable' as const, isNullable: false }]` and add `derivedRelationships: []`
- Remove `relationships: []` if present in the inline creation

- [ ] **Step 2: Update APIs page**

In `src/routes/(dashboard)/apis/[id]/+page.svelte`:
- Replace `obj.fields` iteration (line 58) with `obj.members.filter(m => m.memberType === 'field')`
- Replace `editedNewObject.fields` (line 148) with `members`
- Replace `fields: []` and `relationships: []` (lines 124-125) with `members: []` and `derivedRelationships: []`
- Replace field-addition logic (line 265) to add field members instead of field refs

- [ ] **Step 3: Update `paramInference.ts`**

`resolveTargetFields()` currently iterates `obj.fields`. Update to filter `obj.members` for field members:
```typescript
for (const member of obj.members) {
  if (member.memberType !== 'field') continue;
  const field = fields.find(f => f.id === member.fieldId);
  if (!field) continue;
  result.push({
    name: member.name,
    type: field.type,
    isPk: member.role === 'pk'
  });
}
```

Note: uses `member.name` (not `field.name`) because the member's name is the authoritative column name in the unified model.

- [ ] **Step 4: Update `ObjectSelectorDropdown.svelte`**

Replace `selectedObject.fields.length` with `selectedObject.members.length` (per D5). Update display text from "fields" to "members".

- [ ] **Step 5: Update `ResponsePreview.svelte`**

Replace `selectedObject.fields.length` with `selectedObject.members.length`. Replace `selectedObject.fields` iteration with `selectedObject.members.filter(m => m.memberType === 'field')` since only field members have field references for the preview.

- [ ] **Step 6: Update examples utility**

In `src/lib/utils/examples.ts`:

**6a: Update `getTargetPkType()`:**
Replace `targetObj.fields.find(f => f.role === 'pk')` with a member lookup:
```typescript
function getTargetPkType(targetObjectId: string): string {
  const targetObj = getObjectById(targetObjectId);
  if (!targetObj) return 'uuid';

  const pkMember = targetObj.members.find(
    m => m.memberType === 'field' && m.role === 'pk'
  ) as FieldMember | undefined;
  if (!pkMember) return 'uuid';

  const pkField = getFieldById(pkMember.fieldId);
  return pkField?.type ?? 'uuid';
}
```

**6b: Update `buildObjectFromObjectId`:**
Replace `objectDef.fields.forEach(fieldRef => ...)` with scalar member iteration:
```typescript
objectDef.members
  .filter(m => m.memberType === 'field')
  .forEach(member => {
    const field = getFieldById((member as FieldMember).fieldId);
    if (field) obj[member.name] = getExampleValueForType(field.type);
  });
```

**6c: Update `buildRequestBodyFromObjectId`:**
Replace `objectDef.fields.filter(...)` with field members filtered by writable roles:
```typescript
objectDef.members
  .filter(m => m.memberType === 'field')
  .filter(m => (m as FieldMember).role === 'writable' || (m as FieldMember).role === 'write_only')
  .forEach(member => {
    const field = getFieldById((member as FieldMember).fieldId);
    if (field) obj[member.name] = getExampleValueForType(field.type);
  });
```

Then, replace the legacy FK injection block (`objectDef.relationships.filter(rel => rel.cardinality === 'references')`) with derived-relationship-based FK field computation:
```typescript
for (const dr of objectDef.derivedRelationships) {
  if (dr.impliesFk && !(dr.impliesFk in obj)) {
    obj[dr.impliesFk] = getExampleValueForType(getTargetPkType(dr.sourceObjectId));
  }
}
```

**6d: Update `buildResponseBodyFromObjectId`:**
Same two changes: use field members for field iteration, and replace legacy FK injection with derived-relationship-based computation:
```typescript
objectDef.members
  .filter(m => m.memberType === 'field')
  .filter(m => (m as FieldMember).role !== 'write_only')
  .forEach(member => {
    const field = getFieldById((member as FieldMember).fieldId);
    if (field) obj[member.name] = getExampleValueForType(field.type);
  });

for (const dr of objectDef.derivedRelationships) {
  if (dr.impliesFk && !(dr.impliesFk in obj)) {
    obj[dr.impliesFk] = getExampleValueForType(getTargetPkType(dr.sourceObjectId));
  }
}
```

- [ ] **Step 7: Remove stale imports across codebase**

Grep for imports of deleted modules and types. Remove all found references:
- `reconciler` (from `$lib/stores/reconciler`)
- `relationships` (from `$lib/domain/relationships`)
- `ObjectRelationship`
- `ObjectFieldReference`
- `GraphMutationResult`
- `Cardinality`
- `getFkHint`
- `applyGraphMutation`
- `createRelationshipApi`
- `deleteRelationshipApi`

- [ ] **Step 8: Run full frontend type check**

```bash
cd /Users/evgesha/Projects/dev-tools/mediancode/repos/mediancode-frontend && bun run svelte-check --tsconfig ./tsconfig.json
```

Fix any remaining type errors.

- [ ] **Step 9: Commit**

```
feat(routes/utils): update all consumers for unified members model

- Objects page shows members.length, creates objects with members array
- APIs page creates objects with members, iterates field members
- paramInference uses member.name and filters field members
- ObjectSelectorDropdown and ResponsePreview use members
- Examples utility uses field members, replaces FK injection with derivedRelationships
- Remove all stale imports of deleted types and modules
```

---

## Phase 4: Tests

**Scope:** Update all test files to use the new member-based types and shapes. Delete test files for removed modules. Update fixtures, page objects, and E2E specs. Run full suite verification.

**Files:**
- Delete: `tests/unit/lib/stores/reconciler.test.ts`
- Delete: `tests/unit/lib/domain/relationships.test.ts`
- Modify: `tests/unit/lib/types/fieldRoles.test.ts`
- Modify: `tests/unit/lib/utils/examples.test.ts`
- Modify: `tests/unit/lib/api/objects.test.ts`
- Modify: `tests/unit/lib/stores/objectsModel.test.ts`
- Modify: `tests/unit/lib/stores/objects.test.ts`
- Modify: `tests/unit/lib/domain/paramInference.test.ts`
- Modify: `tests/unit/lib/components/form/ObjectFormContent.test.ts`
- Modify: `tests/unit/lib/components/api-generator/ObjectSelectorDropdown.test.ts`
- Modify: `tests/fixtures/seedData.ts`
- Modify: `tests/page-objects/ObjectsPage.ts`
- Modify: `tests/e2e/crud/objects.spec.ts`

### Deletions

- [ ] **Step 1: Delete `tests/unit/lib/stores/reconciler.test.ts`**

Module under test is deleted.

- [ ] **Step 2: Delete `tests/unit/lib/domain/relationships.test.ts`**

Module under test is deleted.

### Unit Test Updates

- [ ] **Step 3: Update `fieldRoles.test.ts`**

- Remove test "should never return fk for any field type" -- fk no longer exists as a role
- Remove test "should return false for fk role" in `roleHasModifiers`
- Remove test "should include fk in the roles array" in `FIELD_ROLES constant`
- Remove test "should have a label for fk" in `ROLE_LABELS`
- Remove test "should have a tooltip for fk" in `ROLE_TOOLTIPS`
- Remove test "should constrain fk to int and uuid types" in `ROLE_TYPE_CONSTRAINTS`
- Add test: `FIELD_ROLES` should NOT contain `'fk'`

- [ ] **Step 4: Update `examples.test.ts`**

- Replace fixture objects to use `members` array instead of `fields`/`relationships`
- Remove the FK test object (`fkTestObject`) with `role: 'fk'`
- Update tests for `buildRequestBodyFromObjectId` and `buildResponseBodyFromObjectId` to verify field members are used
- Add test: relationship members do not produce direct fields in request/response previews
- Add test: `derivedRelationships` with `impliesFk` produce FK columns in request/response previews

- [ ] **Step 5: Update `objects.test.ts` (API tests)**

- Replace `transformRelationship` tests with `transformMember` tests for both scalar and relationship variants
- Remove `transformGraphMutation` tests
- Replace mock response objects to use `members` and `derivedRelationships` shape
- Test `transformDerivedRelationship` for all three kinds

- [ ] **Step 6: Update `objectsModel.test.ts`**

- Remove mocks for `createRelationshipApi` and `deleteRelationshipApi`
- Update test fixtures to use `members` instead of `fields`/`relationships`
- Add test: create object with mixed field + relationship members sends single API call with members array
- Add test: update object sends members with IDs for reconcile-by-ID
- Add test: derived relationships are present on loaded objects

- [ ] **Step 7: Update `tests/unit/lib/stores/objects.test.ts`**

- Update the `makeObject` helper to use `members: []` and `derivedRelationships: []` instead of `fields: []` and `relationships: []`
- Update any fixture objects that reference the old `fields`/`relationships` shape
- Verify `getObjectById`, `searchObjects`, and other store functions still pass with the new shape

- [ ] **Step 8: Update `tests/unit/lib/domain/paramInference.test.ts`**

- Update the `resolveTargetFields` test fixtures to use `members` instead of `fields`/`relationships`:
  ```typescript
  const objects: ObjectDefinition[] = [
    {
      id: 'obj-1', namespaceId: 'ns', name: 'Product',
      members: [
        { memberType: 'field', name: 'id', fieldId: 'f-1', role: 'pk', isNullable: false },
        { memberType: 'field', name: 'price', fieldId: 'f-2', role: 'writable', isNullable: false },
        { memberType: 'field', name: 'name', fieldId: 'f-3', role: 'writable', isNullable: true }
      ],
      derivedRelationships: [], validators: [], usedInApis: []
    }
  ];
  ```
- Update assertions to verify `member.name` is used (not `field.name`), since the member name is now authoritative
- Update the "skips fields that cannot be resolved" test similarly

- [ ] **Step 9: Update `tests/unit/lib/components/form/ObjectFormContent.test.ts`**

- Update the `ObjectFormContentProps` fixture to use `members: []` and `derivedRelationships: []` instead of `fields: []`
- Remove any references to `relationships` property in the fixture
- Verify type-level tests still pass with the new shape

- [ ] **Step 10: Update `tests/unit/lib/components/api-generator/ObjectSelectorDropdown.test.ts`**

- Update any object fixtures referenced in test props to use `members` shape instead of `fields`/`relationships`
- Verify type-level tests still pass

### Fixture Updates

- [ ] **Step 11: Update `tests/fixtures/seedData.ts`**

- Update `initialObjects` fixtures: replace `fields: [...]` and `relationships: []` with `members: [...]` and `derivedRelationships: []`
- Each field ref becomes a `FieldMember`: `{ memberType: 'field', name: '<field_name>', fieldId: '...', role: '...', isNullable: false }`
- Update `cloneObjects` to clone `members` and `derivedRelationships` instead of `fields` and `relationships`
- Update the `ObjectDefinition` import if needed

### E2E Updates

- [ ] **Step 12: Update `tests/page-objects/ObjectsPage.ts`**

- Rename `fieldsColumnHeader` to `membersColumnHeader`
- Rename `addField` to `addFieldMember` (or keep as `addField` with updated implementation)
- Rename `getFieldCount` to `getMemberCount`
- Rename `getFieldNames` to `getMemberNames`
- Update locators to match new UI text ("Members" instead of "Fields" in column headers)
- Add helpers for relationship member interactions (add relationship, set kind, set inverse name)

- [ ] **Step 13: Update `tests/e2e/crud/objects.spec.ts`**

- Update the CRUD lifecycle test to use member-based page object methods
- Replace `addField` calls with scalar member additions
- Replace field count assertions with member count assertions
- Add: create an object with a relationship member, verify it saves and appears on reload
- Update reorder test to work with unified member list

### Verification

- [ ] **Step 14: Run full unit test suite**

```bash
cd /Users/evgesha/Projects/dev-tools/mediancode/repos/mediancode-frontend && bunx vitest run
```

Fix any failures.

- [ ] **Step 15: Run Playwright E2E tests**

```bash
cd /Users/evgesha/Projects/dev-tools/mediancode/repos/mediancode-frontend && bunx playwright test --project=setup --project=crud
```

Fix any failures.

- [ ] **Step 16: Run full frontend type check**

```bash
cd /Users/evgesha/Projects/dev-tools/mediancode/repos/mediancode-frontend && bun run svelte-check --tsconfig ./tsconfig.json
```

Fix any remaining type errors.

- [ ] **Step 17: Commit**

```
test(frontend): update all tests for unified member model

- Delete reconciler and relationships test files
- Update fieldRoles tests (remove fk)
- Update examples tests for field members and derivedRelationship FK injection
- Update API and store tests for members shape
- Update objects store tests (makeObject helper)
- Update paramInference tests (resolveTargetFields fixtures, member.name)
- Update ObjectFormContent and ObjectSelectorDropdown component tests
- Update seedData fixtures with members/derivedRelationships
- Update E2E page objects and CRUD specs for member-based UI
```

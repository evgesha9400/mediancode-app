# Container Types & Required→Optional Rename — Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `List` container support to fields and rename the `required` boolean to `optional` (inverted semantics) on object-field references. Frontend only — types, API layer, stores, UI.

**Architecture:** Two changes to the frontend to match the updated backend API contract. Part A adds a `container` field (`"List"` | `null`) to the Field entity and a toggle in the field drawer. Part B renames `required` → `optional` on `ObjectFieldReference` with inverted boolean semantics across types, API layer, stores, and the objects page UI.

**Tech Stack:** TypeScript, SvelteKit, Svelte 5, Tailwind CSS, Vitest, Playwright

**Prerequisite:** Backend must be deployed with the matching API changes first. The backend plan is at `/Users/evgesha/Documents/Projects/median-code-backend/docs/plans/2026-02-25-container-types-and-optional-rename-impl.md`.

**Design doc:** See `docs/plans/2026-02-25-container-types-and-optional-rename-design.md` for full design rationale and decision record.

---

## Part A: Container Types (List)

### Task 1: Add `container` to Field type and seed data

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

### Task 2: Add `container` to field API layer

**Files:**
- Modify: `src/lib/api/fields.ts` (~line 45 FieldResponse, ~line 83 transformField, ~line 130 CreateFieldRequest, ~line 143 UpdateFieldRequest)
- Modify: `tests/unit/lib/api/fields.test.ts`

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

### Task 3: Add `container` to fieldsModel (draft, payload, search)

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

### Task 4: Add container toggle to field drawer UI

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

Insert a new Container section before the existing Type `<div>` (~lines 350-364):

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
```

Keep the existing Type `<div>` with `TypeSelectorDropdown` unchanged below it.

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

## Part B: Required → Optional Rename

### Task 5: Rename `required` → `optional` in frontend types

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

### Task 6: Rename `required` → `optional` in objects API layer

**Files:**
- Modify: `src/lib/api/objects.ts` (~line 13 ObjectFieldReferenceResponse, ~line 44 transformFieldReference)
- Modify: `tests/unit/lib/api/objects.test.ts`

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

### Task 7: Update objects page UI and handlers

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

Use Grep to search for `.required` in objects-related files and fix any remaining references.

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

### Task 8: Update objectsModel and remaining stores

**Files:**
- Modify: `src/lib/stores/objectsModel.svelte.ts` (if any direct references to `required`)
- Modify: `src/lib/stores/objects.ts` (if any direct references to `required`)
- Modify: `tests/unit/lib/stores/objectsModel.test.ts`
- Modify: `tests/unit/lib/stores/objects.test.ts`

**Step 1: Grep for remaining `required` references in stores**

Search for any remaining `.required` references that relate to `ObjectFieldReference`.

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

### Task 9: Full test suite

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

Expected: All pass. Note — these will fail until the backend is deployed with the matching changes.

**Step 5: Commit any remaining fixes**

```bash
git add -A && git commit -m "fix: address test failures from container and optional rename"
```

---

## Expected API Contract

### Field Response (GET/POST/PUT /fields)

```json
{
  "id": "uuid",
  "namespaceId": "uuid",
  "name": "tags",
  "typeId": "uuid-of-str",
  "container": "List",
  "description": "User tags",
  "defaultValue": null,
  "usedInApis": [],
  "constraints": [],
  "validators": []
}
```

`container`: `"List"` or `null` (new field).

### Object Response (GET/POST/PUT /objects)

```json
{
  "id": "uuid",
  "namespaceId": "uuid",
  "name": "User",
  "description": "User account",
  "fields": [
    { "fieldId": "uuid", "optional": false },
    { "fieldId": "uuid", "optional": true }
  ],
  "usedInApis": [],
  "validators": []
}
```

`optional`: replaces `required` with inverted semantics. `false` = required (default), `true` = optional.

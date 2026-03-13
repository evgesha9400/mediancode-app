# Schema Derivation & Relationships — Frontend Implementation Plan

> **For Claude:** Your FIRST action must be to invoke the Skill tool with `superpowers:executing-plans`. Do NOT proceed without it.

**Goal:** Add field-level "appears in" control, object relationships with bidirectional auto-inverse, and merge endpoint request/response object selectors into a single object selector — all driven by the new backend API contract.

**Architecture:** The `ObjectFieldReference` type gains an `appears` property (`"both" | "request" | "response"`) replacing the implicit "all fields everywhere" behavior. The `ObjectDefinition` type gains a `relationships` array. The `ApiEndpoint` type replaces `requestBodyObjectId`/`responseBodyObjectId` with a single `objectId`. Preview generation in `examples.ts` is updated to filter fields by `appears` flag. The object form gets a segmented control (`Both | Request | Response`) per field row and a relationships section. The endpoint drawer merges its two object selectors into one.

**Tech Stack:** SvelteKit 2.47+, Svelte 5.41+ (runes), TypeScript, Tailwind CSS, Vitest, Playwright

**Prerequisite:** Backend must be deployed with the matching API changes first. The backend plan is at `/Users/evgesha/Documents/Projects/median-code-backend/docs/plans/2026-03-13-schema-derivation-impl.md`.

---

## Part 1: Types, API Client, and Stores

### Task 1: Update TypeScript types

**Files:**
- Modify: `src/lib/types/index.ts` (~lines 154-168)

- [ ] **Step 1: Add `appears` to `ObjectFieldReference`**

In `src/lib/types/index.ts`, update the `ObjectFieldReference` interface (~line 154):

```typescript
// Before
export interface ObjectFieldReference {
  fieldId: string;
  optional: boolean;
  isPk: boolean;
}

// After
export type FieldAppearance = 'both' | 'request' | 'response';

export interface ObjectFieldReference {
  fieldId: string;
  optional: boolean;
  isPk: boolean;
  appears: FieldAppearance;
}
```

- [ ] **Step 2: Add relationship types**

Add after `ObjectFieldReference`:

```typescript
export type Cardinality = 'has_one' | 'has_many' | 'references' | 'many_to_many';

export interface ObjectRelationship {
  id: string;
  sourceObjectId: string;
  targetObjectId: string;
  name: string;
  cardinality: Cardinality;
  isInferred: boolean;
  inverseId?: string;
}
```

- [ ] **Step 3: Add `relationships` to `ObjectDefinition`**

Update the `ObjectDefinition` interface (~line 160):

```typescript
// Before
export interface ObjectDefinition {
  id: string;
  namespaceId: string;
  name: string;
  description?: string;
  fields: ObjectFieldReference[];
  validators: InlineModelValidator[];
  usedInApis: string[];
}

// After
export interface ObjectDefinition {
  id: string;
  namespaceId: string;
  name: string;
  description?: string;
  fields: ObjectFieldReference[];
  relationships: ObjectRelationship[];
  validators: InlineModelValidator[];
  usedInApis: string[];
}
```

- [ ] **Step 4: Update `ApiEndpoint` type**

Replace `requestBodyObjectId` and `responseBodyObjectId` with `objectId` (~line 136):

```typescript
// Before
export interface ApiEndpoint {
  id: string;
  apiId: string;
  method: HttpMethod;
  path: string;
  description: string;
  tagName?: string;
  pathParams: PathParam[];
  queryParamsObjectId?: string;
  requestBodyObjectId?: string;
  responseBodyObjectId?: string;
  useEnvelope: boolean;
  responseShape: ResponseShape;
  expanded?: boolean;
}

// After
export interface ApiEndpoint {
  id: string;
  apiId: string;
  method: HttpMethod;
  path: string;
  description: string;
  tagName?: string;
  pathParams: PathParam[];
  queryParamsObjectId?: string;
  objectId?: string;
  useEnvelope: boolean;
  responseShape: ResponseShape;
  expanded?: boolean;
}
```

- [ ] **Step 5: Run type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

This WILL produce errors — the rest of the plan fixes them. Note the errors for reference but proceed.

- [ ] **Step 6: Commit**

```bash
# Use /commit skill
```

Use the `/commit` skill. Suggested message: `feat(types): add field appears flag, relationships, merge endpoint objectId`

---

### Task 2: Update API client layer — Objects and Relationships

**Files:**
- Modify: `src/lib/api/objects.ts`

- [ ] **Step 1: Update response/request types**

In `src/lib/api/objects.ts`, update `ObjectFieldReferenceResponse` (~line 13):

```typescript
interface ObjectFieldReferenceResponse {
  fieldId: string;
  optional: boolean;
  isPk: boolean;
  appears: string;
}
```

Add relationship response type:

```typescript
interface ObjectRelationshipResponse {
  id: string;
  sourceObjectId: string;
  targetObjectId: string;
  name: string;
  cardinality: string;
  isInferred: boolean;
  inverseId: string | null;
}
```

Update `ObjectResponse` (~line 32) to add relationships:

```typescript
interface ObjectResponse {
  id: string;
  namespaceId: string;
  name: string;
  description: string | null;
  fields: ObjectFieldReferenceResponse[];
  relationships: ObjectRelationshipResponse[];
  validators: ModelValidatorResponse[];
  usedInApis: string[];
}
```

- [ ] **Step 2: Update transform functions**

Update `transformFieldReference` (~line 45):

```typescript
function transformFieldReference(response: ObjectFieldReferenceResponse): ObjectFieldReference {
  return {
    fieldId: response.fieldId,
    optional: response.optional,
    isPk: response.isPk ?? false,
    appears: (response.appears as FieldAppearance) ?? 'both'
  };
}
```

Add `transformRelationship`:

```typescript
function transformRelationship(response: ObjectRelationshipResponse): ObjectRelationship {
  return {
    id: response.id,
    sourceObjectId: response.sourceObjectId,
    targetObjectId: response.targetObjectId,
    name: response.name,
    cardinality: response.cardinality as Cardinality,
    isInferred: response.isInferred,
    inverseId: response.inverseId ?? undefined
  };
}
```

Update `transformObject` (~line 68) to include relationships:

```typescript
function transformObject(response: ObjectResponse): ObjectDefinition {
  return {
    id: response.id,
    namespaceId: response.namespaceId,
    name: response.name,
    description: response.description ?? undefined,
    fields: response.fields.map(transformFieldReference),
    relationships: (response.relationships ?? []).map(transformRelationship),
    validators: (response.validators ?? []).map(transformModelValidator),
    usedInApis: response.usedInApis
  };
}
```

- [ ] **Step 3: Add relationship API client methods**

Add relationship CRUD methods to `src/lib/api/objects.ts` (keeping them co-located with the object they belong to):

```typescript
/**
 * Create a relationship on an object (auto-creates bidirectional inverse on backend)
 */
export async function createRelationshipApi(
  objectId: string,
  data: { targetObjectId: string; name: string; cardinality: string }
): Promise<ObjectDefinition> {
  const response = await apiPost<ObjectResponse>(`/objects/${objectId}/relationships`, data);
  return transformObject(response);
}

/**
 * Delete a relationship (auto-deletes bidirectional inverse on backend)
 */
export async function deleteRelationshipApi(
  objectId: string,
  relationshipId: string
): Promise<void> {
  await apiDelete<void>(`/objects/${objectId}/relationships/${relationshipId}`);
}
```

- [ ] **Step 4: Run type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 5: Commit**

Use the `/commit` skill. Suggested message: `feat(api): update objects client for appears flag and relationships`

---

### Task 3: Update API client layer — Endpoints

**Files:**
- Modify: `src/lib/api/endpoints.ts`

- [ ] **Step 1: Update endpoint response/request types**

In `src/lib/api/endpoints.ts`, update `EndpointResponse` (~line 21):

```typescript
interface EndpointResponse {
  id: string;
  apiId: string;
  method: string;
  path: string;
  description: string;
  tagName: string | null;
  pathParams: PathParamResponse[];
  queryParamsObjectId: string | null;
  objectId: string | null;
  useEnvelope: boolean;
  responseShape: string;
}
```

Remove the `requestBodyObjectId` and `responseBodyObjectId` fields.

- [ ] **Step 2: Update transform function**

Update `transformEndpoint` (~line 49):

```typescript
function transformEndpoint(response: EndpointResponse): ApiEndpoint {
  return {
    id: response.id,
    apiId: response.apiId,
    method: response.method as HttpMethod,
    path: response.path,
    description: response.description,
    tagName: response.tagName ?? undefined,
    pathParams: response.pathParams.map(transformParameter),
    queryParamsObjectId: response.queryParamsObjectId ?? undefined,
    objectId: response.objectId ?? undefined,
    useEnvelope: response.useEnvelope,
    responseShape: response.responseShape as ResponseShape,
    expanded: false
  };
}
```

- [ ] **Step 3: Update request payloads**

Update `CreateEndpointRequest` (~line 93) and `UpdateEndpointRequest` (~line 110):

```typescript
export interface CreateEndpointRequest {
  apiId: string;
  method: HttpMethod;
  path: string;
  description?: string;
  tagName?: string;
  pathParams?: { name: string; fieldId: string }[];
  queryParamsObjectId?: string;
  objectId?: string;
  useEnvelope?: boolean;
  responseShape?: ResponseShape;
}

export interface UpdateEndpointRequest {
  method?: HttpMethod;
  path?: string;
  description?: string;
  tagName?: string | null;
  pathParams?: { name: string; fieldId: string }[];
  queryParamsObjectId?: string | null;
  objectId?: string | null;
  useEnvelope?: boolean;
  responseShape?: ResponseShape;
}
```

- [ ] **Step 4: Run type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 5: Commit**

Use the `/commit` skill. Suggested message: `feat(api): update endpoints client for merged objectId`

---

### Task 4: Update stores and domain logic

**Files:**
- Modify: `src/lib/stores/apiDetailState.svelte.ts` — merge endpoint handlers, update all objectId references
- Modify: `src/lib/domain/endpointReducer.ts` — update `normalizeEndpoint` and `buildDuplicateEndpoint`
- Modify: `src/lib/domain/mutations.ts` — update endpoint action builders
- Modify: `src/routes/(dashboard)/dashboard/+page.svelte` — update API readiness check

Note: `apiModel.svelte.ts` manages API-level CRUD (not endpoints), so it does NOT need changes.

- [ ] **Step 1: Update `endpointReducer.ts`**

In `normalizeEndpoint()` (~line 40), ensure it handles `objectId` instead of the old fields.

In `buildDuplicateEndpoint()` (~line 51), copy `objectId` instead of `requestBodyObjectId`/`responseBodyObjectId`.

- [ ] **Step 2: Update endpoint mutations in `mutations.ts`**

In `createEndpointAction()` and `updateEndpointAction()`, update the payload to use `objectId` instead of `requestBodyObjectId`/`responseBodyObjectId`.

- [ ] **Step 3: Update `apiDetailState.svelte.ts` — ALL locations**

This file has many references to the old fields. Update ALL of the following:

1. **`CREATE_DEFAULTS`** (~line 380): Replace `requestBodyObjectId` and `responseBodyObjectId` with `objectId`
2. **`hasEndpointChanges` derived** (~line 396): Update field comparison to use `objectId`
3. **`handleSelectRequestBodyObject` + `handleSelectResponseBodyObject`**: Merge into single `handleSelectObject` that sets `editedEndpoint.objectId`
4. **`handleCreateEndpoint`** (~line 458): Update payload to pass `objectId`
5. **`handleDuplicateEndpoint`** (~line 526): Update to copy `objectId`
6. **`handleSaveEndpoint`** (~line 579): Update payload to pass `objectId`
7. **`handleResetResponseDefaults`** (~line 678): Update to reset `objectId` instead of `responseBodyObjectId`
8. **`ApiDetailState` interface** (~line 132): Remove old handler types, add `handleSelectObject`
9. **Return object** (~line 754): Remove old handlers, add `handleSelectObject`

- [ ] **Step 4: Update dashboard page**

In `src/routes/(dashboard)/dashboard/+page.svelte`, the API readiness computation (~lines 25, 33) references `responseBodyObjectId`. Update to use `objectId`:

```typescript
// Before: endpoint.responseBodyObjectId
// After: endpoint.objectId
```

- [ ] **Step 5: Run type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 6: Commit**

Use the `/commit` skill. Suggested message: `feat(stores): update endpoint stores for merged objectId`

---

### Task 5: Update seed data and fixtures

**Files:**
- Modify: `tests/fixtures/seedData.ts` — add `appears` to field references, add `relationships: []` to objects
- Modify: `tests/shared/testUtils.ts` — update `createMockEndpoint` factory

- [ ] **Step 1: Update seed data**

Add `appears: 'both'` to all existing `ObjectFieldReference` entries in seed data. Add `relationships: []` to all `ObjectDefinition` entries.

- [ ] **Step 2: Update mock factories**

Update `createMockEndpoint` to use `objectId` instead of `requestBodyObjectId`/`responseBodyObjectId`.

Update any `createMockObject` factory to include `relationships: []`.

- [ ] **Step 3: Run unit tests**

```bash
bunx vitest run
```

Fix any failures from the type changes.

- [ ] **Step 4: Commit**

Use the `/commit` skill. Suggested message: `test: update fixtures for appears flag and merged objectId`

---

## Part 2: Preview Generation

### Task 6: Update `examples.ts` to respect `appears` flag

**Files:**
- Modify: `src/lib/utils/examples.ts`
- Modify: `tests/unit/lib/utils/examples.test.ts`

The key change: `buildObjectFromObjectId` currently includes ALL fields. It needs two variants — one for request preview (exclude PK + "response" fields), one for response preview (exclude "request" fields).

- [ ] **Step 1: Write failing tests**

Add tests in `tests/unit/lib/utils/examples.test.ts`:

```typescript
describe('buildRequestPreviewFromObject - appears flag', () => {
  it('should exclude PK fields from request preview', () => {
    // Setup: object with a PK field (appears: 'response')
    // Assert: PK field not in request preview
  });

  it('should exclude response-only fields from request preview', () => {
    // Setup: object with created_at (appears: 'response')
    // Assert: created_at not in request preview
  });

  it('should include request-only fields in request preview', () => {
    // Setup: object with password (appears: 'request')
    // Assert: password IS in request preview
  });
});

describe('buildResponsePreviewFromObject - appears flag', () => {
  it('should exclude request-only fields from response preview', () => {
    // Setup: object with password (appears: 'request')
    // Assert: password not in response preview
  });

  it('should include response-only fields in response preview', () => {
    // Setup: object with id (appears: 'response')
    // Assert: id IS in response preview
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bunx vitest run tests/unit/lib/utils/examples.test.ts
```

- [ ] **Step 3: Update implementation**

Refactor `buildObjectFromObjectId` to accept a filter context, or create two new functions:

```typescript
export function buildRequestBodyFromObjectId(objectId: string | undefined, objects?: any[]): Record<string, any> {
  if (!objectId) return {};
  const objectDef = getObjectById(objectId);
  if (!objectDef) return {};

  const obj: Record<string, any> = {};
  objectDef.fields
    .filter(fieldRef => !fieldRef.isPk && fieldRef.appears !== 'response')
    .forEach(fieldRef => {
      const field = getFieldById(fieldRef.fieldId);
      if (field) obj[field.name] = getExampleValueForType(field.type);
    });
  return obj;
}

export function buildResponseBodyFromObjectId(objectId: string | undefined, objects?: any[]): Record<string, any> {
  if (!objectId) return {};
  const objectDef = getObjectById(objectId);
  if (!objectDef) return {};

  const obj: Record<string, any> = {};
  objectDef.fields
    .filter(fieldRef => fieldRef.appears !== 'request')
    .forEach(fieldRef => {
      const field = getFieldById(fieldRef.fieldId);
      if (field) obj[field.name] = getExampleValueForType(field.type);
    });
  return obj;
}
```

Update `buildRequestPreviewFromObject` to use `buildRequestBodyFromObjectId` and `buildResponsePreviewFromObject` to use `buildResponseBodyFromObjectId`.

Keep the existing `buildObjectFromObjectId` if it's used elsewhere, or remove it if all callers are updated.

- [ ] **Step 4: Run tests to verify they pass**

```bash
bunx vitest run tests/unit/lib/utils/examples.test.ts
```

- [ ] **Step 5: Run all unit tests**

```bash
bunx vitest run
```

- [ ] **Step 6: Commit**

Use the `/commit` skill. Suggested message: `feat(utils): update preview generation to respect appears flag`

---

## Part 3: Object Form UI

### Task 7: Add segmented "appears in" control to ObjectFormContent

**Files:**
- Modify: `src/lib/components/form/ObjectFormContent.svelte`

Replace the existing PK toggle + Optional checkbox field row with:
- PK toggle (only shown for int/uuid fields)
- Segmented control: `Both | Request | Response`
- Optional checkbox (disabled when PK or "Response")
- Remove button

**Mutual exclusivity rules enforced by UI:**
- PK → auto-lock segmented to "Response", disable Optional
- FK field (detected via relationship with `references` cardinality) → lock segmented to "Both"
- "Response" selected → disable Optional checkbox

- [ ] **Step 1: Add `appears` default to `addField` function**

When a field is added, default `appears` to `'both'`:

```typescript
function addField(fieldId: string) {
  // ... existing logic ...
  editedItem.fields = [...editedItem.fields, { fieldId, optional: false, isPk: false, appears: 'both' }];
}
```

- [ ] **Step 2: Add `setFieldAppears` function**

```typescript
function setFieldAppears(fieldId: string, value: FieldAppearance) {
  const fieldRef = editedItem.fields.find(f => f.fieldId === fieldId);
  if (!fieldRef || fieldRef.isPk) return;
  fieldRef.appears = value;
  if (value === 'response') fieldRef.optional = false;
  editedItem.fields = [...editedItem.fields]; // trigger reactivity
}
```

- [ ] **Step 3: Update `toggleFieldPk` to set `appears`**

When PK is toggled on, also set `appears: 'response'` and `optional: false`.

- [ ] **Step 4: Update field row template**

Replace the existing toggle buttons with:
- PK button (only if field type is int/uuid)
- Segmented control with three buttons (Both/Request/Response)
- Optional checkbox

Use Tailwind classes matching the monochrome design system. Active states:
- "Both" active: blue tint (`bg-blue-500/20 text-blue-400 border-blue-500/50`)
- "Request" active: yellow tint (`bg-yellow-500/20 text-yellow-400 border-yellow-500/50`)
- "Response" active: green tint (`bg-green-500/20 text-green-400 border-green-500/50`)

Locked state (PK or FK): reduced opacity, `pointer-events-none`

- [ ] **Step 5: Run type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 6: Commit**

Use the `/commit` skill. Suggested message: `feat(objects): add segmented appears-in control to object form`

---

### Task 8: Add relationships section to ObjectFormContent

**Files:**
- Modify: `src/lib/components/form/ObjectFormContent.svelte`

Add a relationships section below the fields section, separated by a dashed line labeled "relationships". Relationships are added via the same dropdown as fields (add an "Objects" section to the dropdown). Each relationship row shows:
- Editable name input
- Cardinality selector (has one / has many / references / many ↔ many)
- Target object badge (→ ObjectName)
- FK inference hint for "references" cardinality
- Remove button

Inferred (bidirectional) relationships show as grayed-out, read-only rows with dashed border and "auto · on {ObjectName}" badge.

- [ ] **Step 1: Add relationship management functions**

```typescript
function addRelationship(targetObjectId: string) {
  const targetObj = getObjectById(targetObjectId);
  if (!targetObj) return;
  const defaultName = targetObj.name.toLowerCase() + 's';
  const newRel: ObjectRelationship = {
    id: generateId(),
    sourceObjectId: editedItem.id,
    targetObjectId,
    name: defaultName,
    cardinality: 'has_many',
    isInferred: false
  };
  editedItem.relationships = [...(editedItem.relationships || []), newRel];
}

function removeRelationship(relId: string) {
  editedItem.relationships = (editedItem.relationships || []).filter(r => r.id !== relId);
}

function updateRelationshipName(relId: string, name: string) {
  const rel = (editedItem.relationships || []).find(r => r.id === relId);
  if (rel) {
    rel.name = name;
    editedItem.relationships = [...editedItem.relationships];
  }
}

function updateRelationshipCardinality(relId: string, cardinality: Cardinality) {
  const rel = (editedItem.relationships || []).find(r => r.id === relId);
  if (rel) {
    rel.cardinality = cardinality;
    // Auto-update name based on cardinality
    const targetObj = getObjectById(rel.targetObjectId);
    if (targetObj) {
      rel.name = (cardinality === 'has_many' || cardinality === 'many_to_many')
        ? targetObj.name.toLowerCase() + 's'
        : targetObj.name.toLowerCase();
    }
    editedItem.relationships = [...editedItem.relationships];
  }
}
```

- [ ] **Step 2: Update the dropdown to include objects**

The existing field selector dropdown should gain an "Objects" section. When an object is selected from the dropdown, call `addRelationship(objectId)` instead of `addField(fieldId)`.

- [ ] **Step 3: Add relationship row template**

Below the fields list, add a dashed separator and relationship rows. Each row:
- Editable name input (monospace, inline editing)
- `<select>` for cardinality: has one, has many, references, many ↔ many
- Target object badge: `→ {ObjectName}`
- For "references" cardinality: FK inference hint (`via {name}_id ✓` or `missing {name}_id ✗`)
- Remove button

Inferred relationships (from backend `isInferred: true`):
- Dashed border, reduced opacity
- Read-only name input
- Non-editable cardinality display (no select)
- "auto · on {ObjectName}" badge
- Remove button (removes both sides)

- [ ] **Step 4: Update object save flow for relationship persistence**

The object form's save handler (via `createObjectAction`/`updateObjectAction` in `mutations.ts`) does NOT handle relationships — those go through separate API calls. Update the save flow:

- On object create: after the object is created, call `createRelationshipApi()` for each user-defined relationship
- On object update: diff the current relationships against the original, call `createRelationshipApi()` for new ones and `deleteRelationshipApi()` for removed ones
- After relationship mutations, re-fetch the object to get backend-computed inverses

This logic should be added to the object form's save handler in `ObjectFormContent.svelte` or in the parent component that orchestrates the save.

- [ ] **Step 5: Run type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 6: Commit**

Use the `/commit` skill. Suggested message: `feat(objects): add relationship section to object form`

---

## Part 4: Endpoint Drawer Merge

### Task 9: Merge request/response editors into single object selector

**Files:**
- Modify: `src/routes/(dashboard)/apis/[id]/+page.svelte` (~lines 669-687)
- Modify: `src/lib/components/api-generator/RequestBodyEditor.svelte` — rename to `ObjectEditor.svelte` or refactor
- Delete: `src/lib/components/api-generator/ResponseBodyEditor.svelte` — functionality merged
- Modify: `src/lib/components/api-generator/index.ts` — update barrel export
- Modify: `src/lib/stores/apiDetailState.svelte.ts` — merge handlers

The two separate editors (RequestBodyEditor + ResponseBodyEditor) merge into a single component that:
1. Shows ONE object selector dropdown
2. Shows response shape selector (Object / List)
3. Shows envelope checkbox
4. Shows TWO preview panels side-by-side: Request Preview and Response Preview
5. Previews use the `appears` flag to show different fields

- [ ] **Step 1: Create `ObjectEditor.svelte` (new file, then delete old ones)**

Create `src/lib/components/api-generator/ObjectEditor.svelte` as a new component that combines:
- Object selector (from RequestBodyEditor)
- Response shape selector (from ResponseBodyEditor)
- Envelope checkbox (from ResponseBodyEditor)
- Two preview panels: request (fields where `appears !== 'response'` and not PK) and response (fields where `appears !== 'request'`)

Props:
```typescript
export interface ObjectEditorProps {
  endpointNamespaceId: string;
  selectedObjectId?: string;
  useEnvelope: boolean;
  responseShape: ResponseShape;
  onSelectObject: (objectId: string | undefined) => void;
  onEnvelopeToggle: (enabled: boolean) => void;
  onSetResponseShape: (shape: ResponseShape) => void;
  onCreateNewObject?: () => void;
}
```

- [ ] **Step 2: Update the API detail page**

In `src/routes/(dashboard)/apis/[id]/+page.svelte`, replace the two separate editors (~lines 669-687) with the single `ObjectEditor`:

```svelte
<ObjectEditor
  endpointNamespaceId={apiState.apiNamespaceId}
  selectedObjectId={apiState.editedEndpoint.objectId}
  useEnvelope={apiState.editedEndpoint.useEnvelope}
  responseShape={apiState.editedEndpoint.responseShape}
  onSelectObject={apiState.handleSelectObject}
  onEnvelopeToggle={apiState.handleEnvelopeToggle}
  onSetResponseShape={apiState.handleSetResponseShape}
  onCreateNewObject={() => openObjectCreate('body')}
/>
```

- [ ] **Step 3: Update `apiDetailState.svelte.ts`**

Merge `handleSelectRequestBodyObject` and `handleSelectResponseBodyObject` into `handleSelectObject`:

```typescript
handleSelectObject(objectId: string | undefined) {
  if (this.editedEndpoint) {
    this.editedEndpoint.objectId = objectId;
  }
}
```

Remove the old handlers.

- [ ] **Step 4: Delete old editor files and update barrel export**

Delete both files:
- `src/lib/components/api-generator/RequestBodyEditor.svelte`
- `src/lib/components/api-generator/ResponseBodyEditor.svelte`

Update `src/lib/components/api-generator/index.ts` barrel export:
- Remove `RequestBodyEditor` export
- Remove `ResponseBodyEditor` export
- Add `ObjectEditor` export

- [ ] **Step 5: Clean up all references**

Search for any remaining references to `RequestBodyEditor`, `ResponseBodyEditor`, `requestBodyObjectId`, `responseBodyObjectId`, `handleSelectRequestBodyObject`, `handleSelectResponseBodyObject` and update/remove them.

```bash
# Verify no orphaned references remain
```
Use Grep to search for: `RequestBodyEditor`, `ResponseBodyEditor`, `requestBodyObjectId`, `responseBodyObjectId`

Known files that WILL have orphaned references (update or delete all of these):
- `tests/unit/lib/components/api-generator/RequestBodyEditor.test.ts` — delete (component deleted)
- `tests/unit/lib/components/api-generator/ResponseBodyEditor.test.ts` — delete (component deleted)
- `tests/unit/lib/stores/apiDetailState.test.ts` — update for `objectId`
- `tests/unit/lib/stores/apis-endpoints.test.ts` — update for `objectId`
- `tests/unit/lib/components/api-generator/EndpointItem.test.ts` — update for `objectId`

- [ ] **Step 6: Run type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

- [ ] **Step 7: Commit**

Use the `/commit` skill. Suggested message: `feat(api-generator): merge request/response editors into single ObjectEditor`

---

## Part 5: Tests and Verification

### Task 10: Update unit tests

**Files:**
- Modify: `tests/unit/lib/api/objects.test.ts` — update for `appears` and `relationships`
- Modify: `tests/unit/lib/api/endpoints.test.ts` — update for `objectId`
- Modify: `tests/unit/lib/stores/objects.test.ts` — update for `relationships`
- Modify: `tests/unit/lib/stores/apiDetailState.test.ts` — update for `objectId`
- Modify: `tests/unit/lib/stores/apis-endpoints.test.ts` — update for `objectId`
- Modify: `tests/unit/lib/domain/endpointReducer.test.ts` — update for `objectId`
- Modify: `tests/unit/lib/domain/mutations.test.ts` — update for `objectId`
- Modify: `tests/unit/lib/components/api-generator/EndpointItem.test.ts` — update for `objectId`
- Delete: `tests/unit/lib/components/api-generator/RequestBodyEditor.test.ts` — component deleted
- Delete: `tests/unit/lib/components/api-generator/ResponseBodyEditor.test.ts` — component deleted
- Create: `tests/unit/lib/components/api-generator/ObjectEditor.test.ts` — tests for new component

- [ ] **Step 1: Update API client tests**

Update mock responses and assertions in objects and endpoints tests to use the new field shapes (`appears`, `relationships`, `objectId`).

- [ ] **Step 2: Update store tests**

Update any tests that create `ObjectDefinition` or `ApiEndpoint` objects to include the new fields.

- [ ] **Step 3: Update domain logic tests**

Update `endpointReducer` and `mutations` tests for `objectId`.

- [ ] **Step 4: Run all unit tests**

```bash
bunx vitest run
```

Fix any failures.

- [ ] **Step 5: Commit**

Use the `/commit` skill. Suggested message: `test: update unit tests for schema derivation changes`

---

### Task 11: Update E2E tests

**Files:**
- Modify: `tests/page-objects/ObjectsPage.ts` — add relationship interaction methods
- Modify: `tests/e2e/crud/objects.spec.ts` — update for new form controls
- Modify: `tests/e2e/crud/apis.spec.ts` — update for merged object selector
- Modify: `tests/helpers/api-client.ts` — update for new API contract

- [ ] **Step 1: Update E2E API client**

Update `E2EApiClient` to use `objectId` instead of `requestBodyObjectId`/`responseBodyObjectId` for endpoint operations.

- [ ] **Step 2: Update page objects**

Update `ObjectsPage` to support:
- Interacting with the segmented "appears in" control
- Adding relationships via the dropdown

Update `ApisPage` (or the API detail page object) to use the merged object selector.

- [ ] **Step 3: Update E2E tests**

Update CRUD tests for objects and APIs to work with the new UI controls.

- [ ] **Step 4: Run E2E tests**

```bash
PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

Fix any failures.

- [ ] **Step 5: Commit**

Use the `/commit` skill. Suggested message: `test: update E2E tests for schema derivation UI changes`

---

### Task 12: Final verification

**Important:** Invoke the `running-tests` skill before running any test command below.

- [ ] **Step 1: Run type check**

```bash
bun run svelte-check --tsconfig ./tsconfig.json
```

Must be 0 errors.

- [ ] **Step 2: Run all unit tests**

```bash
bunx vitest run
```

Must be 0 failures.

- [ ] **Step 3: Run smoke tests**

```bash
bunx playwright test --project=smoke
```

- [ ] **Step 4: Run E2E CRUD tests**

```bash
PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud
```

- [ ] **Step 5: Commit any remaining fixes**

---

### Task 13: Cleanup

- [ ] **Step 1: Delete this plan file and its companion prompt**

```bash
rm docs/plans/2026-03-13-schema-derivation-impl.md
rm docs/plans/2026-03-13-schema-derivation-frontend-prompt.md
```

- [ ] **Step 2: Commit**

Use the `/commit` skill. Suggested message: `chore: remove completed implementation plan`

---

## Expected API Contract

Must match backend plan exactly.

### Object Field Reference (updated)

```json
{
  "fieldId": "uuid",
  "optional": false,
  "isPk": false,
  "appears": "both"
}
```

`appears` values: `"both"` (default), `"request"`, `"response"`

### Object Response (updated)

```json
{
  "id": "uuid",
  "namespaceId": "uuid",
  "name": "User",
  "description": "User account",
  "fields": [
    { "fieldId": "f1", "optional": false, "isPk": true, "appears": "response" },
    { "fieldId": "f2", "optional": false, "isPk": false, "appears": "both" },
    { "fieldId": "f3", "optional": false, "isPk": false, "appears": "request" }
  ],
  "validators": [],
  "relationships": [
    {
      "id": "r1",
      "sourceObjectId": "obj-user",
      "targetObjectId": "obj-post",
      "name": "posts",
      "cardinality": "has_many",
      "isInferred": false,
      "inverseId": "r2"
    }
  ],
  "usedInApis": ["api-1"]
}
```

### Relationship Create Request

```json
{
  "targetObjectId": "uuid",
  "name": "posts",
  "cardinality": "has_many"
}
```

### Endpoint Create Request (updated)

```json
{
  "apiId": "uuid",
  "method": "POST",
  "path": "/users",
  "description": "Create a user",
  "pathParams": [],
  "objectId": "uuid",
  "useEnvelope": true,
  "responseShape": "object"
}
```

Note: `requestBodyObjectId` and `responseBodyObjectId` are replaced by single `objectId`.

### Endpoint Response (updated)

```json
{
  "id": "uuid",
  "apiId": "uuid",
  "method": "POST",
  "path": "/users",
  "description": "Create a user",
  "tagName": null,
  "pathParams": [],
  "queryParamsObjectId": null,
  "objectId": "uuid",
  "useEnvelope": true,
  "responseShape": "object"
}
```

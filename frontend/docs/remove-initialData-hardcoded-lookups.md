# Remove Hardcoded initialData Lookups — Implementation Prompt

## Goal

Eliminate `src/lib/stores/initialData.ts` as a production dependency. The backend is the source of truth for all entity data. The frontend should fetch data from the API and use it directly — no hardcoded UUID maps, no duplicated type definitions, no seed data in production code.

## Problem Summary

`src/lib/stores/initialData.ts` currently exports:

1. **`BUILTIN_TYPE_IDS`** — hardcoded UUID-to-name map for 6 primitive types. Used in `src/lib/api/fields.ts` to build a reverse lookup (`TYPE_ID_TO_NAME`) that converts `typeId` UUIDs from the backend into `PrimitiveTypeName` strings. Also used in `src/lib/stores/types.ts` to define hardcoded `primitiveTypes` and `abstractTypes` arrays.

2. **`GLOBAL_NAMESPACE_ID`** — a single well-known UUID (`00000000-0000-0000-0000-000000000001`). Used in 6 production files as a constant for "switch to global namespace" logic.

3. **`BUILTIN_FIELD_CONSTRAINT_IDS`** — hardcoded field constraint UUIDs. Only used within `initialData.ts` itself to construct `initialFieldConstraints` seed data. No production code references these.

4. **Type definitions** (`Field`, `FieldConstraintValue`, `FieldConstraintBase`) — shared between production stores and test fixtures.

5. **Seed data** (`initialFields`, `initialFieldConstraints`, `initialObjects`, `initialNamespaces`) + clone helpers — used exclusively by test fixtures.

The core issue: the backend already returns type `name` on `/v1/types` responses, and the frontend already fetches and stores types via `loadStoresFromApi()`. There is no need to maintain a hardcoded UUID map to resolve `typeId → typeName`. The types store can do this lookup at runtime.

## What the Backend Returns

**GET /v1/types** returns:
```json
[
  { "id": "00000000-...-0001", "name": "str", "pythonType": "str", "description": "...", "importPath": null, "parentTypeId": null, "usedInFields": 5 },
  { "id": "00000000-...-0002", "name": "int", ... }
]
```

**GET /v1/fields** returns:
```json
[
  { "id": "...", "namespaceId": "...", "name": "email", "typeId": "00000000-...-0001", "description": "...", "constraints": [...], "usedInApis": [...] }
]
```

The field response has `typeId` (UUID). The frontend currently converts this to a name string (`"str"`) using the hardcoded `BUILTIN_TYPE_IDS` map. Instead, it should look up the name from the already-loaded types store.

## Data Flow (Current vs Target)

### Current (broken)
```
1. loadStoresFromApi() fires 7 parallel fetches
2. Types API → typesBaseStore (but also hardcoded primitiveTypes/abstractTypes exist in types.ts)
3. Fields API → transformField() uses BUILTIN_TYPE_IDS reverse map to convert typeId → typeName
4. Field.type is stored as PrimitiveTypeName string (e.g., "str")
5. UI displays field.type directly
6. When saving a field, getTypeIdByName() looks up the types store to convert name → UUID
```

### Target (clean)
```
1. loadStoresFromApi() fires 7 parallel fetches — types MUST load before fields
2. Types API → typesBaseStore (the ONLY source of type data)
3. Fields API → transformField() looks up typesBaseStore to convert typeId → typeName
4. Field.type is stored as PrimitiveTypeName string (e.g., "str") — no change to downstream
5. UI displays field.type directly — no change
6. When saving a field, getTypeIdByName() looks up the types store — no change
```

## Implementation Steps

### Step 1: Make types load before fields

**File: `src/lib/stores/loader.ts`**

Currently `loadStoresFromApi()` fires all 7 API calls in parallel via `Promise.allSettled`. The field transformer needs types to already be in the store. Change the load order:

1. First batch (parallel): `listTypes()`, `listNamespaces()`, `listFieldConstraints()`
2. Set `typesBaseStore`, `namespacesStore`, `fieldConstraintsStore` from first batch results
3. Second batch (parallel): `listFields()`, `listObjects()`, `listApis()`, `listEndpoints()`
4. Set remaining stores from second batch results

This is necessary because `transformField()` will now read from `typesBaseStore` instead of a hardcoded map.

### Step 2: Remove hardcoded type definitions from types.ts

**File: `src/lib/stores/types.ts`**

- Delete the `import { BUILTIN_TYPE_IDS } from './initialData'` import
- Delete the hardcoded `primitiveTypes` array (lines 36-85)
- Delete the hardcoded `abstractTypes` array (lines 87-96)
- Delete `FIELD_CONSTRAINT_COMPATIBILITY` (already marked `@deprecated`)
- Delete `getFieldConstraintCategoriesForType()` (uses the deprecated map)
- Keep everything else: `typesBaseStore`, `typesStore` (derived), `getPrimitiveTypes()`, `searchTypes()`, `getTypeIdByName()`, `getTotalTypeCount()`

The `getPrimitiveTypes()` function currently filters the derived `typesStore` by name — this already works with API data and needs no change.

### Step 3: Remove TYPE_ID_TO_NAME from api/fields.ts

**File: `src/lib/api/fields.ts`**

- Remove `import { BUILTIN_TYPE_IDS } from '$lib/stores/initialData'`
- Remove the `TYPE_ID_TO_NAME` constant
- Change `transformField()` to accept a type lookup map as a parameter (or import from types store)

**Option A (recommended): Pass lookup map from loader**

Change `listFields()` to accept a type map parameter:

```typescript
import { get } from 'svelte/store';
import { typesBaseStore } from '$lib/stores/types';
import type { PrimitiveTypeName } from '$lib/stores/types';

function buildTypeIdToNameMap(): Record<string, PrimitiveTypeName> {
  const types = get(typesBaseStore);
  return Object.fromEntries(
    types.map(t => [t.id, t.name as PrimitiveTypeName])
  );
}

function transformField(response: FieldResponse, typeMap: Record<string, PrimitiveTypeName>): Field {
  const typeName = typeMap[response.typeId];
  if (!typeName) {
    console.warn(`Unknown type_id "${response.typeId}" for field "${response.name}", defaulting to "str"`);
  }
  return {
    id: response.id,
    namespaceId: response.namespaceId,
    name: response.name,
    type: typeName ?? 'str',
    description: response.description ?? undefined,
    defaultValue: response.defaultValue ?? undefined,
    constraints: response.constraints.map(transformFieldConstraintValue),
    usedInApis: response.usedInApis
  };
}

export async function listFields(namespaceId?: string): Promise<Field[]> {
  const params = namespaceId ? `?namespaceId=${encodeURIComponent(namespaceId)}` : '';
  const response = await apiGet<FieldResponse[]>(`/fields${params}`);
  const typeMap = buildTypeIdToNameMap();
  return response.map(r => transformField(r, typeMap));
}
```

Similarly update `getField()`, `createFieldApi()`, `updateFieldApi()` which also call `transformField`.

### Step 4: Move GLOBAL_NAMESPACE_ID to a simple constants file

**Create: `src/lib/constants.ts`**

```typescript
/** Well-known UUID for the global namespace. Matches the backend's built-in global namespace. */
export const GLOBAL_NAMESPACE_ID = '00000000-0000-0000-0000-000000000001';
```

**Update these files** to import from `$lib/constants` instead of `./initialData`:
- `src/lib/stores/namespaces.ts` (lines 3, 228)
- `src/lib/stores/loader.ts` (line 24)
- `src/lib/stores/fields.ts` (line 5)
- `src/lib/stores/objects.ts` (line 4)
- `src/lib/stores/apis.ts` (line 5)
- `src/lib/stores/actions.ts` (line 50 — imports via namespaces re-export)

Update the namespaces re-export (line 228 of namespaces.ts):
```typescript
export { GLOBAL_NAMESPACE_ID } from '$lib/constants';
```

### Step 5: Move type definitions to proper locations

The `Field` and `FieldConstraintValue` interfaces are currently defined in `initialData.ts` and re-exported through store files. Move them:

**Move `Field` and `FieldConstraintValue` to `src/lib/types/index.ts`** (where all shared types live per CLAUDE.md rules):

```typescript
export interface FieldConstraintValue {
  name: string;
  params?: Record<string, any>;
}

export interface Field {
  id: string;
  namespaceId: string;
  name: string;
  type: PrimitiveTypeName;
  description?: string;
  defaultValue?: string;
  constraints: FieldConstraintValue[];
  usedInApis: string[];
}
```

Note: `PrimitiveTypeName` is defined in `src/lib/stores/types.ts`. You'll need to import it in `src/lib/types/index.ts`. Check for circular dependency — if `types/index.ts` imports from `stores/types.ts` and vice versa, move `PrimitiveTypeName` to `types/index.ts` as well.

**Move `FieldConstraintBase` to `src/lib/types/index.ts`**:
```typescript
export interface FieldConstraintBase {
  id: string;
  namespaceId: string;
  name: string;
  description: string;
  parameterType: string;
  docsUrl: string | null;
  compatibleTypes: string[];
}
```

Update all imports in store files (`fields.ts`, `fieldConstraints.ts`) and API files (`api/fields.ts`, `api/fieldConstraints.ts`) to import from `$lib/types` instead of `./initialData`.

### Step 6: Move seed data and clone helpers to tests/fixtures/

**Create: `tests/fixtures/seedData.ts`**

Move from `initialData.ts` to this new file:
- `BUILTIN_TYPE_IDS` (tests still need these for constructing mock data)
- `BUILTIN_FIELD_CONSTRAINT_IDS`
- `SEED_FIELD_IDS`, `SEED_OBJECT_IDS`, `SEED_API_IDS`
- `initialFields`, `initialFieldConstraints`, `initialObjects`, `initialNamespaces`
- `cloneFields()`, `cloneFieldConstraintBases()`, `cloneObjects()`, `cloneNamespaces()`
- `USER_NAMESPACE_ID`

Update test fixture imports:
- `tests/fixtures/constraints.ts` — import from `./seedData` instead of `../../src/lib/stores/initialData`
- `tests/fixtures/fields.ts` — import from `./seedData` instead of `../../src/lib/stores/initialData`
- `tests/fixtures/index.ts` — no change needed (already re-exports from category files)
- All test files importing from `$lib/stores/initialData` — update to import from `tests/fixtures/seedData` or through `tests/fixtures`

Note: `tests/fixtures/seedData.ts` will need to import `PrimitiveTypeName`, `Field`, `FieldConstraintValue`, `FieldConstraintBase` types. Import these from `../../src/lib/types` (their new home after Step 5).

Also import `GLOBAL_NAMESPACE_ID` from `../../src/lib/constants` (its new home after Step 4) or re-define it locally.

### Step 7: Delete initialData.ts

After all imports have been redirected:

**Delete: `src/lib/stores/initialData.ts`**

### Step 8: Clean up test fixtures

**`tests/fixtures/types.ts`** currently has its own hardcoded type data (duplicating both `initialData.ts` AND `stores/types.ts`). This is fine for test fixtures — mock data belongs in test fixtures. No change needed here unless you want to import from `seedData.ts` for consistency.

**`tests/shared/msw/handlers.ts`** — no changes needed. It imports from `tests/fixtures` which will still export the same data.

**Remove legacy aliases** from `tests/fixtures/constraints.ts` (lines 60-65) and `tests/fixtures/index.ts` (lines 51-56) if no tests reference the old names anymore.

## Files Changed Summary

### New Files
- `src/lib/constants.ts` — `GLOBAL_NAMESPACE_ID` constant
- `tests/fixtures/seedData.ts` — all seed data, clone helpers, well-known UUIDs

### Modified Files
- `src/lib/stores/loader.ts` — sequential load (types before fields)
- `src/lib/stores/types.ts` — remove hardcoded type arrays, remove deprecated compatibility map
- `src/lib/api/fields.ts` — resolve typeId from types store instead of hardcoded map
- `src/lib/types/index.ts` — add `Field`, `FieldConstraintValue`, `FieldConstraintBase`, and possibly `PrimitiveTypeName`
- `src/lib/stores/fields.ts` — update imports
- `src/lib/stores/fieldConstraints.ts` — update imports
- `src/lib/stores/namespaces.ts` — update imports
- `src/lib/stores/objects.ts` — update imports
- `src/lib/stores/apis.ts` — update imports
- `src/lib/stores/actions.ts` — update imports (via namespaces re-export)
- `tests/fixtures/constraints.ts` — import from `./seedData`
- `tests/fixtures/fields.ts` — import from `./seedData`
- Any test files importing directly from `$lib/stores/initialData`

### Deleted Files
- `src/lib/stores/initialData.ts`

## Validation Checklist

After all changes:

1. `bun run svelte-check --tsconfig ./tsconfig.json` — must pass with 0 errors
2. `bunx vitest run` — all unit/integration tests must pass
3. `pkill -f "vite" 2>/dev/null && bunx playwright test --project=smoke` — smoke tests pass
4. Verify no production file (`src/`) imports from `tests/` or from the deleted `initialData.ts`
5. `grep -r "initialData" src/` should return zero results
6. `grep -r "BUILTIN_TYPE_IDS\|BUILTIN_FIELD_CONSTRAINT_IDS" src/` should return zero results

## Risks and Edge Cases

- **Circular imports**: Moving `PrimitiveTypeName` from `stores/types.ts` to `types/index.ts` may trigger circular deps if `stores/types.ts` imports from `types/index.ts` and vice versa. Check the import graph carefully. If circular, keep `PrimitiveTypeName` in `stores/types.ts` and import it from there in `types/index.ts` for the `Field` interface.

- **Load order**: The types store MUST be populated before `transformField()` runs. The two-phase loading in Step 1 ensures this. If the types API fails, `buildTypeIdToNameMap()` returns an empty map and all fields default to `"str"` (same as current fallback behavior).

- **Test isolation**: Test fixtures will own their own seed data in `tests/fixtures/seedData.ts`. This data is no longer shared with production code, which is the correct separation.

- **`getTypeIdByName()` in field-registry page**: This function reads from `typesStore` (populated from API). It will continue to work since `typesBaseStore` is loaded from the API. No change needed.

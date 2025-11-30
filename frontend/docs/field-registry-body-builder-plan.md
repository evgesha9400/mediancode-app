# Field Registry Body Builder - Implementation Plan

## Overview

Refactor RequestBodyEditor and ResponseBodyEditor to select fields from the field registry by reference instead of creating new fields inline. Remove JSON paste mode entirely. Remove "Copy from request" button. Use ParameterEditor in read-only mode to display selected fields.

## Design Constraints

- Field display: Reuse ParameterEditor component in read-only mode
- Selection UI: Searchable dropdown (combobox) with type-to-filter
- Field ordering: Keep insertion order (no reordering)
- Copy feature: Remove entirely
- JSON paste mode: Remove entirely
- References: Store field IDs (strings), not copies
- Duplicate prevention: Filter dropdown to exclude already-selected fields (per body)

## File Change Inventory

**Types:**
- `/src/lib/types/index.ts` - DELETE BodyMode type, simplify ApiEndpoint

**State Management:**
- `/src/lib/stores/apiGeneratorState.svelte.ts` - Remove mode logic, update handlers
- `/src/lib/stores/apis.ts` - Update createDefaultEndpoint, remove serialization

**Components:**
- `/src/lib/components/api-generator/RequestBodyEditor.svelte` - Complete refactor
- `/src/lib/components/api-generator/ResponseBodyEditor.svelte` - Complete refactor
- `/src/lib/components/api-generator/ParameterEditor.svelte` - Add read-only mode
- `/src/routes/api-generator/+page.svelte` - Update prop bindings

## Step-by-Step Implementation

### Phase 1: Type System Changes

#### 1.1 Update `/src/lib/types/index.ts`

DELETE:
- Line 103: `export type BodyMode = 'none' | 'fields' | 'json';`
- Lines 106-109: `BodyValidationError` interface

UPDATE `ApiEndpoint` interface (lines 111-138):
- DELETE: `requestBody?: string;` (line 121)
- DELETE: `requestBodyMode: BodyMode;` (line 124)
- DELETE: `requestBodyFields: EndpointParameter[];` (line 125)
- DELETE: `requestBodyJson: string;` (line 126)
- DELETE: `responseBody: string;` (line 129)
- DELETE: `responseBodyMode: BodyMode;` (line 132)
- DELETE: `responseBodyFields: EndpointParameter[];` (line 133)
- DELETE: `responseBodyJson: string;` (line 134)
- ADD after line 118 (after queryParams):
  ```
  requestBodyFieldIds: string[];
  responseBodyFieldIds: string[];
  ```
- KEEP: `useEnvelope: boolean;` (line 136)
- KEEP: `expanded?: boolean;` (line 137)

### Phase 2: Store Updates

#### 2.1 Update `/src/lib/stores/apis.ts`

UPDATE `createDefaultEndpoint` function (lines 192-224):
- DELETE lines 201-218 (all old body-related fields)
- ADD after line 200 (after queryParams):
  ```
  requestBodyFieldIds: [],
  responseBodyFieldIds: [],
  ```
- KEEP: `useEnvelope: true,` (line 219)
- KEEP: `expanded: false` (line 220)

UPDATE `duplicateEndpoint` function (lines 249-270):
- DELETE lines 263-265 (requestBodyFields and responseBodyFields mapping)
- No changes needed to requestBodyFieldIds/responseBodyFieldIds (already cloned correctly)

#### 2.2 Update `/src/lib/stores/apiGeneratorState.svelte.ts`

DELETE imports (line 12):
- Remove: `BodyMode, BodyValidationError`

DELETE from `ApiGeneratorState` interface (lines 49-124):
- Lines 99-104: All `handleRequestBody*` functions
- Lines 106-112: All `handleResponseBody*` functions
- Lines 116-117: `requestBodyErrors` and `responseBodyErrors`

ADD to `ApiGeneratorState` interface (after line 98):
```
// Request body field selection
handleAddRequestBodyField: (fieldId: string) => void;
handleRemoveRequestBodyField: (fieldId: string) => void;

// Response body field selection
handleAddResponseBodyField: (fieldId: string) => void;
handleRemoveResponseBodyField: (fieldId: string) => void;
handleEnvelopeToggle: (enabled: boolean) => void;
```

DELETE functions (lines 526-677):
- Lines 530-573: All request body mode/field/json handlers
- Lines 579-639: All response body mode/field/json handlers (KEEP handleEnvelopeToggle)
- Lines 651-681: `validateBodyFields`, `validateJson`, error derivations

DELETE from `handleSave` function (lines 291-317):
- Lines 294-304: All validation error checks
- Lines 306-311: Body serialization logic

UPDATE `handleSave` (lines 291-317):
- DELETE lines 294-311
- REPLACE with direct save:
  ```
  updateEndpoint(editedEndpoint.id, editedEndpoint);
  selectedEndpoint = editedEndpoint;
  showToast(MESSAGES.ENDPOINT_SAVED, 'success');
  return true;
  ```

DELETE serialization functions (lines 319-415):
- Lines 326-352: `serializeRequestBody`
- Lines 357-388: `serializeResponseBody`
- Lines 393-415: `getExampleValue`

ADD new field selection handlers (after line 524):
```
function handleAddRequestBodyField(fieldId: string): void {
  if (!editedEndpoint) return;
  if (editedEndpoint.requestBodyFieldIds.includes(fieldId)) return;

  editedEndpoint = {
    ...editedEndpoint,
    requestBodyFieldIds: [...editedEndpoint.requestBodyFieldIds, fieldId]
  };
}

function handleRemoveRequestBodyField(fieldId: string): void {
  if (!editedEndpoint) return;

  editedEndpoint = {
    ...editedEndpoint,
    requestBodyFieldIds: editedEndpoint.requestBodyFieldIds.filter(id => id !== fieldId)
  };
}

function handleAddResponseBodyField(fieldId: string): void {
  if (!editedEndpoint) return;
  if (editedEndpoint.responseBodyFieldIds.includes(fieldId)) return;

  editedEndpoint = {
    ...editedEndpoint,
    responseBodyFieldIds: [...editedEndpoint.responseBodyFieldIds, fieldId]
  };
}

function handleRemoveResponseBodyField(fieldId: string): void {
  if (!editedEndpoint) return;

  editedEndpoint = {
    ...editedEndpoint,
    responseBodyFieldIds: editedEndpoint.responseBodyFieldIds.filter(id => id !== fieldId)
  };
}
```

KEEP `handleEnvelopeToggle` (lines 641-645)

UPDATE return statement (lines 695-762):
- DELETE lines 746-758 (old handler exports)
- ADD new handler exports:
  ```
  handleAddRequestBodyField,
  handleRemoveRequestBodyField,
  handleAddResponseBodyField,
  handleRemoveResponseBodyField,
  handleEnvelopeToggle,
  ```

### Phase 3: Component Updates

#### 3.1 Update `/src/lib/components/api-generator/ParameterEditor.svelte`

ADD to `ParameterEditorProps` interface (after line 10):
```
readOnly?: boolean;
```

UPDATE props destructuring (line 14):
```
let { parameter, onUpdate, onDelete, showRequired = true, nameEditable = true, readOnly = false }: Props = $props();
```

WRAP editable inputs in conditional (lines 32-64):
```
{#if !readOnly}
  <!-- Existing editable inputs -->
{:else}
  <!-- Read-only display -->
  <div class="w-40 px-3 py-1.5 text-sm bg-mono-100 border border-mono-200 rounded-md text-mono-700 font-mono">
    {parameter.name}
  </div>
  <div class="px-3 py-1.5 text-sm bg-mono-100 border border-mono-200 rounded-md text-mono-700">
    {parameterTypes.find(t => t.value === parameter.type)?.label || parameter.type}
  </div>
  <div class="flex-1 px-3 py-1.5 text-sm bg-mono-100 border border-mono-200 rounded-md text-mono-600">
    {parameter.description || '—'}
  </div>
  {#if showRequired}
    <div class="px-3 py-1.5 text-sm text-mono-600">
      {parameter.required ? 'Required' : 'Optional'}
    </div>
  {/if}
{/if}
```

#### 3.2 Create `/src/lib/components/api-generator/FieldSelectorDropdown.svelte`

New component for searchable field selection:

Props:
- `availableFields: Field[]` - All fields from registry
- `selectedFieldIds: string[]` - Currently selected field IDs
- `onSelect: (fieldId: string) => void` - Selection handler
- `placeholder?: string` - Input placeholder

Structure:
- Text input with type-to-filter
- Dropdown list showing available fields (filtered by search query)
- Filter out fields already in `selectedFieldIds`
- Display: field name, type, description (truncated)
- Click to select → calls onSelect(fieldId)

Implementation pattern: Similar to tag combobox in `/src/routes/api-generator/+page.svelte` lines 124-192

#### 3.3 Refactor `/src/lib/components/api-generator/RequestBodyEditor.svelte`

DELETE entire current implementation (lines 1-105)

NEW implementation:

Props (replace lines 5-15):
```
export interface RequestBodyEditorProps {
  selectedFieldIds: string[];
  onAddField: (fieldId: string) => void;
  onRemoveField: (fieldId: string) => void;
}
```

Template structure:
```
<div>
  <h3 class="text-sm text-mono-700 flex items-center font-medium mb-2">
    <i class="fa-solid fa-arrow-up mr-2"></i>
    Request Body
  </h3>

  <div class="space-y-2">
    <!-- Field Selector Dropdown -->
    <FieldSelectorDropdown
      availableFields={$fieldsStore}
      selectedFieldIds={selectedFieldIds}
      onSelect={onAddField}
      placeholder="Add field to request body..."
    />

    <!-- Selected Fields (Read-only ParameterEditor) -->
    {#if selectedFieldIds.length === 0}
      <div class="p-3 bg-mono-50 rounded border border-mono-200">
        <p class="text-xs text-mono-500">No fields selected</p>
      </div>
    {:else}
      {#each selectedFieldIds as fieldId (fieldId)}
        {@const field = getFieldById(fieldId)}
        {#if field}
          <ParameterEditor
            parameter={{
              id: field.id,
              name: field.name,
              type: field.type,
              description: field.description || '',
              required: true
            }}
            readOnly={true}
            onDelete={() => onRemoveField(fieldId)}
          />
        {/if}
      {/each}
    {/if}
  </div>
</div>
```

Imports needed:
- `import { fieldsStore, getFieldById } from '$lib/stores/fields';`
- `import FieldSelectorDropdown from './FieldSelectorDropdown.svelte';`
- `import ParameterEditor from './ParameterEditor.svelte';`

#### 3.4 Refactor `/src/lib/components/api-generator/ResponseBodyEditor.svelte`

DELETE entire current implementation (lines 1-207)

NEW implementation:

Props (replace lines 5-18):
```
export interface ResponseBodyEditorProps {
  selectedFieldIds: string[];
  useEnvelope: boolean;
  onAddField: (fieldId: string) => void;
  onRemoveField: (fieldId: string) => void;
  onEnvelopeToggle: (enabled: boolean) => void;
}
```

Template structure (similar to RequestBodyEditor):
```
<div class="space-y-4">
  <!-- Editor Section -->
  <div>
    <h3 class="text-sm text-mono-700 flex items-center font-medium mb-2">
      <i class="fa-solid fa-arrow-down mr-2"></i>
      Response Body
    </h3>

    <div class="space-y-2">
      <!-- Field Selector Dropdown -->
      <FieldSelectorDropdown
        availableFields={$fieldsStore}
        selectedFieldIds={selectedFieldIds}
        onSelect={onAddField}
        placeholder="Add field to response body..."
      />

      <!-- Selected Fields (Read-only ParameterEditor) -->
      {#if selectedFieldIds.length === 0}
        <div class="p-3 bg-mono-50 rounded border border-mono-200">
          <p class="text-xs text-mono-500">No fields selected</p>
        </div>
      {:else}
        {#each selectedFieldIds as fieldId (fieldId)}
          {@const field = getFieldById(fieldId)}
          {#if field}
            <ParameterEditor
              parameter={{
                id: field.id,
                name: field.name,
                type: field.type,
                description: field.description || '',
                required: true
              }}
              readOnly={true}
              onDelete={() => onRemoveField(fieldId)}
            />
          {/if}
        {/each}
      {/if}
    </div>
  </div>

  <!-- Preview Section -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm text-mono-700 flex items-center font-medium">
        <i class="fa-solid fa-eye mr-2"></i>
        Response Preview (200)
      </h3>
      <label class="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={useEnvelope}
          onchange={(e) => onEnvelopeToggle(e.currentTarget.checked)}
          class="w-4 h-4 text-mono-900 border-mono-300 rounded focus:ring-2 focus:ring-mono-400"
        />
        <span class="text-xs text-mono-700">Use envelope wrapper</span>
      </label>
    </div>
    <div class="p-3 bg-mono-900 rounded text-white text-xs overflow-x-auto">
      <pre>{previewJson}</pre>
    </div>
  </div>
</div>
```

ADD derived preview JSON (using field registry):
```
const previewJson = $derived.by(() => {
  if (selectedFieldIds.length === 0) {
    return useEnvelope
      ? JSON.stringify({ success: true, data: {}, error: null }, null, 2)
      : '{}';
  }

  let bodyContent: any = {};
  selectedFieldIds.forEach(fieldId => {
    const field = getFieldById(fieldId);
    if (field) {
      bodyContent[field.name] = getExampleValueForType(field.type);
    }
  });

  if (useEnvelope) {
    bodyContent = {
      success: true,
      data: bodyContent,
      error: null
    };
  }

  return JSON.stringify(bodyContent, null, 2);
});

function getExampleValueForType(type: string): any {
  const normalizedType = type.toLowerCase();

  if (normalizedType === 'str' || normalizedType === 'string') return 'string';
  if (normalizedType === 'int' || normalizedType === 'integer') return 0;
  if (normalizedType === 'float' || normalizedType === 'number') return 0.0;
  if (normalizedType === 'bool' || normalizedType === 'boolean') return true;
  if (normalizedType === 'uuid') return '00000000-0000-0000-0000-000000000000';
  if (normalizedType === 'datetime') return '2024-01-01T00:00:00Z';
  if (normalizedType === 'date') return '2024-01-01';
  if (normalizedType === 'time') return '00:00:00';

  return null;
}
```

#### 3.5 Update barrel export `/src/lib/components/index.ts`

ADD export:
```
export { default as FieldSelectorDropdown } from './api-generator/FieldSelectorDropdown.svelte';
```

### Phase 4: Page Integration

#### 4.1 Update `/src/routes/api-generator/+page.svelte`

FIND RequestBodyEditor usage (around line 250-260):
REPLACE props:
```
<RequestBodyEditor
  selectedFieldIds={state.editedEndpoint.requestBodyFieldIds}
  onAddField={state.handleAddRequestBodyField}
  onRemoveField={state.handleRemoveRequestBodyField}
/>
```

FIND ResponseBodyEditor usage (around line 270-285):
REPLACE props:
```
<ResponseBodyEditor
  selectedFieldIds={state.editedEndpoint.responseBodyFieldIds}
  useEnvelope={state.editedEndpoint.useEnvelope}
  onAddField={state.handleAddResponseBodyField}
  onRemoveField={state.handleRemoveResponseBodyField}
  onEnvelopeToggle={state.handleEnvelopeToggle}
/>
```

### Phase 5: Validation and Cleanup

#### 5.1 Add validation to state handlers

UPDATE `handleAddRequestBodyField` in apiGeneratorState.svelte.ts:
```
function handleAddRequestBodyField(fieldId: string): void {
  if (!editedEndpoint) return;

  // Validate field exists in registry
  const field = getFieldById(fieldId);
  if (!field) {
    showToast('Field not found in registry', 'error');
    return;
  }

  // Prevent duplicates
  if (editedEndpoint.requestBodyFieldIds.includes(fieldId)) return;

  editedEndpoint = {
    ...editedEndpoint,
    requestBodyFieldIds: [...editedEndpoint.requestBodyFieldIds, fieldId]
  };
}
```

UPDATE `handleAddResponseBodyField` similarly

ADD import to apiGeneratorState.svelte.ts:
```
import { getFieldById } from './fields';
```

#### 5.2 Type checking

Run: `npx svelte-check --tsconfig ./tsconfig.json`

Fix any TypeScript errors related to:
- Removed BodyMode type references
- Updated ApiEndpoint interface
- Component prop type mismatches

## Testing Checklist

After implementation:

1. Create new endpoint - verify empty body state
2. Add field to request body via dropdown - verify it appears read-only
3. Remove field from request body - verify it disappears
4. Add same field to response body - verify no duplicate prevention across bodies
5. Try adding same field twice to request body - verify duplicate prevention works
6. Verify preview JSON updates correctly based on selected fields
7. Toggle envelope wrapper - verify preview updates
8. Save endpoint - verify field IDs persist correctly
9. Reopen endpoint - verify fields load from registry by ID
10. Delete a field from registry that's used in body - verify graceful handling (shows placeholder or removes)
11. Edit field in registry - verify changes reflect in body display
12. Search in field selector dropdown - verify filtering works
13. Verify dropdown excludes already-selected fields
14. Verify field ordering matches insertion order

## Migration Notes

Existing endpoints in store will have old structure. Need migration strategy:

Option 1: Reset all endpoints (simplest for development)
Option 2: Add migration function that converts old format to new:
- `requestBodyFields` → extract field names → lookup IDs in registry → populate `requestBodyFieldIds`
- `responseBodyFields` → same process
- Clear old fields

Recommend Option 1 for current development phase (no production data yet).

## Deleted Patterns

NO LONGER VALID:
- Mode toggles (none/fields/json)
- JSON paste textarea
- Field validation errors in body editors
- Copy from request button
- Inline field creation in body editors
- Field editing in body context (all read-only references now)

## New Patterns Established

CONVENTIONS:
- Bodies reference fields, never own them
- Field registry is single source of truth
- ParameterEditor has `readOnly` mode for display
- FieldSelectorDropdown handles all field selection
- Duplicate prevention at selection time (UI level)
- Preview generation uses registry lookup
- No body-specific validation (field existence checked at selection time)

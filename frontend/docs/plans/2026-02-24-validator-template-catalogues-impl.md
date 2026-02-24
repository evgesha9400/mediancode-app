# Validator Template Catalogues — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded frontend validator templates with backend-served template catalogues, update all validator pages to be catalogue reference tables, and change the validator API contract from `functionBody` to `templateId + parameters + fieldMappings`.

**Architecture:** The backend now provides two new read-only catalogue endpoints (`GET /v1/field-validator-templates` and `GET /v1/model-validator-templates`). Validators on fields/objects are stored as template references (`templateId + parameters`) instead of raw code. The frontend loads template catalogues at startup alongside other reference data, and uses client-side `{{ }}` substitution for code preview.

**Tech Stack:** SvelteKit, Svelte 5 (runes), TypeScript, Tailwind CSS, Vitest

**Design Doc:** `docs/plans/2026-02-24-validator-template-catalogues-design.md`

---

## Phase 1: Types + API Clients

### Task 1: Update shared types

**Files:**
- Modify: `src/lib/types/index.ts`

**What to do:**

1. Replace `InlineFieldValidator` (lines 199-205) with:

```typescript
export interface InlineFieldValidator {
  id: string;
  templateId: string;
  parameters: Record<string, string> | null;
}
```

2. Replace `InlineModelValidator` (lines 207-213) with:

```typescript
export interface InlineModelValidator {
  id: string;
  templateId: string;
  parameters: Record<string, string> | null;
  fieldMappings: Record<string, string>;
}
```

3. Delete the standalone `FieldValidator` (lines 216-224) and `ModelValidator` (lines 226-234) types — they are unused.

4. Add the new template catalogue types (after `FieldConstraintBase`):

```typescript
// Validator template catalogue types (backend-served reference data)
export interface TemplateParameter {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder: string;
  options?: SelectOption[];
  required: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldMappingDefinition {
  key: string;
  label: string;
  compatibleTypes: string[];
  required: boolean;
}

export interface FieldValidatorTemplate {
  id: string;
  name: string;
  description: string;
  compatibleTypes: string[];
  mode: 'before' | 'after';
  parameters: TemplateParameter[];
  bodyTemplate: string;
}

export interface ModelValidatorTemplate {
  id: string;
  name: string;
  description: string;
  mode: 'before' | 'after';
  parameters: TemplateParameter[];
  fieldMappings: FieldMappingDefinition[];
  bodyTemplate: string;
}
```

**Step 1:** Make the type changes.

**Step 2:** Run `bun run svelte-check --tsconfig ./tsconfig.json`. This WILL produce type errors across the codebase since many files depend on the old `InlineFieldValidator` shape. That's expected — subsequent tasks fix them.

**Step 3:** Commit: `feat(types): update validator types to template-based model`

---

### Task 2: Create field validator templates API client

**Files:**
- Create: `src/lib/api/fieldValidatorTemplates.ts`
- Create: `tests/unit/lib/api/fieldValidatorTemplates.test.ts`

**What to do:**

Create `src/lib/api/fieldValidatorTemplates.ts` following the same pattern as `src/lib/api/fieldConstraints.ts`:

```typescript
import { apiGet } from './client';
import type { FieldValidatorTemplate } from '$lib/types';

interface FieldValidatorTemplateResponse {
  id: string;
  name: string;
  description: string;
  compatibleTypes: string[];
  mode: 'before' | 'after';
  parameters: {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select';
    placeholder: string;
    options?: { value: string; label: string }[];
    required: boolean;
  }[];
  bodyTemplate: string;
}

function transformFieldValidatorTemplate(response: FieldValidatorTemplateResponse): FieldValidatorTemplate {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    compatibleTypes: response.compatibleTypes,
    mode: response.mode,
    parameters: response.parameters,
    bodyTemplate: response.bodyTemplate
  };
}

export async function listFieldValidatorTemplates(): Promise<FieldValidatorTemplate[]> {
  const response = await apiGet<FieldValidatorTemplateResponse[]>('/field-validator-templates');
  return response.map(transformFieldValidatorTemplate);
}
```

Write tests mirroring `tests/unit/lib/api/fieldConstraints.test.ts` structure — mock `apiGet`, verify transform handles the response correctly.

**Step 1:** Write the test file.
**Step 2:** Run `bunx vitest run tests/unit/lib/api/fieldValidatorTemplates.test.ts` — verify it fails.
**Step 3:** Write the API client.
**Step 4:** Run the test — verify it passes.
**Step 5:** Commit: `feat(api): add field validator templates API client`

---

### Task 3: Create model validator templates API client

**Files:**
- Create: `src/lib/api/modelValidatorTemplates.ts`
- Create: `tests/unit/lib/api/modelValidatorTemplates.test.ts`

**What to do:**

Same pattern as Task 2 but for model validator templates. Endpoint: `GET /v1/model-validator-templates`. The response includes `fieldMappings: FieldMappingDefinition[]` in addition to the shared fields.

```typescript
import { apiGet } from './client';
import type { ModelValidatorTemplate } from '$lib/types';

interface ModelValidatorTemplateResponse {
  id: string;
  name: string;
  description: string;
  mode: 'before' | 'after';
  parameters: {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select';
    placeholder: string;
    options?: { value: string; label: string }[];
    required: boolean;
  }[];
  fieldMappings: {
    key: string;
    label: string;
    compatibleTypes: string[];
    required: boolean;
  }[];
  bodyTemplate: string;
}

function transformModelValidatorTemplate(response: ModelValidatorTemplateResponse): ModelValidatorTemplate {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    mode: response.mode,
    parameters: response.parameters,
    fieldMappings: response.fieldMappings,
    bodyTemplate: response.bodyTemplate
  };
}

export async function listModelValidatorTemplates(): Promise<ModelValidatorTemplate[]> {
  const response = await apiGet<ModelValidatorTemplateResponse[]>('/model-validator-templates');
  return response.map(transformModelValidatorTemplate);
}
```

**Step 1:** Write test.
**Step 2:** Verify it fails.
**Step 3:** Write the API client.
**Step 4:** Verify it passes.
**Step 5:** Commit: `feat(api): add model validator templates API client`

---

### Task 4: Update fields API client for new validator contract

**Files:**
- Modify: `src/lib/api/fields.ts`
- Modify: `tests/unit/lib/api/fields.test.ts`

**What to do:**

1. Update `FieldValidatorResponse` (line 36-42):

```typescript
interface FieldValidatorResponse {
  id: string;
  templateId: string;
  parameters: Record<string, string> | null;
}
```

2. Update `transformFieldValidator` (line 73-81):

```typescript
function transformFieldValidator(response: FieldValidatorResponse): InlineFieldValidator {
  return {
    id: response.id,
    templateId: response.templateId,
    parameters: response.parameters
  };
}
```

3. Update `CreateFieldRequest.validators` type (line 141):

```typescript
validators?: { templateId: string; parameters?: Record<string, string> }[];
```

4. Update `UpdateFieldRequest.validators` type (line 153):

```typescript
validators?: { templateId: string; parameters?: Record<string, string> }[];
```

5. Remove unused import: `InlineFieldValidator` is still imported but the shape changed. Verify the import still works with the new type.

**Step 1:** Update the API client.
**Step 2:** Update `tests/unit/lib/api/fields.test.ts` — change test fixtures to use new response shape and verify transforms.
**Step 3:** Run `bunx vitest run tests/unit/lib/api/fields.test.ts` — verify passes.
**Step 4:** Commit: `refactor(api): update fields API to template-based validators`

---

### Task 5: Update objects API client for new validator contract

**Files:**
- Modify: `src/lib/api/objects.ts`
- Modify: `tests/unit/lib/api/objects.test.ts`

**What to do:**

Same pattern as Task 4 but for objects:

1. Update `ModelValidatorResponse` (line 21-27):

```typescript
interface ModelValidatorResponse {
  id: string;
  templateId: string;
  parameters: Record<string, string> | null;
  fieldMappings: Record<string, string>;
}
```

2. Update `transformModelValidator` (line 55-63):

```typescript
function transformModelValidator(response: ModelValidatorResponse): InlineModelValidator {
  return {
    id: response.id,
    templateId: response.templateId,
    parameters: response.parameters,
    fieldMappings: response.fieldMappings
  };
}
```

3. Update `CreateObjectRequest.validators` type (line 111):

```typescript
validators?: { templateId: string; parameters?: Record<string, string>; fieldMappings: Record<string, string> }[];
```

4. Update `UpdateObjectRequest.validators` type (line 121):

```typescript
validators?: { templateId: string; parameters?: Record<string, string>; fieldMappings: Record<string, string> }[];
```

**Step 1:** Update the API client.
**Step 2:** Update `tests/unit/lib/api/objects.test.ts`.
**Step 3:** Run tests and verify passes.
**Step 4:** Commit: `refactor(api): update objects API to template-based validators`

---

## Phase 2: Stores + Loader

### Task 6: Create template catalogue stores

**Files:**
- Create: `src/lib/stores/fieldValidatorTemplates.ts`
- Create: `src/lib/stores/modelValidatorTemplates.ts`
- Create: `tests/unit/lib/stores/fieldValidatorTemplates.test.ts`
- Create: `tests/unit/lib/stores/modelValidatorTemplates.test.ts`

**What to do:**

Follow the same pattern as `src/lib/stores/fieldConstraints.ts`. These are simple writable stores with search functions.

`src/lib/stores/fieldValidatorTemplates.ts`:

```typescript
import { writable, get } from 'svelte/store';
import type { FieldValidatorTemplate } from '$lib/types';

export const fieldValidatorTemplatesStore = writable<FieldValidatorTemplate[]>([]);

export function searchFieldValidatorTemplates(
  templates: FieldValidatorTemplate[],
  query: string
): FieldValidatorTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return templates;

  return templates.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.compatibleTypes.some(ct => ct.toLowerCase().includes(q))
  );
}

export function getFieldValidatorTemplateById(id: string): FieldValidatorTemplate | undefined {
  return get(fieldValidatorTemplatesStore).find(t => t.id === id);
}
```

`src/lib/stores/modelValidatorTemplates.ts`:

```typescript
import { writable, get } from 'svelte/store';
import type { ModelValidatorTemplate } from '$lib/types';

export const modelValidatorTemplatesStore = writable<ModelValidatorTemplate[]>([]);

export function searchModelValidatorTemplates(
  templates: ModelValidatorTemplate[],
  query: string
): ModelValidatorTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return templates;

  return templates.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q)
  );
}

export function getModelValidatorTemplateById(id: string): ModelValidatorTemplate | undefined {
  return get(modelValidatorTemplatesStore).find(t => t.id === id);
}
```

Write tests for search functions and getById lookups.

**Step 1:** Write both test files.
**Step 2:** Write both store files.
**Step 3:** Run tests.
**Step 4:** Commit: `feat(stores): add field and model validator template catalogue stores`

---

### Task 7: Update loader to include template catalogues

**Files:**
- Modify: `src/lib/stores/loader.ts`
- Modify: `tests/unit/lib/stores/loader.test.ts`

**What to do:**

Template catalogues are reference data (like field constraints). Add them to **phase 1** of the loader.

1. Add imports at top:

```typescript
import { listFieldValidatorTemplates } from '$lib/api/fieldValidatorTemplates';
import { listModelValidatorTemplates } from '$lib/api/modelValidatorTemplates';
import { fieldValidatorTemplatesStore } from './fieldValidatorTemplates';
import { modelValidatorTemplatesStore } from './modelValidatorTemplates';
```

2. Add store names to `STORE_NAMES`:

```typescript
export const STORE_NAMES = {
  TYPES: 'Types',
  NAMESPACES: 'Namespaces',
  FIELD_CONSTRAINTS: 'Field Constraints',
  FIELD_VALIDATOR_TEMPLATES: 'Field Validator Templates',
  MODEL_VALIDATOR_TEMPLATES: 'Model Validator Templates',
  FIELDS: 'Fields',
  OBJECTS: 'Objects',
  APIS: 'APIs',
  ENDPOINTS: 'Endpoints',
} as const;
```

3. Add to `PHASE1_STORE_NAMES`:

```typescript
const PHASE1_STORE_NAMES = [
  STORE_NAMES.TYPES,
  STORE_NAMES.NAMESPACES,
  STORE_NAMES.FIELD_CONSTRAINTS,
  STORE_NAMES.FIELD_VALIDATOR_TEMPLATES,
  STORE_NAMES.MODEL_VALIDATOR_TEMPLATES,
] as const;
```

4. Add to `loadStoresFromApi()` phase 1 `Promise.allSettled`:

```typescript
const phase1Results = await Promise.allSettled([
  listTypes(),
  listNamespaces(),
  listFieldConstraints(),
  listFieldValidatorTemplates(),
  listModelValidatorTemplates()
]);

// ... extract results at indices 3 and 4
const fieldValidatorTemplates = phase1Results[3].status === 'fulfilled' ? phase1Results[3].value : [];
const modelValidatorTemplates = phase1Results[4].status === 'fulfilled' ? phase1Results[4].value : [];
```

5. Populate the stores after extraction:

```typescript
fieldValidatorTemplatesStore.set(fieldValidatorTemplates);
modelValidatorTemplatesStore.set(modelValidatorTemplates);
```

6. Add to `resetStores()`:

```typescript
fieldValidatorTemplatesStore.set([]);
modelValidatorTemplatesStore.set([]);
```

**Step 1:** Update the loader.
**Step 2:** Update `tests/unit/lib/stores/loader.test.ts` — add mocks for new API calls, verify stores are populated.
**Step 3:** Run tests.
**Step 4:** Commit: `feat(loader): load validator template catalogues at startup`

---

### Task 8: Add previewBody utility function

**Files:**
- Create: `src/lib/utils/templatePreview.ts`
- Create: `tests/unit/lib/utils/templatePreview.test.ts`

**What to do:**

Client-side `{{ }}` substitution for code preview (from design doc):

```typescript
// src/lib/utils/templatePreview.ts

/**
 * Replace {{placeholder}} tokens in a bodyTemplate with actual values.
 * Unreplaced placeholders are kept as-is (e.g. {{key}} stays if no mapping for key).
 */
export function previewBody(bodyTemplate: string, mappings: Record<string, string>): string {
  return bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => mappings[key] ?? `{{${key}}}`);
}
```

Tests:

```typescript
import { describe, it, expect } from 'vitest';
import { previewBody } from '$lib/utils/templatePreview';

describe('previewBody', () => {
  it('replaces known placeholders', () => {
    expect(previewBody('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('leaves unknown placeholders as-is', () => {
    expect(previewBody('{{a}} and {{b}}', { a: 'X' })).toBe('X and {{b}}');
  });

  it('handles template with no placeholders', () => {
    expect(previewBody('no placeholders', {})).toBe('no placeholders');
  });

  it('replaces multiple occurrences of same placeholder', () => {
    expect(previewBody('{{x}} + {{x}}', { x: '1' })).toBe('1 + 1');
  });

  it('handles empty mappings', () => {
    expect(previewBody('{{a}}', {})).toBe('{{a}}');
  });
});
```

**Step 1:** Write the test.
**Step 2:** Write the utility.
**Step 3:** Run tests.
**Step 4:** Commit: `feat(utils): add template body preview function`

---

## Phase 3: Mutation Pipeline

### Task 9: Update fields model payload transformation

**Files:**
- Modify: `src/lib/stores/fieldsModel.svelte.ts`
- Modify: `tests/unit/lib/stores/fieldsModel.test.ts`

**What to do:**

Update `toCreatePayload` (line 186-203) and `toUpdatePayload` (line 205-219) to use the new validator format.

In `toCreatePayload`, change the `validators` mapping (line 198-199):

```typescript
validators: item.validators.length > 0
  ? item.validators.map(v => ({ templateId: v.templateId, parameters: v.parameters ?? undefined }))
  : undefined
```

In `toUpdatePayload`, change the `validators` mapping (line 216):

```typescript
validators: item.validators.map(v => ({ templateId: v.templateId, parameters: v.parameters ?? undefined }))
```

**Step 1:** Update fieldsModel.
**Step 2:** Update tests — change fixture validators to use `{ id, templateId, parameters }` instead of `{ id, functionName, mode, functionBody }`.
**Step 3:** Run tests.
**Step 4:** Commit: `refactor(stores): update fields model for template-based validators`

---

### Task 10: Update objects model payload transformation

**Files:**
- Modify: `src/lib/stores/objectsModel.svelte.ts`
- Modify: `tests/unit/lib/stores/objectsModel.test.ts`

**What to do:**

Same as Task 9 but for objects. In `toCreatePayload` (line 187-188):

```typescript
validators: item.validators.length > 0
  ? item.validators.map(v => ({
      templateId: v.templateId,
      parameters: v.parameters ?? undefined,
      fieldMappings: v.fieldMappings
    }))
  : undefined
```

In `toUpdatePayload` (line 203):

```typescript
validators: clean.validators.map(v => ({
  templateId: v.templateId,
  parameters: v.parameters ?? undefined,
  fieldMappings: v.fieldMappings
}))
```

**Step 1:** Update objectsModel.
**Step 2:** Update tests.
**Step 3:** Run tests.
**Step 4:** Commit: `refactor(stores): update objects model for template-based validators`

---

## Phase 4: Template Components

### Task 11: Refactor TemplateGallery component

**Files:**
- Modify: `src/lib/components/validator-templates/TemplateGallery.svelte`
- Modify: `tests/unit/lib/components/validator-templates/TemplateGallery.test.ts`

**What to do:**

The component currently imports types from `$lib/utils/validatorTemplates` (the file being deleted). Update to use the shared types from `$lib/types`.

1. Change the module script imports (line 2):

```typescript
import type { FieldValidatorTemplate, ModelValidatorTemplate } from '$lib/types';
```

2. The Props interface stays the same (names match). The underlying type shapes changed but the component only uses `.name`, `.description`, `.mode` — all still present.

3. Add compatible types pills to field template cards (the gallery should show what types each template works with):

For each field template card, after the name and mode, add:
```svelte
<div class="flex flex-wrap gap-1 mt-1">
  {#each template.compatibleTypes as ctype}
    <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{ctype}</span>
  {/each}
</div>
```

4. For model template cards, add field mapping summary:
```svelte
<div class="flex flex-wrap gap-1 mt-1">
  {#each template.fieldMappings as fm}
    <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-mono-200 text-mono-600">{fm.label}</span>
  {/each}
</div>
```

**Step 1:** Update component.
**Step 2:** Update tests — change fixtures to use new type shape (remove `generateFunctionName`, `generateFunctionBody`, add `bodyTemplate`, `parameters` array).
**Step 3:** Run tests.
**Step 4:** Commit: `refactor(components): update TemplateGallery for backend templates`

---

### Task 12: Refactor TemplateForm component

**Files:**
- Modify: `src/lib/components/validator-templates/TemplateForm.svelte`
- Modify: `tests/unit/lib/components/validator-templates/TemplateForm.test.ts`

**What to do:**

Major changes:

1. Change imports (line 2):

```typescript
import type { FieldValidatorTemplate, ModelValidatorTemplate } from '$lib/types';
```

2. Change `onAdd` callback type — no longer generates code, returns template reference instead:

```typescript
/** Called when form is submitted with template reference data */
onAdd: (validator: {
  templateId: string;
  parameters?: Record<string, string>;
  fieldMappings?: Record<string, string>;
}) => void;
```

3. Remove `fieldName` prop — no longer needed (was used to generate `functionName`).

4. Support `select` parameter type. Currently the form only renders `text` and `number` inputs. Add a dropdown for `select`:

```svelte
{#if param.type === 'select' && param.options}
  <select
    id="param-{param.key}"
    bind:value={params[param.key]}
    class="w-full px-3 py-2 border border-mono-300 rounded-md text-sm focus:ring-2 focus:ring-mono-400 focus:border-transparent bg-white"
  >
    <option value="">Select...</option>
    {#each param.options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
{:else}
  <input ... />
{/if}
```

5. Change role mapping terminology. The design doc calls them `fieldMappings` (not `roles`). The template type uses `fieldMappings: FieldMappingDefinition[]` instead of `roles: TemplateRole[]`. Update the model template section to iterate `modelTemplate.fieldMappings` instead of `modelTemplate.roles`.

6. Update `handleSubmit` to return template reference instead of generated code:

```typescript
function handleSubmit() {
  if (!isValid) return;

  if (kind === 'field' && fieldTemplate) {
    const nonEmptyParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '')
    );
    onAdd({
      templateId: fieldTemplate.id,
      parameters: Object.keys(nonEmptyParams).length > 0 ? nonEmptyParams : undefined
    });
  } else if (kind === 'model' && modelTemplate) {
    const nonEmptyParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== '')
    );
    onAdd({
      templateId: modelTemplate.id,
      parameters: Object.keys(nonEmptyParams).length > 0 ? nonEmptyParams : undefined,
      fieldMappings: mappings
    });
  }
}
```

7. Add code preview section at the bottom (before the Add button) showing the `bodyTemplate` with current parameter values substituted:

```svelte
<!-- Code Preview -->
{#if template?.bodyTemplate}
  {@const allMappings = { ...mappings, ...params }}
  <div>
    <label class="block text-xs text-mono-700 mb-1 font-medium">Code Preview</label>
    <pre class="p-3 bg-mono-900 text-mono-100 rounded-md text-xs overflow-x-auto whitespace-pre font-mono">{previewBody(template.bodyTemplate, allMappings)}</pre>
  </div>
{/if}
```

Import `previewBody` from `$lib/utils/templatePreview`.

8. Remove the `customDescription` field — no longer needed (description comes from the template and is not overridable).

**Step 1:** Update the component.
**Step 2:** Update tests.
**Step 3:** Run tests.
**Step 4:** Commit: `refactor(components): update TemplateForm for backend templates with select support`

---

## Phase 5: Edit Drawers

### Task 13: Update Fields page for template-based validators

**Files:**
- Modify: `src/routes/(dashboard)/fields/+page.svelte`

**What to do:**

1. Remove imports from `$lib/utils/validatorTemplates`:

```diff
- import type { FieldValidatorTemplate } from '$lib/utils/validatorTemplates';
- import { getFieldTemplatesForType } from '$lib/utils/validatorTemplates';
```

2. Add imports for template catalogue store:

```typescript
import { fieldValidatorTemplatesStore, getFieldValidatorTemplateById } from '$lib/stores/fieldValidatorTemplates';
import { previewBody } from '$lib/utils/templatePreview';
import type { FieldValidatorTemplate } from '$lib/types';
```

3. Update `compatibleTemplates` derived (line 157-159) — filter from store instead of hardcoded utility:

```typescript
let compatibleTemplates = $derived(
  workflow.editedItem
    ? $fieldValidatorTemplatesStore.filter(t => t.compatibleTypes.includes(workflow.editedItem!.type))
    : []
);
```

4. Update `handleAddValidator` (line 170-182) — now receives template reference, not generated code:

```typescript
function handleAddValidator(data: { templateId: string; parameters?: Record<string, string> }) {
  if (!workflow.editedItem) return;
  const newValidator: InlineFieldValidator = {
    id: '',
    templateId: data.templateId,
    parameters: data.parameters ?? null
  };
  workflow.editedItem = {
    ...workflow.editedItem,
    validators: [...workflow.editedItem.validators, newValidator]
  };
  validatorGalleryOpen = false;
  selectedFieldTemplate = null;
}
```

5. Remove `fieldName` prop from `<TemplateForm>` usage (line 416).

6. Update validator list display in the drawer (lines 434-452). Instead of showing `functionName` and `mode`, show the template name (looked up from catalogue store) and a code preview pill:

```svelte
{#each workflow.editedItem.validators as validator, index}
  {@const template = getFieldValidatorTemplateById(validator.templateId)}
  <div class="flex items-center space-x-2 p-2 bg-white rounded border border-mono-200">
    <div class="flex items-center space-x-2 flex-1 min-w-0">
      <span class="text-sm text-mono-700 truncate">{template?.name ?? validator.templateId}</span>
      {#if template}
        <span class="px-2 py-0.5 text-xs rounded-full bg-mono-100 text-mono-600 shrink-0">{template.mode}</span>
      {/if}
    </div>
    <button
      type="button"
      onclick={() => removeValidator(index)}
      class="text-red-700 hover:text-red-600 transition-colors shrink-0"
      title="Remove validator"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
{/each}
```

**Step 1:** Make the changes.
**Step 2:** Run `bun run svelte-check --tsconfig ./tsconfig.json` — verify no type errors in this file.
**Step 3:** Commit: `refactor(fields): update field edit drawer for template-based validators`

---

### Task 14: Update Objects page for template-based validators

**Files:**
- Modify: `src/routes/(dashboard)/objects/+page.svelte`

**What to do:**

1. Remove imports from `$lib/utils/validatorTemplates`:

```diff
- import type { ModelValidatorTemplate } from '$lib/utils/validatorTemplates';
- import { getModelTemplates } from '$lib/utils/validatorTemplates';
```

2. Add imports:

```typescript
import { modelValidatorTemplatesStore, getModelValidatorTemplateById } from '$lib/stores/modelValidatorTemplates';
import { previewBody } from '$lib/utils/templatePreview';
import type { ModelValidatorTemplate } from '$lib/types';
```

3. Update `modelTemplates` derived (line 103):

```typescript
let modelTemplates = $derived($modelValidatorTemplatesStore);
```

4. Update `handleAddValidator` (line 122-134) — receives template reference:

```typescript
function handleAddValidator(data: { templateId: string; parameters?: Record<string, string>; fieldMappings?: Record<string, string> }) {
  if (!workflow.editedItem) return;
  const newValidator: InlineModelValidator = {
    id: '',
    templateId: data.templateId,
    parameters: data.parameters ?? null,
    fieldMappings: data.fieldMappings ?? {}
  };
  workflow.editedItem = {
    ...workflow.editedItem,
    validators: [...workflow.editedItem.validators, newValidator]
  };
  validatorGalleryOpen = false;
  selectedModelTemplate = null;
}
```

5. Update validator list display in drawer (lines 402-422). Show template name and mode from catalogue store, same pattern as Task 13.

**Step 1:** Make the changes.
**Step 2:** Run `bun run svelte-check --tsconfig ./tsconfig.json`.
**Step 3:** Commit: `refactor(objects): update object edit drawer for template-based validators`

---

## Phase 6: Catalogue Pages

### Task 15: Rewrite Field Validators page as template catalogue

**Files:**
- Modify: `src/routes/(dashboard)/validators/field-validators/+page.svelte`

**What to do:**

Complete rewrite. The page is no longer a derived view from fields store — it's a reference catalogue like Field Constraints.

Data source: `fieldValidatorTemplatesStore` (loaded at startup).

**Table columns** (from design doc):
| Column | Content |
|---|---|
| Name | Template name |
| Compatible Types | Pill list |
| Mode | `before` / `after` pill |
| Description | Truncated to first sentence |
| Used In Fields | Count + "fields" label (clickable) |

**Filters:**
- Checkbox group: "Compatible Types" — dynamically built from template data
- Toggle: "Used in fields only"

**Drawer (read-only):**
- Name, Description, Compatible Types (pill list), Mode (pill)
- Parameters (list of parameter names + types; `select` parameters show their options as pills)
- Code Preview — `bodyTemplate` shown as-is in a code block with `{{ }}` placeholders visible
- Used In Fields — count + clickable field links (same pattern as Field Constraints drawer)

"Used In Fields" computation:

```typescript
let fieldsUsingTemplate = $derived(
  state.selectedItem
    ? $fieldsStore.filter(f =>
        f.validators.some(v => v.templateId === state.selectedItem!.id)
      ).map(f => ({ name: f.name, fieldId: f.id }))
    : []
);
```

This page follows the Field Constraints page pattern closely. Use `createListViewState` with `trackEdits: false, allowDelete: false`.

Use `STORE_NAMES.FIELD_VALIDATOR_TEMPLATES` for empty state.

Add a `usedInFields` computed property to each template row for sorting/filtering by scanning `fieldsStore`.

**Step 1:** Rewrite the page.
**Step 2:** Run `bun run svelte-check --tsconfig ./tsconfig.json`.
**Step 3:** Commit: `feat(pages): rewrite field validators as template catalogue`

---

### Task 16: Rewrite Model Validators page as template catalogue

**Files:**
- Modify: `src/routes/(dashboard)/validators/model-validators/+page.svelte`

**What to do:**

Same pattern as Task 15 but for model validator templates.

Data source: `modelValidatorTemplatesStore`.

**Table columns** (from design doc):
| Column | Content |
|---|---|
| Name | Template name |
| Field Mappings | Summary of required mappings |
| Mode | `before` / `after` pill |
| Description | Truncated |
| Used In Objects | Count + "objects" label |

**Filters:**
- Toggle: "Used in objects only"

**Drawer (read-only):**
- Name, Description, Mode (pill)
- Field Mappings (list: label + compatible types per mapping)
- Parameters (if any)
- Code Preview — `bodyTemplate` with `{{ }}` syntax visible
- Used In Objects — count + clickable object links

"Used In Objects" computation:

```typescript
let objectsUsingTemplate = $derived(
  state.selectedItem
    ? $objectsStore.filter(o =>
        o.validators.some(v => v.templateId === state.selectedItem!.id)
      ).map(o => ({ name: o.name, objectId: o.id }))
    : []
);
```

Use `STORE_NAMES.MODEL_VALIDATOR_TEMPLATES` for empty state.

**Step 1:** Rewrite the page.
**Step 2:** Run `bun run svelte-check --tsconfig ./tsconfig.json`.
**Step 3:** Commit: `feat(pages): rewrite model validators as template catalogue`

---

## Phase 7: Cleanup + Verification

### Task 17: Delete hardcoded templates utility and remove dead code

**Files:**
- Delete: `src/lib/utils/validatorTemplates.ts`
- Delete: `tests/unit/lib/utils/validatorTemplates.test.ts`

**What to do:**

1. Delete `src/lib/utils/validatorTemplates.ts`.
2. Delete `tests/unit/lib/utils/validatorTemplates.test.ts`.
3. Search the ENTIRE codebase for any remaining references:

```
Grep for: validatorTemplates
Grep for: getFieldTemplatesForType
Grep for: getModelTemplates
Grep for: FIELD_VALIDATOR_TEMPLATES
Grep for: MODEL_VALIDATOR_TEMPLATES
Grep for: generateFunctionName
Grep for: generateFunctionBody
Grep for: TemplateRole
Grep for: functionBody (in validator context)
Grep for: functionName (in validator context)
```

4. Fix any remaining references found.
5. Verify no imports point to the deleted file.

**Step 1:** Delete the files.
**Step 2:** Grep for all references.
**Step 3:** Fix any remaining references.
**Step 4:** Commit: `chore(cleanup): delete hardcoded validator templates utility`

---

### Task 18: Update remaining tests and typecheck barrel

**Files:**
- Modify: `tests/unit/lib/domain/mutations.test.ts` — update validator fixtures
- Modify: `src/lib/components/index.typecheck.ts` — if it references old validator types
- Modify: any test fixture files that use old `InlineFieldValidator` / `InlineModelValidator` shape

**What to do:**

1. Search all test files for `functionName`, `functionBody`, `functionName:`, `mode:` in validator context.
2. Update all test fixtures to use new shape (`templateId`, `parameters`, `fieldMappings`).
3. Update `src/lib/components/index.typecheck.ts` if it references removed types.
4. Run full test suite: `bunx vitest run`.

**Step 1:** Update all test fixtures.
**Step 2:** Run `bunx vitest run` — all tests must pass.
**Step 3:** Commit: `test: update all validator test fixtures for template-based model`

---

### Task 19: Update API spec

**Files:**
- Modify: `docs/api-spec.yaml`

**What to do:**

Add the two new read-only endpoints to the API spec:

- `GET /v1/field-validator-templates` — returns `FieldValidatorTemplate[]`
- `GET /v1/model-validator-templates` — returns `ModelValidatorTemplate[]`

Update the field/object validator schemas in the existing endpoints to reflect the new request/response shapes.

**Step 1:** Update the spec.
**Step 2:** Commit: `docs(api-spec): add validator template catalogue endpoints`

---

### Task 20: Full verification

**Run all four mandatory checks:**

1. `bun run svelte-check --tsconfig ./tsconfig.json` — 0 errors
2. `bunx vitest run` — all tests pass
3. `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke` — smoke tests pass
4. `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud` — CRUD tests pass

**If any test fails, fix it before marking this task complete.**

**Step 1:** Run svelte-check.
**Step 2:** Run vitest.
**Step 3:** Run smoke tests.
**Step 4:** Run CRUD tests.
**Step 5:** Fix any failures.
**Step 6:** Final commit if needed: `fix: address test failures from validator template migration`

---

## Summary of File Changes

### Files to Create (6)
- `src/lib/api/fieldValidatorTemplates.ts`
- `src/lib/api/modelValidatorTemplates.ts`
- `src/lib/stores/fieldValidatorTemplates.ts`
- `src/lib/stores/modelValidatorTemplates.ts`
- `src/lib/utils/templatePreview.ts`
- Tests for each of the above (5 test files)

### Files to Modify (14+)
- `src/lib/types/index.ts` — type definitions
- `src/lib/api/fields.ts` — validator response/request types
- `src/lib/api/objects.ts` — validator response/request types
- `src/lib/stores/loader.ts` — phase 1 loading
- `src/lib/stores/fieldsModel.svelte.ts` — payload mapping
- `src/lib/stores/objectsModel.svelte.ts` — payload mapping
- `src/lib/components/validator-templates/TemplateGallery.svelte` — backend types
- `src/lib/components/validator-templates/TemplateForm.svelte` — backend types + select + code preview
- `src/routes/(dashboard)/fields/+page.svelte` — validator UI in drawer
- `src/routes/(dashboard)/objects/+page.svelte` — validator UI in drawer
- `src/routes/(dashboard)/validators/field-validators/+page.svelte` — rewrite as catalogue
- `src/routes/(dashboard)/validators/model-validators/+page.svelte` — rewrite as catalogue
- `docs/api-spec.yaml` — new endpoints
- All associated test files

### Files to Delete (2)
- `src/lib/utils/validatorTemplates.ts`
- `tests/unit/lib/utils/validatorTemplates.test.ts`

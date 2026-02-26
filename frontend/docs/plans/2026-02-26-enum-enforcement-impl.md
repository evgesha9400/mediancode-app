# Frontend Enum Enforcement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centralize enum constants, update local OpenAPI spec to match live backend, and replace hardcoded string literals in components with references to those constants. Fix inconsistent mode display.

**Architecture:** Add constant arrays next to existing type unions in `src/lib/types/index.ts`. Update component templates to iterate over or reference these constants instead of hardcoding values. Update `docs/api-spec.yaml` to match the live backend spec at `https://api.dev.mediancode.com/openapi.json`.

**Tech Stack:** SvelteKit 5, TypeScript, Tailwind CSS

---

### Task 1: Add enum constants to types

**Files:**
- Modify: `src/lib/types/index.ts`

**Step 1: Add constants after the existing type unions**

After line 106 (`export type HttpMethod = ...`), add:
```typescript
export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
```

After line 111 (`export type ResponseShape = ...`), add:
```typescript
export const RESPONSE_SHAPES: ResponseShape[] = ['object', 'list'];
```

After line 180 (`container: string | null;` inside `Field`), add a standalone constant near the Field interface (after the interface closing brace):
```typescript
export const CONTAINER_VALUES = ['List'] as const;
```

After line 240 (`mode: 'before' | 'after';` inside `FieldValidatorTemplate`), add a standalone constant near the validator template types:
```typescript
export const VALIDATOR_MODES = ['before', 'after'] as const;
```

**Step 2: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 3: Run unit tests**

Run: `bunx vitest run`
Expected: All pass (no interface changes)

**Step 4: Commit**

Message: `feat(types): add centralized enum constant arrays`

---

### Task 2: Use HTTP_METHODS in endpoint method select

**Files:**
- Modify: `src/routes/(dashboard)/apis/[id]/+page.svelte`

**Step 1: Add import**

Add `HTTP_METHODS` to the existing types import. The file imports from `$lib/types` at line 29 (`import type { ... } from '$lib/types';`). Since `HTTP_METHODS` is a value (not a type), add a separate import:
```typescript
import { HTTP_METHODS } from '$lib/types';
```

**Step 2: Replace hardcoded options with loop**

Replace lines 417-421:
```svelte
<option value="GET">GET</option>
<option value="POST">POST</option>
<option value="PUT">PUT</option>
<option value="PATCH">PATCH</option>
<option value="DELETE">DELETE</option>
```

With:
```svelte
{#each HTTP_METHODS as method}
  <option value={method}>{method}</option>
{/each}
```

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Commit**

Message: `refactor(apis): use HTTP_METHODS constant for method select`

---

### Task 3: Use RESPONSE_SHAPES in response shape toggles

**Files:**
- Modify: `src/lib/components/api-generator/ResponseBodyEditor.svelte`

**Step 1: Add import**

Add to the instance `<script>` block (after line 15):
```typescript
import { RESPONSE_SHAPES } from '$lib/types';
```

**Step 2: Replace hardcoded string literals**

The toggle buttons at lines 63 and 73 use hardcoded `'object'` and `'list'`. Replace with references to `RESPONSE_SHAPES[0]` and `RESPONSE_SHAPES[1]`. However, since we also need the labels ("Object" and "List of Objects") and icons, a simple loop won't work cleanly here — the two buttons have different icons and labels.

Instead, define a local mapping at the top of the instance script:
```typescript
const SHAPE_OPTIONS: { value: ResponseShape; label: string; icon: string }[] = [
  { value: 'object', label: 'Object', icon: 'fa-solid fa-box' },
  { value: 'list', label: 'List of Objects', icon: 'fa-solid fa-list' }
];
```

Then replace the two button elements (lines 61-81) with:
```svelte
<div class="flex gap-1">
  {#each SHAPE_OPTIONS as option}
    <button
      type="button"
      onclick={() => onSetResponseShape(option.value)}
      class="flex-1 px-1.5 py-1 text-sm border rounded-md transition-colors {responseShape === option.value
        ? 'bg-mono-900 text-white border-mono-900'
        : 'bg-white text-mono-700 border-mono-300 hover:border-mono-400'}"
    >
      <i class="{option.icon} mr-1.5"></i>
      {option.label}
    </button>
  {/each}
</div>
```

Note: This approach keeps the `RESPONSE_SHAPES` import unused. Since the options array is local to this component and includes UI metadata (label, icon), just use `ResponseShape` type for the value. Remove the unused `RESPONSE_SHAPES` import.

Actually, simpler: skip the import entirely. The values are already type-constrained by `ResponseShape`. The real value of this task is centralizing the shape options into a local const so the template is DRY. No need to import `RESPONSE_SHAPES` since the component already knows its own option labels/icons.

**Revised Step 1: Add local SHAPE_OPTIONS array**

In the instance `<script>` block, after line 19, add:
```typescript
const SHAPE_OPTIONS: { value: ResponseShape; label: string; icon: string }[] = [
  { value: 'object', label: 'Object', icon: 'fa-solid fa-box' },
  { value: 'list', label: 'List of Objects', icon: 'fa-solid fa-list' }
];
```

**Revised Step 2: Replace hardcoded buttons with loop**

Replace lines 60-81 (the `<div class="flex gap-1">` block) with the `{#each}` version above.

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Run unit tests**

Run: `bunx vitest run tests/unit/lib/components/api-generator/ResponseBodyEditor.test.ts`
Expected: All pass

**Step 5: Commit**

Message: `refactor(apis): use SHAPE_OPTIONS constant for response shape toggles`

---

### Task 4: Use CONTAINER_VALUES in field container toggles

**Files:**
- Modify: `src/routes/(dashboard)/fields/+page.svelte`

**Step 1: Add import**

Add a value import for `CONTAINER_VALUES`:
```typescript
import { CONTAINER_VALUES } from '$lib/types';
```

**Step 2: Replace hardcoded 'List' string literal**

At line 371, replace:
```svelte
onclick={() => handleContainerChange('List')}
```
With:
```svelte
onclick={() => handleContainerChange(CONTAINER_VALUES[0])}
```

At line 372, replace:
```svelte
class="... {workflow.editedItem.container === 'List' ? ...}"
```
With:
```svelte
class="... {workflow.editedItem.container === CONTAINER_VALUES[0] ? ...}"
```

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Commit**

Message: `refactor(fields): use CONTAINER_VALUES constant for container toggles`

---

### Task 5: Fix inconsistent mode display — TemplateGallery

**Files:**
- Modify: `src/lib/components/validator-templates/TemplateGallery.svelte`

**Step 1: Add Pill import**

In the module `<script>` block (line 2), add `Pill` to the imports. Since the module script currently imports types from `$lib/types`, add a new import in the instance `<script>` block:
```typescript
import Pill from '../pill/Pill.svelte';
```

**Step 2: Replace raw spans with Pill**

At line 83, replace:
```svelte
<span class="px-2 py-0.5 text-xs rounded-full bg-mono-100 text-mono-600">{template.mode}</span>
```
With:
```svelte
<Pill>{template.mode}</Pill>
```

At line 104, replace the same pattern:
```svelte
<span class="px-2 py-0.5 text-xs rounded-full bg-mono-100 text-mono-600">{template.mode}</span>
```
With:
```svelte
<Pill>{template.mode}</Pill>
```

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Run unit tests**

Run: `bunx vitest run tests/unit/lib/components/validator-templates/TemplateGallery.test.ts`
Expected: All pass

**Step 5: Commit**

Message: `style(validators): use Pill component for mode display in TemplateGallery`

---

### Task 6: Fix inconsistent mode display — Objects page

**Files:**
- Modify: `src/routes/(dashboard)/objects/+page.svelte`

**Step 1: Verify Pill is already imported**

The objects page already imports `Pill` from `$lib/components` (line 11). No new import needed.

**Step 2: Replace raw span with Pill**

At line 409, replace:
```svelte
<span class="px-2 py-0.5 text-xs rounded-full bg-mono-100 text-mono-600 shrink-0">{tmpl?.mode ?? 'after'}</span>
```
With:
```svelte
<Pill class="shrink-0">{tmpl?.mode ?? 'after'}</Pill>
```

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Commit**

Message: `style(objects): use Pill component for validator mode display`

---

### Task 7: Update OpenAPI spec — endpoint enums

**Files:**
- Modify: `docs/api-spec.yaml`

**Step 1: Add enum to ApiEndpointResponse.method**

At lines 1089-1093, change:
```yaml
        method:
          type: string
          title: Method
          examples:
          - GET
```
To:
```yaml
        method:
          type: string
          enum:
          - GET
          - POST
          - PUT
          - PATCH
          - DELETE
          title: Method
          examples:
          - GET
```

**Step 2: Add enum to ApiEndpointResponse.responseShape**

At lines 1145-1149, change:
```yaml
        responseShape:
          type: string
          title: Responseshape
          examples:
          - object
```
To:
```yaml
        responseShape:
          type: string
          enum:
          - object
          - list
          title: Responseshape
          examples:
          - object
```

**Step 3: Validate spec**

Run: `bunx @apidevtools/swagger-cli validate docs/api-spec.yaml`
Expected: No errors

**Step 4: Commit**

Message: `docs(api-spec): add enum constraints to endpoint response schema`

---

### Task 8: Update OpenAPI spec — field container

**Files:**
- Modify: `docs/api-spec.yaml`

**Step 1: Add container to FieldCreate**

After the `validators` property in `FieldCreate` (around line 1591), add the `container` property:
```yaml
        container:
          anyOf:
          - type: string
            const: List
          - type: 'null'
          title: Container
          examples:
          - List
```

**Step 2: Add container to FieldResponse**

After the `validators` property in `FieldResponse` (around line 1670), add:
```yaml
        container:
          anyOf:
          - type: string
            const: List
          - type: 'null'
          title: Container
```

**Step 3: Add container to FieldUpdate**

After the `validators` property in `FieldUpdate` (around line 1734), add:
```yaml
        container:
          anyOf:
          - type: string
            const: List
          - type: 'null'
          title: Container
          examples:
          - List
```

**Step 4: Validate spec**

Run: `bunx @apidevtools/swagger-cli validate docs/api-spec.yaml`
Expected: No errors

**Step 5: Commit**

Message: `docs(api-spec): add container field to field schemas`

---

### Task 9: Update OpenAPI spec — validator template mode enums

**Files:**
- Modify: `docs/api-spec.yaml`

**Step 1: Add enum to FieldValidatorTemplateResponse.mode**

At lines 1819-1821, change:
```yaml
        mode:
          type: string
          title: Mode
```
To:
```yaml
        mode:
          type: string
          enum:
          - before
          - after
          title: Mode
```

**Step 2: Add enum to ModelValidatorTemplateResponse.mode**

At lines 1948-1950, change:
```yaml
        mode:
          type: string
          title: Mode
```
To:
```yaml
        mode:
          type: string
          enum:
          - before
          - after
          title: Mode
```

**Step 3: Validate spec**

Run: `bunx @apidevtools/swagger-cli validate docs/api-spec.yaml`
Expected: No errors

**Step 4: Commit**

Message: `docs(api-spec): add enum constraints to validator template mode`

---

### Task 10: Final verification

**Step 1: Type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 2: Unit/integration tests**

Run: `bunx vitest run`
Expected: All pass

**Step 3: Smoke tests**

Run: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
Expected: All pass

**Step 4: CRUD tests**

Run: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
Expected: All pass

---

### Task 11: Cleanup

**Step 1: Delete plan and design files**

```bash
rm docs/plans/2026-02-26-enum-enforcement-design.md
rm docs/plans/2026-02-26-enum-enforcement-impl.md
rm docs/plans/2026-02-26-enum-enforcement-frontend-prompt.md
```

**Step 2: Commit**

Message: `chore: remove completed enum enforcement plans`

# Frontend Enum Enforcement — Design

## Problem

The backend enforces enum constraints via `Literal` types, and the live OpenAPI spec (`/openapi.json`) now includes `enum` arrays for several fields. The local `docs/api-spec.yaml` is out of date, and the frontend hardcodes enum values as scattered string literals rather than centralized constants.

## Affected Fields

| Field | Enum Values | Schemas | UI Control |
|---|---|---|---|
| `method` | `GET, POST, PUT, PATCH, DELETE` | EndpointCreate/Update/Response | `<select>` dropdown |
| `responseShape` | `object, list` | EndpointCreate/Update/Response | Toggle buttons |
| `container` | `List` (or `null`) | FieldCreate/Update/Response | Toggle buttons (None/List) |
| `mode` | `before, after` | FieldValidatorTemplate/ModelValidatorTemplateResponse | Read-only pill |

## Decisions

- **No submit-time validation** — UI controls already constrain input; backend validates too.
- **No new form components** — each control is used exactly once.
- **No color-coding for mode pills** — keep monochrome, consistent with design system.
- **Constants live in `src/lib/types/index.ts`** — next to existing type unions.

## Changes

### 1. OpenAPI Spec (`docs/api-spec.yaml`)

Align with live backend spec:
- Add `enum` to `method` and `responseShape` on `ApiEndpointResponse`
- Add `container` property to `FieldCreate`, `FieldResponse`, `FieldUpdate`
- Add `enum: [before, after]` to `mode` on both validator template responses

### 2. Centralized Constants (`src/lib/types/index.ts`)

```typescript
export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
export const RESPONSE_SHAPES: ResponseShape[] = ['object', 'list'];
export const CONTAINER_VALUES = ['List'] as const;
export const VALIDATOR_MODES: Array<'before' | 'after'> = ['before', 'after'];
```

### 3. Component Updates

- **method select**: Replace hardcoded `<option>` elements with `{#each HTTP_METHODS}` loop
- **responseShape toggles**: Replace hardcoded string literals with `RESPONSE_SHAPES` references
- **container toggles**: Replace hardcoded `'List'` with `CONTAINER_VALUES[0]`
- **mode display**: Replace raw `<span>` tags with `<Pill>` component (3 locations)

### Files Touched

| File | Change |
|---|---|
| `docs/api-spec.yaml` | Add missing enums/const/container |
| `src/lib/types/index.ts` | Add 4 constant arrays |
| `src/routes/(dashboard)/apis/[id]/+page.svelte` | Loop over `HTTP_METHODS` |
| `src/lib/components/api-generator/ResponseBodyEditor.svelte` | Use `RESPONSE_SHAPES` |
| `src/routes/(dashboard)/fields/+page.svelte` | Use `CONTAINER_VALUES` |
| `src/lib/components/validator-templates/TemplateGallery.svelte` | `<span>` to `<Pill>` |
| `src/routes/(dashboard)/objects/+page.svelte` | `<span>` to `<Pill>` |

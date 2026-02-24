# Validator Template Catalogues Design

**Date:** 2026-02-24
**Status:** Approved

## Problem

The three pages under the Validators sidebar section are inconsistent:
- **Field Constraints** is a reference catalogue of available Pydantic constraint annotations
- **Field Validators** is a derived view of validators attached to fields
- **Model Validators** is a derived view of validators attached to objects

The attached-validator views are low-value because they duplicate information already visible on the Fields and Objects edit drawers. The pages should instead be template catalogues, consistent with Field Constraints.

## Decision

Replace the Field Validators and Model Validators pages with **template catalogue pages** — read-only reference tables of available validator templates. Templates become backend-registered resources. Raw `functionBody` is no longer accepted in the API; validators are created exclusively by referencing a `templateId` with parameters and (for model validators) field mappings.

## Design

### Page Layout — Field Validators

Data source: backend template catalogue (`GET /v1/field-validator-templates`).

**Table columns:**

| Column | Content |
|---|---|
| Name | Template name (e.g. "Strip & Lowercase") |
| Compatible Types | Pill list (e.g. `str`, `int float`) |
| Mode | `before` / `after` pill |
| Description | Template description (truncated to first sentence) |
| Used In Fields | Count + "fields" label (clickable, like Field Constraints) |

**Filters:**
- Checkbox group: "Compatible Types"
- Toggle: "Used in fields only"

**Drawer (read-only):**
- Name, Description, Compatible Types (pill list), Mode (pill)
- Parameters (list of parameter names + types, if any)
- Code Preview — `bodyTemplate` shown as-is in a code block
- Used In Fields — count + clickable field links (same pattern as Field Constraints drawer)

### Page Layout — Model Validators

**Table columns:**

| Column | Content |
|---|---|
| Name | Template name (e.g. "Password Confirmation") |
| Field Mappings | Summary of required mappings (e.g. "password, confirm") |
| Mode | `before` / `after` pill |
| Description | Template description (truncated) |
| Used In Objects | Count + "objects" label |

**Filters:**
- Toggle: "Used in objects only"

**Drawer (read-only):**
- Name, Description, Mode (pill)
- Field Mappings (list: label + compatible types per mapping)
- Parameters (if any)
- Code Preview — `bodyTemplate` with `{{placeholder}}` syntax visible
- Used In Objects — count + clickable object links

### Backend Template Resource

Two new read-only endpoints:

```
GET /v1/field-validator-templates    → FieldValidatorTemplate[]
GET /v1/model-validator-templates    → ModelValidatorTemplate[]
```

**FieldValidatorTemplate:**
```typescript
{
  id: string;
  name: string;
  description: string;
  compatibleTypes: string[];
  mode: 'before' | 'after';
  parameters: TemplateParameter[];
  bodyTemplate: string;
}
```

**ModelValidatorTemplate:**
```typescript
{
  id: string;
  name: string;
  description: string;
  mode: 'before' | 'after';
  parameters: TemplateParameter[];
  fieldMappings: FieldMappingDefinition[];
  bodyTemplate: string;                    // uses {{placeholder}} syntax
}
```

**TemplateParameter:**
```typescript
{
  key: string;
  label: string;
  type: 'text' | 'number';
  placeholder: string;
  required: boolean;
}
```

**FieldMappingDefinition:**
```typescript
{
  key: string;
  label: string;
  compatibleTypes: string[];  // [] for any type
  required: boolean;
}
```

Templates are seeded backend data (like field constraints). No create/update/delete.

### API Contract Change — Attaching Validators

**Current (removed):**
```typescript
validators: [{ functionName, mode, functionBody, description }]
```

**New — Field validator (on field create/update):**
```typescript
validators: [{
  templateId: string;
  parameters?: Record<string, string>;
}]
```

**New — Model validator (on object create/update):**
```typescript
validators: [{
  templateId: string;
  parameters?: Record<string, string>;
  fieldMappings: Record<string, string>;
}]
```

Backend resolves templateId, substitutes parameters/fieldMappings into bodyTemplate, generates functionName, and produces final Python code. No raw functionBody accepted.

**Backend response** includes resolved code plus templateId for traceability:
```typescript
validators: [{
  id: string;
  templateId: string;
  functionName: string;
  mode: 'before' | 'after';
  functionBody: string;       // resolved with real values
  description: string | null;
}]
```

### "Used In" Tracking

With `templateId` on each validator instance, frontend computes counts by scanning fields/objects stores:

```typescript
// Field validator templates
const usedInFields = $fieldsStore.filter(f =>
  f.validators.some(v => v.templateId === template.id)
);

// Model validator templates
const usedInObjects = $objectsStore.filter(o =>
  o.validators.some(v => v.templateId === template.id)
);
```

### Frontend Code Preview

**Template catalogue pages:** Show `bodyTemplate` as-is with placeholders visible.

**Field/object edit drawers:** Client-side substitution for preview when user selects parameters/fieldMappings:
```typescript
function previewBody(bodyTemplate: string, mappings: Record<string, string>): string {
  return bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => mappings[key] ?? `{{${key}}}`);
}
```

### Impact on Fields/Objects Pages

- Attached validators display stays on edit drawers
- Each validator shows which template it came from (pill/label)
- Function body shown is the resolved version from the backend
- Adding validators still uses TemplateGallery + TemplateForm, but sends `{ templateId, parameters, fieldMappings }` instead of generated code

### What Gets Deleted

- `src/lib/utils/validatorTemplates.ts` — hardcoded templates with JS code generation functions (replaced by backend resource)
- TemplateGallery and TemplateForm components are refactored to work with backend template data

## Philosophy Alignment

- **Structural, not behavioral:** Templates encode common patterns as configuration. No code authoring.
- **Deterministic:** Same templateId + parameters + fieldMappings always produces the same Python.
- **Templates-only:** No raw functionBody accepted. Guarantees working generated code.
- **Reference catalogues:** All three Validators pages are now catalogues of available options.
- **"Generate structure, leave behavior to post-generation":** If a user's validation doesn't fit a template, they add it after deployment.

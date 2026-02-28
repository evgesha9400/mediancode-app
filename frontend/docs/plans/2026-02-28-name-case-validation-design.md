# Client-Side Name Case Validation

## Problem

The backend now enforces strict case rules on name fields (`PascalCaseName`, `SnakeCaseName`). Sending an invalid name returns a 422. The frontend must validate names before submission to provide instant inline feedback.

## Affected Entities

| Entity | Field | Required Case |
|---|---|---|
| Field (create/edit) | `name` | snake_case |
| Object (create/edit) | `name` | PascalCase |
| Endpoint (create/edit) | `pathParams[].name` | snake_case |

## Validation Rules

### snake_case

- Regex: `^[a-z][a-z0-9]*(_[a-z0-9]+)*$`
- Valid: `email`, `user_email`, `created_at`, `field2`
- Invalid: `Email`, `userEmail`, `user__email`, `_email`, `email_`, `user-email`, `123field`, ``

### PascalCase

- Starts with uppercase letter, letters and digits only, no consecutive uppercase
- Regex: `^[A-Z](?!.*[A-Z]{2})[a-zA-Z0-9]*$`
- Valid: `User`, `UserEmail`, `Product2`
- Invalid: `user`, `userEmail`, `user_email`, `USer`, ``

## Design

### New file: `src/lib/utils/validation.ts`

Two pure functions:

```typescript
export function isValidSnakeCaseName(value: string): boolean {
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(value);
}

export function isValidPascalCaseName(value: string): boolean {
  return /^[A-Z](?!.*[A-Z]{2})[a-zA-Z0-9]*$/.test(value);
}
```

### Wiring into existing validation

**`fieldsModel.svelte.ts`** — in existing `validate()` function, after the empty-name check:

```typescript
if (item.name.trim() && !isValidSnakeCaseName(item.name)) {
  errors.name = 'Must be snake_case (e.g. user_email)';
}
```

**`objectsModel.svelte.ts`** — same pattern in existing `validate()`:

```typescript
if (item.name.trim() && !isValidPascalCaseName(item.name)) {
  errors.name = 'Must be PascalCase (e.g. UserEmail)';
}
```

**`apiDetailState.svelte.ts`** — endpoint path param validation. Endpoints currently have no client-side validation. Add a `pathError` state variable that is set during `handlePathChange()`:

```typescript
let pathError = $state<string>('');

function handlePathChange(newPath: string): void {
  if (!editedEndpoint) return;
  const { path, pathParams } = reconcilePathParams(newPath, editedEndpoint.pathParams);
  editedEndpoint = { ...editedEndpoint, path, pathParams };

  // Validate extracted param names
  const invalidParam = pathParams.find(p => p.name && !isValidSnakeCaseName(p.name));
  pathError = invalidParam
    ? `Path parameter '${invalidParam.name}' must be snake_case (e.g. user_id)`
    : '';
}
```

Expose `pathError` from the state module; render it below the path input in the endpoint drawer.

### Error messages

- snake_case fields: `"Must be snake_case (e.g. user_email)"`
- PascalCase fields: `"Must be PascalCase (e.g. UserEmail)"`
- Path params: `"Path parameter '{name}' must be snake_case (e.g. user_id)"`

### Validation trigger

Follows existing pattern: errors computed reactively via `$derived` but only shown after `formTouched` is set (first save attempt) for fields/objects. Path param errors shown immediately on path change (instant feedback since the user is actively editing the path).

### No auto-transformation

Names are sent as-is. Validation rejects invalid input; it does not silently convert.

## Testing

- Unit tests for `isValidSnakeCaseName` and `isValidPascalCaseName` covering exact valid/invalid examples from backend spec
- Existing E2E CRUD tests exercise validation in context

## Out of scope

- Display prettification (e.g. `user_email` → "User Email")
- Read endpoint changes (GET responses unchanged)
- Retroactive validation of existing data

# Client-Side Name Case Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add client-side name validation to field, object, and endpoint forms so users get instant inline errors instead of 422s from the backend.

**Architecture:** Two pure validator functions in a new `src/lib/utils/validation.ts`. Each entity's existing `validate()` function gets one additional check. Endpoint path gets a new `pathError` state variable.

**Tech Stack:** SvelteKit 5, Svelte 5 runes, Vitest, Playwright

---

### Task 1: Create validation utility with tests

**Files:**
- Create: `src/lib/utils/validation.ts`
- Create: `tests/unit/lib/utils/validation.test.ts`

**Step 1: Write the failing tests**

Create `tests/unit/lib/utils/validation.test.ts`:

```typescript
// tests/unit/lib/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { isValidSnakeCaseName, isValidPascalCaseName } from '$lib/utils/validation';

describe('isValidSnakeCaseName', () => {
  it.each([
    'email',
    'user_email',
    'created_at',
    'field2',
    'a',
    'a1_b2'
  ])('accepts valid snake_case name: %s', (name) => {
    expect(isValidSnakeCaseName(name)).toBe(true);
  });

  it.each([
    ['Email', 'starts with uppercase'],
    ['userEmail', 'camelCase'],
    ['user__email', 'consecutive underscores'],
    ['_email', 'starts with underscore'],
    ['email_', 'ends with underscore'],
    ['user-email', 'contains hyphen'],
    ['123field', 'starts with digit'],
    ['', 'empty string'],
    ['user email', 'contains space'],
    ['user_Email', 'uppercase after underscore']
  ])('rejects invalid name: %s (%s)', (name) => {
    expect(isValidSnakeCaseName(name)).toBe(false);
  });
});

describe('isValidPascalCaseName', () => {
  it.each([
    'User',
    'UserEmail',
    'Product2',
    'A',
    'Ab',
    'Ab2c'
  ])('accepts valid PascalCase name: %s', (name) => {
    expect(isValidPascalCaseName(name)).toBe(true);
  });

  it.each([
    ['user', 'starts with lowercase'],
    ['userEmail', 'starts with lowercase (camelCase)'],
    ['user_email', 'snake_case'],
    ['USer', 'consecutive uppercase'],
    ['', 'empty string'],
    ['User_Email', 'contains underscore'],
    ['User Email', 'contains space'],
    ['2User', 'starts with digit'],
    ['User-Email', 'contains hyphen'],
    ['ABc', 'consecutive uppercase at start']
  ])('rejects invalid name: %s (%s)', (name) => {
    expect(isValidPascalCaseName(name)).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bunx vitest run tests/unit/lib/utils/validation.test.ts`
Expected: FAIL — cannot resolve `$lib/utils/validation`

**Step 3: Write minimal implementation**

Create `src/lib/utils/validation.ts`:

```typescript
// src/lib/utils/validation.ts

/**
 * Validates that a name follows snake_case rules.
 * Must start with lowercase letter, contain only lowercase letters, digits,
 * and single underscores (no leading/trailing/consecutive underscores).
 */
export function isValidSnakeCaseName(value: string): boolean {
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(value);
}

/**
 * Validates that a name follows PascalCase rules.
 * Must start with uppercase letter, contain only letters and digits,
 * no consecutive uppercase letters.
 */
export function isValidPascalCaseName(value: string): boolean {
  return /^[A-Z](?!.*[A-Z]{2})[a-zA-Z0-9]*$/.test(value);
}
```

**Step 4: Run tests to verify they pass**

Run: `bunx vitest run tests/unit/lib/utils/validation.test.ts`
Expected: All tests PASS

**Step 5: Commit**

Message suggestion: `feat(validators): add snake_case and PascalCase name validators`

---

### Task 2: Add snake_case validation to field forms

**Files:**
- Modify: `src/lib/stores/fieldsModel.svelte.ts` (line 163, the `validate` function)

**Step 1: Modify the validate function**

In `src/lib/stores/fieldsModel.svelte.ts`, add the import at the top (after line 21, with the other util imports):

```typescript
import { isValidSnakeCaseName } from '$lib/utils/validation';
```

Then modify the `validate` function (line 163-179). After the empty-name check on line 165, add the case validation. The full function becomes:

```typescript
  function validate(item: Field): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!item.name.trim()) {
      errors.name = 'Field name is required';
    } else if (!isValidSnakeCaseName(item.name)) {
      errors.name = 'Must be snake_case (e.g. user_email)';
    }
    if (!item.type) errors.type = 'Type is required';
    const emptyParam = item.constraints.find(c => c.value === null || c.value === '');
    if (emptyParam) errors.constraints = `Constraint "${emptyParam.name}" requires a value`;

    if (item.defaultValue && item.defaultValue !== 'None') {
      if (item.type === 'int' && !/^-?\d+$/.test(item.defaultValue)) {
        errors.defaultValue = 'Default value must be a whole number';
      }
      if (item.type === 'float' && !/^-?\d+(\.\d+)?$/.test(item.defaultValue)) {
        errors.defaultValue = 'Default value must be a number';
      }
    }
    return errors;
  }
```

**Step 2: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 3: Run unit tests**

Run: `bunx vitest run`
Expected: All tests PASS

**Step 4: Commit**

Message suggestion: `feat(fields): add snake_case validation to field name input`

---

### Task 3: Add PascalCase validation to object forms

**Files:**
- Modify: `src/lib/stores/objectsModel.svelte.ts` (line 161, the `validate` function)

**Step 1: Modify the validate function**

In `src/lib/stores/objectsModel.svelte.ts`, add the import at the top (after line 21, with the other util imports):

```typescript
import { isValidPascalCaseName } from '$lib/utils/validation';
```

Then modify the `validate` function (line 161-165). The full function becomes:

```typescript
  function validate(item: ObjectDefinition): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!item.name.trim()) {
      errors.name = 'Object name is required';
    } else if (!isValidPascalCaseName(item.name)) {
      errors.name = 'Must be PascalCase (e.g. UserEmail)';
    }
    return errors;
  }
```

**Step 2: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 3: Run unit tests**

Run: `bunx vitest run`
Expected: All tests PASS

**Step 4: Commit**

Message suggestion: `feat(objects): add PascalCase validation to object name input`

---

### Task 4: Add path parameter validation to endpoint forms

**Files:**
- Modify: `src/lib/stores/apiDetailState.svelte.ts` (interface + handlePathChange + return object)
- Modify: `src/routes/(dashboard)/apis/[id]/+page.svelte` (render pathError below path input)

**Step 1: Add pathError state and validation to apiDetailState**

In `src/lib/stores/apiDetailState.svelte.ts`:

1. Add import at the top (after line 30, with other util imports):

```typescript
import { isValidSnakeCaseName } from '$lib/utils/validation';
```

2. Add `pathError` to the `ApiDetailState` interface (after line 97, the `hasEndpointChanges` line):

```typescript
	readonly pathError: string;
```

3. Add `pathError` state variable inside `createApiDetailState()`. Place it near the other endpoint-related state variables (around line 230, near `isSaving`):

```typescript
	let pathError = $state('');
```

4. Modify `handlePathChange` (line 574-578) to validate extracted params:

```typescript
	function handlePathChange(newPath: string): void {
		if (!editedEndpoint) return;
		const { path, pathParams } = reconcilePathParams(newPath, editedEndpoint.pathParams);
		editedEndpoint = { ...editedEndpoint, path, pathParams };

		const invalidParam = pathParams.find(p => p.name && !isValidSnakeCaseName(p.name));
		pathError = invalidParam
			? `Path parameter '${invalidParam.name}' must be snake_case (e.g. user_id)`
			: '';
	}
```

5. Clear `pathError` when opening/closing endpoint drawer. In `openEndpoint` (line 512), add after `tagDropdownOpen = false;`:

```typescript
		pathError = '';
```

In `closeEndpointDrawer` (line 522), add after `showEndpointDeleteConfirm = false;`:

```typescript
		pathError = '';
```

In `handleUndoEndpoint` (line 564), add after `tagInputValue = editedEndpoint?.tagName ?? '';`:

```typescript
		pathError = '';
```

6. Block save/create when `pathError` is set. In `handleSaveEndpoint` (line 531), add after the existing guard:

```typescript
		if (pathError) return false;
```

In `handleCreateEndpoint` (line 411), add after `if (!editedEndpoint) return;`:

```typescript
		if (pathError) return;
```

7. Expose `pathError` in the return object (after line 682, the `isSaving` getter):

```typescript
		get pathError() { return pathError; },
```

**Step 2: Render pathError in the endpoint drawer**

In `src/routes/(dashboard)/apis/[id]/+page.svelte`, add the error message after the path input's closing `</div>` (after line 432). The section becomes:

```svelte
            </div>
            {#if apiState.pathError}
              <p class="text-xs text-red-500 mt-1">{apiState.pathError}</p>
            {/if}
          </div>
```

**Step 3: Run type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 4: Run unit tests**

Run: `bunx vitest run`
Expected: All tests PASS

**Step 5: Commit**

Message suggestion: `feat(endpoints): add snake_case validation to path parameters`

---

### Task 5: Run full validation suite

**Step 1: Type check**

Run: `bun run svelte-check --tsconfig ./tsconfig.json`
Expected: 0 errors

**Step 2: Unit tests**

Run: `bunx vitest run`
Expected: All tests PASS

**Step 3: Smoke tests**

Run: `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke`
Expected: All tests PASS

**Step 4: E2E CRUD tests**

Run: `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud`
Expected: All tests PASS

If any E2E tests fail because they use names that violate the new case rules (e.g. `testField` instead of `test_field`), update the test fixtures to use valid names.

---

### Task 6: Clean up plan files

**Step 1: Delete plan files**

```bash
rm docs/plans/2026-02-28-name-case-validation-design.md
rm docs/plans/2026-02-28-name-case-validation-impl.md
```

**Step 2: Commit**

Message suggestion: `chore: remove completed name case validation plans`

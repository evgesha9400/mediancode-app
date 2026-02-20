# Field Validators Implementation Plan

## Claude Agent Instructions

This document is a **base prompt for Claude agents** implementing the Field Validators feature across the Median Code platform (frontend and backend). Each phase is self-contained and can be handed to a Claude agent as a standalone task.

**Before starting any phase:**

1. Read `CLAUDE.md` at the project root for project structure, code organization rules, and conventions.
2. Read `src/lib/types/index.ts` for the current type definitions.
3. Read `src/lib/stores/fieldConstraints.ts` and `src/lib/stores/fieldsModel.svelte.ts` for the established store and CRUD model patterns.
4. Read `src/routes/(dashboard)/validators/field-constraints/+page.svelte` for the canonical list page UI pattern.
5. Read `src/lib/domain/mutations.ts` for the canonical mutation pipeline pattern.
6. Run `bun run svelte-check --tsconfig ./tsconfig.json` and `bunx vitest run` after every change.

**Key conventions to follow:**

- Component directories (`src/lib/components/*/`) contain ONLY `.svelte` files (plus one `index.ts` barrel export).
- Shared types go in `src/lib/types/index.ts`.
- Store files go in `src/lib/stores/`.
- API client modules go in `src/lib/api/`.
- Domain mutation logic goes in `src/lib/domain/mutations.ts`.
- All imports use barrel exports from `$lib/components`, `$lib/api`, etc.
- Follow the monochrome design system (mono-50 through mono-900).
- Use conventional commit messages: `feat(field-validators): ...`

---

## 1. Overview

### What Are Field Validators?

Field validators are Pydantic `@field_validator` decorator functions that run custom imperative logic on individual field values during model validation. They are the imperative counterpart to field constraints.

**Field Constraints** (already implemented) are **declarative parameters** passed to `Field()`:

```python
# Declarative: constraint parameters
name: str = Field(min_length=1, max_length=255, pattern=r'^[a-z]+$')
```

**Field Validators** (this feature) are **imperative functions** that execute custom validation logic:

```python
# Imperative: function body with custom logic
@field_validator('email', mode='before')
@classmethod
def validate_email(cls, v: str) -> str:
    import re
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
        raise ValueError('Invalid email format')
    return v.lower()
```

### The "Median" Philosophy

Median Code covers 80% of common validation cases through templates (email validation, string cleanup, number range, regex matching, etc.). For the remaining 20%, users can write custom code or use AI to generate it. The template system is the primary entry point -- users should rarely need to write validators from scratch.

### How Field Validators Fit in the Platform

```
Types --> Fields --> [Constraints (declarative)] --> Objects --> Endpoints --> API
                 \-> [Validators (imperative)]  /
```

A field can have zero or more constraints AND zero or more validators. During code generation, both are emitted into the generated Pydantic model: constraints as `Field()` parameters, validators as `@field_validator` decorated methods on the model class.

---

## 2. Data Model

### 2.1 Frontend Types

These types will be added to `src/lib/types/index.ts`, following the existing pattern established by `FieldConstraintBase` and `FieldConstraintValue`.

```typescript
// ============================================================================
// Field Validator Types
// ============================================================================

/**
 * A field validator definition (the reusable template/function).
 * Mirrors the pattern of FieldConstraintBase.
 */
export interface FieldValidatorBase {
  id: string;
  namespaceId: string;
  name: string;              // e.g. "validate_email", "normalize_username"
  description: string;        // Human-readable description of what this does
  compatibleTypes: string[];  // ["str"], ["int", "float"], ["Any"]
  mode: 'before' | 'after';  // Pydantic validator mode
  code: string;               // Python function body (everything inside the def)
}

/**
 * A reference to a validator attached to a field.
 * Mirrors the pattern of FieldConstraintValue.
 *
 * Unlike FieldConstraintValue which has a `value` parameter,
 * FieldValidatorReference has no extra config -- the code IS the validator.
 */
export interface FieldValidatorReference {
  validatorId: string;
  name: string;  // Denormalized name for display (populated by backend)
}
```

**Pattern parallel with field constraints:**

| Concept | Field Constraints | Field Validators |
|---------|------------------|-----------------|
| Definition type | `FieldConstraintBase` | `FieldValidatorBase` |
| Attachment type | `FieldConstraintValue` | `FieldValidatorReference` |
| Attachment has params | Yes (`value: string \| null`) | No (code is self-contained) |
| Stored on Field | `constraints: FieldConstraintValue[]` | `validators: FieldValidatorReference[]` |
| System-provided | Yes (global namespace, locked) | Yes (template-based seeds in global namespace) |
| User-created | No (constraints are Pydantic built-ins) | Yes (custom validators with user-written code) |

### 2.2 Backend Database Tables

#### Primary Table: `field_validators`

```sql
CREATE TABLE field_validators (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR(255) NOT NULL,    -- Clerk user ID (tenant isolation)
    namespace_id    UUID NOT NULL REFERENCES namespaces(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    compatible_types TEXT[] NOT NULL,           -- PostgreSQL array: ['str'], ['int', 'float'], ['Any']
    mode            VARCHAR(10) NOT NULL CHECK (mode IN ('before', 'after')),
    code            TEXT NOT NULL,              -- Python function body
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, namespace_id, name)
);

CREATE INDEX idx_field_validators_user_namespace ON field_validators(user_id, namespace_id);
```

#### Attachment: JSONB on Fields Table

Field validators are attached to fields the same way field constraints are: as an array embedded in the field record. Looking at the existing `FieldCreate` schema in `api-spec.yaml`, constraints are passed as an array in the request body:

```yaml
# Existing pattern (FieldCreate):
constraints:
  items:
    $ref: '#/components/schemas/FieldConstraintValueInput'
  type: array
```

Field validators follow the same pattern:

```yaml
# New addition to FieldCreate/FieldUpdate:
validators:
  items:
    $ref: '#/components/schemas/FieldValidatorReferenceInput'
  type: array
```

The backend stores these references in the existing `fields` table, either as:
- A JSONB column `validators` (consistent with how constraints are likely stored), OR
- A junction table `field_validator_attachments`

**Recommendation:** Use the same storage pattern as field constraints. If constraints are stored as a JSONB array on the fields table, validators should be too. If constraints use a junction table, validators should too. The backend codebase should be consulted to determine which pattern is in use.

Given the API spec shows constraints as a nested array in `FieldResponse`, the most likely backend implementation is a junction table `field_constraint_values` that gets serialized into the response. Follow the same pattern:

```sql
CREATE TABLE field_validator_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id        UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    validator_id    UUID NOT NULL REFERENCES field_validators(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(field_id, validator_id)
);

CREATE INDEX idx_fva_field ON field_validator_attachments(field_id);
CREATE INDEX idx_fva_validator ON field_validator_attachments(validator_id);
```

The `ON DELETE RESTRICT` on `validator_id` ensures a validator cannot be deleted while attached to any field (matching the deletion guard pattern used by field constraints).

### 2.3 Backend API Endpoints

All endpoints follow the patterns established by the existing field constraints, fields, and objects endpoints in `api-spec.yaml`. Authentication uses Clerk JWT (`HTTPBearer` security scheme). All request/response bodies use `camelCase` field names (matching the existing API convention).

#### `GET /v1/field-validators`

List all field validators accessible to the authenticated user.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `namespaceId` | `string \| null` | No | Filter by namespace |

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "namespaceId": "uuid",
    "name": "validate_email",
    "description": "Validate email format and normalize to lowercase",
    "compatibleTypes": ["str"],
    "mode": "before",
    "code": "import re\npattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'\nif not re.match(pattern, v):\n    raise ValueError('Invalid email format')\nreturn v.lower()",
    "usedInFields": 3,
    "createdAt": "2026-01-25T10:30:00Z",
    "updatedAt": "2026-01-25T10:30:00Z"
  }
]
```

**Error Responses:**
- `401 Unauthorized` -- Missing or invalid JWT
- `422 Validation Error` -- Invalid query parameters

#### `GET /v1/field-validators/{validator_id}`

Get a single field validator by ID.

**Path Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `validator_id` | `string (UUID)` | Yes | Validator ID |

**Response:** `200 OK` -- Same schema as list item above.

**Error Responses:**
- `401 Unauthorized`
- `404 Not Found` -- Validator does not exist or belongs to another user
- `422 Validation Error`

#### `POST /v1/field-validators`

Create a new field validator.

**Request Body:**
```json
{
  "namespaceId": "uuid",
  "name": "validate_email",
  "description": "Validate email format and normalize to lowercase",
  "compatibleTypes": ["str"],
  "mode": "before",
  "code": "import re\nif not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', v):\n    raise ValueError('Invalid email format')\nreturn v.lower()"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `namespaceId` | `string (UUID)` | Yes | Namespace to create in |
| `name` | `string` | Yes | Validator function name (must be valid Python identifier) |
| `description` | `string` | No | Human-readable description |
| `compatibleTypes` | `string[]` | Yes | List of compatible field types |
| `mode` | `"before" \| "after"` | Yes | Pydantic validator mode |
| `code` | `string` | Yes | Python function body |

**Response:** `201 Created` -- Full validator object (same schema as GET response).

**Validation Rules:**
- `name` must be a valid Python identifier (`^[a-zA-Z_][a-zA-Z0-9_]*$`)
- `name` must be unique within the namespace
- `code` must not be empty
- `compatibleTypes` must contain at least one entry
- `mode` must be `"before"` or `"after"`
- Namespace must not be locked (system validators in global namespace cannot be created by users)

**Error Responses:**
- `401 Unauthorized`
- `409 Conflict` -- Validator with same name already exists in namespace
- `422 Validation Error` -- Invalid request body

#### `PUT /v1/field-validators/{validator_id}`

Update an existing field validator.

**Path Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `validator_id` | `string (UUID)` | Yes | Validator ID |

**Request Body:**
```json
{
  "name": "validate_email_v2",
  "description": "Updated description",
  "compatibleTypes": ["str", "EmailStr"],
  "mode": "after",
  "code": "updated code..."
}
```

All fields are optional. Only provided fields are updated.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string \| null` | No | Updated name |
| `description` | `string \| null` | No | Updated description |
| `compatibleTypes` | `string[] \| null` | No | Updated compatible types |
| `mode` | `"before" \| "after" \| null` | No | Updated mode |
| `code` | `string \| null` | No | Updated code |

**Response:** `200 OK` -- Full updated validator object.

**Validation Rules:**
- Same rules as POST for any provided fields
- Cannot update validators in locked namespaces
- If `name` is changed, must not conflict with existing validators in the same namespace

**Error Responses:**
- `401 Unauthorized`
- `403 Forbidden` -- Validator is in a locked namespace
- `404 Not Found`
- `409 Conflict` -- Name conflict
- `422 Validation Error`

#### `DELETE /v1/field-validators/{validator_id}`

Delete a field validator.

**Path Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `validator_id` | `string (UUID)` | Yes | Validator ID |

**Response:** `204 No Content`

**Deletion Guard:**
- Cannot delete if the validator is currently attached to any fields
- Cannot delete validators in locked namespaces

**Error Responses:**
- `401 Unauthorized`
- `403 Forbidden` -- Locked namespace
- `409 Conflict` -- Validator is in use by fields (response includes `usedInFields` count)
- `404 Not Found`

#### Field Endpoint Changes

The existing `FieldCreate`, `FieldUpdate`, and `FieldResponse` schemas need to be extended:

**`FieldValidatorReferenceInput` (new schema):**
```json
{
  "validatorId": "uuid"
}
```

**`FieldValidatorReferenceResponse` (new schema):**
```json
{
  "validatorId": "uuid",
  "name": "validate_email"
}
```

**`FieldCreate` changes:**
```yaml
# Add to existing FieldCreate schema:
validators:
  items:
    $ref: '#/components/schemas/FieldValidatorReferenceInput'
  type: array
  title: Validators
```

**`FieldUpdate` changes:**
```yaml
# Add to existing FieldUpdate schema:
validators:
  anyOf:
    - items:
        $ref: '#/components/schemas/FieldValidatorReferenceInput'
      type: array
    - type: 'null'
  title: Validators
```

**`FieldResponse` changes:**
```yaml
# Add to existing FieldResponse schema:
validators:
  items:
    $ref: '#/components/schemas/FieldValidatorReferenceResponse'
  type: array
  title: Validators
```

---

## 3. Phased Implementation Plan

### Phase 1: Core CRUD (MVP) `[High Complexity]`

**Goal:** Full create/read/update/delete for field validators, plus attaching validators to fields.

#### Phase 1A: Backend -- Database and API

**Files to create/modify (backend repo):**

| File | Action | Description |
|------|--------|-------------|
| `alembic/versions/xxx_add_field_validators.py` | Create | DB migration for `field_validators` and `field_validator_attachments` tables |
| `app/models/field_validator.py` | Create | SQLAlchemy model for `FieldValidator` |
| `app/models/field_validator_attachment.py` | Create | SQLAlchemy model for `FieldValidatorAttachment` |
| `app/schemas/field_validator.py` | Create | Pydantic schemas: `FieldValidatorCreate`, `FieldValidatorUpdate`, `FieldValidatorResponse` |
| `app/schemas/field.py` | Modify | Add `validators` field to `FieldCreate`, `FieldUpdate`, `FieldResponse` |
| `app/crud/field_validator.py` | Create | CRUD operations for field validators |
| `app/crud/field.py` | Modify | Handle validator attachments in field create/update |
| `app/api/v1/field_validators.py` | Create | Router with GET, POST, PUT, DELETE endpoints |
| `app/api/v1/__init__.py` | Modify | Register field validators router |
| `tests/api/test_field_validators.py` | Create | API endpoint tests |
| `tests/crud/test_field_validator_crud.py` | Create | CRUD unit tests |

**Seed data (system validators in global namespace):**

The following system validators should be seeded as locked entries in the global namespace. These are the 8 templates from the Field Validators page (`src/routes/(dashboard)/validators/field-validators/+page.svelte`):

1. `validate_email` -- Email format validation + lowercase normalization
2. `validate_number_range` -- Min/max bounds check for numbers
3. `normalize_string` -- Strip, lowercase, length limit
4. `validate_regex` -- Custom regex pattern matching
5. `validate_enum` -- Allowed values membership check
6. `validate_url` -- URL format with protocol validation
7. `validate_length` -- Min/max string length bounds
8. `blank_validator` -- Empty template for custom logic

Each seed validator should have `mode: 'after'` as default, `compatibleTypes` matching the template's intended use, and `code` matching the `generateCode` output from the gallery prototype with default values.

**Acceptance criteria:**
- [ ] All 5 CRUD endpoints return correct responses
- [ ] System validators are seeded in the global namespace and are locked (cannot be modified/deleted)
- [ ] Validators in locked namespaces return `403 Forbidden` on write operations
- [ ] Deletion is blocked with `409 Conflict` when validator is attached to fields
- [ ] `usedInFields` count is correctly calculated in GET responses
- [ ] Fields can be created/updated with `validators` array
- [ ] `FieldResponse` includes denormalized `validators` array with names
- [ ] All existing field tests still pass (backward-compatible -- `validators` defaults to `[]`)

#### Phase 1B: Frontend -- Types, Store, API Client

**Files to create/modify (frontend repo):**

| File | Action | Description |
|------|--------|-------------|
| `src/lib/types/index.ts` | Modify | Add `FieldValidatorBase`, `FieldValidatorReference` types; add `validators` to `Field` interface |
| `src/lib/stores/fieldValidators.ts` | Create | Writable store, search function, deletion check |
| `src/lib/api/fieldValidators.ts` | Create | API client: `listFieldValidators`, `getFieldValidator`, `createFieldValidatorApi`, `updateFieldValidatorApi`, `deleteFieldValidatorApi` |
| `src/lib/api/index.ts` | Modify | Re-export from `fieldValidators.ts` |
| `src/lib/api/fields.ts` | Modify | Add `validators` to `FieldResponse`, `CreateFieldRequest`, `UpdateFieldRequest` |
| `src/lib/stores/loader.ts` | Modify | Add `listFieldValidators` to phase 1 loading (alongside types and field constraints) |
| `src/lib/domain/mutations.ts` | Modify | Add `createFieldValidatorAction`, `updateFieldValidatorAction`, `deleteFieldValidatorAction` |
| `src/lib/utils/references.ts` | Modify | Add `checkFieldValidatorDeletion` function |

**Store pattern** (mirrors `fieldConstraints.ts`):

```typescript
// src/lib/stores/fieldValidators.ts

import { writable, get } from 'svelte/store';
import type { FieldValidatorBase } from '$lib/types';

export interface FieldValidator extends FieldValidatorBase {
  usedInFields: number;
}

export const fieldValidatorsStore = writable<FieldValidator[]>([]);

export function searchFieldValidators(
  validators: FieldValidator[],
  query: string
): FieldValidator[] {
  // Search by name, description, compatibleTypes, mode
}

export function getFieldValidatorsByFieldType(
  fieldTypeName: string
): FieldValidator[] {
  // Filter by compatibleTypes (include "Any" as wildcard)
}
```

**API client pattern** (mirrors `fieldConstraints.ts` + CRUD from `fields.ts`):

```typescript
// src/lib/api/fieldValidators.ts

export async function listFieldValidators(namespaceId?: string): Promise<FieldValidator[]>;
export async function getFieldValidator(id: string): Promise<FieldValidator>;
export async function createFieldValidatorApi(data: CreateFieldValidatorRequest): Promise<FieldValidator>;
export async function updateFieldValidatorApi(id: string, data: UpdateFieldValidatorRequest): Promise<FieldValidator>;
export async function deleteFieldValidatorApi(id: string): Promise<void>;
```

**Loader changes** (`src/lib/stores/loader.ts`):

```typescript
// Add to PHASE1_STORE_NAMES:
const PHASE1_STORE_NAMES = ['Types', 'Namespaces', 'Field Constraints', 'Field Validators'] as const;

// Add to phase 1 Promise.allSettled:
const phase1Results = await Promise.allSettled([
  listTypes(),
  listNamespaces(),
  listFieldConstraints(),
  listFieldValidators()    // NEW
]);
```

**Field type update** (`src/lib/types/index.ts`):

```typescript
export interface Field {
  id: string;
  namespaceId: string;
  name: string;
  type: string;
  description?: string;
  defaultValue?: string;
  constraints: FieldConstraintValue[];
  validators: FieldValidatorReference[];  // NEW
  usedInApis: string[];
}
```

**Acceptance criteria:**
- [ ] `fieldValidatorsStore` loads from API on dashboard init
- [ ] Type checker passes with zero errors
- [ ] All existing tests pass (backward-compatible -- `validators` defaults to `[]` on existing fields)
- [ ] API client supports all 5 CRUD operations
- [ ] Mutation actions follow the established pattern in `mutations.ts`

#### Phase 1C: Frontend -- List Page UI

**Files to create/modify:**

| File | Action | Description |
|------|--------|-------------|
| `src/lib/stores/fieldValidatorsModel.svelte.ts` | Create | Per-entity CRUD model (mirrors `fieldsModel.svelte.ts`) |
| `src/routes/(dashboard)/validators/field-validators/+page.svelte` | Replace | Full list page with table, drawer, CRUD |

**Model pattern** (mirrors `fieldsModel.svelte.ts`):

The `fieldValidatorsModel.svelte.ts` factory composes `createListViewState` with CRUD-specific state:
- `openCreate()` opens the drawer in create mode with a blank draft
- `handleSave()` calls the update mutation
- `handleCreate()` calls the create mutation
- `handleDelete()` calls the delete mutation with deletion guard
- Validates `name` (required, valid Python identifier) and `code` (required, non-empty)

**Page layout:**

The field validators list page follows the same structure as the field constraints page:
- `PageHeader` with title and a "New Validator" button (via `actions` snippet)
- `SearchBar` with filter panel
- `Table` with sortable columns: Name, Mode, Compatible Types, Description, Used In Fields
- `Drawer` with view/edit form including a code editor textarea
- `CrudDrawerFooter` with Save/Delete/Undo buttons

**Table columns:**

| Column | Sortable | Content |
|--------|----------|---------|
| Name | Yes | Validator name with lock icon for system entities |
| Mode | Yes | `before` / `after` badge |
| Compatible Types | No | Type badges (same style as field constraints) |
| Description | No | First sentence, truncated |
| Used In Fields | Yes | Count badge |

**Drawer sections (view/edit mode):**
- System entity banner (if locked)
- Name input field
- Description textarea
- Mode selector (before/after dropdown)
- Compatible Types multi-select
- Code editor (textarea with `font-mono`, dark background)
- "Used In Fields" list with navigation links

**Filter config:**

```typescript
type FieldValidatorFilterState = {
  selectedCompatibleTypes: string[];
  selectedModes: string[];
  onlyUsedInFields: boolean;
};
```

**Acceptance criteria:**
- [ ] List page displays all validators with correct data
- [ ] Search works across name, description, compatible types
- [ ] Sorting works on Name, Mode, Used In Fields columns
- [ ] Filters work for compatible types, mode, and usage
- [ ] Drawer opens on row click with full validator details
- [ ] Create new validator via "New Validator" button
- [ ] Edit existing user-created validators
- [ ] Delete user-created validators (with deletion guard)
- [ ] System validators (global namespace, locked) show as read-only
- [ ] Code editor textarea displays and edits Python code
- [ ] Type checker passes, all tests pass

#### Phase 1D: Frontend -- Field-Validator Attachment

**Files to modify:**

| File | Action | Description |
|------|--------|-------------|
| `src/routes/(dashboard)/fields/+page.svelte` | Modify | Show validators in field drawer, allow attaching/detaching |
| `src/lib/stores/fieldsModel.svelte.ts` | Modify | Include validators in create/update payloads |
| `src/lib/api/fields.ts` | Modify | Include validators in request/response transforms |
| `src/lib/components/FieldValidatorEditor.svelte` | Create | Validator attachment UI component (mirrors `FieldConstraintEditor.svelte`) |
| `src/lib/components/index.ts` | Modify | Export new component |

**FieldValidatorEditor component:**

A component that lets users attach/detach validators to a field, similar to `FieldConstraintEditor` for constraints. It shows:
- List of currently attached validators with remove buttons
- Dropdown/search to add a new validator (filtered by field type compatibility)
- Each attached validator shows its name, mode, and a link to view the full validator

**Acceptance criteria:**
- [ ] Fields page drawer shows attached validators
- [ ] Users can attach validators to fields (filtered by compatible type)
- [ ] Users can detach validators from fields
- [ ] Field create/update payloads include validator references
- [ ] Validators "Used In Fields" count updates when attached/detached

---

### Phase 2: Template System `[Medium Complexity]`

**Goal:** Make the template gallery the primary entry point for creating validators. Users pick a template, customize it, and save.

#### Phase 2A: Template Gallery as Creation Flow

**Files to create/modify:**

| File | Action | Description |
|------|--------|-------------|
| `src/lib/components/field-validator/index.ts` | Create | Barrel export for field validator components |
| `src/lib/components/field-validator/TemplateGallery.svelte` | Create | Template selection grid |
| `src/lib/components/field-validator/TemplateCustomizer.svelte` | Create | Form fields for template customization |
| `src/lib/components/field-validator/CodePreview.svelte` | Create | Read-only Python code preview with syntax highlighting |
| `src/lib/components/index.ts` | Modify | Export field validator components |
| `src/routes/(dashboard)/validators/field-validators/+page.svelte` | Modify | Integrate template gallery into creation flow |

**Creation flow:**

1. User clicks "New Validator" button on list page
2. A modal or full-page view shows the template gallery (8 templates from the gallery prototype)
3. User selects a template
4. The customizer view opens with template-specific form fields (from the gallery prototype)
5. Live code preview shows the generated Python code
6. User clicks "Save" to create the validator via the API
7. Validator appears in the list

**Template definitions:**

The 8 templates from the gallery prototype (`src/routes/(dashboard)/prototypes/field-validators/gallery/+page.svelte`) serve as the template catalog:

| Template | Icon | Description | Default Compatible Types |
|----------|------|-------------|-------------------------|
| Email Format | `fa-envelope` | Validate email format + normalize | `["str"]` |
| Number Range | `fa-arrow-up-1-9` | Min/max bounds check | `["int", "float"]` |
| String Cleanup | `fa-broom` | Strip, lowercase, length limit | `["str"]` |
| Regex Pattern | `fa-code` | Custom regex matching | `["str"]` |
| Enum Membership | `fa-list-check` | Allowed values check | `["str"]` |
| URL Format | `fa-link` | URL validation with protocol | `["str"]` |
| Length Bounds | `fa-ruler-horizontal` | Min/max string length | `["str"]` |
| Blank Validator | `fa-file-circle-plus` | Empty template for custom code | `["Any"]` |

**Template metadata** should be defined as a constant in `src/lib/utils/` or as a data file, NOT in a component directory (per CLAUDE.md rules). The template definition includes the form fields and code generation function (same as in the gallery prototype).

**Acceptance criteria:**
- [ ] Template gallery displays all 8 templates
- [ ] Selecting a template opens a customizer with pre-filled form fields
- [ ] Code preview updates in real-time as form fields change
- [ ] "Save" creates a validator via the API with the generated code
- [ ] Created validator appears in the list immediately
- [ ] "Blank Validator" template allows fully custom code entry
- [ ] Template gallery respects the mono design system

#### Phase 2B: Syntax Highlighting Utility

**Files to create:**

| File | Action | Description |
|------|--------|-------------|
| `src/lib/utils/pythonHighlight.ts` | Create | Python syntax highlighting utility |

The three prototypes (gallery, REPL, test-driven) all duplicate the same Python syntax highlighting logic. This should be extracted into a shared utility. The utility:
- Takes a Python code string
- Returns HTML with `<span>` tags for colored tokens
- Supports keywords, builtins, decorators, strings, comments, numbers, type hints
- Uses the project's mono color palette for dark backgrounds

**Acceptance criteria:**
- [ ] Shared utility works identically to the prototype implementations
- [ ] Prototype pages can be refactored to use the shared utility (optional in this phase)
- [ ] Code preview component uses the shared utility

---

### Phase 3: AI Builder `[High Complexity]`

**Goal:** Users describe a validator in natural language, and AI generates the Python code.

#### Phase 3A: Backend -- AI Code Generation Endpoint

**Files to create/modify (backend repo):**

| File | Action | Description |
|------|--------|-------------|
| `app/api/v1/field_validators.py` | Modify | Add `POST /v1/field-validators/generate` endpoint |
| `app/services/ai_validator_generator.py` | Create | AI service for code generation |
| `tests/api/test_field_validator_ai.py` | Create | Tests for AI endpoint |

**Endpoint: `POST /v1/field-validators/generate`**

**Request Body:**
```json
{
  "description": "Validate that the value is a valid US phone number in format (XXX) XXX-XXXX",
  "fieldType": "str",
  "mode": "after"
}
```

**Response:** `200 OK`
```json
{
  "name": "validate_us_phone",
  "description": "Validates US phone number format: (XXX) XXX-XXXX",
  "code": "import re\npattern = r'^\\(\\d{3}\\) \\d{3}-\\d{4}$'\nif not re.match(pattern, v):\n    raise ValueError('Must be a valid US phone number: (XXX) XXX-XXXX')\nreturn v",
  "compatibleTypes": ["str"],
  "mode": "after"
}
```

The AI generates:
- A valid Python function name
- A description
- The function body code
- Inferred compatible types

The user can then edit the generated code before saving.

**Safety considerations:**
- The AI prompt must instruct the model to ONLY generate validator code (no imports except `re`, no side effects)
- The generated code should be validated for basic Python syntax
- Rate limiting on the AI endpoint
- Token/credit cost tracking

#### Phase 3B: Frontend -- AI Builder UI

**Files to create/modify:**

| File | Action | Description |
|------|--------|-------------|
| `src/lib/components/field-validator/AiBuilder.svelte` | Create | AI builder input form |
| `src/lib/api/fieldValidators.ts` | Modify | Add `generateFieldValidator` API function |
| `src/routes/(dashboard)/validators/field-validators/+page.svelte` | Modify | Add "Build with AI" entry point |

**UI flow:**

1. User clicks "Build with AI" button (alongside "New Validator" and template gallery)
2. A modal opens with:
   - Natural language textarea: "Describe what the validator should do..."
   - Field type selector dropdown
   - Mode selector (before/after)
   - "Generate" button
3. On generate:
   - Loading spinner
   - AI response populates the customizer form with generated name, description, code
   - Code preview shows the generated Python
4. User can edit the generated code
5. "Save" creates the validator

**Acceptance criteria:**
- [ ] "Build with AI" opens the AI builder modal
- [ ] Natural language input generates valid validator code
- [ ] Generated code is editable before saving
- [ ] Error handling for AI generation failures
- [ ] Loading state during generation
- [ ] Generated validator can be saved via the standard creation flow

---

### Phase 4: Testing and Debugging Tools `[Medium Complexity]`

**Goal:** Provide a test-driven development experience and interactive debugging for validators.

#### Phase 4A: Test Table (from test-driven prototype)

**Files to create/modify:**

| File | Action | Description |
|------|--------|-------------|
| `src/lib/components/field-validator/TestTable.svelte` | Create | TDD-style test case table |
| `src/lib/utils/validatorExecutor.ts` | Create | Client-side Python-to-JS validator execution engine |

The test table (from `src/routes/(dashboard)/prototypes/field-validators/test-driven/+page.svelte`) lets users define test cases and see pass/fail status in real-time:

| # | Input Value | Expected Result | Expected Output | Status |
|---|-------------|-----------------|-----------------|--------|
| 1 | `  Alice  ` | Transform | `alice` | Pass |
| 2 | `ab` | Reject | `Must be at least 3 characters` | Pass |
| 3 | `` | Reject | `Cannot be empty` | Fail |

The execution engine (`validatorExecutor.ts`) simulates common Python validator operations in JavaScript (same as in the REPL prototype). This is a "best effort" client-side simulation -- it covers the 80% case of common patterns (strip, lower, regex, length checks, raise ValueError).

This component integrates into the validator editor drawer or a dedicated editor view.

**Acceptance criteria:**
- [ ] Test cases can be added, removed, edited
- [ ] Test cases run against the validator code in real-time
- [ ] Pass/fail status updates as code or test cases change
- [ ] Summary shows passing count / total count
- [ ] Test table is reusable across the editor and any future views

#### Phase 4B: Interactive REPL (from REPL prototype)

**Files to create/modify:**

| File | Action | Description |
|------|--------|-------------|
| `src/lib/components/field-validator/ReplEditor.svelte` | Create | Line-by-line REPL editor |

The REPL editor (from `src/routes/(dashboard)/prototypes/field-validators/repl/+page.svelte`) provides a line-by-line coding experience with autocomplete and instant execution feedback. This is an alternative to the code textarea for users who prefer step-by-step construction.

This integrates as a tab/mode within the validator editor, alongside the textarea and test table.

**Acceptance criteria:**
- [ ] REPL editor allows adding, editing, removing lines
- [ ] Autocomplete suggestions appear on focus
- [ ] Line-by-line execution shows traces
- [ ] Generated code from REPL matches the standard code format
- [ ] Can switch between REPL mode and textarea mode

---

### Phase 5: Code Generation Integration `[Medium Complexity]`

**Goal:** Validators are correctly emitted in the generated FastAPI code.

#### Phase 5A: Backend -- Code Generator Updates

**Files to modify (backend repo):**

| File | Action | Description |
|------|--------|-------------|
| `app/generator/models.py` (or equivalent) | Modify | Emit `@field_validator` decorators on Pydantic models |
| `app/generator/imports.py` (or equivalent) | Modify | Add `from pydantic import field_validator` import |
| `tests/generator/test_validator_generation.py` | Create | Code generation tests |

**Code generation rules:**

1. **Import statement:** If any field on a model has validators, add `from pydantic import field_validator` to the imports.

2. **Decorator placement:** For each field that has validators, emit the validator method on the model class:

```python
from pydantic import BaseModel, Field, field_validator

class UserCreate(BaseModel):
    email: str = Field(max_length=255)
    username: str = Field(min_length=3)

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v: str) -> str:
        import re
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Invalid email format')
        return v.lower()

    @field_validator('username', mode='before')
    @classmethod
    def normalize_username(cls, v: str) -> str:
        v = v.strip()
        v = v.lower()
        return v
```

3. **Multiple validators on the same field:** Each validator becomes a separate `@field_validator` method. Pydantic executes them in definition order.

4. **Shared validators across fields on the same model:** If the same validator is attached to multiple fields on the same model, use Pydantic's multi-field syntax:

```python
@field_validator('email', 'backup_email', mode='before')
@classmethod
def validate_email(cls, v: str) -> str:
    ...
```

5. **Validator naming conflicts:** If two different validators would produce methods with the same name on the same model, the code generator should suffix them (e.g., `validate_email_1`, `validate_email_2`).

6. **Function body wrapping:** The stored `code` is the function body. The code generator wraps it with the decorator, classmethod, and function signature:

```python
# Stored code:
# "import re\nif not re.match(...):\n    raise ValueError(...)\nreturn v.lower()"

# Generated output:
@field_validator('email', mode='before')
@classmethod
def validate_email(cls, v):
    import re
    if not re.match(...):
        raise ValueError(...)
    return v.lower()
```

**Acceptance criteria:**
- [ ] Generated models include `@field_validator` for fields with validators
- [ ] Multiple validators on one field generate separate methods
- [ ] Shared validators across fields use multi-field syntax
- [ ] Import statements are correct
- [ ] Generated code passes `ruff check` and `mypy`
- [ ] Fields with no validators generate the same code as before (backward-compatible)

---

## 4. Naming Consistency Table

Following the project's naming consistency rule (see CLAUDE.md and the naming consistency convention in project memory):

| Layer | Name |
|-------|------|
| Route directory | `field-validators` |
| Sidebar label | `Field Validators` |
| Sidebar icon | `fa-input-text` |
| Store file | `fieldValidators.ts` |
| Store variable | `fieldValidatorsStore` |
| Model file | `fieldValidatorsModel.svelte.ts` |
| Type name (base) | `FieldValidatorBase` |
| Type name (store) | `FieldValidator` |
| Type name (reference) | `FieldValidatorReference` |
| API path | `/v1/field-validators` |
| API client file | `fieldValidators.ts` (in `src/lib/api/`) |
| API client functions | `listFieldValidators`, `createFieldValidatorApi`, `updateFieldValidatorApi`, `deleteFieldValidatorApi` |
| DB table (validators) | `field_validators` |
| DB table (attachments) | `field_validator_attachments` |
| Mutation actions | `createFieldValidatorAction`, `updateFieldValidatorAction`, `deleteFieldValidatorAction` |
| Component prefix | `FieldValidator` |
| Component directory | `src/lib/components/field-validator/` |
| Test fixture file | `tests/fixtures/fieldValidators.ts` |
| Page object (E2E) | `FieldValidatorsPage` |
| OpenAPI tag | `Field Validators` |
| Backend model class | `FieldValidator` |
| Backend schema prefix | `FieldValidator` (`FieldValidatorCreate`, `FieldValidatorUpdate`, `FieldValidatorResponse`) |
| Backend CRUD module | `field_validator.py` |
| Backend router module | `field_validators.py` |

**Naming convention by layer (matching project rules):**
- Routes: `kebab-case` (`field-validators`)
- Stores: `camelCase.ts` (`fieldValidators.ts`)
- Types: `PascalCase` (`FieldValidatorBase`)
- API paths: `kebab-case` (`/v1/field-validators`)
- DB tables: `snake_case` (`field_validators`)

---

## 5. Dependencies and Risks

### Phase Dependencies

```
Phase 1A (Backend CRUD) -----> Phase 1B (Frontend Types/Store/API)
                                   |
                                   v
                               Phase 1C (List Page UI) -----> Phase 1D (Field Attachment)
                                   |
                                   v
                               Phase 2A (Template Gallery) ---> Phase 2B (Syntax Highlighting)
                                   |
                                   v
                               Phase 3A (AI Backend) --------> Phase 3B (AI Frontend)
                                   |
                               Phase 4A (Test Table) --------> Phase 4B (REPL Editor)
                                   |
                                   v
                               Phase 5A (Code Generation)
```

- Phase 1A (backend) must complete before Phase 1B (frontend types/store) can integrate
- Phase 1B can start in parallel with Phase 1A if using mock data
- Phase 1C depends on Phase 1B for the store and API client
- Phase 1D depends on Phase 1C for the list page
- Phase 2 depends on Phase 1C for the creation flow integration
- Phase 3 depends on Phase 2 (builds on the customizer UI)
- Phase 4 depends on Phase 1C (integrates into the editor view)
- Phase 5 depends on Phase 1A (needs the backend validator data)

### Risks and Mitigations

#### Risk 1: Code Injection in User-Written Python

**Severity:** High
**Description:** Users write arbitrary Python code that gets included in generated applications. Malicious code could include `os.system()`, `subprocess`, file access, network requests, etc.
**Mitigation:**
- Phase 1: No server-side execution -- code is stored as text and only included in generated ZIP files. The user is responsible for reviewing generated code.
- Phase 3 (AI): The AI prompt explicitly forbids dangerous operations. Generated code is validated against a deny-list of dangerous patterns (`import os`, `import subprocess`, `exec(`, `eval(`, `open(`, `__import__`).
- Phase 5: The code generator can optionally run a static analysis pass on validator code to flag dangerous patterns (warning only, not blocking).
- Long-term: Consider a sandboxed execution environment for testing validators server-side.

#### Risk 2: Validator Code That Does Not Compile

**Severity:** Medium
**Description:** Users can save syntactically invalid Python code. This would cause the generated application to fail on import.
**Mitigation:**
- Phase 1: Frontend shows a warning if code appears incomplete (e.g., missing `return` statement, unclosed blocks). This is a best-effort lint, not a full Python parser.
- Phase 4: The test table and REPL provide instant feedback on code correctness via client-side JS simulation.
- Phase 5: The code generator can optionally run `py_compile` on the generated validator code and report errors to the user before downloading the ZIP.

#### Risk 3: Migration Strategy for Existing Fields

**Severity:** Low
**Description:** Adding `validators` to the `Field` type and `FieldResponse` schema could break existing frontend code that does not expect this field.
**Mitigation:**
- Backend: `validators` defaults to `[]` in the response, so existing fields are backward-compatible.
- Frontend: All code that destructures or iterates over `Field` objects needs to handle the new `validators` array. The TypeScript compiler will catch missing handling if `validators` is added to the `Field` interface.
- E2E tests: Run all CRUD tests after the type change to verify no regressions.

#### Risk 4: Performance with Many Validators

**Severity:** Low
**Description:** If a user creates hundreds of validators, the list page and store could become slow.
**Mitigation:**
- The current pattern (load all into a store, filter client-side) works well for up to ~500 items.
- If needed later, server-side pagination can be added following the same pattern as other entities.

---

## 6. Additional Future Features (Post-MVP)

These features are explicitly out of scope for the initial implementation but should be considered in the architecture:

### Validator Marketplace / Sharing

Allow users to publish validators to a shared marketplace. Other users can import validators into their namespace. This would require:
- A `published` flag on validators
- A public listing endpoint (unauthenticated)
- An "import" action that copies a validator into the user's namespace

### Validator Versioning

Track changes to validator code over time. This would require:
- A `field_validator_versions` table with version numbers and code snapshots
- UI to view version history and revert to previous versions
- Diffing between versions

### Validator Composition (Chaining)

Allow combining multiple small validators into a pipeline that runs in sequence. This is essentially what Pydantic does natively with multiple `@field_validator` decorators, but a visual pipeline builder could make it more intuitive.

### Auto-Suggested Validators

Based on a field's name and type, suggest relevant validators. For example:
- Field named `email` with type `str` --> suggest "Email Format" validator
- Field named `age` with type `int` --> suggest "Number Range" validator
- Field named `password` with type `str` --> suggest "Length Bounds" validator

This could be a simple heuristic or an AI-powered suggestion.

### Validator Performance Profiling

Show estimated execution time for validators. This would require server-side execution in a sandbox with timing.

### Model Validators

The architecture for field validators should be designed to be extensible for model validators (`@model_validator`) in the future. The key difference:
- Field validators operate on a single field value
- Model validators operate on the entire model (access to all fields)

The data model, store, API, and UI patterns should be similar enough that model validators can reuse most of the field validators infrastructure.

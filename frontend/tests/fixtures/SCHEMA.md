# Fixture Schema Documentation

> This document explains the structure and relationships of all test fixtures. It serves as the contract between the mock API and the UI expectations.

**Last Updated:** 2026-02-10

## Entity Relationships

```
User
  └─ has many → Role
                  └─ has many → Permission

Field
  ├─ belongs to → Namespace
  ├─ has one → Type (PrimitiveTypeName)
  ├─ has many → FieldValidator
  │              └─ references → Validator (by name)
  └─ used in many → ApiEndpoint

Validator
  ├─ has one → type (string, numeric)
  ├─ has one → category (inline, custom)
  ├─ belongs to → Namespace
  └─ used in many → Field

Type
  ├─ has one → category (primitive, abstract)
  ├─ has many → compatibleTypes (validator type compatibility)
  └─ used in many → Field

ApiEndpoint
  └─ uses many → Field
```

## Entity Schemas

### User

```typescript
interface MockUser {
  id: string;              // Unique identifier (user-1, user-2, etc.)
  email: string;           // Email address (unique)
  username: string;        // Username (unique)
  firstName: string;       // First name
  lastName: string;        // Last name
  createdAt: string;       // ISO 8601 timestamp
  updatedAt: string;       // ISO 8601 timestamp
}
```

**Invariants:**
- `id` must be unique
- `email` must be unique and valid email format
- `username` must be unique, 3-50 characters
- `createdAt` <= `updatedAt`

**Test Data:**
- 3 users total
- User IDs: `user-1`, `user-2`, `user-3`
- Default test user: `user-1` (John Doe)

### Type

```typescript
type PrimitiveTypeName = 'str' | 'int' | 'float' | 'bool' | 'datetime' | 'uuid';
type AbstractTypeName = 'numeric';
type TypeName = PrimitiveTypeName | AbstractTypeName;

interface TypeBase {
  name: TypeName;                    // Type name
  category: 'primitive' | 'abstract'; // Type category
  pythonType: string;                 // Python type mapping
  description: string;                // Human-readable description
  compatibleTypes: string[];           // Compatible validator types
}

interface FieldType extends TypeBase {
  usedInFields: number;              // Count of fields using this type
}
```

**Invariants:**
- Primitive types: `str`, `int`, `float`, `bool`, `datetime`, `uuid`
- Abstract types: `numeric`
- `compatibleTypes` determines which validators can be applied

**Test Data:**
- 6 primitive types
- 1 abstract type
- Total: 7 types

### Validator

```typescript
interface ValidatorBase {
  name: string;                       // Validator name (unique within namespace)
  namespaceId: string;                // Namespace this validator belongs to
  type: 'string' | 'numeric';        // Validator type (matches compatible field types)
  description: string;                // Human-readable description
  category: 'inline' | 'custom';     // Inline (Pydantic built-in) or custom
  parameterType: string;              // Type of parameter expected
  exampleUsage: string;               // Code example
  docsUrl: string;                    // Documentation URL
}

interface Validator extends ValidatorBase {
  usedInFields: number;                              // Count of fields using this validator
  fieldsUsingValidator: Array<{                      // Fields using this validator
    name: string;
    fieldId: string;
  }>;
}
```

**Invariants:**
- `name` must be unique within namespace
- `type` must match compatible type's `compatibleTypes`
- Inline validators map to Pydantic Field constraints
- Custom validators use `@field_validator` decorator

**Test Data:**
- 8 inline validators (global namespace)
- 3 custom validators (2 global: `email_format`, `url_format` + 1 user: `product_name_format`)
- Total: 11 validators across all namespaces (10 in global namespace)

**Validator Types:**
- **string:** `max_length`, `min_length`, `pattern`, `email_format`, `url_format`, `product_name_format`
- **numeric:** `gt`, `ge`, `lt`, `le`, `multiple_of`

### Field

```typescript
interface FieldValidator {
  name: string;                      // Validator name
  params?: Record<string, any>;      // Validator parameters
}

interface Field {
  id: string;                        // Unique identifier (UUID)
  namespaceId: string;               // Namespace this field belongs to
  name: string;                      // Field name (unique within namespace)
  type: PrimitiveTypeName;           // Field type
  description?: string;              // Optional description
  defaultValue?: string;             // Optional default value (as string)
  validators: FieldValidator[];      // Applied validators
  usedInApis: string[];              // API IDs using this field
}
```

**Invariants:**
- `id` must be unique (UUID format)
- `name` must be unique within namespace (case-insensitive)
- `type` must be a valid `PrimitiveTypeName`
- All validators in `validators[]` must be compatible with field's `type`
- `usedInApis[]` references must exist in `mockApis`

**Test Data:**
- 13 fields total (10 global + 3 user namespace)
- Field IDs use well-known UUIDs (SEED_FIELD_IDS)
- Coverage of all primitive types
- Various validator combinations

**Field Types Distribution (global namespace):**
- `str`: 5 fields (email, username, password, status, website, phone)
- `int`: 0 fields
- `float`: 1 field (price)
- `bool`: 0 fields
- `datetime`: 2 fields (created_at, updated_at)
- `uuid`: 1 field (user_id)

**User Namespace Fields:**
- `str`: 1 field (product_name)
- `int`: 1 field (quantity)
- `float`: 1 field (product_price)

### ApiEndpoint

```typescript
interface ApiEndpoint {
  id: string;                        // Unique identifier (api-1, api-2, etc.)
  name: string;                      // Endpoint name
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; // HTTP method
  path: string;                      // URL path
  description: string;               // Human-readable description
  usedFields: string[];              // Field IDs used in this endpoint
  createdAt: string;                 // ISO 8601 timestamp
  updatedAt: string;                 // ISO 8601 timestamp
}
```

**Invariants:**
- `id` must be unique
- `path` should follow REST conventions
- `usedFields[]` references must exist in `mockFields`
- `createdAt` <= `updatedAt`

**Test Data:**
- 4 APIs total
- API IDs: `api-1` through `api-4`
- CRUD operations: Create, Read, Update, Delete
- Methods: GET, POST, PUT, DELETE

### Permission

```typescript
interface Permission {
  id: string;                        // Unique identifier (perm-1, perm-2, etc.)
  name: string;                      // Permission name (unique)
  resource: string;                  // Resource type (field, api, etc.)
  action: 'create' | 'read' | 'update' | 'delete'; // CRUD action
  description: string;               // Human-readable description
}

interface Role {
  id: string;                        // Unique identifier (role-1, role-2, etc.)
  name: string;                      // Role name (unique)
  description: string;               // Human-readable description
  permissions: string[];             // Permission IDs
}
```

**Invariants:**
- Permission `id` must be unique
- Permission `name` must be unique
- Role `id` must be unique
- Role `name` must be unique
- All `permissions[]` references must exist in `mockPermissions`

**Test Data:**
- 8 permissions (4 for fields, 4 for APIs)
- 3 roles (admin, developer, viewer)

## Validation Rules

### Cross-Entity Consistency

1. **Field → Validator:**
   - A field's validators must be compatible with its type
   - String fields can only use string validators
   - Numeric fields can only use numeric validators

2. **Field → Type:**
   - A field's type must be a valid `PrimitiveTypeName`
   - The type determines which validator categories are allowed

3. **Field → Api:**
   - If `field.usedInApis` includes an API ID, that API's `usedFields` must include the field ID
   - This is a bidirectional relationship

4. **Validator → Field:**
   - If `validator.fieldsUsingValidator` includes a field, that field's `validators[]` must include the validator

### Data Integrity Checks

The fixture validation script (`bun run test:fixtures:validate`) should verify:

1. **No orphaned references:**
   - All `usedInApis[]` IDs exist in `mockApis`
   - All `usedFields[]` IDs exist in `mockFields`
   - All `permissions[]` IDs exist in `mockPermissions`

2. **Type compatibility:**
   - Field validators match field type's compatible categories
   - Validator parameters match `parameterType`

3. **Uniqueness constraints:**
   - All IDs are unique within their entity type
   - All names are unique where required

4. **Timestamp validity:**
   - All `createdAt` and `updatedAt` are valid ISO 8601
   - `createdAt` <= `updatedAt`

## Usage in Tests

### Importing Fixtures

```typescript
import { 
  mockFields, 
  mockValidators, 
  mockTypes,
  getFieldById,
  getValidatorByName 
} from 'tests/fixtures';
```

### MSW Handlers

All MSW handlers MUST use fixtures:

```typescript
import { http, HttpResponse } from 'msw';
import { mockFields } from 'tests/fixtures';

export const handlers = [
  http.get('/api/fields', () => {
    return HttpResponse.json(mockFields);
  }),
  
  http.get('/api/fields/:id', ({ params }) => {
    const field = getFieldById(params.id);
    if (!field) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(field);
  })
];
```

### Component Tests

```typescript
import { renderWithProviders } from 'tests/shared/renderWithProviders';
import { mockFields } from 'tests/fixtures';
import Table from '$lib/components/table/Table.svelte';

test('renders field table', () => {
  const { getByText } = renderWithProviders(Table, {
    props: { items: mockFields }
  });
  
  expect(getByText('email')).toBeInTheDocument();
});
```

## Updating Fixtures

When updating fixtures:

1. Update the fixture file (e.g., `tests/fixtures/fields.ts`)
2. Update this SCHEMA.md if schema changes
3. Update MSW handlers if API responses change
4. Run `bun run test:fixtures:validate` to check for issues
5. Update affected tests

## Future Enhancements

Potential additions to fixtures:

- **Activity logs** for dashboard activity feed
- **Credit usage** for billing/usage tracking
- **Code generation results** for generated API code
- **Deployment configurations** for AWS CDK
- **Error responses** for testing error handling

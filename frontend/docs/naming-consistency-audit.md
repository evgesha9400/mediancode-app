# Naming Consistency Audit Prompt

This document provides a reusable prompt for auditing naming consistency across all layers of the Median Code frontend codebase. Every domain entity should use a single, canonical name that flows unchanged through routes, stores, types, components, API client modules, API endpoint paths, sidebar labels, test fixtures, and page objects.

Run this audit whenever new entities are added, entity names are changed, or you suspect naming drift between frontend and backend.

---

## Instructions for the Auditing Agent

You are tasked with analyzing the Median Code frontend codebase for naming inconsistencies. A "naming inconsistency" occurs when the same conceptual domain entity is referred to by different names in different parts of the codebase. This creates ambiguity, makes code harder to navigate, and increases the chance of bugs.

### What to Audit

For each domain entity listed below, trace its name through every layer of the codebase and verify consistency. The layers are:

| Layer | Location | Naming Convention |
|---|---|---|
| **Route directory** | `src/routes/(dashboard)/` | kebab-case directory name |
| **Sidebar label** | `Sidebar.svelte` nav items | Human-readable display label |
| **Sidebar href** | `Sidebar.svelte` nav items | kebab-case URL path |
| **Page header title** | `PageHeader` component usage on each page | Human-readable title |
| **Store file** | `src/lib/stores/*.ts` | camelCase filename |
| **Store variable** | Exported writable/derived store | camelCase with `Store` suffix |
| **Type interface** | `src/lib/types/index.ts` | PascalCase interface name |
| **API client file** | `src/lib/api/*.ts` | camelCase filename |
| **API endpoint path** | URL path in API client fetch calls | kebab-case or plural noun |
| **API spec path** | `api-spec.yaml` paths section | kebab-case or plural noun |
| **API spec schema** | `api-spec.yaml` components/schemas | PascalCase schema name |
| **Actions layer** | `src/lib/stores/actions.ts` | camelCase function names |
| **Component directory** | `src/lib/components/*/` | kebab-case directory name |
| **Component prefix** | Component `.svelte` filenames | PascalCase prefix matching entity |
| **Test fixture file** | `tests/fixtures/*.ts` | camelCase filename |
| **Test fixture exports** | Exported mock data variable names | camelCase with `mock` prefix |
| **Page object file** | `tests/page-objects/*.ts` | PascalCase filename |
| **Page object class** | Exported class name | PascalCase class name |

### Consistency Rules

1. **The canonical name for each entity should be a single English noun (or compound noun)** that is used everywhere, adapted only by casing convention:
   - Route: `field-constraints` (kebab-case)
   - Store file: `fieldConstraints.ts` (camelCase)
   - Store variable: `fieldConstraintsStore` (camelCase + Store suffix)
   - Type: `FieldConstraint` (PascalCase)
   - API client file: `fieldConstraints.ts` (camelCase)
   - API path: `/field-constraints` (kebab-case)
   - Test fixture: `fieldConstraints.ts` with `mockFieldConstraints` exports
   - Page object: `FieldConstraintsPage.ts` with `FieldConstraintsPage` class

2. **The route directory name and sidebar href must match exactly.**

3. **The sidebar label should be the human-readable version of the route name.** Example: route `field-constraints` should have sidebar label "Field Constraints".

4. **The store filename should be the camelCase version of the entity name.** Example: entity "field constraints" maps to `fieldConstraints.ts`.

5. **The API client filename should match the store filename** (they represent the same entity).

6. **The API endpoint path should match the route directory name** (both kebab-case). Example: route `field-constraints` should call API path `/field-constraints`.

7. **Type interface names should be the PascalCase version of the entity name.** Example: entity "field constraint" maps to `FieldConstraint`.

8. **Page object class names should match the route directory name in PascalCase.** Example: route `fields` maps to `FieldsPage`.

9. **Test fixture filenames should match the entity name.** Example: entity "field constraints" maps to `fieldConstraints.ts` (not `constraints.ts`).

---

## Known Domain Entities

The following entities have been identified in the codebase. Audit each one against all layers.

### Entity: Types

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | `types` | `types` | CONSISTENT |
| Sidebar label | "Types" | "Types" | CONSISTENT |
| Sidebar href | `/types` | `/types` | CONSISTENT |
| Store file | `types.ts` | `types.ts` | CONSISTENT |
| Store variable | `typesStore` / `typesBaseStore` | `typesStore` | CONSISTENT |
| Type interface | `FieldType`, `TypeBase` | -- | SEE NOTES |
| API client file | `types.ts` | `types.ts` | CONSISTENT |
| API endpoint path | `/types` | `/types` | CONSISTENT |
| API spec path | `/types` | `/types` | CONSISTENT |
| API spec schema | -- | `TypeBase` | CONSISTENT |
| Page object | `TypesPage.ts` / `TypesPage` | `TypesPage` | CONSISTENT |
| Test fixture file | `types.ts` | `types.ts` | CONSISTENT |

**Notes:** The primary type interface is named `FieldType` rather than `Type`. This is intentional to avoid collision with the JavaScript reserved word `type` and to clarify that these are "types used for fields." The base interface `TypeBase` is also used. This is an acceptable deviation given language constraints.

---

### Entity: Field Constraints (formerly Validators)

This entity was previously the **most significant naming inconsistency** in the codebase. As of 2026-02-15, all layers have been aligned to use "field constraints" consistently.

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | `validators/field-constraints` | `validators/field-constraints` | CONSISTENT |
| Sidebar label | "Field Constraints" | "Field Constraints" | CONSISTENT |
| Sidebar href | `/validators/field-constraints` | `/validators/field-constraints` | CONSISTENT |
| Store file | `fieldConstraints.ts` | `fieldConstraints.ts` | CONSISTENT |
| Store variable | `fieldConstraintsStore` | `fieldConstraintsStore` | CONSISTENT |
| Type interface | `FieldConstraint`, `FieldConstraintBase` | `FieldConstraint` | CONSISTENT |
| API client file | `fieldConstraints.ts` | `fieldConstraints.ts` | CONSISTENT |
| API endpoint path | `/field-constraints` | `/field-constraints` | CONSISTENT |
| API spec path | `/field-constraints` | `/field-constraints` | CONSISTENT |
| API spec schema | `FieldConstraintResponse` | `FieldConstraintResponse` | CONSISTENT |
| Actions layer | `(none -- no CRUD actions)` | -- | N/A (read-only entity) |
| Test fixture file | `fieldConstraints.ts` | `fieldConstraints.ts` | CONSISTENT |
| Test fixture exports | `mockFieldConstraints` | `mockFieldConstraints` | CONSISTENT |
| Page object file | `FieldConstraintsPage.ts` | `FieldConstraintsPage.ts` | CONSISTENT |
| Page object class | `FieldConstraintsPage` | `FieldConstraintsPage` | CONSISTENT |

**Status:** Fully consistent across all layers. Previously the API spec used `/validators` and `ValidatorBase` schema while the frontend used "field constraints" -- this was resolved by updating the API spec to match the frontend naming.

---

### Entity: Fields

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | `fields` | `fields` | CONSISTENT |
| Sidebar label | "Fields" | "Fields" | CONSISTENT |
| Sidebar href | `/fields` | `/fields` | CONSISTENT |
| Store file | `fields.ts` | `fields.ts` | CONSISTENT |
| Store variable | `fieldsStore` | `fieldsStore` | CONSISTENT |
| Type interface | `Field` | `Field` | CONSISTENT |
| API client file | `fields.ts` | `fields.ts` | CONSISTENT |
| API endpoint path | `/fields` | `/fields` | CONSISTENT |
| API spec path | `/fields` | `/fields` | CONSISTENT |
| API spec schema | `Field` | `Field` | CONSISTENT |
| Actions layer | `createFieldAction`, etc. | -- | CONSISTENT |
| Page object file | `FieldsPage.ts` | `FieldsPage.ts` | CONSISTENT |
| Page object class | `FieldsPage` | `FieldsPage` | CONSISTENT |
| Test fixture file | `fields.ts` | `fields.ts` | CONSISTENT |
| Test fixture exports | `mockFields` | `mockFields` | CONSISTENT |

**Status:** Fully consistent across all layers. Previously the route was `field-registry` and the page object was `FieldRegistryPage` -- these were renamed to `fields` and `FieldsPage` on 2026-02-15.

---

### Entity: Objects

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | `objects` | `objects` | CONSISTENT |
| Sidebar label | "Objects" | "Objects" | CONSISTENT |
| Sidebar href | `/objects` | `/objects` | CONSISTENT |
| Store file | `objects.ts` | `objects.ts` | CONSISTENT |
| Store variable | `objectsStore` | `objectsStore` | CONSISTENT |
| Type interface | `ObjectDefinition` | `Object` or `ObjectDefinition` | SEE NOTES |
| API client file | `objects.ts` | `objects.ts` | CONSISTENT |
| API endpoint path | `/objects` | `/objects` | CONSISTENT |
| API spec path | `/objects` | `/objects` | CONSISTENT |
| Actions layer | `createObjectAction`, etc. | -- | CONSISTENT |
| Page object file | `ObjectsPage.ts` | `ObjectsPage.ts` | CONSISTENT |
| Page object class | `ObjectsPage` | `ObjectsPage` | CONSISTENT |
| Test fixture file | (embedded in other fixtures) | `objects.ts` | N/A |

**Status:** Fully consistent across all layers. Previously the route was `object-builder` and the page object was `ObjectBuilderPage` -- these were renamed to `objects` and `ObjectsPage` on 2026-02-15.

**Notes:** The type interface is `ObjectDefinition` rather than `Object` to avoid collision with JavaScript's built-in `Object`. This is an acceptable deviation.

---

### Entity: APIs

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | `apis` | `apis` | CONSISTENT |
| Sidebar label | "APIs" | "APIs" | CONSISTENT |
| Sidebar href | `/apis` | `/apis` | CONSISTENT |
| Store file | `apis.ts` | `apis.ts` | CONSISTENT |
| Store variable | `apisStore` | `apisStore` | CONSISTENT |
| Type interface | `Api` | `Api` | CONSISTENT |
| API client file | `apis.ts` | `apis.ts` | CONSISTENT |
| API endpoint path | `/apis` | `/apis` | CONSISTENT |
| API spec path | `/apis` | `/apis` | CONSISTENT |
| Actions layer | `createApiAction`, etc. | -- | CONSISTENT |
| Page object file | `ApisPage.ts` | `ApisPage.ts` | CONSISTENT |
| Page object class | `ApisPage` | `ApisPage` | CONSISTENT |
| Test fixture file | `apis.ts` | `apis.ts` | CONSISTENT |

**Status:** Fully consistent across all layers.

---

### Entity: Endpoints

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | (no dedicated route -- managed within `apis/[id]`) | N/A | N/A |
| Store variable | `endpointsStore` (in `apis.ts`) | -- | CONSISTENT |
| Type interface | `ApiEndpoint` | `ApiEndpoint` or `Endpoint` | SEE NOTES |
| API client file | `endpoints.ts` | `endpoints.ts` | CONSISTENT |
| API endpoint path | `/endpoints` | `/endpoints` | CONSISTENT |
| API spec path | `/endpoints` | `/endpoints` | CONSISTENT |
| Actions layer | `createEndpointAction`, etc. | -- | CONSISTENT |

**Notes:** The type is `ApiEndpoint` (prefixed with `Api`) rather than just `Endpoint`. This prefix clarifies that these are endpoints belonging to an API definition, not generic HTTP endpoints. The `endpointsStore` lives inside `apis.ts` rather than having its own file, which is a minor structural inconsistency but acceptable since endpoints are always accessed in the context of an API.

---

### Entity: Namespaces

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | `namespaces` | `namespaces` | CONSISTENT |
| Sidebar label | "Namespaces" | "Namespaces" | CONSISTENT |
| Sidebar href | `/namespaces` | `/namespaces` | CONSISTENT |
| Store file | `namespaces.ts` | `namespaces.ts` | CONSISTENT |
| Store variable | `namespacesStore` | `namespacesStore` | CONSISTENT |
| Type interface | `Namespace` | `Namespace` | CONSISTENT |
| API client file | `namespaces.ts` | `namespaces.ts` | CONSISTENT |
| API endpoint path | `/namespaces` | `/namespaces` | CONSISTENT |
| API spec path | `/namespaces` | `/namespaces` | CONSISTENT |
| Actions layer | `createNamespaceAction`, etc. | -- | CONSISTENT |
| Component directory | `namespace/` | `namespace/` | CONSISTENT |

**Status:** Fully consistent across all layers.

---

### Entity: Tags

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | (no dedicated route -- embedded in API) | N/A | N/A |
| Type interface | `ApiTag` | `ApiTag` | CONSISTENT |
| API spec path | `/tags` | -- | SEE NOTES |
| API spec schema | `Tag` | -- | SEE NOTES |

**Notes:** Tags were migrated from a standalone entity (with their own `/tags` API endpoint) to being embedded within the `Api` entity as a JSONB array. The API spec still defines `/tags` as a standalone endpoint, but the frontend treats tags as part of the API. The deprecated `EndpointTag` type was removed from `src/lib/types/index.ts` on 2026-02-15.

---

### Entity: Dashboard

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | `dashboard` | `dashboard` | CONSISTENT |
| Sidebar label | "Dashboard" | "Dashboard" | CONSISTENT |
| Page object | `DashboardPage.ts` / `DashboardPage` | `DashboardPage` | CONSISTENT |

**Status:** Fully consistent.

---

### Entity: Settings

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | `settings` | `settings` | CONSISTENT |
| Nested route | `settings/organization` | `settings/organization` | CONSISTENT |

**Status:** Consistent. Settings is not a domain entity but a UI section. No store, type, or API layer needed.

---

### Entity: Prototypes

| Layer | Current Name | Expected Name | Status |
|---|---|---|---|
| Route directory | `prototypes/response-body` | -- | N/A |

**Notes:** Prototypes appear to be experimental/prototype pages. No corresponding store, API, or type exists. Not a domain entity requiring naming alignment.

---

## Summary of Inconsistencies

### CRITICAL (names diverge across core layers)

All critical inconsistencies have been resolved as of 2026-02-15.

| # | Entity | Problem | Status | Resolution Date |
|---|---|---|---|---|
| ~~1~~ | ~~**Fields**~~ | ~~Route was `field-registry`, everything else was `fields`~~ | RESOLVED | 2026-02-15 |
| ~~2~~ | ~~**Objects**~~ | ~~Route was `object-builder`, everything else was `objects`~~ | RESOLVED | 2026-02-15 |
| ~~3~~ | ~~**Field Constraints**~~ | ~~API spec used `validators`/`ValidatorBase`, frontend used `field-constraints`/`FieldConstraint`~~ | RESOLVED | 2026-02-15 |

### MODERATE (test infrastructure naming drift)

All moderate inconsistencies have been resolved as of 2026-02-15.

| # | Entity | Problem | Status | Resolution Date |
|---|---|---|---|---|
| ~~4~~ | ~~**Field Constraints**~~ | ~~Test fixture file named `constraints.ts` instead of `fieldConstraints.ts`~~ | RESOLVED | 2026-02-15 |
| ~~5~~ | ~~**Field Constraints**~~ | ~~Page object file named `ConstraintsPage.ts` instead of `FieldConstraintsPage.ts`~~ | RESOLVED | 2026-02-15 |
| ~~6~~ | ~~**Fields**~~ | ~~Page object class named `FieldRegistryPage` instead of `FieldsPage`~~ | RESOLVED | 2026-02-15 |
| ~~7~~ | ~~**Objects**~~ | ~~Page object class named `ObjectBuilderPage` instead of `ObjectsPage`~~ | RESOLVED | 2026-02-15 |

### MINOR (legacy/deprecated naming)

| # | Entity | Problem | Status | Details |
|---|---|---|---|---|
| ~~8~~ | ~~**Tags**~~ | ~~Deprecated `EndpointTag` type existed~~ | RESOLVED | Removed on 2026-02-15 |
| ~~9~~ | ~~**APIs**~~ | ~~Deprecated `ApiMetadata` type and `apiMetadataStore` still exist~~ | RESOLVED | Removed on 2026-02-15 |
| ~~10~~ | ~~**API Generator**~~ | ~~Deprecated `apiGeneratorState.svelte.ts` existed~~ | RESOLVED | Deleted on 2026-02-15 |

---

## How to Run This Audit

### Step-by-step procedure

1. **List all route directories:**
   ```bash
   ls src/routes/(dashboard)/
   ```
   For each directory, note the kebab-case name. This is a candidate entity name.

2. **Check sidebar navigation:**
   Read `src/lib/components/Sidebar.svelte` and extract all `href` and `label` values from `coreComponentItems` and `configItems`. Verify each href matches its corresponding route directory.

3. **Check store files:**
   ```bash
   ls src/lib/stores/
   ```
   For each domain store file, verify the filename matches the camelCase version of the entity's route name.

4. **Check type definitions:**
   Read `src/lib/types/index.ts` and verify that each entity has a corresponding PascalCase type interface.

5. **Check API client files:**
   ```bash
   ls src/lib/api/
   ```
   For each API client file, verify:
   - The filename matches the store filename
   - The API endpoint path (in fetch calls) matches the route directory name (both kebab-case)
   - The API endpoint path matches the path in `api-spec.yaml`

6. **Check API spec alignment:**
   Read `api-spec.yaml` paths section and verify every frontend API call has a matching path in the spec.

7. **Check test fixtures:**
   ```bash
   ls tests/fixtures/
   ```
   For each fixture file, verify the filename matches the entity name.

8. **Check page objects:**
   ```bash
   ls tests/page-objects/
   ```
   For each page object, verify:
   - The filename is PascalCase version of the route name + "Page"
   - The class name matches the filename

9. **Check component directories:**
   ```bash
   ls src/lib/components/
   ```
   For entity-specific component directories, verify the directory name matches the entity.

10. **Cross-reference dashboard page titles:**
    For each route's `+page.svelte`, check the `PageHeader` title prop and verify it matches the sidebar label.

### Automated checks you can add

```bash
# Find all API endpoint paths used in src/lib/api/
grep -rn "apiGet\|apiPost\|apiPut\|apiDelete" src/lib/api/ | grep -oP "'[^']+'"

# Find all API spec paths
grep -E "^  /" api-spec.yaml

# Compare the two lists for mismatches
```

---

## Entity Name Registry

This is the canonical name mapping. When adding a new entity, add it here first, then implement it consistently across all layers.

| Entity (canonical) | Route | Store File | Store Variable | Type | API Client | API Path | Sidebar Label |
|---|---|---|---|---|---|---|---|
| types | `types` | `types.ts` | `typesStore` | `FieldType` | `types.ts` | `/types` | "Types" |
| field-constraints | `validators/field-constraints` | `fieldConstraints.ts` | `fieldConstraintsStore` | `FieldConstraint` | `fieldConstraints.ts` | `/field-constraints` | "Field Constraints" |
| fields | `fields` | `fields.ts` | `fieldsStore` | `Field` | `fields.ts` | `/fields` | "Fields" |
| objects | `objects` | `objects.ts` | `objectsStore` | `ObjectDefinition` | `objects.ts` | `/objects` | "Objects" |
| apis | `apis` | `apis.ts` | `apisStore` | `Api` | `apis.ts` | `/apis` | "APIs" |
| endpoints | (nested in apis) | `apis.ts` | `endpointsStore` | `ApiEndpoint` | `endpoints.ts` | `/endpoints` | (none) |
| namespaces | `namespaces` | `namespaces.ts` | `namespacesStore` | `Namespace` | `namespaces.ts` | `/namespaces` | "Namespaces" |
| tags | (embedded in api) | `apis.ts` | (in Api.tags) | `ApiTag` | (in apis.ts) | `/tags` * | (none) |

All primary entity names are now consistent across all layers. The `*` on tags `/tags` indicates the API spec still defines a standalone `/tags` endpoint, but the frontend treats tags as embedded within the Api entity (no dedicated route or store).

---

## Decision Log

Use this section to record decisions about intentional naming deviations.

| Entity | Deviation | Reason | Date |
|---|---|---|---|
| Types | Type named `FieldType` not `Type` | Avoids JavaScript `Type` ambiguity; clarifies these are field types | -- |
| Objects | Type named `ObjectDefinition` not `Object` | Avoids collision with JavaScript built-in `Object` | -- |
| Endpoints | Type named `ApiEndpoint` not `Endpoint` | Clarifies these are API endpoint definitions, not generic endpoints | -- |
| Endpoints | Store lives in `apis.ts` not `endpoints.ts` | Endpoints are always accessed in API context | -- |
| Field Constraints | Route nested under `validators/` | Architectural decision: validators is a parent category containing field constraints, field validators, and model validators | -- |
| Fields | Route renamed from `field-registry` to `fields` | Aligned route with canonical name used by all other layers (store, types, API client, API spec) | 2026-02-15 |
| Objects | Route renamed from `object-builder` to `objects` | Aligned route with canonical name used by all other layers (store, types, API client, API spec) | 2026-02-15 |
| Field Constraints | API spec updated from `/validators`+`ValidatorBase` to `/field-constraints`+`FieldConstraintResponse` | Backend API spec now matches frontend naming; test fixtures and page objects also renamed for consistency | 2026-02-15 |
| Tags | Deprecated `EndpointTag` type removed | Migration to embedded tags within Api entity is complete | 2026-02-15 |
| API Generator | Deprecated `apiGeneratorState.svelte.ts` deleted | File confirmed unused and removed | 2026-02-15 |

# Navigation & Workflow Redesign — Design Document

## Summary

Restructure the sidebar navigation into **Catalog** (reference/edit) and **Components** (full CRUD) groups. Introduce a **two-panel drawer system** where creating nested entities (endpoint → object → field) shows the active form on the right and the parent form (dimmed) on the left. Unify all entity forms so the same drawer component is used everywhere — from catalog pages and from within the endpoint creation flow.

## Navigation Structure

### Current
```
Dashboard
Core Components
  Types
  Validators
    Field Constraints
    Field Validators
    Model Validators
  Fields
  Objects
  APIs
Configuration
  Namespaces
```

### New
```
Dashboard
Catalog
  Types              (read-only — system entities, no CUD)
  Field Constraints   (read-only — system entities, no CUD)
  Field Validators    (read-only — system templates, no CUD)
  Model Validators    (read-only — system templates, no CUD)
  Fields              (full CRUD — create, edit, restricted delete)
  Objects             (full CRUD — create, edit, restricted delete)
Components
  Namespaces          (full CRUD)
  APIs                (full CRUD, with endpoint sub-entities)
```

### Delete Restriction Rule (Fields & Objects)

Delete is allowed only when the entity has **≤1 parent reference**:
- **Field**: parents = objects containing it + endpoints using it as a path param
- **Object**: parents = endpoints using it as query params, request body, or response body

If parent count > 1, delete button is disabled with a tooltip listing the parents. Removing a field/object from an endpoint or object **unlinks** it (does not delete).

## Two-Panel Drawer System

### Core Concept

The content area (right of sidebar) hosts a **drawer stack**. At most **two panels** are visible at once:
- **Active panel** (right): the entity being created/edited, fixed width
- **Parent panel** (left): the previous context, dimmed with overlay, fills remaining width

When drilling deeper, the grandparent panel hides — only the direct parent stays visible.

### Panel Widths

```
┌──────────┬────────────────────────────────┬─────────────────────┐
│ Sidebar  │  Parent panel (dimmed)          │  Active panel       │
│  256px   │  flex: 1 (~584px on 1440px)     │  600px fixed        │
└──────────┴────────────────────────────────┴─────────────────────┘
```

- **Sidebar**: 256px (existing, unchanged)
- **Active panel**: 600px for Field/Object drawers, full available width for Endpoint drawer (when no child is open)
- **Parent panel**: `flex: 1` — naturally fills remaining space between sidebar and active panel

### Visual States

**Single panel (no nesting):**
```
┌──────────┬──────────────────────────────────────────────────┐
│ Sidebar  │  Active Form (fills available space)              │
│          │  e.g., Endpoint: ~1184px                          │
│          │  e.g., Field from catalog: 600px + page behind    │
└──────────┴──────────────────────────────────────────────────┘
```

**Two panels (one level of nesting):**
```
┌──────────┬─────────────────────────────┬────────────────────┐
│ Sidebar  │  Parent (dimmed overlay)     │  Active Form       │
│          │  Scrollable but not          │  600px             │
│          │  interactive. Light overlay. │  Full interactivity│
└──────────┴─────────────────────────────┴────────────────────┘
```

**Three levels deep (only top 2 visible):**
```
Level 1: Endpoint (hidden)
Level 2: Object (parent, dimmed) ← visible left
Level 3: Field (active)          ← visible right
```

### Parent Panel Behavior

- **Dimmed**: semi-transparent overlay (`bg-white/60` or similar) over the parent form
- **Scrollable**: user can scroll to see context but cannot interact with inputs
- **Not editable**: all inputs visually present but covered by the overlay
- **Header visible**: parent's title/breadcrumb always readable through the overlay
- **Close active to return**: closing the active panel removes it, parent becomes active and expands

### Transitions

- Active panel slides in from right using `transform: translateX()` (GPU-composited)
- Parent panel doesn't animate its width — it naturally fills via `flex: 1`
- Closing the active panel: slides out to the right, parent overlay fades, parent becomes active

## Unified Entity Forms

### Principle

Each entity has **one form component** used everywhere:
- From its Catalog/Components page (clicking a row or "Create" button)
- From within the endpoint creation flow (clicking "Create new" in a selector)

### Form Specifications

**Field Form (600px)**
1. Namespace (read-only)
2. Field Name (required)
3. Container (None/List toggle) + Type (searchable dropdown) — same row
4. Description (textarea)
5. Default Value (composite input)
6. Validators — dashed "Add Validator" → template gallery → template form → applied list
7. Field Constraints — constraint selector → applied rows with value inputs
8. Used In (read-only, only shown when editing from Catalog)

**Object Form (600px)**
1. Namespace (read-only)
2. Object Name (required)
3. Description (textarea)
4. Fields — field selector dropdown + "Create new field" option
   - Each row: name (font-mono) + type badge + container badge (if list) + Optional checkbox + remove X
   - "Create new field" → opens Field Form as stacked active panel
5. Model Validators — dashed "Add Validator" → model template gallery → field mapping form → applied list
6. Used In (read-only, only shown when editing from Catalog)

**Endpoint Form (full available width, no fixed max)**
1. Tag (combobox) + Description (text input) — same row
2. HTTP Method (select) + Path (text input with `/` prefix) — same row
3. Path Parameters (auto-detected from `{param}` in path)
   - Each param: name (read-only) + field selector with "Create new field" → stacked Field Form
4. Query Parameters — object selector with "Create new object" → stacked Object Form
5. Request Body — object selector with "Create new object" → stacked Object Form
6. Response Body — object selector + envelope toggle + response shape radios

**"Create new" behavior in selectors:**
- At the bottom of every searchable entity dropdown: `+ Create new [Field/Object]`
- Clicking opens the entity's form as a new stacked panel (active, right side)
- On save: entity is created, auto-selected in the parent's selector, child panel closes
- On cancel: child panel closes, no entity created, parent selector unchanged

## Nesting Scenarios

### Scenario A: Create endpoint, need new object for request body
1. User opens Endpoint Form (active, full width)
2. In Request Body section, clicks "Create new object"
3. Object Form opens (active, 600px right). Endpoint Form becomes parent (dimmed, left)
4. User fills in object name, adds existing fields
5. Clicks "Create" → Object saved, auto-selected in endpoint's request body selector, Object Form closes
6. Endpoint Form becomes active again (full width)

### Scenario B: While creating object, need new field
1. Endpoint Form (parent, dimmed, left) | Object Form (active, 600px right)
2. User clicks "Create new field" in object's field selector
3. Field Form opens (active, 600px right). Object Form becomes parent. Endpoint Form hides.
4. User fills in field, adds validators and constraints
5. Clicks "Create" → Field saved, added to object's field list, Field Form closes
6. Object Form becomes active. Endpoint Form reappears as parent.

### Scenario C: Edit field from Catalog
1. User is on `/fields` page, clicks a field row
2. Field Form opens (active, 600px) — same form component as Scenario B
3. No parent panel (single panel mode)
4. Delete button: enabled if field has ≤1 parent, disabled with tooltip otherwise

## Sidebar Changes

### Updated Groups
```typescript
const catalogItems: NavItem[] = [
  { href: '/types', label: 'Types', icon: 'fa-shapes' },
  { href: '/validators/field-constraints', label: 'Field Constraints', icon: 'fa-shield-halved' },
  { href: '/validators/field-validators', label: 'Field Validators', icon: 'fa-input-text' },
  { href: '/validators/model-validators', label: 'Model Validators', icon: 'fa-diagram-project' },
  { href: '/fields', label: 'Fields', icon: 'fa-table-list' },
  { href: '/objects', label: 'Objects', icon: 'fa-cubes' },
];

const componentItems: NavItem[] = [
  { href: '/namespaces', label: 'Namespaces', icon: 'fa-layer-group' },
  { href: '/apis', label: 'APIs', icon: 'fa-code' },
];
```

### Layout Changes
- Remove the "Validators" parent group with nested children — Field Constraints, Field Validators, Model Validators become top-level items under Catalog
- Remove the separate "Configuration" footer section — Namespaces moves into Components
- "Catalog" and "Components" section headers replace "Core Components" and "Configuration"

## What Stays the Same

- Dashboard page and route
- Types page (read-only, unchanged)
- Field Constraints page (read-only, unchanged)
- Field Validators page (read-only, unchanged)
- Model Validators page (read-only, unchanged)
- Namespaces page (full CRUD, unchanged)
- API list page (unchanged)
- API detail page (layout unchanged, endpoint drawer behavior updated)
- All existing components: Drawer, DrawerHeader, DrawerContent, DrawerFooter, CrudDrawerFooter
- Store architecture and API client layer

## What Changes

1. **Sidebar** — new groups (Catalog/Components), flatten validator nav items
2. **Fields page** — keep full CRUD, add delete restriction logic
3. **Objects page** — keep full CRUD, add delete restriction logic
4. **Endpoint drawer** — add "Create new" option to all entity selectors
5. **Object drawer** — add "Create new field" option to field selector
6. **New: DrawerStack component** — manages the two-panel layout, dimming, and panel lifecycle
7. **Field/Object form extraction** — extract form content into reusable components used by both Catalog pages and the DrawerStack

## Prototype Reference

Working prototype demonstrating the stacked drawer approach:
- `/prototype/drawer` — demonstrates endpoint → object → field creation flow
- To be deleted after implementation is complete

## Cleanup Tasks (post-implementation)

- Delete `/prototype/wizard` and `/prototype/drawer` routes
- Delete this design document

# Pages and Features Inventory

> Canonical map of the src/ structure for LLM agents. This document is generated during Phase 0 of testing implementation and should be kept in sync with the actual codebase.

**Last Updated:** 2025-11-24

## Source Structure Overview

### Routes (`src/routes/`)

#### Public Routes
- `/` (`+page.svelte`) - Landing page (marketing)
- `/(marketing)/+layout.svelte` - Marketing layout wrapper
- `/mobile-blocked/+page.svelte` - Mobile device blocking page

#### Authentication Routes
- `/signin/+page.svelte` - Clerk sign-in page
- `/signup/+page.svelte` - Clerk sign-up page

#### Authenticated Routes
- `/dashboard/+page.svelte` - Main dashboard with overview
- `/field-registry/+page.svelte` - Field registry management
- `/types/+page.svelte` - Type definitions management
- `/validators/+page.svelte` - Validator management

#### Root Layout
- `+layout.svelte` - Root layout with Clerk initialization
- `+layout.ts` - Server-side layout load function

### Component Library (`src/lib/components/`)

#### Top-Level Components
- `DashboardLayout.svelte` - Main dashboard layout wrapper
- `Sidebar.svelte` - Dashboard sidebar navigation
- `StatCard.svelte` - Statistics display card
- `ActivityItem.svelte` - Activity feed item component

#### Component Categories

**Drawer** (`drawer/`)
- `Drawer.svelte` - Main drawer container
- `DrawerHeader.svelte` - Drawer header section
- `DrawerContent.svelte` - Drawer content area
- `DrawerFooter.svelte` - Drawer footer with actions

**Layout** (`layout/`)
- `PageHeader.svelte` - Page header with title and actions

**Search** (`search/`)
- `SearchBar.svelte` - Search input with icon
- `FilterPanel.svelte` - Filter controls panel

**Table** (`table/`)
- `Table.svelte` - Main table component
- `SortableColumn.svelte` - Column header with sorting
- `EmptyState.svelte` - Empty state placeholder

**Toast** (`toast/`)
- `Toast.svelte` - Individual toast notification
- `ToastContainer.svelte` - Toast notification container

**Tooltip** (`tooltip/`)
- `Tooltip.svelte` - Tooltip overlay component

#### Component Exports
- `index.ts` - Main barrel export for all components
- `index.test.ts` - Compile-time smoke test for barrel exports
- Each category has its own `index.ts` barrel export

### State Management (`src/lib/stores/`)
- `fields.ts` - Field registry store and types
- `types.ts` - Type definitions store and types
- `validators.ts` - Validator store and types
- `listViewState.svelte.ts` - Unified list view state (Svelte 5 runes)
- `toasts.ts` - Toast notification store

### Utilities (`src/lib/utils/`)
- `sorting.ts` - Sorting utilities and SortState type
- `references.ts` - Reference utilities for field relationships

### Type Definitions (`src/lib/types/`)
- `index.ts` - Shared type definitions (User, ClerkState, FilterConfig, NavItem, Toast, etc.)

### Other Library Files
- `clerk.ts` - Clerk authentication integration
- `deviceDetection.ts` - Mobile device detection utilities
- `index.ts` - Main library barrel export

## Vite/TypeScript Aliases

From `svelte.config.js` and `tsconfig.json`:
- `$lib` → `src/lib`
- `$routes` → `src/routes` (implicit via SvelteKit)
- `$app/*` → SvelteKit app modules

## TypeScript Configuration

From `tsconfig.json`:
- Strict mode: **enabled**
- allowJs: **true**
- checkJs: **true**
- esModuleInterop: **true**
- forceConsistentCasingInFileNames: **true**
- resolveJsonModule: **true**
- skipLibCheck: **true**
- sourceMap: **true**
- moduleResolution: **bundler**

## Testing Strategy

**Unit Tests:** Components, utilities, and pure functions
**Integration Tests:** Routes, stores, and component interactions
**E2E Tests:** User flows across authentication and dashboard features

## Key Features by Route

### Landing Page (`/`)
- Hero section with email signup
- Features showcase
- How it works section
- Benefits checklist
- Final CTA
- Mobile menu toggle (reactive)
- Form validation and submission

### Dashboard (`/dashboard`)
- Overview statistics (StatCards)
  - Reactive totals: Fields, APIs, validators, credits available, credits used
- Activity feed
- Quick actions
- Navigation sidebar

### Field Registry (`/field-registry`)
- Table view with columns:
  - Field name
  - Type
  - Validators
  - Description
  - Used in APIs
- Search functionality
- Sortable columns
- Filter controls
- Field Details/Edit View
  - Edit, Undo, Save actions
  - Delete functionality

### Types (`/types`)
- Table view with columns:
  - Type name
  - Category
  - Type
  - Description
  - Used in fields
- Search functionality
- Sortable columns
- Filter controls
- Type creation and editing

### Validators (`/validators`)
- Table view with columns:
  - Validator name
  - Type
  - Category
  - Description
  - Used in fields
- Search functionality
- Sortable columns
- Filter controls
- Validator Details
  - Delete (only custom validators)

## Authentication Flow

1. Public routes accessible without authentication
2. Protected routes redirect to `/signin` if unauthenticated
3. Clerk handles OAuth callbacks on root layout
4. Sign out redirects to `/signin`
5. Mobile devices redirected to `/mobile-blocked`

## Dependencies

**Core:**
- SvelteKit 2.47.1
- Svelte 5.41.0
- TypeScript 5.9.3
- Vite 7.1.10

**Authentication:**
- @clerk/clerk-js 5.108.0

**Styling:**
- Tailwind CSS 3.4.18
- Autoprefixer 10.4.22

**Build Tools:**
- @sveltejs/adapter-auto 7.0.0
- @sveltejs/vite-plugin-svelte 6.2.1
- svelte-check 4.3.3
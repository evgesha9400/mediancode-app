# Median Code

Production-ready FastAPI code generation platform with optional AWS CDK deployment.

## Project Overview

Median Code is a SvelteKit application that serves both the marketing landing page and the authenticated dashboard. The landing page is publicly accessible at the root route (`/`), while the dashboard requires authentication and provides a complete API design workflow.

## Project Structure

```
median-code/
├── src/
│   ├── app.html                     # HTML shell with Font Awesome
│   ├── app.css                      # Global Tailwind styles
│   ├── routes/
│   │   ├── +layout.svelte           # Root layout with Clerk initialization
│   │   ├── +layout.ts               # Server-side layout load
│   │   ├── +page.svelte             # Landing page (public, root route)
│   │   ├── (marketing)/             # Route group for public pages
│   │   ├── (dashboard)/             # Route group for authenticated pages
│   │   │   ├── +layout.svelte       # Dashboard layout (Sidebar + content)
│   │   │   ├── dashboard/           # Dashboard home
│   │   │   ├── types/               # Types management
│   │   │   ├── validators/          # Validators management
│   │   │   ├── fields/              # Fields management
│   │   │   ├── objects/             # Objects management
│   │   │   ├── apis/                # APIs list
│   │   │   │   └── [id]/            # API detail/edit
│   │   │   ├── namespaces/          # Namespaces management
│   │   │   ├── api-generator/       # API generator
│   │   │   └── prototypes/          # Prototype pages
│   │   ├── signin/                  # Sign-in page
│   │   ├── signup/                  # Sign-up page
│   │   └── mobile-blocked/          # Mobile device blocking
│   └── lib/
│       ├── clerk.ts                 # Clerk authentication
│       ├── deviceDetection.ts       # Mobile device detection
│       ├── components/              # UI components (barrel exports)
│       │   ├── api-generator/       # API generator components
│       │   ├── drawer/              # Drawer components
│       │   ├── layout/              # Layout components
│       │   ├── logo/                # 3D Logo component
│       │   ├── namespace/           # Namespace selector
│       │   ├── search/              # Search and filter components
│       │   ├── table/               # Table components
│       │   ├── toast/               # Toast notifications
│       │   └── tooltip/             # Tooltip component
│       ├── stores/                  # Svelte stores for state management
│       ├── types/                   # Shared TypeScript types
│       └── utils/                   # Utility functions
├── static/                          # Static assets
│   ├── font-awesome.min.css
│   ├── font-awesome.min.js
│   └── webfonts/
├── tests/                           # Test suites
│   ├── unit/                        # Unit tests (Vitest)
│   ├── integration/                 # Integration tests (blocked; see tests/integration/README.md)
│   ├── e2e/                         # E2E tests (Playwright)
│   ├── fixtures/                    # Shared test fixtures
│   └── shared/                      # Shared test utilities (MSW)
├── docs/                            # Project documentation
├── tailwind.config.js               # Tailwind configuration
├── package.json                     # Dependencies
├── vercel.json                      # Vercel deployment config
├── svelte.config.js                 # SvelteKit configuration
├── vite.config.ts                   # Vite configuration
├── vitest.config.ts                 # Vitest configuration
├── playwright.config.ts             # Playwright local configuration
├── tests/config/playwright.config.ci.ts      # Playwright CI configuration
├── tests/config/playwright.config.shared.ts  # Shared Playwright settings
├── api-spec.yaml                    # OpenAPI 3.0 specification
├── tsconfig.json                    # TypeScript configuration
├── CLAUDE.md                        # AI assistant guidance
└── README.md                        # This file
```

## Tech Stack

- **Framework**: SvelteKit (Svelte 5)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (monochrome design system)
- **Icons**: Font Awesome 6.4.0 (locally hosted)
- **3D Graphics**: Three.js (logo animation)
- **Authentication**: Clerk
- **Deployment**: Vercel
- **Forms**: Formspree
- **Testing**: Vitest, Playwright, MSW

## Route Structure

**Public Routes:**
- `/` - Landing page (marketing)
- `/signin` - Sign-in page with Clerk authentication
- `/signup` - Sign-up page for new users
- `/mobile-blocked` - Mobile device blocking page

**Dashboard Routes** (authenticated):
- `/dashboard` - Dashboard home with overview stats
- `/types` - Types management (create, edit, delete types)
- `/validators` - Validators management
- `/fields` - Fields management
- `/objects` - Objects management
- `/apis` - APIs list view
- `/apis/[id]` - API detail and edit view
- `/namespaces` - Namespaces management
- `/api-generator` - API code generator

## Local Development

### Prerequisites

- Node.js 18+ installed
- Clerk account and publishable key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/median-code.git
   cd median-code
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Add your Clerk publishable key to `.env` (get from https://dashboard.clerk.com):
   ```
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Start development server**
   ```bash
   bun run dev
   ```

5. **Visit the application**
   - Open `http://localhost:5173` in your browser
   - Landing page loads at root (`/`)
   - Navigate to `/signin` for sign-in or `/signup` for sign-up
   - Navigate to `/dashboard` for authenticated dashboard

### Development Commands

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run preview      # Preview production build
bun run check        # Type-check
```

## Testing

Median Code has comprehensive testing across two layers: unit and end-to-end.

### Quick Start

```bash
# Run all checks before committing
bun run check                    # TypeScript type checking
bun run test:fixtures:validate   # Validate test fixtures
bun run test:unit                # Unit tests
bun run test:e2e:smoke           # E2E smoke tests (fast)
```

### Test Commands

```bash
# Unit tests
bun run test:unit                # Run unit tests once
bun run test:unit:watch          # Watch mode for development

# E2E tests
bun run test:e2e                 # All E2E tests
bun run test:e2e:smoke           # Smoke tests (fast, fail-fast)
bun run test:e2e:full            # Full suite with visual regression
bun run test:e2e:crud            # Setup + CRUD backend integration tests
bun run test:e2e:ui              # Interactive Playwright UI

# CI-oriented E2E commands (managed preview server)
bun run test:e2e:smoke:ci
bun run test:e2e:crud:ci

# Coverage
bun run test:coverage            # Generate coverage report

# Validation
bun run test:fixtures:validate   # Validate fixture schema
```

Local Playwright runs auto-start and auto-stop the frontend dev server
on an isolated test port by default (`127.0.0.1:4175`).
Use `PLAYWRIGHT_TEST_PORT` or `PLAYWRIGHT_BASE_URL` to override it.
Local runs are fail-fast (`maxFailures=1`) to stop quickly in IDE explorers.
To choose local vs hosted backend, set `PUBLIC_API_BASE_URL` when running E2E commands.

### Test Infrastructure

- **Unit Tests:** Component and utility testing with Vitest and Testing Library
- **E2E Tests:** Critical user flows with Playwright and visual regression
- **Fixtures:** Deterministic test data shared across all test layers
- **CI/CD:** GitHub Actions workflow validates all PRs

### Documentation

- **[Test Structure](tests/README.md)** - Directory structure and conventions
- **[E2E Tests](tests/e2e/README.md)** - Playwright E2E testing guide
- **[Fixture Schema](tests/fixtures/SCHEMA.md)** - Test data schema documentation

### Before Committing

Always run these commands:

```bash
bun run check                    # Must pass (0 errors)
bun run test:fixtures:validate   # Must pass
bun run test:unit                # Must pass
bun run test:e2e:smoke           # Must pass
```

## Deployment

### Vercel (Production)

The application automatically deploys to Vercel when changes are pushed to the `main` branch.

**Production URL**: https://mediancode.com

**Environment Variables** (set in Vercel dashboard):
- `PUBLIC_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key

### Manual Deployment

```bash
vercel --prod
```

### Pre-Deployment Checklist

Before pushing to `main`:
1. Ensure all environment variables are set in Vercel dashboard
2. Test authentication flow locally
3. Verify mobile blocking works
4. Check all form submissions
5. Test responsive design on mobile and desktop
6. Verify Font Awesome icons load correctly

## Design System

The application uses a monochrome color palette:

**Colors:**
```
mono-50:  #fafafa (lightest)
mono-100: #f5f5f5
mono-200: #e5e5e5
mono-300: #d4d4d4
mono-400: #a3a3a3
mono-500: #737373
mono-600: #525252
mono-700: #404040
mono-800: #262626
mono-900: #171717 (darkest)
```

**Typography:**
- Font: Inter (Google Fonts CDN)
- Weights: 300, 400, 500, 600, 700

**Icons:**
- Font Awesome 6.4.0 (locally hosted for reliability)
- No CDN dependencies for icons

## Authentication

The dashboard uses Clerk for authentication with support for:
- Email/Password
- OAuth providers (GitHub, Google, etc.)

**Authentication Flow:**
1. User visits `/` (landing page - public)
2. User navigates to `/signin` to sign in or `/signup` to create account
3. After successful authentication, redirects to `/dashboard`
4. Sign out redirects back to `/signin`

**Public Routes** (no authentication required):
- `/` - Landing page
- `/mobile-blocked` - Mobile blocking page

**Protected Routes** (authentication required):
- All `/dashboard/*` routes (dashboard, types, validators, fields, objects, apis, namespaces, api-generator)

## Key Features

### Landing Page
- **Responsive Design**: Mobile-first with Tailwind breakpoints
- **Mobile Menu**: Svelte reactive state management
- **Email Signup**: Formspree integration with validation
- **Code Preview**: Syntax-highlighted code example
- **Font Awesome Icons**: Locally hosted for reliability

### Dashboard
- **Clerk Authentication**: Secure user authentication
- **Mobile Device Detection**: Automatically redirects mobile users
- **Persistent Sidebar**: Navigation with 3D animated logo
- **Types Management**: Create and manage data types
- **Validators Management**: Define validation rules
- **Fields Management**: Create reusable field definitions
- **Objects Management**: Build complex data structures
- **APIs Management**: Design API endpoints with request/response bodies
- **Namespaces Management**: Organize APIs by namespace
- **API Generator**: Generate FastAPI code from your definitions

### Performance Optimizations
- **Clerk Initialization**: Loads on all routes to handle OAuth callbacks properly
- **Local Font Awesome**: No external CDN dependencies for UI
- **SvelteKit SSR**: Server-side rendering for faster initial loads
- **Route Groups**: Clean separation of public vs authenticated routes

## Development Workflow

1. **Feature Development**: Work on `develop` branch
2. **Testing**: Test locally with `bun run dev`
3. **Commit**: Use conventional commit format (see `COMMIT_MESSAGE_STANDARD.md`)
4. **Deploy**: Merge `develop` → `main` to trigger Vercel deployment

## Commit Message Standard

This project follows the conventional commits standard.

**Format:** `<type>(<scope>): <subject>`

**Common types:**
- `feat`: New feature
- `fix`: Bug fix
- `style`: Visual/CSS changes
- `refactor`: Code restructuring
- `docs`: Documentation updates
- `ci`: CI/CD changes

**Example:**
```
feat(landing): add email signup form validation
fix(signin): resolve Clerk redirect issue
style(dashboard): update header layout
```

See `docs/COMMIT_MESSAGE_STANDARD.md` for detailed guidelines.

## Project Documentation

- **CLAUDE.md** - Detailed guidance for Claude Code AI assistant
- **AGENTS.md** - Guidance for AI code agents
- **docs/COMMIT_MESSAGE_STANDARD.md** - Commit message conventions
- **docs/PAGES_AND_FEATURES.md** - Pages and features documentation
- **api-spec.yaml** - OpenAPI 3.0 specification for code generation API

## Contributing

Please follow the commit message standard and test changes locally before pushing.

## License

Proprietary

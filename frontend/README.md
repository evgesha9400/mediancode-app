# Median Code

Production-ready FastAPI code generation platform with optional AWS CDK deployment.

## Project Overview

Median Code is a SvelteKit application that serves both the marketing landing page and the authenticated dashboard. The landing page is publicly accessible at the root route (`/`), while the dashboard requires authentication and provides a complete API design workflow.

## Tech Stack

- **Framework**: SvelteKit (Svelte 5)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (monochrome design system)
- **Icons**: Font Awesome 6.4.0 (locally hosted)
- **Logo**: Canvas 2D wireframe animation (`logoCanvasRenderer.ts`)
- **Authentication**: Clerk
- **Deployment**: Vercel
- **Testing**: Vitest, Playwright, MSW

## Root Interface

| Path                                                        | Purpose                                                          |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| `README.md`                                                 | Frontend entry point for humans                                  |
| `package.json`, `bun.lock`                                  | Bun-managed dependencies and scripts                             |
| `svelte.config.js`, `vite.config.ts`, `vitest.config.ts`    | Framework and test runner config kept at root for tool discovery |
| `tsconfig*.json`, `postcss.config.js`, `tailwind.config.js` | TypeScript and styling config kept at root for tool discovery    |
| `playwright.config.ts`                                      | Local Playwright entry point                                     |
| `vercel.json`, `bunfig.toml`, `.editorconfig`               | Deployment/runtime/editor config kept at root for tool discovery |
| `config/`                                                   | Movable tool config for Prettier and Spectral                    |
| `docs/`                                                     | Frontend docs                                                    |
| `tests/`                                                    | Unit, smoke, E2E, fixtures, helpers, and page objects            |

## Route Structure

**Public Routes:**

- `/` - Landing page (marketing)
- `/signin` - Sign-in page with Clerk authentication
- `/signup` - Sign-up page for new users

**Dashboard Routes** (authenticated, redirect to `/signin` when not signed in):

- `/dashboard` - Dashboard home with overview stats
- `/types` - Types management (create, edit, delete types)
- `/validators/field-constraints` - Field Constraints management
- `/fields` - Fields management
- `/objects` - Objects management
- `/apis` - APIs list view
- `/apis/[id]` - API detail and edit view
- `/namespaces` - Namespaces management
- `/settings` - User/organization settings

## Local Development

### Prerequisites

- Bun 1.3.x installed (CI currently pins the exact supported release)
- Clerk account and publishable key

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/evgesha9400/mediancode-app.git
   cd mediancode-app/frontend
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
- **CI/CD:** GitHub Actions validates changes and deploys tested branch artifacts

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

### Vercel through GitHub Actions

Vercel's direct Git deployment is disabled in `vercel.json`. GitHub Actions
runs the frontend checks, builds with the pinned Vercel CLI, and uploads the
tested build output:

- `develop` → preview deployment, then alias to
  `https://dev.mediancode.com`
- `main` → production deployment at `https://mediancode.com`

**Environment Variables** (set in Vercel dashboard):

- `PUBLIC_CLERK_PUBLISHABLE_KEY` — matching development or production Clerk
  publishable key
- `PUBLIC_API_BASE_URL` — matching public backend `/v1` URL

GitHub Actions additionally requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
`VERCEL_PROJECT_ID`. The token is a secret; the two IDs are non-secret
environment variables.

Manual deployment is an emergency procedure, not the normal release path. Use
Vercel's dashboard rollback for the fastest frontend recovery, or revert the
Git commit and let the normal pipeline redeploy.

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
mono-50:  #f6f6fa (lightest)
mono-100: #f0f0f5
mono-200: #e0e0e6
mono-300: #cfcfd6
mono-400: #a0a0a8
mono-500: #74747b
mono-600: #55555b
mono-700: #444449
mono-800: #2b2b2e
mono-900: #1d1d1f
mono-950: #101012 (darkest)
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
3. Accessing any dashboard route while unauthenticated redirects to `/signin?redirect=<path>`
4. After successful authentication, redirects to the original destination (or `/dashboard`)
5. Sign out redirects back to `/signin`

**Public Routes** (no authentication required):

- `/` - Landing page

**Protected Routes** (authentication required — all routes in the `(dashboard)` route group):

- `/dashboard`, `/types`, `/validators/*`, `/fields`, `/objects`, `/apis`, `/apis/[id]`, `/namespaces`, `/settings`

## Key Features

### Landing Page

- **Responsive Design**: Mobile-first with Tailwind breakpoints
- **Mobile Menu**: Svelte reactive state management
- **Code Preview**: Syntax-highlighted code example
- **Font Awesome Icons**: Locally hosted for reliability

### Dashboard

- **Clerk Authentication**: Secure user authentication
- **Mobile Device Detection**: Automatically redirects mobile users
- **Persistent Sidebar**: Navigation with animated logo
- **Types Management**: Create and manage data types
- **Validators Management**: Define validation rules
- **Fields Management**: Create reusable field definitions
- **Objects Management**: Build complex data structures
- **APIs Management**: Design API endpoints with request/response bodies
- **Namespaces Management**: Organize APIs by namespace

### Performance Optimizations

- **Clerk Initialization**: Loads on all routes to handle OAuth callbacks properly
- **Local Font Awesome**: No external CDN dependencies for UI
- **SvelteKit SSR**: Server-side rendering for faster initial loads
- **Route Groups**: Clean separation of public vs authenticated routes

## Development Workflow

1. **Feature Development**: Work on `develop` branch
2. **Testing**: Test locally with `bun run dev`
3. **Commit**: Use conventional commit format (see `../docs/standards/COMMIT_MESSAGE_STANDARD.md`)
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

- **[docs/environments.md](docs/environments.md)** - Frontend environment strategy
- **[../docs/standards/COMMIT_MESSAGE_STANDARD.md](../docs/standards/COMMIT_MESSAGE_STANDARD.md)** - Commit message conventions
- **[../api-spec.yaml](../api-spec.yaml)** - OpenAPI contract for the code generation API

## Contributing

Please follow the commit message standard and test changes locally before pushing.

## License

Proprietary

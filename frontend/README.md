# Median Code

Production-ready FastAPI code generation platform with optional AWS CDK deployment.

## Project Overview

Median Code is a SvelteKit application that serves both the marketing landing page and the authenticated dashboard. The landing page is publicly accessible at the root route (`/`), while the dashboard requires authentication.

## Project Structure

```
median-code/
├── src/
│   ├── app.html               # HTML shell with Font Awesome
│   ├── app.css                # Global Tailwind styles
│   ├── routes/
│   │   ├── +layout.svelte     # Root layout with Clerk initialization
│   │   ├── +layout.ts         # Server-side layout load
│   │   ├── +page.svelte       # Landing page (public, root route)
│   │   ├── (marketing)/       # Route group for public pages
│   │   ├── auth/              # Authentication page
│   │   ├── dashboard/         # Authenticated dashboard
│   │   └── mobile-blocked/    # Mobile device blocking
│   └── lib/
│       ├── clerk.ts           # Clerk authentication
│       └── deviceDetection.ts
├── static/                    # Static assets
│   ├── font-awesome.min.css
│   ├── font-awesome.min.js
│   └── webfonts/
├── tailwind.config.js         # Tailwind configuration
├── package.json               # Dependencies
├── vercel.json                # Vercel deployment config
├── svelte.config.js           # SvelteKit configuration
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── CLAUDE.md                  # AI assistant guidance
├── COMMIT_MESSAGE_STANDARD.md # Commit conventions
└── README.md                  # This file
```

## Tech Stack

- **Framework**: SvelteKit
- **Language**: TypeScript
- **Styling**: Tailwind CSS (monochrome design system)
- **Icons**: Font Awesome 6.4.0 (locally hosted)
- **Authentication**: Clerk
- **Deployment**: Vercel
- **Forms**: Formspree

## Route Structure

- `/` - Public landing page (marketing)
- `/auth` - Authentication page with Clerk sign-in
- `/dashboard` - Authenticated dashboard (requires sign-in)
- `/mobile-blocked` - Mobile device blocking page

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
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Add your Clerk publishable key to `.env`:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Visit the application**
   - Open `http://localhost:5173` in your browser
   - Landing page loads at root (`/`)
   - Navigate to `/auth` for authentication
   - Navigate to `/dashboard` for authenticated dashboard

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run check        # Type-check
npm run lint         # Run linter
```

## Deployment

### Vercel (Production)

The application automatically deploys to Vercel when changes are pushed to the `main` branch.

**Production URL**: https://app.mediancode.com

**Environment Variables** (set in Vercel dashboard):
- `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key

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
2. User navigates to `/auth` to sign in
3. After successful authentication, redirects to `/dashboard`
4. Sign out redirects back to `/auth`

**Public Routes** (no authentication required):
- `/` - Landing page
- `/mobile-blocked` - Mobile blocking page

**Protected Routes** (authentication required):
- `/dashboard` - Main dashboard

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
- **User Profile**: Display user information and avatar
- **Sign Out**: Secure session termination

### Performance Optimizations
- **Conditional Clerk Initialization**: Only loads Clerk on authenticated routes
- **Local Font Awesome**: No external CDN dependencies for UI
- **SvelteKit SSR**: Server-side rendering for faster initial loads
- **Route Groups**: Clean separation of public vs authenticated routes

## Development Workflow

1. **Feature Development**: Work on `develop` branch
2. **Testing**: Test locally with `npm run dev`
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
fix(auth): resolve Clerk redirect issue
style(dashboard): update header layout
```

See `COMMIT_MESSAGE_STANDARD.md` for detailed guidelines.

## Project Documentation

- **CLAUDE.md** - Detailed guidance for Claude Code AI assistant
- **COMMIT_MESSAGE_STANDARD.md** - Commit message conventions
- **docs/MIGRATION_SVELTEKIT.md** - Migration plan from static landing to SvelteKit

## Contributing

Please follow the commit message standard and test changes locally before pushing.

## License

Proprietary

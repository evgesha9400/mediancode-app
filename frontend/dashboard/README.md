# Median Code Dashboard

SvelteKit-based dashboard for the Median Code platform.

## Tech Stack

- **Framework**: SvelteKit with TypeScript
- **Styling**: Tailwind CSS with custom monochrome theme
- **Authentication**: Clerk (vanilla JS SDK)
- **Deployment**: Vercel

## Development

### Prerequisites

- Node.js v20+ (recommended LTS version)
- npm

### Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Clerk publishable key to `.env`:
   ```
   PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

   Get your key from: https://dashboard.clerk.com

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

### Building for Production

```bash
npm run build
npm run preview
```

## Deployment

### Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key

4. Configure custom domain:
   - Add `app.mediancode.com` in Vercel project settings
   - Update DNS records as instructed by Vercel

### Environment Variables

Required environment variables:

- `PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key (starts with `pk_test_` or `pk_live_`)

## Project Structure

```
dashboard/
├── src/
│   ├── lib/
│   │   ├── clerk.ts              # Clerk auth store and utilities
│   │   ├── deviceDetection.ts    # Mobile device detection
│   │   └── assets/               # Static assets
│   ├── routes/
│   │   ├── +layout.svelte        # Root layout with Clerk init
│   │   ├── +layout.ts            # Load function for env vars
│   │   ├── +page.svelte          # Login page (root)
│   │   ├── dashboard/
│   │   │   └── +page.svelte      # Main dashboard (protected)
│   │   └── mobile-blocked/
│   │       └── +page.svelte      # Mobile blocked page
│   ├── app.css                   # Tailwind directives
│   └── app.html                  # HTML template
├── static/                       # Public static files
├── tailwind.config.js            # Tailwind configuration
├── svelte.config.js              # SvelteKit configuration
└── vite.config.ts                # Vite configuration
```

## Features

- **Authentication**: Embedded Clerk sign-in/sign-up with social providers (GitHub, Google, Email)
- **Protected Routes**: Automatic redirect to dashboard after login
- **Mobile Detection**: Blocks mobile/tablet users with friendly message
- **Responsive Design**: Optimized for desktop usage (1024px+)
- **Monochrome Theme**: Consistent branding with landing page

## Design System

### Colors (Monochrome Palette)

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

### Typography

- Font family: Inter (Google Fonts)
- Weights: 300, 400, 500, 600, 700

## Notes

- Built with Svelte 5 (using new runes syntax)
- Uses `--force` flag for npm install due to Node v23 compatibility
- Clerk SDK initialized client-side only
- Desktop-first design (mobile users are redirected)

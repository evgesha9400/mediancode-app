# Median Code

Production-ready FastAPI code generation platform with optional AWS CDK deployment.

## Project Structure

This is a monorepo containing two separate applications:

```
median-code/
├── landing/                    # Static landing page (GitHub Pages)
│   ├── index.html             # Main landing page
│   ├── CNAME                  # Custom domain: mediancode.com
│   ├── assets/                # Locally hosted assets
│   │   ├── css/               # Tailwind CSS + Font Awesome
│   │   ├── js/                # Font Awesome JS
│   │   └── webfonts/          # Font Awesome fonts
│   ├── styles/
│   │   └── input.css          # Tailwind source
│   ├── package.json           # Build dependencies
│   ├── tailwind.config.js     # Tailwind config
│   ├── postcss.config.js      # PostCSS config
│   └── README.md              # Landing documentation
├── dashboard/                 # SvelteKit dashboard app (Vercel)
│   ├── src/                   # Application source code
│   └── README.md              # Dashboard documentation
├── .github/
│   └── workflows/
│       └── landing.yml        # GitHub Pages deployment
├── CLAUDE.md                  # AI assistant guidance
└── README.md                  # This file
```

## Applications

### Landing Page (`/landing`)

- **Tech**: Vanilla HTML, Tailwind CSS (locally built), Font Awesome (locally hosted), minimal JavaScript
- **Deployment**: GitHub Pages
- **URL**: https://mediancode.com
- **Purpose**: Marketing site and user acquisition

**Asset Hosting:**
- **Critical assets** (Tailwind CSS, Font Awesome) → Locally served for reliability
- **Non-critical assets** (Google Fonts typography) → CDN for performance
- See `landing/README.md` for detailed asset strategy

**Local Development:**
```bash
cd landing
make install             # Install build tools
make build-css           # Build Tailwind CSS
make serve               # Start local dev server
# Visit http://localhost:8000
```

**Alternative commands (without make):**
```bash
npm install              # Install dependencies
npm run build:css        # One-time rebuild
npm run watch:css        # Watch for changes (auto-rebuild)
npm run serve            # Start local server
```

### Dashboard (`/dashboard`)

- **Tech**: SvelteKit, TypeScript, Tailwind CSS, Clerk Auth
- **Deployment**: Vercel
- **URL**: https://app.mediancode.com
- **Purpose**: Authenticated application for code generation

**Local Development:**
```bash
cd dashboard
npm install
npm run dev
# Visit http://localhost:5173
```

See `dashboard/README.md` for detailed setup instructions.

## Deployment

### Landing Page

Automatically deployed to GitHub Pages when changes are pushed to `main` branch.

**Workflow**: `.github/workflows/landing.yml`

### Dashboard

Deploy to Vercel:

```bash
cd dashboard
vercel
```

Configure environment variables in Vercel dashboard:
- `PUBLIC_CLERK_PUBLISHABLE_KEY`

Set custom domain to `app.mediancode.com` in Vercel project settings.

## Development Workflow

1. **Feature Development**: Work on `develop` branch
2. **Testing**: Test locally for both landing and dashboard
3. **Commit**: Use conventional commit format (see `COMMIT_MESSAGE_STANDARD.md`)
4. **Deploy**: Merge to `main` for landing page, use Vercel CLI for dashboard

## Design System

Both applications share a consistent monochrome design:

**Colors:**
```
mono-50  to mono-900  (#fafafa to #171717)
```

**Typography:**
- Font: Inter (Google Fonts)
- Weights: 300, 400, 500, 600, 700

## Authentication

The dashboard uses Clerk for authentication with support for:
- Email/Password
- GitHub OAuth
- Google OAuth

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/median-code.git
   cd median-code
   ```

2. **Set up dashboard authentication**
   ```bash
   cd dashboard
   cp .env.example .env
   # Add your Clerk publishable key to .env
   ```

3. **Start local development**
   - Landing page: `python3 -m http.server 8000 --directory landing`
   - Dashboard: `cd dashboard && npm install && npm run dev`

## Contributing

Please follow the commit message standard defined in `COMMIT_MESSAGE_STANDARD.md`.

## License

Proprietary

# Median Code Landing Page

Static landing page for Median Code - a platform that generates production-ready FastAPI code with optional AWS CDK deployment.

## Tech Stack

- **HTML5** - Semantic markup
- **Tailwind CSS 3.x** - Styling via CDN
- **Font Awesome 6.4.0** - Icons via CDN
- **Google Fonts** - Inter typeface
- **GitHub Pages** - Hosting at [mediancode.com](https://mediancode.com)

## Development

Start a local server from the `src/` directory:

```bash
# Python 3
python3 -m http.server 8000 --directory src

# Node.js
npx http-server src -p 8000

# PHP
php -S localhost:8000 -t src
```

Visit `http://localhost:8000` to view the site.

## Project Structure

```
median-code/
├── src/
│   ├── index.html     # Main landing page
│   └── CNAME          # Custom domain (mediancode.com)
├── .github/
│   └── workflows/
│       └── static.yml # GitHub Pages deployment
└── COMMIT_MESSAGE_STANDARD.md
```

## Deployment

The site auto-deploys to GitHub Pages when changes are pushed to `main`.

**Workflow:**
1. Develop on `develop` branch
2. Test locally
3. Merge `develop` → `main` to deploy
4. Monitor deployment in GitHub Actions tab

Live site: https://mediancode.com

## Design System

Monochrome palette with Tailwind custom colors (`mono-50` to `mono-900`):

- `mono-50`: #fafafa (lightest)
- `mono-900`: #171717 (darkest)

Mobile-first responsive design using Tailwind breakpoints (sm, md, lg, xl).

## Page Sections

- Header/Navigation (sticky, mobile-responsive)
- Hero (value prop + email signup + code preview)
- Features (FastAPI, AWS CDK, PostgreSQL)
- How It Works (3-step process)
- Benefits (feature checklist)
- Final CTA (secondary signup)
- Footer

## Commit Convention

This project uses [Conventional Commits](COMMIT_MESSAGE_STANDARD.md):

```
<type>(<scope>): <subject>

Examples:
feat(hero): add email validation
fix(mobile): resolve menu toggle
style(footer): update copyright year
```

## Branch Strategy

- `main` - Production (triggers deployment)
- `develop` - Active development

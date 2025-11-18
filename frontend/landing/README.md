# Median Code Landing Page

Static landing page for Median Code - a platform that generates production-ready FastAPI code with optional AWS CDK deployment.

## Tech Stack

- **HTML5** - Semantic markup
- **Tailwind CSS 3.x** - Locally built (not CDN)
- **Font Awesome 6.4.0** - Locally hosted icons
- **Google Fonts** - Inter typeface (CDN)
- **GitHub Pages** - Hosting at [mediancode.com](https://mediancode.com)

## Asset Hosting Strategy

### Locally Served Assets

Critical UI assets are built and served locally for reliability and performance:

1. **Tailwind CSS** (`assets/css/styles.css`)
   - Built with Tailwind CLI + PostCSS
   - Minified production build
   - All custom brand colors included

2. **Font Awesome Icons** (`assets/css/` + `assets/js/` + `assets/webfonts/`)
   - Complete icon library locally hosted
   - No CDN dependencies for icons

### CDN Served Assets

Non-critical assets leverage CDN for performance:

1. **Google Fonts** - Inter typography
   - Graceful fallback to system fonts
   - Optimized caching across sites

## Development

### Setup

```bash
npm install
```

### Build CSS

Build Tailwind CSS once or after changes:

```bash
# Using make
make build-css

# Or using npm
npm run build:css
```

For development with auto-rebuild:

```bash
# Using make
make watch-css

# Or using npm
npm run watch:css
```

### Local Development

Serve the site locally:

```bash
# Using make (recommended)
make serve

# Or using npm
npm run serve

# Or using Python 3 directly
python3 -m http.server 8000
```

Visit `http://localhost:8000` in your browser.

**To stop the server:**

```bash
make stop       # Kill any running server on port 8000
```

### File Structure

```
landing/
├── index.html              # Main landing page
├── CNAME                   # Custom domain config (mediancode.com)
├── assets/
│   ├── css/
│   │   ├── styles.css      # Built Tailwind CSS (minified)
│   │   └── font-awesome.min.css
│   ├── js/
│   │   └── font-awesome.min.js
│   └── webfonts/           # Font Awesome fonts
├── styles/
│   └── input.css           # Tailwind source (for rebuilds)
├── package.json            # Build dependencies
├── tailwind.config.js      # Tailwind theme config
├── postcss.config.js       # PostCSS config
└── README.md               # This file
```

### Making Changes

**HTML:**
- Edit `index.html` directly
- Refresh browser to see changes

**Styles:**
- Edit `styles/input.css` to add custom CSS
- Run `npm run build:css` to rebuild
- Check browser for updates

**Icons:**
- Use Font Awesome 6.4.0 class names (e.g., `fa-solid fa-code`)
- All icons are locally available

## Deployment

### GitHub Pages

Changes are automatically deployed when pushed to `main` branch.

**Workflow:** `.github/workflows/landing.yml`
- Deploys `landing/` directory to GitHub Pages
- Custom domain: mediancode.com
- Deployment takes 1-2 minutes

### Pre-Deployment

Before merging to `main`:
1. Run `npm run build:css` to ensure CSS is up-to-date
2. Commit the built CSS file
3. Verify all changes locally
4. Do NOT commit `node_modules/`

## Design System

### Colors (Monochrome Palette)

```
mono-50  #fafafa (lightest)
mono-100 #f5f5f5
mono-200 #e5e5e5
mono-300 #d4d4d4
mono-400 #a3a3a3
mono-500 #737373
mono-600 #525252
mono-700 #404040
mono-800 #262626
mono-900 #171717 (darkest)
```

### Typography

- Font: Inter (Google Fonts)
- Weights: 300, 400, 500, 600, 700

## Page Sections

1. **Header/Navigation** - Sticky header with mobile menu toggle
2. **Hero** - Main value proposition with code preview and email signup
3. **Features** - Three key features (FastAPI, AWS CDK, PostgreSQL)
4. **How It Works** - Three-step process
5. **Benefits** - Why choose Median Code with feature checklist
6. **Final CTA** - Secondary email signup
7. **Footer** - Basic branding and copyright

## Performance Notes

- All assets load from same origin (no third-party delays for critical UI)
- CSS is minified and optimized
- Font Awesome uses SVG auto-replace for modern icon rendering
- Google Fonts CDN provides excellent caching for typography
- Total page load is fast with zero layout shift

## Troubleshooting

### CSS Not Updating

If changes to `styles/input.css` aren't showing:
1. Run `npm run build:css` again
2. Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
3. Check that `assets/css/styles.css` was rebuilt

### Icons Not Showing

If Font Awesome icons aren't displaying:
1. Verify icon class names (e.g., `fa-solid fa-code`)
2. Check browser console for errors
3. Ensure `assets/js/font-awesome.min.js` is loaded
4. Clear browser cache and reload

### Deployment Issues

If changes aren't appearing on the live site:
1. Verify changes are committed and pushed to `main` branch
2. Check GitHub Actions tab for deployment status
3. Wait 1-2 minutes for deployment to complete
4. Hard refresh the live site to clear any cache


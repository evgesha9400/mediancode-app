# SvelteKit Landing Page Migration

## Overview
Migrate static landing page from `/landing` to SvelteKit dashboard at `/dashboard`.
Landing becomes root route `/`, auth moves to `/auth`, dashboard stays at `/dashboard`.

## Prerequisites
- Working directory: `/Users/evgesha/Documents/Projects/median-code/dashboard`
- Node.js installed
- All changes in `dashboard/` directory unless specified

## Step 1: Copy Font Awesome Assets
```bash
# From project root
cp -r landing/assets/webfonts dashboard/static/
cp landing/assets/css/font-awesome.min.css dashboard/static/
cp landing/assets/js/font-awesome.min.js dashboard/static/
```

## Step 2: Update app.html for Font Awesome
Edit `dashboard/src/app.html`:
- Add after existing `%sveltekit.head%`:
```html
<link rel="stylesheet" href="/font-awesome.min.css">
<script>window.FontAwesomeConfig = { autoReplaceSvg: 'nest'};</script>
<script src="/font-awesome.min.js"></script>
```

## Step 3: Create Route Structure
```bash
# Create new directories
mkdir -p dashboard/src/routes/auth
mkdir -p dashboard/src/routes/\(marketing\)

# Move existing auth to /auth
mv dashboard/src/routes/+page.svelte dashboard/src/routes/auth/+page.svelte
```

## Step 4: Create Landing Page Route
Create `dashboard/src/routes/+page.svelte`:
1. Copy content from `landing/index.html` between `<body>` tags
2. Convert to Svelte component:
   - Remove `<script>` tags at bottom
   - Convert to Svelte script section
   - Replace `getElementById` with Svelte bindings
   - Convert form submissions to Svelte handlers

## Step 5: Convert JavaScript to Svelte
In new `dashboard/src/routes/+page.svelte`:

Replace mobile menu toggle:
```svelte
<script>
  let mobileMenuOpen = false;

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }
</script>
```

Update HTML bindings:
- `class:hidden={!mobileMenuOpen}` for menu visibility
- `on:click={toggleMobileMenu}` for button
- `on:click={closeMobileMenu}` for menu links

## Step 6: Handle Form Submissions
Convert Formspree forms to Svelte:
```svelte
<script>
  async function handleSubmit(event) {
    const form = event.target;
    const data = new FormData(form);

    const response = await fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      // Handle success
      form.reset();
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} action="https://formspree.io/f/meovrpjv">
```

## Step 7: Update Navigation Guards
Edit `dashboard/src/routes/+layout.svelte`:
```svelte
<script>
  // Add route check for public pages
  const publicRoutes = ['/', '/mobile-blocked'];
  const isPublicRoute = publicRoutes.includes($page.url.pathname);

  // Only initialize Clerk for non-public routes
  $effect(() => {
    if (browser && data.clerkPublishableKey && !isPublicRoute) {
      initializeClerk(data.clerkPublishableKey);
    }
  });
</script>
```

## Step 8: Create Route Layout for Public Pages
Create `dashboard/src/routes/(marketing)/+layout.svelte`:
```svelte
<script>
  // No Clerk initialization for marketing pages
</script>

<slot />
```

## Step 9: Update Auth Redirects
Edit `dashboard/src/routes/auth/+page.svelte`:
- Keep existing Clerk integration
- No changes needed to redirect logic

Edit `dashboard/src/lib/clerk.ts` if exists:
- Update redirect URLs to use `/auth` instead of `/`

## Step 10: Clean Up Tailwind
Remove from `dashboard/src/routes/+page.svelte`:
- Any duplicate Tailwind classes already in `app.css`
- Inline styles that can use existing theme colors

## Step 11: Update Environment Variables
No changes needed - keep existing `.env` structure

## Step 12: Test Locally
```bash
cd dashboard
npm install
npm run dev
```

Test:
1. Landing page at `http://localhost:5173/`
2. Auth at `http://localhost:5173/auth`
3. Dashboard at `http://localhost:5173/dashboard` (requires auth)
4. Mobile blocking still works
5. Form submissions work

## Step 13: Update Deployment
Edit `dashboard/vercel.json` - no changes needed, adapter-auto handles routing

## Step 14: Update GitHub Workflow
Delete `.github/workflows/landing.yml` - no longer needed

## Step 15: Update Project Documentation
Edit `/CLAUDE.md`:
- Remove landing/ directory references
- Update to reflect SvelteKit structure
- Note that landing is now at root route

Edit `/README.md`:
- Remove landing/ setup instructions
- Update to single SvelteKit app instructions

## Step 16: Remove Old Landing Directory
After confirming everything works:
```bash
rm -rf landing/
```

## Step 17: Deploy
```bash
git add .
git commit -m "feat: migrate landing page to SvelteKit root route"
git push
```

Vercel auto-deploys on push to main branch.

## Verification Checklist
- [ ] Landing page loads at `/`
- [ ] No authentication required for landing
- [ ] Auth page works at `/auth`
- [ ] Dashboard requires auth at `/dashboard`
- [ ] Font Awesome icons display correctly
- [ ] Mobile menu works
- [ ] Form submissions work
- [ ] Mobile blocking works
- [ ] All Tailwind styles applied correctly
- [ ] No console errors

## Rollback Plan
If issues occur:
1. `git revert HEAD`
2. Restore `.github/workflows/landing.yml`
3. Restore `landing/` directory from git history
4. Deploy landing separately to GitHub Pages

## Notes
- Single deployment simplifies maintenance
- Unified Tailwind config reduces duplication
- Font Awesome remains locally hosted for reliability
- Route structure allows future marketing pages
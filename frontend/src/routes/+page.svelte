<script lang="ts">
	import { clerkState } from '$lib/clerk';
	import { Logo } from '$lib/components/logo';
	import {
		marketingBetaDot,
		marketingBetaPill,
		marketingCtaOutline,
		marketingCtaPrimary,
		marketingFeatureIcon,
		marketingFooterCta,
		marketingFooterCtaSecondary,
		marketingHeader,
		marketingHeroCta,
		marketingHeroCtaSecondary,
		marketingHowItWorksStepBody,
		marketingHowItWorksStepColumn,
		marketingHowItWorksStepTitle,
		marketingHowItWorksWatermark,
		marketingMobileMenu,
		marketingNavLink,
		marketingNavLinkMobile,
		themeAccentBadge,
		themeAccentFill,
		themeAccentGlowGradient,
		themeAccentIconBadge,
		themeAccentText,
	} from '$lib/ui/classes';

	type MarketingFeatureCard = {
		icon: string;
		title: string;
		description: string;
		codeExample?: string;
	};

	const marketingNavSections = [
		{ href: '#features', label: 'Features' },
		{ href: '#how-it-works', label: 'How It Works' },
		{ href: '#philosophy', label: 'Philosophy' },
	] as const;

	const heroGlowOrbs = [
		'top-[6%] left-1/2 h-[min(32rem,55vw)] w-[min(52rem,95vw)] -translate-x-1/2 opacity-[0.14] blur-[120px]',
		'top-[32%] -right-[8%] h-[22rem] w-[28rem] opacity-[0.09] blur-[100px]',
		'top-[52%] -left-[12%] h-[18rem] w-[26rem] opacity-[0.1] blur-[90px]',
		'top-[62%] -left-[22%] h-[19rem] w-[26rem] opacity-[0.07] blur-[95px]',
		'bottom-[8%] left-1/2 h-[16rem] w-[min(40rem,90vw)] -translate-x-1/2 opacity-[0.11] blur-[100px]',
	] as const;

	const trustBadges = [
		'Deterministic output',
		'Instant generation',
		'Human-readable code',
		'Ready to deploy',
	] as const;

	const terminalGeneratedFiles = [
		{ path: 'models/user.py', lines: 63 },
		{ path: 'models/order.py', lines: 56 },
		{ path: 'schemas/user.py', lines: 49 },
		{ path: 'schemas/order.py', lines: 44 },
		{ path: 'routes/users.py', lines: 112 },
		{ path: 'routes/orders.py', lines: 97 },
		{ path: 'alembic/versions/001_initial.py', lines: 48 },
		{ path: 'infra/cdk_stack.py', lines: 86 },
	] as const;

	const featureCards: readonly MarketingFeatureCard[] = [
		{
			icon: 'fa-bolt',
			title: 'FastAPI Endpoints',
			description:
				'Complete CRUD routes with proper request/response models, error handling, and auto-generated OpenAPI documentation.',
		},
		{
			icon: 'fa-database',
			title: 'SQLAlchemy Models',
			description:
				'Database models with proper column types, relationships, foreign keys, and constraints, ready for PostgreSQL.',
		},
		{
			icon: 'fa-shield-halved',
			title: 'Pydantic Schemas',
			description:
				'Request and response schemas with field constraints, type validation, and serialization configured out of the box.',
		},
		{
			icon: 'fa-cloud',
			title: 'AWS CDK Infrastructure',
			description:
				'Optional deployment code for AWS including Lambda, API Gateway, RDS.',
			codeExample: 'cdk deploy',
		},
		{
			icon: 'fa-layer-group',
			title: 'Alembic Migrations',
			description:
				'Database migration scripts generated automatically. Schema evolution handled from day one, not retrofitted later.',
		},
		{
			icon: 'fa-check-double',
			title: 'Validator Templates',
			description:
				'Common field and model validators from a curated gallery including email normalization, date ranges, and more.',
		},
	] as const;

	const howItWorksSteps = [
		{
			index: '01',
			title: 'Define Models',
			description:
				'Use the visual interface to declare your data objects, field types, relationships, and constraints. No YAML, no JSON. Just forms and dropdowns.',
		},
		{
			index: '02',
			title: 'Generate',
			description:
				'One click. Median Code produces a complete FastAPI project with endpoints, models, schemas, migrations, and infrastructure. Same input, same output, every time.',
		},
		{
			index: '03',
			title: 'Deploy',
			description:
				"Download the full project, add your business logic, and deploy. Use the included CDK stack or your own infrastructure. It's your code. Own it.",
		},
	] as const;

	const philosophyItems = [
		{
			icon: 'fa-cube',
			title: 'Structural, not behavioral',
			description:
				'We generate table definitions and endpoint scaffolding. Business logic is yours to write.',
		},
		{
			icon: 'fa-code-branch',
			title: 'Deterministic, always',
			description:
				'Same inputs produce identical output. No AI guessing, no ambiguity, no surprises.',
		},
		{
			icon: 'fa-unlock-keyhole',
			title: 'A starting point, not a cage',
			description:
				"Download the full project, add your business logic, and deploy. It's your code to own and extend.",
		},
	] as const;

	const outputManifestItems = [
		'FastAPI Application',
		'SQLAlchemy Models',
		'Pydantic Schemas',
		'Alembic Migrations',
		'AWS CDK Stack',
		'API Documentation',
	] as const;

	const marketingAccentGlowOrb = `${themeAccentFill} absolute rounded-full`;
	const marketingAccentInfoGlow = themeAccentGlowGradient;
	const marketingTrustBadgeIcon = `w-5 h-5 rounded-full ${themeAccentIconBadge}`;
	const marketingPhilosophyIcon = `w-8 h-8 rounded-full flex-shrink-0 mt-0.5 ${themeAccentIconBadge}`;
	const marketingManifestIncludedPill = `text-xs px-2 py-1 rounded-md font-medium ${themeAccentBadge}`;
	const marketingFeatureCard =
		'p-8 bg-surface-base/40 border border-edge-faint/80 rounded-2xl hover:bg-surface-base/60 hover:border-edge/80 transition-all hover:-translate-y-1 shadow-lg';
	const marketingManifestRow =
		'flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] rounded-xl transition-colors';

	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function scrollToTop(event: MouseEvent) {
		event.preventDefault();
		window.scrollTo({ top: 0, behavior: 'smooth' });
		window.history.replaceState({}, document.title, window.location.pathname);
		closeMobileMenu();
	}
</script>

<!-- Header -->
<header id="header" class={marketingHeader}>
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<a
				href="/"
				onclick={scrollToTop}
				class="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
			>
				<Logo size="md" />
				<span class="text-lg font-inter font-semibold text-fg tracking-tight">Median Code</span>
			</a>
			<button
				onclick={toggleMobileMenu}
				aria-label="Toggle mobile menu"
				class="md:hidden w-10 h-10 flex items-center justify-center"
			>
				<i class="fa-solid {mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-white text-xl"></i>
			</button>
			<nav class="hidden md:flex items-center space-x-8">
				{#each marketingNavSections as section}
					<a href={section.href} class={marketingNavLink}>{section.label}</a>
				{/each}

				{#if $clerkState.isLoaded}
					<div class="h-5 w-px bg-surface-raised"></div>

					{#if $clerkState.isSignedIn}
						<a href="/dashboard" class={marketingCtaOutline}>
							Dashboard
						</a>
					{:else}
						<a href="/signin" class={marketingCtaOutline}>
							Sign In
						</a>
						<a href="/signup" class={marketingCtaPrimary}>
							Start Building
						</a>
					{/if}
				{/if}
			</nav>
		</div>
	</div>
	<!-- Mobile menu (softened) -->
	<div class={marketingMobileMenu} class:hidden={!mobileMenuOpen}>
		<div class="px-4 py-4 space-y-1">
			{#each marketingNavSections as section}
				<a href={section.href} onclick={closeMobileMenu} class={marketingNavLinkMobile}>
					{section.label}
				</a>
			{/each}
			{#if $clerkState.isLoaded && !$clerkState.isSignedIn}
				<div class="border-t border-edge-faint/60 pt-3 mt-3 space-y-3">
					<a href="/signin" onclick={closeMobileMenu} class="{marketingCtaOutline} w-full justify-center sm:w-auto">
						Sign In
					</a>
					<a href="/signup" onclick={closeMobileMenu} class="{marketingCtaPrimary} w-full justify-center sm:w-auto">
						Start Building
					</a>
				</div>
			{/if}
			{#if $clerkState.isLoaded && $clerkState.isSignedIn}
				<div class="border-t border-edge-faint/60 pt-3 mt-3">
					<a href="/dashboard" onclick={closeMobileMenu} class="{marketingCtaOutline} w-full justify-center sm:w-auto">
						Go to Dashboard
					</a>
				</div>
			{/if}
		</div>
	</div>
</header>

<!-- One continuous canvas: base + sprinkled green glows (sections stay transparent) -->
<div class="relative bg-surface-base text-white overflow-x-hidden">
	<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
		{#each heroGlowOrbs as orbClass}
			<div class={`${marketingAccentGlowOrb} ${orbClass}`}></div>
		{/each}
	</div>

	<!-- Hero: min height below sticky header (4rem). Tighter pt when content is taller than viewport, flex grow had no slack. -->
	<section
		id="hero"
		class="relative z-10 flex min-h-[calc(100dvh-4rem)] flex-col justify-center overflow-hidden pt-8 sm:pt-10 lg:pt-12 pb-12 sm:pb-16 lg:pb-20"
	>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
			<div class="space-y-10">
				<!-- Status indicator -->
				<div class={marketingBetaPill}>
					<span class={marketingBetaDot}></span>
					<span class={`text-xs font-inter font-semibold uppercase tracking-widest ${themeAccentText}`}>beta</span>
				</div>

				<!-- Softened headline -->
				<h1 class="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tighter font-inter">
					The Shortest Path to a <br class="hidden sm:block" /><span class="text-fg-secondary">Production API</span>
				</h1>

				<p class="text-lg sm:text-xl text-fg-muted leading-relaxed max-w-2xl font-inter">
					Define your data models. Get a complete FastAPI application with PostgreSQL, SQLAlchemy, Pydantic schemas, and AWS CDK infrastructure. <span class="text-fg">Instantly.</span>
				</p>

				<!-- CTA buttons -->
				<div class="flex flex-col sm:flex-row gap-4 pt-2">
					{#if $clerkState.isLoaded && $clerkState.isSignedIn}
						<a href="/dashboard" class={marketingHeroCta}>
							Go to Dashboard
							<i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
						</a>
					{:else}
						<a href="/signup" class={marketingHeroCta}>
							Get Started for Free
							<i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
						</a>
						<a href="#how-it-works" class={marketingHeroCtaSecondary}>
							See How It Works
						</a>
					{/if}
				</div>

				<!-- Trust badges -->
				<div class="flex flex-wrap gap-x-8 gap-y-4 text-sm font-inter text-fg-muted font-medium pt-4">
					{#each trustBadges as badge}
						<div class="flex items-center space-x-2">
							<div class={marketingTrustBadgeIcon}>
								<i class="fa-solid fa-check text-[10px]"></i>
							</div>
							<span>{badge}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Terminal generation log (mac style) -->
			<div class="hidden lg:block mt-20 relative max-w-4xl mx-auto">
				<!-- Subtle glow behind terminal -->
				<div class={`absolute -inset-1 rounded-3xl blur-xl opacity-50 ${marketingAccentInfoGlow}`}></div>

				<div class="relative bg-surface-base/80 backdrop-blur-xl border border-edge-faint/80 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/5">
					<!-- Terminal chrome -->
					<div class="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/5">
						<div class="flex items-center space-x-2">
							<div class="w-3 h-3 bg-red-500/80 rounded-full"></div>
							<div class="w-3 h-3 bg-yellow-500/80 rounded-full"></div>
							<div class="w-3 h-3 bg-accent-strong/80 rounded-full"></div>
						</div>
						<div class="flex items-center space-x-2 bg-black/20 px-3 py-1 rounded-md text-fg-muted text-[10px] font-mono tracking-wider">
							<i class="fa-brands fa-apple opacity-50"></i>
							<span>median-cli</span>
						</div>
						<div class="w-12"></div>
					</div>
					<!-- Generation log content -->
					<div class="p-6 font-mono text-sm leading-relaxed text-fg-secondary">
						<div class="terminal-line" style="--line-index: 0"><span class={`${themeAccentText} opacity-80`}>➜</span> <span class="text-blue-400">~/project</span> <span class="text-white">median generate --api "My API"</span></div>
						<div class="terminal-line" style="--line-index: 1"><span class={themeAccentText}>✓</span> <span class="text-fg-muted">Parsed 2 objects, 8 fields, 4 endpoints</span></div>
						{#each terminalGeneratedFiles as file, index}
							<div class="terminal-line" style={`--line-index: ${index + 2}`}>
								<span class={themeAccentText}>✓</span>
								<span class="text-fg-muted">Generated</span>
								<span class="text-fg-secondary">{file.path}</span>
								<span class="text-fg-dimmed">({file.lines} lines)</span>
							</div>
						{/each}
						<div class="terminal-line mt-3" style="--line-index: 10"><span class={`${themeAccentText} font-bold`}>✨ Done.</span> <span class="text-fg-secondary">12 files, 654 lines. Ready to deploy.</span></div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Features -->
	<section id="features" class="relative z-10 py-20 sm:py-24 lg:py-32">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
			<!-- Section header -->
			<div class="mb-16 text-center sm:text-left">
				<h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight font-inter">
					Everything Your API Needs
				</h2>
				<p class="text-base text-fg-muted mt-4 max-w-xl font-inter">
					A complete, deployable FastAPI application. Not fragments you have to stitch together.
				</p>
			</div>

			<!-- Feature grid (Soft cards) -->
			<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each featureCards as feature}
					<div class={marketingFeatureCard}>
						<div class={marketingFeatureIcon}>
							<i class={`fa-solid ${feature.icon} text-lg`}></i>
						</div>
						<h3 class="text-lg font-semibold text-white mb-3 tracking-wide font-inter">{feature.title}</h3>
						<p class="text-sm text-fg-muted leading-relaxed font-inter">
							{feature.description}
							{#if feature.codeExample}
								Run
								<code class="text-fg-secondary bg-white/5 px-1.5 py-0.5 rounded font-mono text-xs">{feature.codeExample}</code>
								and go live.
							{/if}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How It Works -->
	<section id="how-it-works" class="relative z-10 py-20 sm:py-24 lg:py-32">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<!-- Section header -->
			<div class="mb-16 text-center sm:mb-20 sm:text-left">
				<h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight font-inter">
					Three Steps. Working API.
				</h2>
				<p class="mt-4 max-w-xl font-inter text-base leading-relaxed text-fg-muted">
					No boilerplate. No configuration puzzles. Define what you need and get production code.
				</p>
			</div>

			<div class="grid gap-12 lg:grid-cols-3 lg:gap-6">
				{#each howItWorksSteps as step}
					<div class={marketingHowItWorksStepColumn}>
						<span class={marketingHowItWorksWatermark} aria-hidden="true">{step.index}</span>
						<div class={marketingHowItWorksStepBody}>
							<h3 class={marketingHowItWorksStepTitle}>{step.title}</h3>
							<p class="text-sm font-inter leading-relaxed text-fg-muted">{step.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Philosophy -->
	<section id="philosophy" class="relative z-10 py-20 sm:py-24 lg:py-32">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="grid lg:grid-cols-2 gap-16 items-center">
				<!-- Left: Copy -->
				<div>
					<h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6 font-inter">
						Not the simplest API.<br />
						Not the most custom.<br />
						<span class="text-fg-muted">The median.</span>
					</h2>
					<p class="text-base text-fg-muted leading-relaxed mb-10 font-inter">
						We target the statistical center of what developers build. 90% of the code you'd write for any new API is the same structural work like models, schemas, routes, and config. Median Code generates all of it so you can focus on the 10% that makes your project unique.
					</p>
					<div class="space-y-6">
						{#each philosophyItems as item}
							<div class="flex items-start space-x-4">
								<div class={marketingPhilosophyIcon}>
									<i class={`fa-solid ${item.icon} text-xs`}></i>
								</div>
								<div>
									<span class="text-white font-inter font-semibold tracking-wide text-sm">{item.title}</span>
									<span class="text-fg-muted text-sm font-inter block mt-1 leading-relaxed">{item.description}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Right: What you get table (same green→blue wash as hero terminal) -->
				<div class="relative">
					<div class={`pointer-events-none absolute -inset-1 rounded-3xl opacity-50 blur-xl ${marketingAccentInfoGlow}`} aria-hidden="true"></div>
					<div class="relative overflow-hidden rounded-3xl border border-edge-faint/80 bg-surface-base/60 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
						<div class="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
							<p class="text-sm font-inter font-semibold text-white">Output Manifest</p>
						</div>
						<div class="p-2 space-y-1">
							{#each outputManifestItems as item}
								<div class={marketingManifestRow}>
									<span class="text-fg-secondary text-sm font-inter font-medium">{item}</span>
									<span class={marketingManifestIncludedPill}>Included</span>
								</div>
							{/each}
							<div class="flex items-center justify-between px-4 py-3 mt-2 bg-white/[0.02] border border-white/5 rounded-xl">
								<span class="text-white text-sm font-inter font-semibold">Your Business Logic</span>
								<span class="text-xs bg-surface-raised text-fg-secondary px-2 py-1 rounded-md font-medium">You write this</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Final CTA -->
	<section id="final-cta" class="relative z-10 overflow-hidden py-24 sm:py-32">
		<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
			<h2 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6 font-inter">
				Start Building Your API
			</h2>
			<p class="text-base sm:text-lg text-fg-muted mb-10 max-w-xl mx-auto font-inter">
				Define your models, generate production-ready code, and deploy. It takes minutes, not days.
			</p>

			<div class="flex flex-col sm:flex-row items-center justify-center gap-4">
				{#if $clerkState.isLoaded && $clerkState.isSignedIn}
					<a href="/dashboard" class={marketingFooterCta}>
						Go to Dashboard
						<i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
					</a>
				{:else}
					<a href="/signup" class={marketingFooterCta}>
						Get Started for Free
						<i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
					</a>
					<a href="/signin" class={marketingFooterCtaSecondary}>
						Already have an account? Sign in
					</a>
				{/if}
			</div>

			<p class="text-xs font-inter text-fg-dimmed mt-8 tracking-wide uppercase font-semibold">Free during beta. No credit card required.</p>
		</div>
	</section>

	<!-- Footer -->
	<footer id="footer" class="relative z-10 border-t border-edge-faint/40 py-12">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
				<div class="flex items-center space-x-3 opacity-80 hover:opacity-100 transition-opacity">
					<Logo size="md" />
					<span class="text-lg font-inter font-semibold text-fg tracking-tight">Median Code</span>
				</div>
				<div class="text-fg-dimmed text-sm font-inter">
					&copy; {new Date().getFullYear()} Median Code. Deterministic API generation.
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	/* Smooth scrolling for anchor links */
	:global(html) {
		scroll-behavior: smooth;
	}

	/* Terminal line staggered appearance animation */
	.terminal-line {
		opacity: 0;
		animation: line-appear 0.3s ease-out forwards;
		animation-delay: calc(var(--line-index) * 0.15s + 0.5s);
	}

	@keyframes line-appear {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>

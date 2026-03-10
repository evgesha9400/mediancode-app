<script lang="ts">
	import { clerkState } from '$lib/clerk';
	import { Logo } from '$lib/components';

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
<header id="header" class="bg-mono-950 border-b-2 border-mono-700 sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<a href="/" onclick={scrollToTop} class="flex items-center space-x-3 cursor-pointer">
				<Logo size="md" variant="dark" />
				<span class="text-base font-mono font-semibold text-mono-100 tracking-tight">median-code</span>
			</a>
			<button onclick={toggleMobileMenu} aria-label="Toggle mobile menu" class="md:hidden w-10 h-10 flex items-center justify-center">
				<i class="fa-solid {mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-white text-xl"></i>
			</button>
			<nav class="hidden md:flex items-center space-x-8">
				<a href="#features" class="text-mono-400 hover:text-white font-mono font-medium text-xs uppercase tracking-widest transition-colors">Features</a>
				<a href="#how-it-works" class="text-mono-400 hover:text-white font-mono font-medium text-xs uppercase tracking-widest transition-colors">How It Works</a>
				<a href="#philosophy" class="text-mono-400 hover:text-white font-mono font-medium text-xs uppercase tracking-widest transition-colors">Philosophy</a>

				{#if $clerkState.isLoaded}
					<div class="h-5 w-px bg-mono-700"></div>

					{#if $clerkState.isSignedIn}
						<a href="/dashboard" class="px-6 py-2 text-green-400 font-mono font-bold text-xs uppercase tracking-widest border-2 border-green-400 hover:bg-green-400 hover:text-mono-950 transition-colors">
							Dashboard
						</a>
					{:else}
						<a href="/signin" class="text-mono-400 hover:text-white font-mono font-medium text-xs uppercase tracking-widest transition-colors">
							Sign In
						</a>
						<a href="/signup" class="px-6 py-2 bg-green-400 text-mono-950 font-mono font-bold text-xs uppercase tracking-widest border-2 border-green-400 hover:bg-green-300 hover:border-green-300 transition-colors">
							Start Building
						</a>
					{/if}
				{/if}
			</nav>
		</div>
	</div>
	<!-- Mobile menu (terminal style) -->
	<div class="md:hidden border-t-2 border-mono-700" class:hidden={!mobileMenuOpen}>
		<div class="px-4 py-4 space-y-1 bg-mono-950">
			<a href="#features" onclick={closeMobileMenu} class="block text-mono-400 hover:text-mono-100 font-mono text-sm py-2 transition-colors">
				<span class="text-green-400 mr-2">></span>features
			</a>
			<a href="#how-it-works" onclick={closeMobileMenu} class="block text-mono-400 hover:text-mono-100 font-mono text-sm py-2 transition-colors">
				<span class="text-green-400 mr-2">></span>how-it-works
			</a>
			<a href="#philosophy" onclick={closeMobileMenu} class="block text-mono-400 hover:text-mono-100 font-mono text-sm py-2 transition-colors">
				<span class="text-green-400 mr-2">></span>philosophy
			</a>
			{#if $clerkState.isLoaded && !$clerkState.isSignedIn}
				<div class="border-t-2 border-mono-800 pt-3 mt-3 space-y-1">
					<a href="/signin" onclick={closeMobileMenu} class="block text-mono-400 hover:text-mono-100 font-mono text-sm py-2 transition-colors">
						<span class="text-mono-600">$</span>&nbsp;sign-in
					</a>
					<a href="/signup" onclick={closeMobileMenu} class="block text-green-400 hover:text-green-300 font-mono text-sm py-2 transition-colors">
						<span class="text-green-400">$</span>&nbsp;start-building
					</a>
				</div>
			{/if}
			{#if $clerkState.isLoaded && $clerkState.isSignedIn}
				<div class="border-t-2 border-mono-800 pt-3 mt-3">
					<a href="/dashboard" onclick={closeMobileMenu} class="block text-green-400 hover:text-green-300 font-mono text-sm py-2 transition-colors">
						<span class="text-green-400">$</span>&nbsp;go-to-dashboard
					</a>
				</div>
			{/if}
		</div>
	</div>
</header>

<!-- Hero -->
<section id="hero" class="bg-mono-950 py-20 sm:py-28 lg:py-32">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="space-y-10">
			<!-- Status indicator -->
			<div class="flex items-center space-x-2">
				<span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
				<span class="text-sm font-mono font-bold text-green-400 uppercase tracking-widest">beta</span>
			</div>

			<!-- Single-line terminal headline -->
			<h1 class="text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl font-bold text-white leading-tight tracking-tighter font-mono">
				<span class="text-green-400">$</span>&nbsp;The Shortest Path to a <span class="text-mono-500">Production API</span><span class="cursor-blink text-green-400">_</span>
			</h1>

			<p class="text-base sm:text-lg text-mono-400 leading-relaxed max-w-2xl font-mono">
				Define your data models. Get a complete FastAPI application with PostgreSQL, SQLAlchemy, Pydantic schemas, and AWS CDK infrastructure. Instantly.
			</p>

			<!-- CTA buttons -->
			<div class="flex flex-col sm:flex-row gap-4">
				{#if $clerkState.isLoaded && $clerkState.isSignedIn}
					<a href="/dashboard" class="inline-flex items-center justify-center px-10 py-4 text-green-400 font-mono font-bold text-sm tracking-wide border-2 border-green-400 hover:bg-green-400 hover:text-mono-950 transition-colors">
						go-to-dashboard
						<i class="fa-solid fa-arrow-right ml-3 text-xs"></i>
					</a>
				{:else}
					<a href="/signup" class="inline-flex items-center justify-center px-10 py-4 bg-green-400 text-mono-950 font-mono font-bold text-sm tracking-wide border-2 border-green-400 hover:bg-green-300 hover:border-green-300 transition-colors">
						get-started --free
						<i class="fa-solid fa-arrow-right ml-3 text-xs"></i>
					</a>
					<a href="#how-it-works" class="inline-flex items-center justify-center px-10 py-4 bg-transparent text-mono-300 font-mono font-bold text-sm tracking-wide border-2 border-mono-500 hover:border-green-400 hover:text-green-400 transition-colors">
						see-how-it-works
					</a>
				{/if}
			</div>

			<!-- Trust badges -->
			<div class="flex flex-wrap gap-x-8 gap-y-3 text-sm font-mono text-mono-300 tracking-wide">
				<div class="flex items-center space-x-2.5">
					<i class="fa-solid fa-check text-green-400 text-xs font-bold"></i>
					<span>Deterministic output</span>
				</div>
				<div class="flex items-center space-x-2.5">
					<i class="fa-solid fa-check text-green-400 text-xs font-bold"></i>
					<span>Instant generation</span>
				</div>
				<div class="flex items-center space-x-2.5">
					<i class="fa-solid fa-check text-green-400 text-xs font-bold"></i>
					<span>Ready to deploy</span>
				</div>
			</div>
		</div>

		<!-- Terminal generation log (wide, below hero content) -->
		<div class="hidden lg:block mt-16">
			<div class="border-2 border-mono-700 bg-mono-900 max-w-4xl">
				<!-- Terminal chrome -->
				<div class="flex items-center justify-between px-6 py-3.5 border-b-2 border-mono-700">
					<div class="flex items-center space-x-2">
						<div class="w-3 h-3 bg-red-500 rounded-full opacity-70"></div>
						<div class="w-3 h-3 bg-yellow-500 rounded-full opacity-70"></div>
						<div class="w-3 h-3 bg-green-500 rounded-full opacity-70"></div>
					</div>
					<span class="text-mono-500 text-xs font-mono font-bold tracking-wider">terminal</span>
				</div>
				<!-- Generation log content -->
				<div class="p-6 font-mono text-sm leading-loose">
					<div class="terminal-line" style="--line-index: 0"><span class="text-green-400">$</span> <span class="text-mono-100">median generate --api "My API"</span></div>
					<div class="terminal-line" style="--line-index: 1"><span class="text-green-400">[OK]</span> <span class="text-mono-400">Parsed 2 objects, 8 fields, 4 endpoints</span></div>
					<div class="terminal-line" style="--line-index: 2"><span class="text-green-400">[OK]</span> <span class="text-mono-400">Generated</span> <span class="text-mono-300">models/user.py</span> <span class="text-mono-500">(42 lines)</span></div>
					<div class="terminal-line" style="--line-index: 3"><span class="text-green-400">[OK]</span> <span class="text-mono-400">Generated</span> <span class="text-mono-300">models/order.py</span> <span class="text-mono-500">(38 lines)</span></div>
					<div class="terminal-line" style="--line-index: 4"><span class="text-green-400">[OK]</span> <span class="text-mono-400">Generated</span> <span class="text-mono-300">schemas/user.py</span> <span class="text-mono-500">(31 lines)</span></div>
					<div class="terminal-line" style="--line-index: 5"><span class="text-green-400">[OK]</span> <span class="text-mono-400">Generated</span> <span class="text-mono-300">schemas/order.py</span> <span class="text-mono-500">(28 lines)</span></div>
					<div class="terminal-line" style="--line-index: 6"><span class="text-green-400">[OK]</span> <span class="text-mono-400">Generated</span> <span class="text-mono-300">routes/users.py</span> <span class="text-mono-500">(67 lines)</span></div>
					<div class="terminal-line" style="--line-index: 7"><span class="text-green-400">[OK]</span> <span class="text-mono-400">Generated</span> <span class="text-mono-300">routes/orders.py</span> <span class="text-mono-500">(61 lines)</span></div>
					<div class="terminal-line" style="--line-index: 8"><span class="text-green-400">[OK]</span> <span class="text-mono-400">Generated</span> <span class="text-mono-300">alembic/versions/001_initial.py</span></div>
					<div class="terminal-line" style="--line-index: 9"><span class="text-green-400">[OK]</span> <span class="text-mono-400">Generated</span> <span class="text-mono-300">infra/cdk_stack.py</span></div>
					<div class="terminal-line mt-1" style="--line-index: 10"><span class="text-mono-100 font-bold">Done.</span> <span class="text-mono-300">12 files, 398 lines.</span> <span class="text-green-400">Ready to deploy.</span></div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Features -->
<section id="features" class="bg-mono-900 py-20 sm:py-24 lg:py-32">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Section header -->
		<div class="mb-16">
			<p class="text-xs font-mono font-bold text-green-400 tracking-wider mb-4">
				<span class="text-green-400">$</span>&nbsp;ls ./features
			</p>
			<h2 class="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[0.95] font-mono">
				Everything Your<br>API Needs
			</h2>
			<p class="text-base text-mono-400 mt-6 max-w-xl font-mono">
				A complete, deployable FastAPI application, not fragments you have to stitch together.
			</p>
		</div>

		<!-- Feature grid (B's 3-column with thick borders, A's terminal style) -->
		<div class="grid sm:grid-cols-2 lg:grid-cols-3 border-2 border-mono-700">
			<div class="p-8 border-b-2 border-r-0 sm:border-r-2 border-mono-700">
				<div class="w-10 h-10 border-2 border-green-400 flex items-center justify-center mb-6">
					<i class="fa-solid fa-bolt text-green-400 text-sm"></i>
				</div>
				<h3 class="text-lg font-bold text-white mb-3 uppercase tracking-wide font-mono">FastAPI Endpoints</h3>
				<p class="text-sm text-mono-400 leading-relaxed font-mono">Complete CRUD routes with proper request/response models, error handling, and auto-generated OpenAPI documentation.</p>
			</div>

			<div class="p-8 border-b-2 border-r-0 lg:border-r-2 border-mono-700">
				<div class="w-10 h-10 border-2 border-green-400 flex items-center justify-center mb-6">
					<i class="fa-solid fa-database text-green-400 text-sm"></i>
				</div>
				<h3 class="text-lg font-bold text-white mb-3 uppercase tracking-wide font-mono">SQLAlchemy Models</h3>
				<p class="text-sm text-mono-400 leading-relaxed font-mono">Database models with proper column types, relationships, foreign keys, and constraints, ready for PostgreSQL.</p>
			</div>

			<div class="p-8 border-b-2 border-r-0 sm:border-r-2 lg:border-r-0 border-mono-700">
				<div class="w-10 h-10 border-2 border-green-400 flex items-center justify-center mb-6">
					<i class="fa-solid fa-shield-halved text-green-400 text-sm"></i>
				</div>
				<h3 class="text-lg font-bold text-white mb-3 uppercase tracking-wide font-mono">Pydantic Schemas</h3>
				<p class="text-sm text-mono-400 leading-relaxed font-mono">Request and response schemas with field constraints, type validation, and serialization configured out of the box.</p>
			</div>

			<div class="p-8 border-b-2 sm:border-b-0 lg:border-b-0 border-r-0 lg:border-r-2 border-mono-700">
				<div class="w-10 h-10 border-2 border-green-400 flex items-center justify-center mb-6">
					<i class="fa-solid fa-cloud text-green-400 text-sm"></i>
				</div>
				<h3 class="text-lg font-bold text-white mb-3 uppercase tracking-wide font-mono">AWS CDK Infrastructure</h3>
				<p class="text-sm text-mono-400 leading-relaxed font-mono">Optional deployment code for AWS including Lambda, API Gateway, RDS, and all the glue. Run <code class="text-mono-200 bg-mono-800 px-1.5 py-0.5 font-mono">cdk deploy</code> and go live.</p>
			</div>

			<div class="p-8 border-b-2 sm:border-b-0 border-r-0 sm:border-r-2 border-mono-700">
				<div class="w-10 h-10 border-2 border-green-400 flex items-center justify-center mb-6">
					<i class="fa-solid fa-layer-group text-green-400 text-sm"></i>
				</div>
				<h3 class="text-lg font-bold text-white mb-3 uppercase tracking-wide font-mono">Alembic Migrations</h3>
				<p class="text-sm text-mono-400 leading-relaxed font-mono">Database migration scripts generated automatically. Schema evolution handled from day one, not retrofitted later.</p>
			</div>

			<div class="p-8">
				<div class="w-10 h-10 border-2 border-green-400 flex items-center justify-center mb-6">
					<i class="fa-solid fa-check-double text-green-400 text-sm"></i>
				</div>
				<h3 class="text-lg font-bold text-white mb-3 uppercase tracking-wide font-mono">Validator Templates</h3>
				<p class="text-sm text-mono-400 leading-relaxed font-mono">Common field and model validators from a curated gallery including email normalization, date ranges, confirmation matching, and more.</p>
			</div>
		</div>
	</div>
</section>

<!-- How It Works -->
<section id="how-it-works" class="bg-mono-950 py-20 sm:py-24 lg:py-32">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Section header -->
		<div class="mb-20">
			<p class="text-xs font-mono font-bold text-green-400 tracking-wider mb-4">
				<span class="text-green-400">$</span>&nbsp;cat ./workflow
			</p>
			<h2 class="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[0.95] font-mono">
				Three Steps.<br>Working API.
			</h2>
			<p class="text-base text-mono-400 mt-6 max-w-xl font-mono">
				No boilerplate. No configuration puzzles. Define what you need and get production code.
			</p>
		</div>

		<!-- Steps with massive numbers and terminal commands -->
		<div class="grid lg:grid-cols-3 gap-0">
			<!-- Step 1 -->
			<div class="relative pb-16 lg:pb-0 lg:pr-12">
				<div class="text-[8rem] sm:text-[10rem] font-black text-mono-800 leading-none select-none -mb-12 sm:-mb-16 font-mono">01</div>
				<div class="relative z-10 border-l-4 border-green-400 pl-6">
					<p class="font-mono text-base font-bold text-mono-100 tracking-wide mb-3">
						<span class="text-green-400">$</span>&nbsp;define-models
					</p>
					<p class="text-sm text-mono-400 leading-relaxed font-mono">Use the visual interface to declare your data objects, field types, relationships, and constraints. No YAML, no JSON. Just forms and dropdowns.</p>
				</div>
			</div>

			<!-- Step 2 -->
			<div class="relative pb-16 lg:pb-0 lg:pr-12">
				<div class="text-[8rem] sm:text-[10rem] font-black text-mono-800 leading-none select-none -mb-12 sm:-mb-16 font-mono">02</div>
				<div class="relative z-10 border-l-4 border-green-400 pl-6">
					<p class="font-mono text-base font-bold text-mono-100 tracking-wide mb-3">
						<span class="text-green-400">$</span>&nbsp;generate
					</p>
					<p class="text-sm text-mono-400 leading-relaxed font-mono">One click. Median Code produces a complete FastAPI project with endpoints, models, schemas, migrations, and infrastructure. Same input, same output, every time.</p>
				</div>
			</div>

			<!-- Step 3 -->
			<div class="relative">
				<div class="text-[8rem] sm:text-[10rem] font-black text-mono-800 leading-none select-none -mb-12 sm:-mb-16 font-mono">03</div>
				<div class="relative z-10 border-l-4 border-green-400 pl-6">
					<p class="font-mono text-base font-bold text-mono-100 tracking-wide mb-3">
						<span class="text-green-400">$</span>&nbsp;deploy
					</p>
					<p class="text-sm text-mono-400 leading-relaxed font-mono">Download the full project, add your business logic, and deploy. Use the included CDK stack or your own infrastructure. It's your code. Own it.</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Philosophy -->
<section id="philosophy" class="bg-mono-900 py-20 sm:py-24 lg:py-32">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="grid lg:grid-cols-2 gap-16 items-start">
			<!-- Left: Copy -->
			<div>
				<p class="text-xs font-mono font-bold text-green-400 tracking-wider mb-6">
					<span class="text-green-400">$</span>&nbsp;cat ./philosophy
				</p>
				<h2 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-[1] mb-8 font-mono">
					Not the simplest API.<br>
					Not the most custom.<br>
					<span class="text-mono-500">The median.</span>
				</h2>
				<p class="text-base text-mono-400 leading-relaxed mb-10 font-mono">
					We target the statistical center of what developers build. 90% of the code you'd write for any new API is the same structural work like models, schemas, routes, and config. Median Code generates all of it so you can focus on the 10% that makes your project unique.
				</p>
				<div class="space-y-0">
					<div class="flex items-start space-x-4 py-5 border-t-2 border-mono-700">
						<span class="text-green-400 font-mono text-sm mt-0.5 flex-shrink-0 font-bold">></span>
						<div>
							<span class="text-white font-mono font-bold uppercase tracking-wide text-sm">Structural, not behavioral</span>
							<span class="text-mono-500 text-sm font-mono block mt-1">We generate table definitions and endpoint scaffolding. Business logic is yours to write.</span>
						</div>
					</div>
					<div class="flex items-start space-x-4 py-5 border-t-2 border-mono-700">
						<span class="text-green-400 font-mono text-sm mt-0.5 flex-shrink-0 font-bold">></span>
						<div>
							<span class="text-white font-mono font-bold uppercase tracking-wide text-sm">Deterministic, always</span>
							<span class="text-mono-500 text-sm font-mono block mt-1">Same inputs produce identical output. No AI guessing, no ambiguity, no surprises.</span>
						</div>
					</div>
					<div class="flex items-start space-x-4 py-5 border-t-2 border-b-2 border-mono-700">
						<span class="text-green-400 font-mono text-sm mt-0.5 flex-shrink-0 font-bold">></span>
						<div>
							<span class="text-white font-mono font-bold uppercase tracking-wide text-sm">A starting point, not a cage</span>
							<span class="text-mono-500 text-sm font-mono block mt-1">The generated code is clean, readable, and designed for humans or LLMs to extend immediately.</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Right: What you get table -->
			<div class="border-2 border-mono-700">
				<div class="px-6 py-4 border-b-2 border-mono-700 bg-mono-800">
					<p class="text-xs font-mono font-bold text-green-400 tracking-wider">
						<span class="text-green-400">$</span>&nbsp;cat ./output-manifest
					</p>
				</div>
				<div>
					<div class="flex items-center justify-between px-6 py-4 border-b-2 border-mono-700">
						<span class="text-mono-200 text-sm font-mono font-bold">FastAPI Application</span>
						<span class="text-sm text-green-400 font-mono font-bold">[GEN]</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4 border-b-2 border-mono-700">
						<span class="text-mono-200 text-sm font-mono font-bold">SQLAlchemy Models</span>
						<span class="text-sm text-green-400 font-mono font-bold">[GEN]</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4 border-b-2 border-mono-700">
						<span class="text-mono-200 text-sm font-mono font-bold">Pydantic Schemas</span>
						<span class="text-sm text-green-400 font-mono font-bold">[GEN]</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4 border-b-2 border-mono-700">
						<span class="text-mono-200 text-sm font-mono font-bold">Alembic Migrations</span>
						<span class="text-sm text-green-400 font-mono font-bold">[GEN]</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4 border-b-2 border-mono-700">
						<span class="text-mono-200 text-sm font-mono font-bold">AWS CDK Stack</span>
						<span class="text-sm text-green-400 font-mono font-bold">[GEN]</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4 border-b-2 border-mono-700">
						<span class="text-mono-200 text-sm font-mono font-bold">API Documentation</span>
						<span class="text-sm text-green-400 font-mono font-bold">[GEN]</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4 bg-mono-800">
						<span class="text-mono-200 text-sm font-mono font-bold">Your Business Logic</span>
						<span class="text-sm text-mono-200 font-mono font-bold">[TODO]</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Final CTA -->
<section id="final-cta" class="bg-mono-950 py-24 sm:py-32 lg:py-40 border-t-2 border-mono-700">
	<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
		<p class="text-xs font-mono font-bold text-green-400 tracking-wider mb-6">
			<span class="text-green-400">$</span>&nbsp;ready
		</p>
		<h2 class="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.95] mb-6 font-mono">
			Start Building<br>Your API
		</h2>
		<p class="text-base sm:text-lg text-mono-400 mb-10 max-w-xl font-mono">
			Define your models, generate production-ready code, and deploy. It takes minutes, not days.
		</p>

		<div class="flex flex-col sm:flex-row items-start gap-4">
			{#if $clerkState.isLoaded && $clerkState.isSignedIn}
				<a href="/dashboard" class="inline-flex items-center justify-center px-12 py-5 text-green-400 font-mono font-bold text-sm tracking-wide border-2 border-green-400 hover:bg-green-400 hover:text-mono-950 transition-colors">
					go-to-dashboard
					<i class="fa-solid fa-arrow-right ml-3 text-xs"></i>
				</a>
			{:else}
				<a href="/signup" class="inline-flex items-center justify-center px-12 py-5 bg-green-400 text-mono-950 font-mono font-bold text-sm tracking-wide border-2 border-green-400 hover:bg-green-300 hover:border-green-300 transition-colors">
					get-started --free
					<i class="fa-solid fa-arrow-right ml-3 text-xs"></i>
				</a>
				<a href="/signin" class="inline-flex items-center justify-center px-12 py-5 text-mono-400 hover:text-white font-mono font-bold text-sm tracking-wide transition-colors">
					Already have an account? sign-in
				</a>
			{/if}
		</div>

		<p class="text-xs font-mono text-mono-600 mt-8 tracking-wide">Free during beta. No credit card required.</p>
	</div>
</section>

<!-- Footer -->
<footer id="footer" class="bg-mono-950 border-t-2 border-mono-700 py-10">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
			<div class="flex items-center space-x-3">
				<Logo size="md" variant="dark" />
				<span class="text-base font-mono font-semibold text-mono-100 tracking-tight">median-code</span>
			</div>
			<div class="text-mono-500 text-xs font-mono uppercase tracking-widest">
				&copy; {new Date().getFullYear()} Median Code. Deterministic API generation.
			</div>
		</div>
	</div>
</footer>

<style>
	/* Smooth scrolling for anchor links */
	:global(html) {
		scroll-behavior: smooth;
	}

	/* Blinking cursor animation */
	.cursor-blink {
		animation: blink 1s step-end infinite;
	}

	@keyframes blink {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
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

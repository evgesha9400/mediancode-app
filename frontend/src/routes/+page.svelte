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
<header id="header" class="bg-white/80 backdrop-blur-md border-b border-mono-200 sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<a href="/" onclick={scrollToTop} class="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
				<Logo size="md" />
				<span class="text-lg sm:text-xl font-bold text-mono-900">Median Code</span>
			</a>
			<button onclick={toggleMobileMenu} aria-label="Toggle mobile menu" class="md:hidden w-10 h-10 flex items-center justify-center">
				<i class="fa-solid {mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-mono-900 text-xl"></i>
			</button>
			<nav class="hidden md:flex items-center space-x-6 lg:space-x-8">
				<a href="#features" class="text-mono-500 hover:text-mono-900 font-medium transition-colors text-sm">Features</a>
				<a href="#how-it-works" class="text-mono-500 hover:text-mono-900 font-medium transition-colors text-sm">How It Works</a>
				<a href="#philosophy" class="text-mono-500 hover:text-mono-900 font-medium transition-colors text-sm">Philosophy</a>

				{#if $clerkState.isLoaded}
					<div class="h-5 w-px bg-mono-200"></div>

					{#if $clerkState.isSignedIn}
						<a href="/dashboard" class="px-5 py-2 bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors font-medium text-sm whitespace-nowrap">
							Go to Dashboard
						</a>
					{:else}
						<a href="/signin" class="text-mono-500 hover:text-mono-900 font-medium transition-colors text-sm">
							Sign In
						</a>
						<a href="/signup" class="px-5 py-2 bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors font-medium text-sm whitespace-nowrap">
							Start Building
						</a>
					{/if}
				{/if}
			</nav>
		</div>
	</div>
	<div class="md:hidden bg-white border-t border-mono-200" class:hidden={!mobileMenuOpen}>
		<div class="px-4 py-4 space-y-3">
			<a href="#features" onclick={closeMobileMenu} class="block text-mono-600 hover:text-mono-900 font-medium transition-colors py-2">Features</a>
			<a href="#how-it-works" onclick={closeMobileMenu} class="block text-mono-600 hover:text-mono-900 font-medium transition-colors py-2">How It Works</a>
			<a href="#philosophy" onclick={closeMobileMenu} class="block text-mono-600 hover:text-mono-900 font-medium transition-colors py-2">Philosophy</a>
			{#if $clerkState.isLoaded && !$clerkState.isSignedIn}
				<div class="border-t border-mono-200 pt-3 space-y-3">
					<a href="/signin" onclick={closeMobileMenu} class="block text-mono-600 hover:text-mono-900 font-medium transition-colors py-2">Sign In</a>
					<a href="/signup" onclick={closeMobileMenu} class="block w-full text-center px-5 py-2.5 bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors font-medium">Start Building</a>
				</div>
			{/if}
			{#if $clerkState.isLoaded && $clerkState.isSignedIn}
				<div class="border-t border-mono-200 pt-3">
					<a href="/dashboard" onclick={closeMobileMenu} class="block w-full text-center px-5 py-2.5 bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors font-medium">Go to Dashboard</a>
				</div>
			{/if}
		</div>
	</div>
</header>

<!-- Hero -->
<section id="hero" class="bg-white py-16 sm:py-20 lg:py-0 lg:min-h-[calc(100vh-64px)] flex items-center">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
		<div class="space-y-8 order-2 lg:order-1">
			<div class="space-y-5">
				<div class="inline-flex items-center space-x-2 px-3 py-1 bg-mono-100 border border-mono-200 rounded-full">
					<span class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
					<span class="text-xs font-semibold text-mono-700 tracking-wide uppercase">Now in Beta</span>
				</div>
				<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-mono-900 leading-[1.1] tracking-tight">
					The Shortest Path to a
					<span class="text-mono-500">Production API</span>
				</h1>
				<p class="text-lg sm:text-xl text-mono-500 leading-relaxed max-w-lg">
					Define your data models. Get a complete FastAPI application with PostgreSQL, SQLAlchemy, Pydantic schemas, and AWS CDK infrastructure. Instantly.
				</p>
			</div>

			<div class="flex flex-col sm:flex-row gap-3">
				{#if $clerkState.isLoaded && $clerkState.isSignedIn}
					<a href="/dashboard" class="inline-flex items-center justify-center px-8 py-3.5 bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors font-semibold text-base">
						Go to Dashboard
						<i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
					</a>
				{:else}
					<a href="/signup" class="inline-flex items-center justify-center px-8 py-3.5 bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors font-semibold text-base">
						Get Started Free
						<i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
					</a>
					<a href="#how-it-works" class="inline-flex items-center justify-center px-8 py-3.5 bg-white text-mono-700 border border-mono-300 rounded-lg hover:border-mono-400 hover:text-mono-900 transition-colors font-medium text-base">
						See How It Works
					</a>
				{/if}
			</div>

			<div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-mono-500">
				<div class="flex items-center space-x-2">
					<i class="fa-solid fa-check text-green-600 text-xs"></i>
					<span>Deterministic output</span>
				</div>
				<div class="flex items-center space-x-2">
					<i class="fa-solid fa-check text-green-600 text-xs"></i>
					<span>Instant generation</span>
				</div>
				<div class="flex items-center space-x-2">
					<i class="fa-solid fa-check text-green-600 text-xs"></i>
					<span>Ready to deploy</span>
				</div>
			</div>
		</div>

		<div class="relative order-1 lg:order-2 hidden lg:block">
			<div class="bg-mono-950 rounded-xl p-6 text-mono-300 font-mono text-sm shadow-2xl shadow-mono-900/10">
				<div class="flex items-center space-x-2 mb-5">
					<div class="w-3 h-3 bg-red-500 rounded-full opacity-80"></div>
					<div class="w-3 h-3 bg-yellow-500 rounded-full opacity-80"></div>
					<div class="w-3 h-3 bg-green-500 rounded-full opacity-80"></div>
					<span class="ml-3 text-mono-500 text-xs">generated/main.py</span>
				</div>
				<div class="space-y-1 leading-relaxed">
					<div><span class="text-blue-400">from</span> <span class="text-mono-200">fastapi</span> <span class="text-blue-400">import</span> <span class="text-mono-200">FastAPI</span></div>
					<div><span class="text-blue-400">from</span> <span class="text-mono-200">sqlalchemy.orm</span> <span class="text-blue-400">import</span> <span class="text-mono-200">Session</span></div>
					<div><span class="text-blue-400">from</span> <span class="text-mono-200">.schemas</span> <span class="text-blue-400">import</span> <span class="text-mono-200">UserCreate, UserResponse</span></div>
					<div><span class="text-blue-400">from</span> <span class="text-mono-200">.models</span> <span class="text-blue-400">import</span> <span class="text-mono-200">User</span></div>
					<div class="mt-4"><span class="text-mono-200">app</span> = <span class="text-mono-200">FastAPI</span>(<span class="text-green-400">title</span>=<span class="text-yellow-300">"My API"</span>)</div>
					<div class="mt-4"><span class="text-mono-500">@app.post(</span><span class="text-yellow-300">"/users/"</span><span class="text-mono-500">,</span> <span class="text-green-400">response_model</span>=<span class="text-mono-200">UserResponse</span><span class="text-mono-500">)</span></div>
					<div><span class="text-blue-400">async def</span> <span class="text-yellow-400">create_user</span><span class="text-mono-500">(</span></div>
					<div class="ml-4"><span class="text-mono-200">user</span>: <span class="text-mono-200">UserCreate</span>,</div>
					<div class="ml-4"><span class="text-mono-200">db</span>: <span class="text-mono-200">Session</span> = <span class="text-mono-200">Depends</span>(<span class="text-mono-200">get_db</span>)</div>
					<div><span class="text-mono-500">):</span></div>
					<div class="ml-4"><span class="text-mono-200">db_user</span> = <span class="text-mono-200">User</span>(**<span class="text-mono-200">user</span>.model_dump())</div>
					<div class="ml-4"><span class="text-mono-200">db</span>.add(<span class="text-mono-200">db_user</span>)</div>
					<div class="ml-4"><span class="text-mono-200">db</span>.commit()</div>
					<div class="ml-4"><span class="text-blue-400">return</span> <span class="text-mono-200">db_user</span></div>
				</div>
			</div>
			<div class="absolute -bottom-4 -right-4 -z-10 w-full h-full bg-mono-200 rounded-xl"></div>
		</div>
	</div>
</section>

<!-- Features -->
<section id="features" class="bg-mono-50 py-16 sm:py-20 lg:py-24 border-t border-mono-100">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-12 lg:mb-16">
			<h2 class="text-3xl sm:text-4xl font-bold text-mono-900 mb-4 tracking-tight">Everything Your API Needs</h2>
			<p class="text-lg text-mono-500 max-w-2xl mx-auto">A complete, deployable FastAPI application, not fragments you have to stitch together.</p>
		</div>

		<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
			<div class="bg-white p-7 rounded-xl border border-mono-200 hover:border-mono-300 transition-colors">
				<div class="w-10 h-10 bg-mono-900 rounded-lg flex items-center justify-center mb-5">
					<i class="fa-solid fa-bolt text-white"></i>
				</div>
				<h3 class="text-lg font-semibold text-mono-900 mb-2">FastAPI Endpoints</h3>
				<p class="text-sm text-mono-500 leading-relaxed">Complete CRUD routes with proper request/response models, error handling, and auto-generated OpenAPI documentation.</p>
			</div>

			<div class="bg-white p-7 rounded-xl border border-mono-200 hover:border-mono-300 transition-colors">
				<div class="w-10 h-10 bg-mono-900 rounded-lg flex items-center justify-center mb-5">
					<i class="fa-solid fa-database text-white"></i>
				</div>
				<h3 class="text-lg font-semibold text-mono-900 mb-2">SQLAlchemy Models</h3>
				<p class="text-sm text-mono-500 leading-relaxed">Database models with proper column types, relationships, foreign keys, and constraints, ready for PostgreSQL.</p>
			</div>

			<div class="bg-white p-7 rounded-xl border border-mono-200 hover:border-mono-300 transition-colors">
				<div class="w-10 h-10 bg-mono-900 rounded-lg flex items-center justify-center mb-5">
					<i class="fa-solid fa-shield-halved text-white"></i>
				</div>
				<h3 class="text-lg font-semibold text-mono-900 mb-2">Pydantic Schemas</h3>
				<p class="text-sm text-mono-500 leading-relaxed">Request and response schemas with field constraints, type validation, and serialization configured out of the box.</p>
			</div>

			<div class="bg-white p-7 rounded-xl border border-mono-200 hover:border-mono-300 transition-colors">
				<div class="w-10 h-10 bg-mono-900 rounded-lg flex items-center justify-center mb-5">
					<i class="fa-solid fa-cloud text-white"></i>
				</div>
				<h3 class="text-lg font-semibold text-mono-900 mb-2">AWS CDK Infrastructure</h3>
				<p class="text-sm text-mono-500 leading-relaxed">Optional deployment code for AWS including Lambda, API Gateway, RDS, and all the glue. Run <code class="text-mono-700 bg-mono-100 px-1 rounded">cdk deploy</code> and go live.</p>
			</div>

			<div class="bg-white p-7 rounded-xl border border-mono-200 hover:border-mono-300 transition-colors">
				<div class="w-10 h-10 bg-mono-900 rounded-lg flex items-center justify-center mb-5">
					<i class="fa-solid fa-layer-group text-white"></i>
				</div>
				<h3 class="text-lg font-semibold text-mono-900 mb-2">Alembic Migrations</h3>
				<p class="text-sm text-mono-500 leading-relaxed">Database migration scripts generated automatically. Schema evolution handled from day one, not retrofitted later.</p>
			</div>

			<div class="bg-white p-7 rounded-xl border border-mono-200 hover:border-mono-300 transition-colors">
				<div class="w-10 h-10 bg-mono-900 rounded-lg flex items-center justify-center mb-5">
					<i class="fa-solid fa-check-double text-white"></i>
				</div>
				<h3 class="text-lg font-semibold text-mono-900 mb-2">Validator Templates</h3>
				<p class="text-sm text-mono-500 leading-relaxed">Common field and model validators from a curated gallery including email normalization, date ranges, confirmation matching, and more.</p>
			</div>
		</div>
	</div>
</section>

<!-- How It Works -->
<section id="how-it-works" class="bg-white py-16 sm:py-20 lg:py-24">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="text-center mb-12 lg:mb-16">
			<h2 class="text-3xl sm:text-4xl font-bold text-mono-900 mb-4 tracking-tight">Three Steps. Working API.</h2>
			<p class="text-lg text-mono-500 max-w-2xl mx-auto">No boilerplate. No configuration puzzles. Define what you need and get production code.</p>
		</div>

		<div class="grid lg:grid-cols-3 gap-6 lg:gap-0">
			<!-- Step 1 -->
			<div class="relative text-center px-6 lg:px-10">
				<div class="w-14 h-14 bg-mono-900 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-6">1</div>
				<h3 class="text-xl font-semibold text-mono-900 mb-3">Define Your Models</h3>
				<p class="text-sm text-mono-500 leading-relaxed">Use the visual interface to declare your data objects, field types, relationships, and constraints. No YAML, no JSON. Just forms and dropdowns.</p>
				<div class="hidden lg:block absolute top-7 left-[calc(50%+48px)] w-[calc(100%-96px)] h-px bg-mono-200"></div>
			</div>

			<!-- Step 2 -->
			<div class="relative text-center px-6 lg:px-10">
				<div class="w-14 h-14 bg-mono-900 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-6">2</div>
				<h3 class="text-xl font-semibold text-mono-900 mb-3">Generate Instantly</h3>
				<p class="text-sm text-mono-500 leading-relaxed">One click. Median Code produces a complete FastAPI project with endpoints, models, schemas, migrations, and infrastructure. Same input, same output, every time.</p>
				<div class="hidden lg:block absolute top-7 left-[calc(50%+48px)] w-[calc(100%-96px)] h-px bg-mono-200"></div>
			</div>

			<!-- Step 3 -->
			<div class="text-center px-6 lg:px-10">
				<div class="w-14 h-14 bg-mono-900 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-6">3</div>
				<h3 class="text-xl font-semibold text-mono-900 mb-3">Download & Deploy</h3>
				<p class="text-sm text-mono-500 leading-relaxed">Download the full project, add your business logic, and deploy. Use the included CDK stack or your own infrastructure. It's your code. Own it.</p>
			</div>
		</div>
	</div>
</section>

<!-- Philosophy / Differentiator -->
<section id="philosophy" class="bg-mono-950 py-16 sm:py-20 lg:py-24">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
			<div>
				<p class="text-sm font-semibold text-mono-400 tracking-wide uppercase mb-4">The Median Principle</p>
				<h2 class="text-3xl sm:text-4xl font-bold text-white mb-6 tracking-tight leading-tight">
					Not the simplest API.<br>Not the most custom.<br>
					<span class="text-mono-400">The median.</span>
				</h2>
				<p class="text-base text-mono-400 leading-relaxed mb-8">
					We target the statistical center of what developers build. 90% of the code you'd write for any new API is the same structural work like models, schemas, routes, and config. Median Code generates all of it so you can focus on the 10% that makes your project unique.
				</p>
				<div class="space-y-4">
					<div class="flex items-start space-x-3">
						<div class="w-5 h-5 bg-white rounded flex items-center justify-center flex-shrink-0 mt-0.5">
							<i class="fa-solid fa-check text-mono-900 text-[10px]"></i>
						</div>
						<div>
							<span class="text-white font-medium">Structural, not behavioral</span>
							<span class="text-mono-500 text-sm block">We generate table definitions and endpoint scaffolding. Business logic is yours to write.</span>
						</div>
					</div>
					<div class="flex items-start space-x-3">
						<div class="w-5 h-5 bg-white rounded flex items-center justify-center flex-shrink-0 mt-0.5">
							<i class="fa-solid fa-check text-mono-900 text-[10px]"></i>
						</div>
						<div>
							<span class="text-white font-medium">Deterministic, always</span>
							<span class="text-mono-500 text-sm block">Same inputs produce identical output. No AI guessing, no ambiguity, no surprises.</span>
						</div>
					</div>
					<div class="flex items-start space-x-3">
						<div class="w-5 h-5 bg-white rounded flex items-center justify-center flex-shrink-0 mt-0.5">
							<i class="fa-solid fa-check text-mono-900 text-[10px]"></i>
						</div>
						<div>
							<span class="text-white font-medium">A starting point, not a cage</span>
							<span class="text-mono-500 text-sm block">The generated code is clean, readable, and designed for humans or LLMs to extend immediately.</span>
						</div>
					</div>
				</div>
			</div>

			<div class="bg-mono-900 rounded-xl border border-mono-800 overflow-hidden">
				<div class="px-6 py-4 border-b border-mono-800">
					<p class="text-xs font-semibold text-mono-400 tracking-wide uppercase">What you get</p>
				</div>
				<div class="divide-y divide-mono-800">
					<div class="flex items-center justify-between px-6 py-4">
						<span class="text-mono-200 text-sm font-medium">FastAPI Application</span>
						<span class="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded">Generated</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4">
						<span class="text-mono-200 text-sm font-medium">SQLAlchemy Models</span>
						<span class="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded">Generated</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4">
						<span class="text-mono-200 text-sm font-medium">Pydantic Schemas</span>
						<span class="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded">Generated</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4">
						<span class="text-mono-200 text-sm font-medium">Alembic Migrations</span>
						<span class="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded">Generated</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4">
						<span class="text-mono-200 text-sm font-medium">AWS CDK Stack</span>
						<span class="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded">Generated</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4">
						<span class="text-mono-200 text-sm font-medium">API Documentation</span>
						<span class="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded">Generated</span>
					</div>
					<div class="flex items-center justify-between px-6 py-4 bg-mono-800/30">
						<span class="text-mono-400 text-sm font-medium">Your Business Logic</span>
						<span class="text-xs text-mono-400 font-medium bg-mono-700/50 px-2 py-0.5 rounded">You add this</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Final CTA -->
<section id="final-cta" class="bg-white py-16 sm:py-20 lg:py-24 border-t border-mono-100">
	<div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
		<h2 class="text-3xl sm:text-4xl font-bold text-mono-900 mb-4 tracking-tight">Start Building Your API</h2>
		<p class="text-lg text-mono-500 mb-8 max-w-xl mx-auto">
			Define your models, generate production-ready code, and deploy. It takes minutes, not days.
		</p>

		<div class="flex flex-col sm:flex-row items-center justify-center gap-3">
			{#if $clerkState.isLoaded && $clerkState.isSignedIn}
				<a href="/dashboard" class="inline-flex items-center justify-center px-8 py-3.5 bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors font-semibold text-base">
					Go to Dashboard
					<i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
				</a>
			{:else}
				<a href="/signup" class="inline-flex items-center justify-center px-8 py-3.5 bg-mono-900 text-white rounded-lg hover:bg-mono-800 transition-colors font-semibold text-base">
					Get Started Free
					<i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
				</a>
				<a href="/signin" class="inline-flex items-center justify-center px-8 py-3.5 text-mono-600 hover:text-mono-900 transition-colors font-medium text-base">
					Already have an account? Sign in
				</a>
			{/if}
		</div>

		<p class="text-xs text-mono-400 mt-6">Free during beta. No credit card required.</p>
	</div>
</section>

<!-- Footer -->
<footer id="footer" class="bg-mono-50 border-t border-mono-200 py-10">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
			<div class="flex items-center space-x-2">
				<Logo size="md" />
				<span class="text-lg font-bold text-mono-900">Median Code</span>
			</div>
			<div class="text-mono-400 text-xs">
				© {new Date().getFullYear()} Median Code. Deterministic API generation.
			</div>
		</div>
	</div>
</footer>

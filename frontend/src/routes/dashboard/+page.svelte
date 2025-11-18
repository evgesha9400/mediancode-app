<script lang="ts">
	import { clerkState, signOut } from '$lib/clerk';
	import { goto } from '$app/navigation';

	async function handleSignOut() {
		await signOut();
		goto('/auth');
	}
</script>

<div class="min-h-screen bg-mono-50">
	<!-- Header -->
	<header class="bg-white border-b border-mono-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center space-x-2">
					<div class="w-8 h-8 bg-mono-900 rounded flex items-center justify-center">
						<span class="text-white text-sm font-bold">&lt;/&gt;</span>
					</div>
					<span class="text-xl font-bold text-mono-900">Median Code</span>
				</div>

				<div class="flex items-center space-x-4">
					{#if $clerkState.user}
						<div class="flex items-center space-x-3">
							<div class="text-right">
								<p class="text-sm font-medium text-mono-900">
									{$clerkState.user.fullName || $clerkState.user.primaryEmailAddress?.emailAddress}
								</p>
								<p class="text-xs text-mono-500">
									{$clerkState.user.primaryEmailAddress?.emailAddress}
								</p>
							</div>
							{#if $clerkState.user.imageUrl}
								<img
									src={$clerkState.user.imageUrl}
									alt="Profile"
									class="w-10 h-10 rounded-full border-2 border-mono-200"
								/>
							{/if}
						</div>
					{/if}
					<button
						on:click={handleSignOut}
						class="px-4 py-2 text-sm font-medium text-mono-700 hover:text-mono-900 hover:bg-mono-100 rounded-lg transition-colors"
					>
						Sign Out
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="max-w-3xl">
			<h1 class="text-4xl font-bold text-mono-900 mb-4">Welcome to Median Code</h1>
			<p class="text-lg text-mono-600 mb-8">
				You're successfully authenticated! This is your dashboard where you'll be able to generate production-ready FastAPI code.
			</p>

			<div class="bg-white border border-mono-200 rounded-lg p-8">
				<div class="space-y-6">
					<div>
						<h2 class="text-2xl font-semibold text-mono-900 mb-3">Getting Started</h2>
						<p class="text-mono-600">
							The code generation interface is coming soon. You'll be able to define your data models, relationships, and API endpoints right here.
						</p>
					</div>

					<div class="border-t border-mono-200 pt-6">
						<h3 class="text-lg font-semibold text-mono-900 mb-3">What You Can Expect</h3>
						<ul class="space-y-3">
							<li class="flex items-start space-x-3">
								<div class="w-6 h-6 bg-mono-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
									<span class="text-white text-xs">✓</span>
								</div>
								<div>
									<p class="font-medium text-mono-900">Interactive Model Builder</p>
									<p class="text-sm text-mono-600">Define your data models with a visual interface</p>
								</div>
							</li>
							<li class="flex items-start space-x-3">
								<div class="w-6 h-6 bg-mono-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
									<span class="text-white text-xs">✓</span>
								</div>
								<div>
									<p class="font-medium text-mono-900">Instant Code Generation</p>
									<p class="text-sm text-mono-600">Get production-ready FastAPI code in seconds</p>
								</div>
							</li>
							<li class="flex items-start space-x-3">
								<div class="w-6 h-6 bg-mono-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
									<span class="text-white text-xs">✓</span>
								</div>
								<div>
									<p class="font-medium text-mono-900">AWS CDK Deployment</p>
									<p class="text-sm text-mono-600">Optional infrastructure code for cloud deployment</p>
								</div>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>

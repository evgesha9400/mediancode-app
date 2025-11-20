<script lang="ts">
	import { clerkState, getClerk } from '$lib/clerk';
	import { goto } from '$app/navigation';

	let clerkMountDiv = $state<HTMLDivElement>();
	let hasAttemptedMount = $state(false);

	// Mount Clerk sign-up form when ready
	$effect(() => {
		if ($clerkState.isLoaded && !$clerkState.isSignedIn && clerkMountDiv && !hasAttemptedMount) {
			hasAttemptedMount = true;
			const clerk = getClerk();
			console.log('Mounting sign-up form...');
			if (clerk) {
				clerk.mountSignUp(clerkMountDiv, {
					fallbackRedirectUrl: '/dashboard',
					signInUrl: '/signin',
					appearance: {
						elements: {
							rootBox: 'mx-auto',
							card: 'shadow-none bg-white border border-mono-200 rounded-lg',
							logoBox: 'height: 48px',
							logoImage: 'height: 48px; width: 48px'
						}
					},
					branding: {
						logo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='4' fill='%23171717'/%3E%3Cpath d='M17 14.8c-.6-.6-1.5-.6-2.1 0l-6 6c-.6.6-.6 1.5 0 2.1l6 6c.6.6 1.5.6 2.1 0s.6-1.5 0-2.1L12.6 24l4.9-4.9c.6-.6.6-1.5 0-2.1zm14.1 0c-.6-.6-1.5-.6-2.1 0s-.6 1.5 0 2.1L33.4 24l-4.9 4.9c-.6.6-.6 1.5 0 2.1s1.5.6 2.1 0l6-6c.6-.6.6-1.5 0-2.1l-6-6z' fill='%23ffffff'/%3E%3Cline x1='27' y1='16.5' x2='21' y2='31.5' stroke='%23ffffff' stroke-width='2.25' stroke-linecap='round'/%3E%3C/svg%3E",
						logoImageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='4' fill='%23171717'/%3E%3Cpath d='M17 14.8c-.6-.6-1.5-.6-2.1 0l-6 6c-.6.6-.6 1.5 0 2.1l6 6c.6.6 1.5.6 2.1 0s.6-1.5 0-2.1L12.6 24l4.9-4.9c.6-.6.6-1.5 0-2.1zm14.1 0c-.6-.6-1.5-.6-2.1 0s-.6 1.5 0 2.1L33.4 24l-4.9 4.9c-.6.6-.6 1.5 0 2.1s1.5.6 2.1 0l6-6c.6-.6.6-1.5 0-2.1l-6-6z' fill='%23ffffff'/%3E%3Cline x1='27' y1='16.5' x2='21' y2='31.5' stroke='%23ffffff' stroke-width='2.25' stroke-linecap='round'/%3E%3C/svg%3E"
					}
				});
			}
		}
	});

	// Redirect to dashboard when signed in
	$effect(() => {
		if ($clerkState.isSignedIn) {
			console.log('User signed up, redirecting to dashboard...');
			goto('/dashboard');
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	{#if !$clerkState.isLoaded}
		<div class="text-center space-y-4">
			<div class="flex items-center justify-center space-x-2 mb-8">
				<div class="w-12 h-12 bg-mono-900 rounded flex items-center justify-center">
					<i class="fa-solid fa-code text-white text-xl"></i>
				</div>
				<h1 class="text-3xl font-bold text-mono-900">Median Code</h1>
			</div>
			<p class="text-mono-500">Loading...</p>
		</div>
	{:else if $clerkState.isSignedIn}
		<div class="text-center space-y-4">
			<div class="flex items-center justify-center space-x-2 mb-8">
				<div class="w-12 h-12 bg-mono-900 rounded flex items-center justify-center">
					<i class="fa-solid fa-code text-white text-xl"></i>
				</div>
				<h1 class="text-3xl font-bold text-mono-900">Median Code</h1>
			</div>
			<p class="text-mono-500">Redirecting to dashboard...</p>
		</div>
	{:else}
		<div class="w-full max-w-md">
			<div bind:this={clerkMountDiv}></div>
		</div>
	{/if}
</div>

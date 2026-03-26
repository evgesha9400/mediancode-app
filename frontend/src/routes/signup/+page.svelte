<script lang="ts">
	import { clerkState, getClerk, clerkAppearance } from '$lib/clerk';
	import { goto } from '$app/navigation';
	import { Logo } from '$lib/components';

	let clerkMountDiv = $state<HTMLDivElement>();
	let hasAttemptedMount = $state(false);

	// Mount Clerk sign-up form when ready
	$effect(() => {
		if ($clerkState.isLoaded && !$clerkState.isSignedIn && clerkMountDiv && !hasAttemptedMount) {
			hasAttemptedMount = true;
			const clerk = getClerk();
			if (clerk) {
				clerk.mountSignUp(clerkMountDiv, {
					fallbackRedirectUrl: '/dashboard',
					signInUrl: '/signin',
					appearance: {
						...clerkAppearance,
						elements: {
							...clerkAppearance.elements,
							rootBox: 'mx-auto',
							headerTitle: 'hidden',
							logoBox: 'hidden',
						}
					}
				});
			}
		}
	});

	// Redirect to dashboard when signed in
	$effect(() => {
		if ($clerkState.isSignedIn) {
			goto('/dashboard');
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	{#if !$clerkState.isLoaded}
		<div class="text-center space-y-4">
			<div class="flex items-center justify-center space-x-3 mb-8">
				<Logo size="lg" variant="dark" />
				<h1 class="text-3xl font-mono font-bold text-mono-100">Median Code</h1>
			</div>
			<p class="text-mono-400">Loading...</p>
		</div>
	{:else if $clerkState.isSignedIn}
		<div class="text-center space-y-4">
			<div class="flex items-center justify-center space-x-3 mb-8">
				<Logo size="lg" variant="dark" />
				<h1 class="text-3xl font-mono font-bold text-mono-100">Median Code</h1>
			</div>
			<p class="text-mono-400">Redirecting to dashboard...</p>
		</div>
	{:else}
		<div class="w-full max-w-md">
			<!-- Logo above Clerk form -->
			<div class="flex items-center justify-center space-x-3 mb-8">
				<Logo size="lg" variant="dark" />
				<h1 class="text-3xl font-mono font-bold text-mono-100">Median Code</h1>
			</div>
			<div bind:this={clerkMountDiv}></div>
		</div>
	{/if}
</div>

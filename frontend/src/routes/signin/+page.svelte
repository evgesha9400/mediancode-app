<script lang="ts">
	import { clerkState, getClerk, clerkAppearance } from '$lib/clerk';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Logo } from '$lib/components';

	let clerkMountDiv = $state<HTMLDivElement>();
	let hasAttemptedMount = $state(false);

	/**
	 * Resolve the post-sign-in redirect target from the `redirect` query parameter.
	 * Only allows internal paths (starting with `/`) to prevent open-redirect attacks.
	 */
	function getRedirectTarget(): string {
		const raw = page.url.searchParams.get('redirect');
		if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
			return raw;
		}
		return '/dashboard';
	}

	// Mount Clerk sign-in form when ready
	$effect(() => {
		if ($clerkState.isLoaded && !$clerkState.isSignedIn && clerkMountDiv && !hasAttemptedMount) {
			hasAttemptedMount = true;
			const clerk = getClerk();
			if (clerk) {
				clerk.mountSignIn(clerkMountDiv, {
					fallbackRedirectUrl: getRedirectTarget(),
					signUpUrl: '/signup',
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

	// Redirect to intended destination (or dashboard) when signed in
	$effect(() => {
		if ($clerkState.isSignedIn) {
			goto(getRedirectTarget());
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

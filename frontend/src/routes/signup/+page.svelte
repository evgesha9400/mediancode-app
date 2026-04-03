<script lang="ts">
	import { clerkState, getClerk, clerkAppearance } from '$lib/clerk';
	import { goto } from '$app/navigation';
	import { PreRenderedLogo } from '$lib/components/logo';

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

<div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-mono-950">
	<!-- Ambient Glow Background -->
	<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] opacity-[0.12] bg-green-400 blur-[120px] rounded-full pointer-events-none"></div>

	<div class="relative z-10 w-full max-w-md">
		{#if !$clerkState.isLoaded}
			<div class="text-center space-y-4">
				<div class="flex items-center justify-center space-x-3 mb-8 opacity-80">
					<PreRenderedLogo size="lg" variant="dark" />
					<h1 class="text-3xl font-inter font-bold text-mono-100 tracking-tight">Median Code</h1>
				</div>
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto opacity-80"></div>
				<p class="text-mono-400 font-inter text-sm">Loading...</p>
			</div>
		{:else if $clerkState.isSignedIn}
			<div class="text-center space-y-4">
				<div class="flex items-center justify-center space-x-3 mb-8 opacity-80">
					<PreRenderedLogo size="lg" variant="dark" />
					<h1 class="text-3xl font-inter font-bold text-mono-100 tracking-tight">Median Code</h1>
				</div>
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto opacity-80"></div>
				<p class="text-mono-400 font-inter text-sm">Redirecting to dashboard...</p>
			</div>
		{:else}
			<div class="w-full flex flex-col items-center">
				<!-- Logo above Clerk form -->
				<div class="flex items-center justify-center space-x-3 mb-8 opacity-90">
					<PreRenderedLogo size="lg" variant="dark" />
					<h1 class="text-3xl font-inter font-bold text-mono-100 tracking-tight">Median Code</h1>
				</div>
				<div bind:this={clerkMountDiv} class="w-full flex justify-center"></div>
			</div>
		{/if}
	</div>
</div>

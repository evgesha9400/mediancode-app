<script lang="ts">
	import { clerkState, getClerk } from '$lib/clerk';
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
						variables: {
							colorBackground: '#171717',
							colorInputBackground: '#171717',
							colorText: '#f5f5f5',
							colorTextSecondary: '#a3a3a3',
							colorPrimary: '#4ade80',
							colorInputText: '#f5f5f5',
							borderRadius: '0',
							colorNeutral: '#a3a3a3',
						},
						elements: {
							rootBox: 'mx-auto',
							card: 'shadow-none bg-mono-900 border-2 border-mono-700',
							headerTitle: 'hidden',
							logoBox: 'hidden',
							formButtonPrimary: 'bg-green-400 text-mono-950 hover:bg-green-300 font-bold tracking-wide',
							formFieldInput: 'bg-mono-900 border-mono-600 text-mono-100',
							footerActionLink: 'text-green-400 hover:text-green-300',
							socialButtonsIconButton__github: '[&>img]:invert',
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
				<h1 class="text-3xl font-mono font-bold text-mono-100">median-code</h1>
			</div>
			<p class="text-mono-400">Loading...</p>
		</div>
	{:else if $clerkState.isSignedIn}
		<div class="text-center space-y-4">
			<div class="flex items-center justify-center space-x-3 mb-8">
				<Logo size="lg" variant="dark" />
				<h1 class="text-3xl font-mono font-bold text-mono-100">median-code</h1>
			</div>
			<p class="text-mono-400">Redirecting to dashboard...</p>
		</div>
	{:else}
		<div class="w-full max-w-md">
			<!-- Logo above Clerk form -->
			<div class="flex items-center justify-center space-x-3 mb-8">
				<Logo size="lg" variant="dark" />
				<h1 class="text-3xl font-mono font-bold text-mono-100">median-code</h1>
			</div>
			<div bind:this={clerkMountDiv}></div>
		</div>
	{/if}
</div>

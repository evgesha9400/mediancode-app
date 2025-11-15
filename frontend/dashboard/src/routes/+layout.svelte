<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initializeClerk } from '$lib/clerk';
	import { browser } from '$app/environment';
	import { isMobileDevice } from '$lib/deviceDetection';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { children, data } = $props();

	// Check for mobile devices and redirect
	$effect(() => {
		if (browser) {
			const currentPath = window.location.pathname;
			const isMobile = isMobileDevice();

			// Redirect mobile users to blocked page (except if already on blocked page)
			if (isMobile && currentPath !== '/mobile-blocked') {
				goto('/mobile-blocked');
			} else if (!isMobile && currentPath === '/mobile-blocked') {
				// Redirect desktop users away from blocked page
				goto('/');
			}
		}
	});

	// Initialize Clerk on client side
	$effect(() => {
		if (browser && data.clerkPublishableKey) {
			initializeClerk(data.clerkPublishableKey);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

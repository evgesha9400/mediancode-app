<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { initializeClerk } from '$lib/clerk';
	import { browser } from '$app/environment';
	import { isMobileDevice } from '$lib/deviceDetection';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { children, data } = $props();

	// Define public routes that don't require authentication
	const publicRoutes = ['/', '/mobile-blocked'];

	// Check for mobile devices and redirect (disabled for landing page)
	$effect(() => {
		if (browser) {
			const currentPath = window.location.pathname;
			const isMobile = isMobileDevice();
			const isPublicRoute = publicRoutes.includes(currentPath);

			// Only redirect for dashboard route, not landing page
			if (isMobile && currentPath === '/dashboard') {
				goto('/mobile-blocked');
			} else if (!isMobile && currentPath === '/mobile-blocked') {
				// Redirect desktop users away from blocked page
				goto('/');
			}
		}
	});

	// Initialize Clerk only for non-public routes
	$effect(() => {
		if (browser && data.clerkPublishableKey) {
			const currentPath = window.location.pathname;
			const isPublicRoute = publicRoutes.includes(currentPath);

			if (!isPublicRoute) {
				initializeClerk(data.clerkPublishableKey);
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

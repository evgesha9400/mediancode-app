<script lang="ts">
	import '../app.css';
	import { initializeClerk } from '$lib/clerk';
	import { browser } from '$app/environment';
	import { isMobileDevice } from '$lib/deviceDetection';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children, data } = $props();

	// Define routes that don't need mobile redirect
	const mobileAllowedRoutes = ['/', '/mobile-blocked'];

	// Check for mobile devices and redirect (disabled for landing page)
	$effect(() => {
		if (browser) {
			const currentPath = page.url.pathname;
			const isMobile = isMobileDevice();

			// Only redirect for dashboard route, not landing page
			if (isMobile && currentPath === '/dashboard') {
				goto('/mobile-blocked');
			} else if (!isMobile && currentPath === '/mobile-blocked') {
				// Redirect desktop users away from blocked page
				goto('/');
			}
		}
	});

	// Initialize Clerk on all routes to handle OAuth callbacks
	$effect(() => {
		if (browser && data.clerkPublishableKey) {
			initializeClerk(data.clerkPublishableKey);
		}
	});
</script>

{@render children()}

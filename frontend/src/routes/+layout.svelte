<script lang="ts">
	import '../app.css';
	import { initializeClerk } from '$lib/clerk';
	import { browser } from '$app/environment';
	import { isMobileDevice } from '$lib/deviceDetection';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children, data } = $props();

	// Public routes that don't require mobile redirect
	const publicRoutes = new Set(['/', '/signin', '/signup', '/mobile-blocked']);

	// Redirect mobile users away from dashboard routes, and desktop users away from /mobile-blocked
	$effect(() => {
		if (browser) {
			const currentPath = page.url.pathname;
			const isMobile = isMobileDevice();

			if (isMobile && !publicRoutes.has(currentPath)) {
				goto('/mobile-blocked');
			} else if (!isMobile && currentPath === '/mobile-blocked') {
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

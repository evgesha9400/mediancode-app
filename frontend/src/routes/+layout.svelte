<script lang="ts">
	import '../app.css';
	import { initializeClerk } from '$lib/clerk';
	import { browser } from '$app/environment';

	let { children, data } = $props();

	// Initialize Clerk on all routes to handle OAuth callbacks
	$effect(() => {
		if (browser && data.clerkPublishableKey) {
			initializeClerk(data.clerkPublishableKey);
		}
	});
</script>

{@render children()}

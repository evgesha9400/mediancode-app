<script lang="ts">
	import '../app.css';
	import { initializeClerk } from '$lib/clerk';
	import { appThemeHeadStyleTag } from '$lib/theme/appTheme';
	import { browser } from '$app/environment';

	let { children, data } = $props();

	// Initialize Clerk on all routes to handle OAuth callbacks
	$effect(() => {
		if (browser && data.clerkPublishableKey) {
			initializeClerk(data.clerkPublishableKey);
		}
	});
</script>

<svelte:head>
	{@html appThemeHeadStyleTag}
</svelte:head>

{@render children()}

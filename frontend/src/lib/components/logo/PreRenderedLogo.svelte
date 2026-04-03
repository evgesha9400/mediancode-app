<script module lang="ts">
	import type { LogoSize, LogoVariant } from '$lib/utils/logoCanvasRenderer';

	export interface PreRenderedLogoProps {
		size?: LogoSize;
		variant?: LogoVariant;
		showText?: boolean;
		class?: string;
	}
</script>

<script lang="ts">
	import Logo from './Logo.svelte';

	interface Props extends PreRenderedLogoProps {}

	let { size = 'md', variant = 'dark', showText = false, class: className = '' }: Props = $props();
</script>

<Logo {size} {variant} {showText} class={className} />

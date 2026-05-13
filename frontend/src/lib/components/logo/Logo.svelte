<script module lang="ts">
	import type { LogoSize, LogoVariant } from '$lib/utils/logoCanvasRenderer';

	export interface LogoProps {
		size?: LogoSize;
		variant?: LogoVariant;
		showText?: boolean;
		paused?: boolean;
		class?: string;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { dashboardTextPrimary } from '$lib/ui/classes';
	import { createLogoCanvasRenderer, LOGO_SIZE_MAP } from '$lib/utils/logoCanvasRenderer';
	import type { LogoCanvasRenderer } from '$lib/utils/logoCanvasRenderer';

	interface Props extends LogoProps {}

	let { size = 'md', variant = 'dark', showText = false, paused = false, class: className = '' }: Props =
		$props();

	const isAutomatedEnvironment = browser && typeof navigator !== 'undefined' && navigator.webdriver === true;

	let canvasEl = $state<HTMLCanvasElement>();
	let renderer = $state<LogoCanvasRenderer | null>(null);

	onMount(() => {
		if (!canvasEl) return;

		const shouldAnimate = !paused && !isAutomatedEnvironment;
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const instance = createLogoCanvasRenderer({
			canvas: canvasEl,
			size,
			variant,
			animated: shouldAnimate && !prefersReducedMotion
		});
		renderer = instance;

		let observer: IntersectionObserver | null = null;

		if (shouldAnimate && !prefersReducedMotion) {
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) {
							instance.start();
						} else {
							instance.stop();
						}
					}
				},
				{ threshold: 0.1 }
			);
			observer.observe(canvasEl);
		}

		return () => {
			observer?.disconnect();
			instance.destroy();
			renderer = null;
		};
	});

	$effect(() => {
		const r = renderer;
		const v = variant;
		const s = size;
		if (r) {
			r.setVariant(v);
			r.resize(s);
		}
	});
</script>

<div class="inline-flex items-center {showText ? 'space-x-2' : ''} {className}">
	<canvas
		bind:this={canvasEl}
		class="flex-shrink-0 bg-transparent [color-scheme:only_light]"
		style="width: {LOGO_SIZE_MAP[size]}px; height: {LOGO_SIZE_MAP[size]}px;"
		aria-hidden="true"
	></canvas>
	{#if showText}
		<span class="font-bold {variant === 'light' ? 'text-mono-900' : dashboardTextPrimary}">Median Code</span>
	{/if}
</div>

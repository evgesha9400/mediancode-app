<script lang="ts">
	import { Logo } from '$lib/components';
</script>

<div class="min-h-screen bg-mono-950 flex items-center justify-center p-4">
	<div class="max-w-md text-center space-y-6">
		<div class="flex items-center justify-center mb-8">
			<Logo size="xl" variant="dark" />
		</div>

		<h1 class="text-3xl font-bold text-mono-100">Desktop Required</h1>

		<div class="bg-mono-900 border border-mono-700 rounded-lg p-6 space-y-4">
			<div class="w-12 h-12 bg-mono-800 rounded-full flex items-center justify-center mx-auto">
				<svg class="w-6 h-6 text-mono-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
				</svg>
			</div>

			<p class="text-mono-400">
				The Median Code dashboard is optimized for desktop use. Our code generation and visualization tools require a larger screen for the best experience.
			</p>

			<div class="pt-4 border-t border-mono-700">
				<p class="text-sm text-mono-400">
					Please visit us on a desktop or laptop computer to access the dashboard.
				</p>
			</div>
		</div>

		<a
			href="https://mediancode.com"
			class="inline-block px-6 py-3 bg-green-400 text-mono-950 font-bold rounded-lg hover:bg-green-300 transition-colors"
		>
			Return to Homepage
		</a>
	</div>
</div>

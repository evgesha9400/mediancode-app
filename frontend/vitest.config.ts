import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
	plugins: [sveltekit()],

	build: {
		chunkSizeWarningLimit: 3000
	},

	test: {
		// Use jsdom for DOM testing
		environment: 'jsdom',

		// Global test setup
		setupFiles: ['./tests/setup/vitestSetup.ts'],

		// Include test files
		include: ['tests/**/*.{test,spec}.{js,ts}'],

		// Exclude files
		exclude: [
			'**/node_modules/**',
			'**/.svelte-kit/**',
			'**/build/**',
			'**/dist/**',
			'tests/e2e/**'
		],

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'json', 'lcov'],
			include: ['src/**/*.{js,ts,svelte}'],
			exclude: [
				'src/**/*.d.ts',
				'src/**/*.test.{js,ts}',
				'src/**/*.spec.{js,ts}',
				'**/.svelte-kit/**',
				'**/node_modules/**'
			],
			thresholds: {
				lines: 0,
				functions: 0,
				branches: 0,
				statements: 0
			}
		},

		// Global test settings
		globals: true
	}
}));

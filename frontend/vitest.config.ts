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
			'tests/e2e/**',
			'tests/smoke/**'
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
				'src/**/*.typecheck.{js,ts}',
				'**/.svelte-kit/**',
				'**/node_modules/**'
			],
			thresholds: {
				lines: 21,
				functions: 24,
				branches: 17,
				statements: 18
			}
		},

		// Global test settings
		globals: true
	}
}));

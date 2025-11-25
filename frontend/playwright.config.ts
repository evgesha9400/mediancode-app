import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Playwright Configuration
 *
 * This configuration defines two test projects:
 * 1. chromium-smoke: Fast subset for PR validation (~2 minutes)
 * 2. chromium-full: Complete suite with visual regression (nightly)
 *
 * NOTE: MSW (Mock Service Worker) is NOT currently initialized for E2E tests.
 * The tests run against the actual app with real Svelte stores (not fixtures).
 * The MSW service worker file exists in static/ but is not started.
 *
 * To enable MSW mocking in E2E tests:
 * 1. Import and call startMSW() in global-setup.ts or a test fixture
 * 2. Update handlers in tests/shared/msw/handlers.ts
 * 3. Ensure the app hydrates with mocked data
 *
 * Current behavior:
 * - Dashboard stat cards use values from src/lib/stores/fields.ts and validators.ts
 * - Forms submit to real Formspree/Clerk endpoints (may need network)
 */
export default defineConfig({
	// Test directory
	testDir: './tests/e2e',

	// Global setup to initialize MSW
	globalSetup: './tests/e2e/global-setup.ts',

	// Maximum time one test can run
	timeout: 30 * 1000,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Opt out of parallel tests on CI for more stable runs
	workers: process.env.CI ? 1 : undefined,

	// Reporter to use
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['list'],
		...(process.env.CI ? [['github'] as const] : [])
	],

	// Shared settings for all projects
	use: {
		// Base URL for navigation (must match webServer port)
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173',

		// Collect trace when retrying the failed test
		trace: 'on-first-retry',

		// Screenshot on failure
		screenshot: 'only-on-failure',

		// Video on failure
		video: 'retain-on-failure',

		// Browser viewport
		viewport: { width: 1280, height: 720 }
	},

	// Configure projects for different test scenarios
	projects: [
		{
			name: 'chromium-smoke',
			use: {
				...devices['Desktop Chrome']
			},
			// Only run tests tagged with @smoke
			testMatch: /.*\.smoke\.spec\.ts/,
			// Fast execution for PR validation
			timeout: 15 * 1000
		},

		{
			name: 'chromium-full',
			use: {
				...devices['Desktop Chrome']
			},
			// Run all spec files
			testMatch: /.*\.spec\.ts/,
			// Longer timeout for comprehensive tests
			timeout: 30 * 1000
		}
	],

	// Web server configuration for local development
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		stdout: 'ignore',
		stderr: 'pipe',
		// Ensure the build has access to required environment variables
		env: {
			...process.env,
			PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder'
		}
	}
});

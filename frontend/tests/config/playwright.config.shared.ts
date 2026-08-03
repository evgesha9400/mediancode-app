import { devices, type PlaywrightTestConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

/**
 * Shared Playwright Configuration
 *
 * Test projects organized by category:
 *
 * 1. smoke: Page-render checks, no backend required (~2 minutes)
 * 2. setup: Authenticates test user for CRUD tests
 * 3. crud: Entity CRUD lifecycle against dev backend
 *
 * Backend integration tests (crud) run against
 * api-dev.mediancode.com and require:
 * - E2E_TEST_USER_EMAIL: Pre-created test user email
 * - E2E_TEST_USER_PASSWORD: Test user password
 */
export function createPlaywrightConfig(baseURL: string): PlaywrightTestConfig {
	const rootDir = process.cwd();
	const globalSetupPath = path.resolve(rootDir, 'tests/e2e/global-setup.ts');
	const failureReporterPath = path.resolve(rootDir, 'tests/helpers/failure-reporter.ts');
	const smokeDir = path.resolve(rootDir, 'tests/smoke');
	const setupDir = path.resolve(rootDir, 'tests/e2e/setup');
	const crudDir = path.resolve(rootDir, 'tests/e2e/crud');

	return {
		// Global setup to initialize MSW
		globalSetup: globalSetupPath,

		// Keep artifacts at repo root — relative paths would nest under tests/config/
		outputDir: path.join(rootDir, 'test-results'),

		// Maximum time one test can run
		timeout: 30 * 1000,

		// Fail the build on CI if you accidentally left test.only in the source code
		forbidOnly: !!process.env.CI,

		// Retry on CI only
		retries: process.env.CI ? 2 : 0,

		// Fail fast locally to avoid noisy cascades in IDE test explorers
		maxFailures: process.env.CI ? undefined : 1,

		// Run 2 workers in CI for smoke tests, 1 for CRUD/auth (sequential)
		workers: process.env.CI ? 2 : undefined,

		// Reporter to use
		reporter: [
			['html', { outputFolder: path.join(rootDir, 'playwright-report') }],
			['list'],
			[failureReporterPath],
			...(process.env.CI ? [['github'] as const] : [])
		],

		// Shared settings for all projects
		use: {
			baseURL,

			// Collect trace when retrying the failed test
			trace: 'on-first-retry',

			// Screenshot on failure
			screenshot: 'only-on-failure',

			// Video on failure
			video: 'retain-on-failure',

			// Browser viewport
			viewport: { width: 1280, height: 720 }
		},

		// Configure projects
		projects: [
			{
				name: 'smoke',
				testDir: smokeDir,
				use: {
					...devices['Desktop Chrome']
				},
				timeout: 15 * 1000
			},

			{
				name: 'setup',
				testDir: setupDir,
				use: {
					...devices['Desktop Chrome']
				},
				timeout: 60 * 1000
			},

			{
				name: 'crud',
				testDir: crudDir,
				dependencies: ['setup'],
				use: {
					...devices['Desktop Chrome'],
					// Nightly CRUD hits real API + preview build; 3s was too tight for member dropdown.
					actionTimeout: 10_000,
					ignoreHTTPSErrors: true
				},
				fullyParallel: false,
				timeout: 0
			}
		]
	};
}

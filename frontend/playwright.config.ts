import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright Configuration
 *
 * Test projects organized by category:
 *
 * 1. smoke: Page-render checks, no backend required (~2 minutes)
 * 2. setup: Authenticates test user for CRUD tests
 * 3. crud: Entity CRUD lifecycle against dev backend
 *
 * Backend integration tests (crud) run against
 * api.dev.mediancode.com and require:
 * - E2E_TEST_USER_EMAIL: Pre-created test user email
 * - E2E_TEST_USER_PASSWORD: Test user password
 */

const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_PORT = 4173;
const DEFAULT_BASE_URL = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;


// Auth state file path
const AUTH_FILE = path.join(__dirname, 'tests/e2e/.auth/user.json');

export default defineConfig({
	// Global setup to initialize MSW
	globalSetup: './tests/e2e/global-setup.ts',

	// Maximum time one test can run
	timeout: 30 * 1000,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Run 2 workers in CI for smoke tests, 1 for CRUD/auth (sequential)
	workers: process.env.CI ? 2 : undefined,

	// Reporter to use
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['list'],
		['./tests/helpers/failure-reporter.ts'],
		...(process.env.CI ? [['github'] as const] : [])
	],

	// Shared settings for all projects
	use: {
		// Base URL for navigation (must match webServer port)
		baseURL: process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL,

		// Collect trace when retrying the failed test
		trace: 'on-first-retry',

		// Screenshot on failure
		screenshot: 'only-on-failure',

		// Video on failure
		video: 'retain-on-failure',

		// Browser viewport
		viewport: { width: 1280, height: 720 }
	},

	// Snapshot path template
	snapshotPathTemplate: 'tests/e2e/__screenshots__/{testFilePath}/{arg}{ext}',

	// Configure projects
	projects: [
		{
			name: 'smoke',
			testDir: './tests/smoke',
			use: {
				...devices['Desktop Chrome']
			},
			timeout: 15 * 1000
		},

		{
			name: 'setup',
			testDir: './tests/e2e/setup',
			use: {
				...devices['Desktop Chrome']
			},
			timeout: 60 * 1000
		},

		{
			name: 'crud',
			testDir: './tests/e2e/crud',
			use: {
				...devices['Desktop Chrome'],
				actionTimeout: 3_000,
				ignoreHTTPSErrors: true
			},
			fullyParallel: false,
			timeout: 0
		},

	],

	// Web server configuration
	webServer: {
		command: `bun run build && bun run preview -- --host ${PREVIEW_HOST} --port ${PREVIEW_PORT}`,
		port: PREVIEW_PORT,
		reuseExistingServer: false,
		stdout: 'ignore',
		stderr: 'pipe',
		env: {
			...process.env,
			PUBLIC_CLERK_PUBLISHABLE_KEY:
				process.env.PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder',
			PUBLIC_CLERK_MOCK_MODE: 'false',
			PUBLIC_API_BASE_URL: process.env.E2E_API_BASE_URL || 'https://api.dev.mediancode.com/v1'
		}
	}
});

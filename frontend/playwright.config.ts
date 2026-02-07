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
 * This configuration defines test projects for different scenarios:
 *
 * EXISTING PROJECTS (frontend-only tests):
 * 1. chromium-smoke: Fast subset for PR validation (~2 minutes)
 * 2. chromium-full: Complete suite with visual regression (nightly)
 *
 * NEW PROJECTS (backend integration tests):
 * 3. setup: Authenticates test user for CRUD tests
 * 4. app-crud: Tests entity CRUD lifecycle against dev backend
 * 5. auth-flows: Tests signup, password change, org creation
 *
 * Backend integration tests run against api.dev.mediancode.com
 * and require:
 * - E2E_TEST_USER_EMAIL: Pre-created test user email
 * - E2E_TEST_USER_PASSWORD: Test user password
 * - CLERK_SECRET_KEY: For auth flow cleanup (auth-flows only)
 */

const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_PORT = 4173;
const DEFAULT_BASE_URL = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;

// Auth state file path
const AUTH_FILE = path.join(__dirname, 'tests/e2e/.auth/user.json');

export default defineConfig({
	// Test directory
	testDir: './tests/e2e',

	// Global setup to initialize MSW (for existing tests)
	globalSetup: './tests/e2e/global-setup.ts',

	// Maximum time one test can run
	timeout: 30 * 1000,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Run 2 workers in CI for existing tests, 1 for CRUD tests (sequential)
	// Note: app-crud and auth-flows projects override this to 1
	workers: process.env.CI ? 2 : undefined,

	// Reporter to use
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['list'],
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

	// Snapshot path template (D3 - Centralized screenshots directory)
	// Organizes snapshots by test file in tests/e2e/__screenshots__/
	snapshotPathTemplate: 'tests/e2e/__screenshots__/{testFilePath}/{arg}{ext}',

	// Configure projects for different test scenarios
	projects: [
		// ========================================================================
		// EXISTING PROJECTS - Frontend-only tests
		// ========================================================================

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
			// Run all spec files except smoke tests and CRUD/auth tests
			testMatch: /.*\.spec\.ts/,
			testIgnore: [/.*\.smoke\.spec\.ts/, /.*\.crud\.spec\.ts/, /scenarios\/auth-flows\/.*/],
			// Longer timeout for comprehensive tests
			timeout: 30 * 1000
		},

		// ========================================================================
		// NEW PROJECTS - Backend integration tests
		// ========================================================================

		{
			// Setup project - authenticates test user before CRUD tests
			name: 'setup',
			testMatch: /auth\.setup\.ts/,
			use: {
				...devices['Desktop Chrome']
			},
			timeout: 60 * 1000 // Auth can take longer
		},

		{
			// App CRUD tests - tests entity lifecycle against dev backend
			name: 'app-crud',
			use: {
				...devices['Desktop Chrome'],
				// Use authenticated state from setup
				storageState: AUTH_FILE
			},
			// Only run CRUD test files
			testMatch: /.*\.crud\.spec\.ts/,
			// Depends on setup completing first
			dependencies: ['setup'],
			// Sequential execution to avoid race conditions
			fullyParallel: false,
			// Longer timeout for API operations
			timeout: 45 * 1000
		},

		{
			// Auth flows tests - tests signup, password change, org creation
			// These do NOT use pre-authenticated state (they test the auth flow itself)
			name: 'auth-flows',
			use: {
				...devices['Desktop Chrome']
				// No storageState - these tests start unauthenticated
			},
			// Only run auth flow test files
			testDir: './tests/e2e/scenarios/auth-flows',
			testMatch: /.*\.spec\.ts/,
			// Sequential execution - one test at a time
			fullyParallel: false,
			// Longer timeout for auth operations
			timeout: 60 * 1000
		}
	],

	// Web server configuration for local development
	// In CI: always start fresh server. Locally: reuse existing dev/preview server if running
	webServer: {
		command: `bun run build && bun run preview -- --host ${PREVIEW_HOST} --port ${PREVIEW_PORT}`,
		port: PREVIEW_PORT,
		reuseExistingServer: !process.env.CI,
		stdout: 'ignore',
		stderr: 'pipe',
		// Ensure the build has access to required environment variables
		env: {
			...process.env,
			PUBLIC_CLERK_PUBLISHABLE_KEY:
				process.env.PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder',
			PUBLIC_CLERK_MOCK_MODE: 'false',
			// API base URL for backend integration
			PUBLIC_API_BASE_URL: process.env.E2E_API_BASE_URL || 'https://api.dev.mediancode.com/v1'
		}
	}
});

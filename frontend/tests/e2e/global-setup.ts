/**
 * Playwright Global Setup
 *
 * Runs once before all tests to prepare the test environment.
 *
 * This setup:
 * 1. Validates required environment variables (fail-fast)
 * 2. Verifies MSW service worker exists (infrastructure ready for future use)
 * 3. Sets up Clerk testing token for E2E tests (via @clerk/testing)
 *
 * Environment Variable Validation:
 * - Clerk keys are always validated (needed by clerkSetup)
 * - E2E test credentials are validated with a warning only, since smoke
 *   tests do not need them. The setup project validates them with a hard
 *   error, and the crud project depends on setup via Playwright dependencies.
 *
 * MSW Status (Decision D1 - Infrastructure Ready):
 * - MSW infrastructure is fully configured and ready
 * - Service worker exists at static/mockServiceWorker.js
 * - Handlers defined in tests/shared/msw/handlers.ts
 * - Browser worker available in tests/shared/msw/browser.ts
 *
 * CURRENT STATE: MSW is NOT started because the app uses Svelte stores (not API calls).
 * Data flows from API → stores → components.
 *
 * FUTURE: When API endpoints are added, enable MSW by:
 * 1. Import startMSW from tests/shared/msw/browser.ts
 * 2. Call startMSW() in this setup or in Playwright fixtures
 * 3. Update handlers to match actual API endpoints
 * 4. Ensure handlers use fixtures from tests/fixtures/
 *
 * The MSW service worker (static/mockServiceWorker.js) is committed to the repo.
 * If you need to update it, run `npx msw init static --save` manually.
 */

import * as fs from 'fs';
import * as path from 'path';
import { clerkSetup } from '@clerk/testing/playwright';

/**
 * Validate that required Clerk environment variables are set.
 * These are needed by clerkSetup() which runs for all test projects.
 * Fails immediately with a clear, actionable error message.
 */
function validateClerkEnvVars(): void {
	const required: Record<string, string | undefined> = {
		PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
		CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY
	};

	const missing = Object.entries(required)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missing.length > 0) {
		const varList = missing.map((v) => `  - ${v}`).join('\n');
		throw new Error(
			`Missing required environment variables for Clerk test setup:\n${varList}\n\n` +
				`Set these in your .env file or as CI environment variables.\n` +
				`See .env for documentation on where to obtain these values.`
		);
	}
}

/**
 * Check E2E test credentials and warn if missing.
 * These are only needed by the setup and crud projects (not smoke).
 * The setup project's authenticate.spec.ts performs a hard validation;
 * this is an early warning to surface the issue sooner in logs.
 */
function warnMissingTestCredentials(): void {
	const e2eVars: Record<string, string | undefined> = {
		E2E_TEST_USER_EMAIL: process.env.E2E_TEST_USER_EMAIL,
		E2E_TEST_USER_PASSWORD: process.env.E2E_TEST_USER_PASSWORD,
		PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL
	};

	const missing = Object.entries(e2eVars)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missing.length > 0) {
		const varList = missing.map((v) => `  - ${v}`).join('\n');
		console.warn(
			`\n⚠️  Missing E2E test credentials:\n${varList}\n` +
				`   Smoke tests will work, but setup/crud tests will fail.\n` +
				`   Set these in your .env file to run the full E2E suite.\n`
		);
	}
}

export default async function globalSetup() {
	// --- Pre-flight: validate environment variables ---
	console.log('Playwright Global Setup: Validating environment...');
	validateClerkEnvVars();
	warnMissingTestCredentials();
	console.log('Environment variables validated');

	// --- Verify MSW service worker ---
	console.log('Playwright Global Setup: Verifying MSW service worker...');

	const publicDir = path.resolve(process.cwd(), 'static');
	const workerPath = path.join(publicDir, 'mockServiceWorker.js');

	if (!fs.existsSync(workerPath)) {
		console.error(
			'MSW service worker not found at static/mockServiceWorker.js\n' +
				'   Run `npx msw init static --save` to generate it and commit the file.'
		);
		throw new Error('MSW service worker not found. Run: npx msw init static --save');
	}

	console.log('MSW service worker verified');

	// --- Obtain Clerk testing token ---
	// Sets process.env.CLERK_FAPI and CLERK_TESTING_TOKEN
	// This must run before setupClerkTestingToken() is called in test fixtures
	await clerkSetup({
		publishableKey: process.env.PUBLIC_CLERK_PUBLISHABLE_KEY,
		secretKey: process.env.CLERK_SECRET_KEY
	});
	console.log('Clerk testing token obtained');
}

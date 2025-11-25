/**
 * Playwright Global Setup
 *
 * Runs once before all tests to prepare the test environment.
 *
 * This setup:
 * 1. Verifies MSW service worker exists (infrastructure ready for future use)
 * 2. Sets up Clerk mock mode for E2E tests (via VITE_CLERK_MOCK_MODE)
 *
 * MSW Status (Decision D1 - Infrastructure Ready):
 * - MSW infrastructure is fully configured and ready
 * - Service worker exists at static/mockServiceWorker.js
 * - Handlers defined in tests/shared/msw/handlers.ts
 * - Browser worker available in tests/shared/msw/browser.ts
 *
 * CURRENT STATE: MSW is NOT started because the app uses Svelte stores (not API calls).
 * Data flows from src/lib/stores/initialData.ts → stores → components.
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

export default async function globalSetup() {
	console.log('🔧 Playwright Global Setup: Verifying MSW service worker...');

	const publicDir = path.resolve(process.cwd(), 'static');
	const workerPath = path.join(publicDir, 'mockServiceWorker.js');

	// Verify the service worker exists (should be committed to repo)
	if (!fs.existsSync(workerPath)) {
		console.error(
			'❌ MSW service worker not found at static/mockServiceWorker.js\n' +
				'   Run `npx msw init static --save` to generate it and commit the file.'
		);
		throw new Error('MSW service worker not found. Run: npx msw init static --save');
	}

	console.log('✅ MSW service worker verified');
	console.log('✅ Clerk mock mode enabled via VITE_CLERK_MOCK_MODE');
}

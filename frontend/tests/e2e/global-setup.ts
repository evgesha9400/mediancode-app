/**
 * Playwright Global Setup
 *
 * Runs once before all tests to prepare the test environment.
 *
 * IMPORTANT: MSW is NOT currently started in E2E tests.
 * This setup only verifies the service worker file exists but does NOT initialize MSW.
 * E2E tests run against the real app with Svelte stores providing data.
 *
 * The MSW service worker (static/mockServiceWorker.js) is committed to the repo.
 * If you need to update it, run `npx msw init static --save` manually.
 *
 * To enable MSW mocking:
 * 1. Uncomment the startMSW() import and call below
 * 2. Or use a Playwright test fixture that starts MSW per-test
 * 3. Update tests/shared/msw/handlers.ts with appropriate mock responses
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
}

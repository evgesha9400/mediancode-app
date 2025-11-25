/**
 * MSW Browser Setup for Playwright E2E Tests
 *
 * This file configures Mock Service Worker to intercept network requests
 * in the browser environment during Playwright tests.
 *
 * IMPORTANT: This uses the same handlers as Vitest (node environment)
 * to ensure deterministic behavior across all test layers.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Create and export the MSW browser worker
 * This worker intercepts fetch/XHR requests in the browser
 */
export const worker = setupWorker(...handlers);

/**
 * Start the MSW worker
 * Called in Playwright global setup or test fixtures
 */
export async function startMSW() {
	await worker.start({
		onUnhandledRequest: 'warn',
		serviceWorker: {
			// Use custom service worker path if needed
			url: '/mockServiceWorker.js'
		}
	});
}

/**
 * Stop the MSW worker
 * Called in Playwright global teardown
 */
export async function stopMSW() {
	await worker.stop();
}

/**
 * Reset handlers to initial state
 * Called between tests to ensure isolation
 */
export function resetMSWHandlers() {
	worker.resetHandlers();
}

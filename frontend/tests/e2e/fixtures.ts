/**
 * Custom Playwright fixtures for E2E tests.
 *
 * - `test`: Base fixture with backend health check (for setup/smoke tests)
 * - `authenticatedTest`: Signs in via Clerk on each test (for CRUD tests)
 *
 * Uses @clerk/testing's emailAddress-based sign-in which creates a sign-in
 * token via the Clerk Backend API (requires CLERK_SECRET_KEY). This approach
 * bypasses 2FA and device verification, making it reliable for CI/CD.
 */

import { test as base } from '@playwright/test';
import { clerk } from '@clerk/testing/playwright';
import { assertBackendHealthy } from '../helpers';

/** Derive the backend hostname from PUBLIC_API_BASE_URL for network log filtering. */
function getBackendHostname(): string {
	const apiUrl = process.env.PUBLIC_API_BASE_URL || 'http://localhost:8000/v1';
	try {
		return new URL(apiUrl).hostname;
	} catch {
		return 'localhost';
	}
}

function isBackendRequest(url: string): boolean {
	return url.includes(getBackendHostname());
}

export const test = base.extend<{}, { _backendHealthy: void }>({
	_backendHealthy: [
		async ({}, use) => {
			await assertBackendHealthy();
			await use();
		},
		{ scope: 'worker', auto: true }
	]
});

export const authenticatedTest = base.extend<
	{ _clerkAuth: void },
	{ _backendHealthy: void }
>({
	_backendHealthy: [
		async ({}, use) => {
			await assertBackendHealthy();
			await use();
		},
		{ scope: 'worker', auto: true }
	],
	_clerkAuth: [
		async ({ page }, use) => {
			// Track successful API responses to filter spurious requestfailed events.
			// Chromium can emit both 'response' and 'requestfailed' (ERR_ABORTED)
			// for the same CORS request during HTTP/2 stream cleanup.
			const succeededRequests = new Set<string>();

			// Log failed network requests for debugging (only our backend API)
			// Third-party requests (Clerk, etc.) may be aborted during navigation
			// as part of normal browser/HTTP2 lifecycle — not actionable for us.
			page.on('requestfailed', (req) => {
				const url = req.url();
				if (!isBackendRequest(url)) {
					return; // Only log our backend failures
				}
				const key = `${req.method()} ${url}`;
				if (succeededRequests.has(key)) {
					succeededRequests.delete(key);
					return; // Already got a successful response — HTTP/2 cleanup noise
				}
				console.log(`[NET FAIL] ${req.method()} ${url} — ${req.failure()?.errorText}`);
			});

			// Log API responses for debugging
			page.on('response', (resp) => {
				const url = resp.url();
				if (isBackendRequest(url)) {
					const key = `${resp.request().method()} ${url}`;
					if (resp.ok()) succeededRequests.add(key);
					console.log(
						`[API RESP] ${resp.request().method()} ${url} → ${resp.status()}`
					);
				}
			});

			// Navigate to a page that loads Clerk
			await page.goto('/');
			await page.waitForLoadState('networkidle');

			// Sign in using email-based approach (creates sign-in token via
			// Clerk Backend API, bypasses 2FA and device verification)
			await clerk.signIn({
				page,
				emailAddress: process.env.E2E_TEST_USER_EMAIL!
			});

			// Wait for Clerk's post-sign-in requests (org memberships, session sync)
			// to complete before the test navigates away
			await page.waitForLoadState('networkidle');

			await use();
		},
		{ auto: true }
	]
});

export { expect } from '@playwright/test';

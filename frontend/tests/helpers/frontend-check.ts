/**
 * Frontend Health Check for Playwright Tests
 *
 * Verifies the configured frontend base URL is reachable before any browser
 * navigation occurs. This provides a fast, explicit error instead of repeated
 * ERR_CONNECTION_REFUSED failures across many tests.
 */

const DEFAULT_FRONTEND_PORT = process.env.PLAYWRIGHT_TEST_PORT || '4175';
const DEFAULT_FRONTEND_BASE_URL =
	process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${DEFAULT_FRONTEND_PORT}`;

function getFrontendHealthUrl(baseUrl: string): string {
	const url = new URL(baseUrl);
	url.pathname = '/';
	return url.toString();
}

export async function assertFrontendHealthy(baseUrl: string = DEFAULT_FRONTEND_BASE_URL): Promise<void> {
	const healthUrl = getFrontendHealthUrl(baseUrl);

	try {
		const response = await fetch(healthUrl, {
			method: 'GET',
			signal: AbortSignal.timeout(3_000)
		});

		if (response.status >= 500) {
			throw new Error(
				`Frontend server responded with an unexpected status.\n` +
					`  URL: ${healthUrl}\n` +
					`  Status: ${response.status} ${response.statusText}\n\n` +
					`The app server started but is not healthy.`
			);
		}
	} catch (error) {
		throw new Error(
			`Frontend server is not reachable.\n` +
				`  URL: ${healthUrl}\n` +
				`  Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
				`Playwright expects to connect to the frontend before running tests.\n` +
				`If running locally, ensure the configured Playwright webServer can bind this URL.`
		);
	}
}

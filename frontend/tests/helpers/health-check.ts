/**
 * Backend Health Check for E2E Tests
 *
 * Verifies the configured backend API is available and healthy before
 * running test scenarios that depend on backend connectivity.
 *
 * Checks the /health endpoint of PUBLIC_API_BASE_URL. If the backend does
 * not respond with HTTP 200, throws an error that terminates the test
 * scenario with a clear diagnostic message including the URL attempted.
 */

/**
 * Backend API base URL - must match the value used by E2EApiClient
 */
const API_BASE_URL = process.env.PUBLIC_API_BASE_URL || 'http://localhost:8000/v1';

/**
 * Derive the health endpoint URL from the API base URL.
 *
 * The /health endpoint lives at the root of the API server, not under
 * the versioned path. For example:
 *   PUBLIC_API_BASE_URL=http://localhost:8000/v1 -> http://localhost:8000/health
 *   PUBLIC_API_BASE_URL=https://api-dev.mediancode.com/v1 -> https://api-dev.mediancode.com/health
 */
function getHealthUrl(): string {
	const url = new URL(API_BASE_URL);
	url.pathname = '/health';
	return url.toString();
}

/**
 * Assert that the backend API is healthy and available.
 *
 * Called once in the setup project before authentication. Since the
 * crud project depends on setup, this single check gates the entire
 * backend test suite.
 *
 * @throws Error if the backend /health endpoint does not return HTTP 200
 */
export async function assertBackendHealthy(): Promise<void> {
	// Catch http:// on remote hosts — browsers block CORS preflight redirects
	const parsed = new URL(API_BASE_URL);
	const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
	if (!isLocal && parsed.protocol === 'http:') {
		throw new Error(
			`PUBLIC_API_BASE_URL uses http:// for a remote host (${parsed.hostname}).\n` +
				`  Browsers block CORS preflight requests that redirect (http→https),\n` +
				`  which causes silent fetch failures in the app.\n\n` +
				`  Fix: Change PUBLIC_API_BASE_URL to use https://\n` +
				`  Current: ${API_BASE_URL}\n` +
				`  Expected: ${API_BASE_URL.replace('http://', 'https://')}`
		);
	}

	const healthUrl = getHealthUrl();

	try {
		const response = await fetch(healthUrl, {
			method: 'GET',
			signal: AbortSignal.timeout(3_000)
		});

		if (response.status !== 200) {
			throw new Error(
				`Backend API is not healthy.\n` +
					`  URL: ${healthUrl}\n` +
					`  Status: ${response.status} ${response.statusText}\n` +
					`  Expected: 200 OK\n\n` +
					`Ensure the backend is running and accessible at ${API_BASE_URL}`
			);
		}

		console.log(`Backend health check passed: ${healthUrl} (${response.status})`);
	} catch (error) {
		// Re-throw our own errors (non-200 status) as-is
		if (error instanceof Error && error.message.startsWith('Backend API is not healthy')) {
			throw error;
		}

		// Network errors (connection refused, timeout, DNS failure)
		throw new Error(
			`Backend API is not available.\n` +
				`  URL: ${healthUrl}\n` +
				`  Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
				`Ensure the backend is running and accessible at ${API_BASE_URL}`
		);
	}
}

import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from './tests/config/playwright.config.shared';

const TEST_HOST = '127.0.0.1';
const TEST_PORT = Number(process.env.PLAYWRIGHT_TEST_PORT || '4175');
const DEFAULT_BASE_URL = `http://${TEST_HOST}:${TEST_PORT}`;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL;

const parsedBaseUrl = new URL(baseURL);
const isLocalBaseUrl =
	parsedBaseUrl.hostname === '127.0.0.1' || parsedBaseUrl.hostname === 'localhost';
const localPort = parsedBaseUrl.port || String(TEST_PORT);

/**
 * Local Playwright config.
 *
 * Local runs start and stop their own dev server for deterministic behavior.
 * `reuseExistingServer` is intentionally disabled to avoid stale code.
 */
const baseConfig = createPlaywrightConfig(baseURL);

export default defineConfig({
	...baseConfig,
	...(isLocalBaseUrl
		? {
				webServer: {
					command: `bun run dev -- --host ${parsedBaseUrl.hostname} --port ${localPort} --strictPort`,
					url: baseURL,
					reuseExistingServer: false,
					stdout: 'ignore',
					stderr: 'pipe',
					timeout: 120 * 1000,
					gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
					env: {
						...process.env,
						PUBLIC_CLERK_PUBLISHABLE_KEY:
							process.env.PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_placeholder',
						PUBLIC_CLERK_MOCK_MODE: 'false'
					}
				}
			}
		: {})
});

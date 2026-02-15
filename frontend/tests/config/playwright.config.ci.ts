import { defineConfig } from '@playwright/test';
import { createPlaywrightConfig } from './playwright.config.shared';

const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_PORT = 4173;
const DEFAULT_BASE_URL = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;

const baseConfig = createPlaywrightConfig(
	process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL
);

/**
 * CI Playwright config.
 *
 * CI owns server startup through Playwright webServer to provide a fully
 * isolated environment for smoke and CRUD runs.
 */
export default defineConfig({
	...baseConfig,
	webServer: {
		command: `bun run build && bun run preview -- --host ${PREVIEW_HOST} --port ${PREVIEW_PORT}`,
		port: PREVIEW_PORT,
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
});

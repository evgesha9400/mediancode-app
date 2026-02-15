/**
 * Smoke Test Fixtures
 *
 * Extends Playwright's base test with a fast frontend health check so smoke
 * runs fail early with a clear message when the app server is unreachable.
 */

import { test as base, expect } from '@playwright/test';
import { assertFrontendHealthy } from '../helpers';

export const test = base.extend<{}, { _frontendHealthy: void }>({
	_frontendHealthy: [
		async ({}, use) => {
			await assertFrontendHealthy();
			await use();
		},
		{ scope: 'worker', auto: true }
	]
});

export { expect };

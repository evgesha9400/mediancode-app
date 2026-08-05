/**
 * Partial store-load failure visibility.
 *
 * The dashboard must not present a normal empty state when one backend store
 * fails. This reproduces the production endpoint failure and verifies both the
 * persistent warning and its recovery path.
 *
 * @tags app-crud resilience
 */

import { authenticatedTest as test, expect } from '../fixtures';

test('surfaces an endpoint load failure and recovers on retry', async ({ page }) => {
	let endpointRequests = 0;

	await page.route('**/v1/endpoints', async (route) => {
		endpointRequests += 1;
		if (endpointRequests === 1) {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ detail: 'Injected endpoint failure' })
			});
			return;
		}

		await route.continue();
	});

	await page.goto('/dashboard');

	const alert = page.getByTestId('store-load-failure-banner');
	await expect(alert).toBeVisible();
	await expect(alert).toContainText('Some server data could not be loaded');
	await expect(alert).toContainText('Failed: Endpoints');

	await alert.getByRole('button', { name: 'Retry' }).click();
	await expect.poll(() => endpointRequests).toBeGreaterThanOrEqual(2);
	await expect(alert).toBeHidden();
});

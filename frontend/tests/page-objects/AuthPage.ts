/**
 * Auth Page Object
 *
 * Encapsulates interactions with authentication pages (/signin, /signup).
 * Used by smoke tests for visual regression.
 * Real auth flow is handled by @clerk/testing in the CRUD setup project.
 *
 * Clerk rendering modes:
 * - Real Clerk: renders when Clerk FAPI is reachable (email input visible)
 * - Mock fallback: renders when Clerk FAPI is unreachable (mock component visible)
 *
 * Both modes indicate the page loaded and Clerk initialization completed.
 */

import { type Page, type Locator } from '@playwright/test';

export class AuthPage {
	readonly page: Page;

	// Email input — present when real Clerk form renders
	readonly emailInput: Locator;

	// Clerk component container — present when real Clerk mounts
	readonly clerkComponent: Locator;

	// Mock fallback — present when Clerk FAPI is unreachable and app falls back
	readonly mockComponent: Locator;

	constructor(page: Page) {
		this.page = page;

		this.emailInput = page.getByRole('textbox', { name: 'Email address' });
		this.clerkComponent = page.locator('.cl-component');
		this.mockComponent = page.locator('[data-testid^="clerk-mock-"]');
	}

	/**
	 * Navigate to sign-in page
	 */
	async gotoSignIn() {
		await this.page.goto('/signin');
	}

	/**
	 * Navigate to sign-up page
	 */
	async gotoSignUp() {
		await this.page.goto('/signup');
	}

	/**
	 * Wait for the Clerk auth form to be fully loaded and rendered.
	 *
	 * Waits for either:
	 * - Real Clerk email input (when Clerk FAPI is reachable)
	 * - Mock fallback component (when Clerk FAPI is unreachable)
	 *
	 * Both indicate that Clerk initialization completed and the page is stable
	 * for visual regression comparison.
	 *
	 * Uses the default action timeout (bounded by the test timeout) — no hardcoded value.
	 */
	async waitForFullyLoaded() {
		await this.emailInput.or(this.mockComponent).waitFor({ state: 'visible' });
	}
}

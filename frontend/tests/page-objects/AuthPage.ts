/**
 * Auth Page Object
 *
 * Encapsulates interactions with authentication pages (/signin, /signup).
 * Used by smoke tests for structural verification.
 * Real auth flow is handled by @clerk/testing in the CRUD setup project.
 *
 * Clerk rendering modes:
 * - Real Clerk: renders when Clerk FAPI is reachable (email input visible)
 * - Mock fallback: renders when Clerk FAPI is unreachable (mock component visible)
 *
 * Both modes indicate the page loaded and Clerk initialization completed.
 *
 * Note: Clerk's CSS class names (e.g., `.cl-component`) are NOT stable across
 * SDK versions. Use role-based and content-based locators instead.
 */

import { type Page, type Locator } from '@playwright/test';

export class AuthPage {
	readonly page: Page;

	// Email input — present when real Clerk form renders
	readonly emailInput: Locator;

	// Continue button — present when real Clerk form renders
	readonly continueButton: Locator;

	// Mock fallback — present when Clerk FAPI is unreachable and app falls back
	readonly mockComponent: Locator;

	constructor(page: Page) {
		this.page = page;

		this.emailInput = page.getByRole('textbox', { name: 'Email address' });
		this.continueButton = page.getByRole('button', { name: /continue/i });
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
	 * Both indicate that Clerk initialization completed and the page is stable.
	 *
	 * Uses the default action timeout (bounded by the test timeout) — no hardcoded value.
	 */
	async waitForFullyLoaded() {
		await this.emailInput.or(this.mockComponent).waitFor({ state: 'visible' });
	}

	/**
	 * Check if real Clerk form rendered (as opposed to mock fallback).
	 * Useful for conditional assertions in smoke tests.
	 */
	async isRealClerk(): Promise<boolean> {
		return this.emailInput.isVisible();
	}
}

/**
 * Auth Page Object
 *
 * Encapsulates interactions with authentication pages (/signin, /signup).
 * Used by smoke tests for visual regression.
 * Real auth flow is handled by @clerk/testing in the CRUD setup project.
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class AuthPage {
	readonly page: Page;

	// Email input — present on both signin and signup, confirms Clerk form is rendered
	readonly emailInput: Locator;

	constructor(page: Page) {
		this.page = page;

		this.emailInput = page.getByRole('textbox', { name: 'Email address' });
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
	 * Wait for the Clerk form to be fully loaded and interactive.
	 * Waits for the container, then for a concrete form element
	 * (input field or OAuth button) to confirm rendering is complete.
	 */
	async waitForFullyLoaded() {
		await expect(this.emailInput).toBeVisible();
	}
}

/**
 * Auth Page Object
 *
 * Encapsulates interactions with authentication pages (/signin, /signup).
 * Handles Clerk authentication flows.
 */

import { type Page, type Locator } from '@playwright/test';

export class AuthPage {
	readonly page: Page;

	// Clerk sign-in elements (adjust selectors based on actual Clerk implementation)
	readonly clerkContainer: Locator;
	readonly emailInput: Locator;
	readonly passwordInput: Locator;
	readonly submitButton: Locator;
	readonly errorMessage: Locator;

	// Sign up link
	readonly signUpLink: Locator;

	// Sign in link
	readonly signInLink: Locator;

	constructor(page: Page) {
		this.page = page;

		// Clerk elements - these selectors may need adjustment based on actual Clerk components
		this.clerkContainer = page.locator('.cl-component, [data-clerk-component]');
		this.emailInput = page.locator('input[name="identifier"], input[type="email"]');
		this.passwordInput = page.locator('input[name="password"], input[type="password"]');
		this.submitButton = page.locator('button[type="submit"]');
		this.errorMessage = page.locator('.cl-formFieldErrorText, [class*="error"]');

		// Navigation links
		this.signUpLink = page.locator('a[href="/signup"]');
		this.signInLink = page.locator('a[href="/signin"]');
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
	 * Sign in with email and password
	 * NOTE: This may need to be mocked or skipped in tests depending on Clerk configuration
	 */
	async signIn(email: string, password: string) {
		await this.emailInput.fill(email);
		await this.passwordInput.fill(password);
		await this.submitButton.click();
	}

	/**
	 * Check if Clerk component is loaded
	 */
	async isClerkLoaded(): Promise<boolean> {
		try {
			await this.clerkContainer.waitFor({ state: 'visible', timeout: 5000 });
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Check if error message is displayed
	 */
	async hasError(): Promise<boolean> {
		return await this.errorMessage.isVisible();
	}

	/**
	 * Get error message text
	 */
	async getErrorText(): Promise<string> {
		if (await this.hasError()) {
			return (await this.errorMessage.textContent()) || '';
		}
		return '';
	}

	/**
	 * Navigate to sign up from sign in page
	 */
	async navigateToSignUp() {
		await this.signUpLink.click();
	}

	/**
	 * Navigate to sign in from sign up page
	 */
	async navigateToSignIn() {
		await this.signInLink.click();
	}
}

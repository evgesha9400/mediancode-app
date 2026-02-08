/**
 * Mobile Blocked Page Object
 *
 * Encapsulates interactions with the mobile blocking page (/mobile-blocked).
 * This page is shown when users access the site from mobile devices.
 */

import { type Page, type Locator } from '@playwright/test';

export class MobileBlockedPage {
	readonly page: Page;

	// Page elements
	readonly heading: Locator;
	readonly message: Locator;
	readonly icon: Locator;

	constructor(page: Page) {
		this.page = page;

		// Mobile blocked elements
		this.heading = page.locator('h1');
		this.message = page.locator('p').first();
		// Target the specific SVG icon in the rounded bg-mono-100 container
		this.icon = page.locator('.bg-mono-100.rounded-full svg');
	}

	/**
	 * Navigate to mobile-blocked page
	 */
	async goto() {
		await this.page.goto('/mobile-blocked');
	}

	/**
	 * Check if the page is displayed
	 */
	async isDisplayed(): Promise<boolean> {
		try {
			await this.heading.waitFor({ state: 'visible', timeout: 5000 });
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get the heading text
	 */
	async getHeadingText(): Promise<string> {
		return (await this.heading.textContent()) || '';
	}

	/**
	 * Get the message text
	 */
	async getMessageText(): Promise<string> {
		return (await this.message.textContent()) || '';
	}
}

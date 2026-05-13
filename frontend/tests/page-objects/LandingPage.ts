/**
 * Landing Page Object
 *
 * Encapsulates interactions with the landing page (/).
 * Provides a clean API for Playwright tests to interact with page elements.
 *
 * Uses stable ID-based selectors (#hero, #features, etc.) for reliability.
 */

import { type Page, type Locator } from '@playwright/test';

export class LandingPage {
	readonly page: Page;

	// Navigation elements
	readonly header: Locator;
	readonly logo: Locator;
	readonly signInButton: Locator;
	readonly mobileMenuToggle: Locator;
	readonly mobileMenuSignIn: Locator;

	// Hero section
	readonly heroSection: Locator;
	readonly heroHeading: Locator;
	readonly heroSignUpLink: Locator;

	// Features section
	readonly featuresSection: Locator;
	readonly featureCards: Locator;

	// How it works section
	readonly howItWorksSection: Locator;
	readonly stepCards: Locator;

	// Philosophy section
	readonly philosophySection: Locator;

	// CTA section
	readonly ctaSection: Locator;
	readonly ctaSignUpLink: Locator;

	// Footer
	readonly footer: Locator;

	constructor(page: Page) {
		this.page = page;

		// Navigation - use header ID
		this.header = page.locator('#header');
		this.logo = this.header.locator('a[href="/"]').first();
		this.signInButton = this.header.locator('a[href="/signin"]').first();
		this.mobileMenuToggle = page.locator('button[aria-label="Toggle mobile menu"]');
		this.mobileMenuSignIn = this.header.locator('nav a[href="/signin"]').last();

		// Hero section - scoped to #hero
		this.heroSection = page.locator('#hero');
		this.heroHeading = this.heroSection.locator('h1');
		this.heroSignUpLink = this.heroSection.locator('a[href="/signup"]');

		// Features section - use #features ID
		this.featuresSection = page.locator('#features');
		this.featureCards = this.featuresSection.locator('.p-8');

		// How it works section - use #how-it-works ID
		this.howItWorksSection = page.locator('#how-it-works');
		this.stepCards = this.howItWorksSection.locator('.relative');

		// Philosophy section - use #philosophy ID
		this.philosophySection = page.locator('#philosophy');

		// CTA section - scoped to #final-cta
		this.ctaSection = page.locator('#final-cta');
		this.ctaSignUpLink = this.ctaSection.locator('a[href="/signup"]');

		// Footer - use #footer ID
		this.footer = page.locator('#footer');
	}

	/**
	 * Navigate to the landing page
	 */
	async goto() {
		await this.page.goto('/');
	}

	/**
	 * Toggle the mobile menu
	 */
	async toggleMobileMenu() {
		await this.mobileMenuToggle.click();
	}

	/**
	 * Wait for Clerk to finish loading so auth-dependent nav elements appear.
	 * The sign-in/sign-up buttons are behind {#if $clerkState.isLoaded} in +page.svelte.
	 * Uses the default action timeout (bounded by the test timeout) — no hardcoded value.
	 */
	async waitForClerkLoaded() {
		await this.signInButton.waitFor({ state: 'visible' });
	}

	/**
	 * Navigate to sign in from the header
	 */
	async navigateToSignIn() {
		await this.waitForClerkLoaded();
		await this.signInButton.click();
	}

	/**
	 * Navigate to sign in from the mobile menu
	 */
	async navigateToSignInViaMobile() {
		await this.toggleMobileMenu();
		await this.mobileMenuSignIn.click();
	}

	/**
	 * Scroll to a specific section
	 */
	async scrollToSection(section: 'features' | 'how-it-works' | 'philosophy' | 'cta') {
		const sectionMap = {
			'features': this.featuresSection,
			'how-it-works': this.howItWorksSection,
			'philosophy': this.philosophySection,
			'cta': this.ctaSection
		};

		await sectionMap[section].scrollIntoViewIfNeeded();
	}
}

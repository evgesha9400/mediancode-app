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
	readonly heroEmailInput: Locator;
	readonly heroSubmitButton: Locator;
	readonly heroSuccessMessage: Locator;

	// Features section
	readonly featuresSection: Locator;
	readonly featureCards: Locator;

	// How it works section
	readonly howItWorksSection: Locator;
	readonly stepCards: Locator;

	// Benefits section
	readonly benefitsSection: Locator;
	readonly benefitItems: Locator;

	// CTA section
	readonly ctaSection: Locator;
	readonly ctaEmailInput: Locator;
	readonly ctaSubmitButton: Locator;
	readonly ctaSuccessMessage: Locator;

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
		this.heroEmailInput = this.heroSection.locator('input[type="email"]');
		this.heroSubmitButton = this.heroSection.locator('button[type="submit"]');
		this.heroSuccessMessage = this.heroSection.locator('text=Thanks! We\'ll notify you when we launch.');

		// Features section - use #features ID
		this.featuresSection = page.locator('#features');
		this.featureCards = this.featuresSection.locator('.bg-white.rounded-lg.border');

		// How it works section - use #how-it-works ID
		this.howItWorksSection = page.locator('#how-it-works');
		this.stepCards = this.howItWorksSection.locator('.text-center');

		// Benefits section - use #benefits ID
		this.benefitsSection = page.locator('#benefits');
		this.benefitItems = this.benefitsSection.locator('.flex.items-start');

		// CTA section - scoped to #final-cta
		this.ctaSection = page.locator('#final-cta');
		this.ctaEmailInput = this.ctaSection.locator('input[type="email"]');
		this.ctaSubmitButton = this.ctaSection.locator('button[type="submit"]');
		this.ctaSuccessMessage = this.ctaSection.locator('text=Thanks! We\'ll notify you when we launch.');

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
	 * Submit the hero email form
	 */
	async submitHeroForm(email: string) {
		await this.heroEmailInput.fill(email);
		await this.heroSubmitButton.click();
	}

	/**
	 * Submit the CTA email form
	 */
	async submitCTAForm(email: string) {
		await this.ctaEmailInput.fill(email);
		await this.ctaSubmitButton.click();
	}

	/**
	 * Toggle the mobile menu
	 */
	async toggleMobileMenu() {
		await this.mobileMenuToggle.click();
	}

	/**
	 * Navigate to sign in from the header
	 */
	async navigateToSignIn() {
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
	async scrollToSection(section: 'features' | 'how-it-works' | 'benefits' | 'cta') {
		const sectionMap = {
			'features': this.featuresSection,
			'how-it-works': this.howItWorksSection,
			'benefits': this.benefitsSection,
			'cta': this.ctaSection
		};

		await sectionMap[section].scrollIntoViewIfNeeded();
	}
}

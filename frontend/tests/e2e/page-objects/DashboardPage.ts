/**
 * Dashboard Page Object
 *
 * Encapsulates interactions with the dashboard page (/dashboard).
 * Handles navigation, stat cards, tables, drawers, and other dashboard features.
 *
 * Uses data-testid and role-based selectors for stability.
 */

import { type Page, type Locator } from '@playwright/test';
import { getStatCardTestId } from '../../../src/lib/utils/testIds';

export const STAT_CARD_TITLES = {
	types: 'Types',
	validators: 'Validators',
	fields: 'Fields',
	generatedApis: 'Generated APIs',
	creditsAvailable: 'Credits Available',
	creditsUsed: 'Credits Used'
} as const;

type StatCardTitle = (typeof STAT_CARD_TITLES)[keyof typeof STAT_CARD_TITLES];

export class DashboardPage {
	readonly page: Page;

	// Header elements
	readonly pageTitle: Locator;
	readonly welcomeMessage: Locator;

	// Stat cards - use data-testid attributes
	readonly statCards: Locator;
	readonly typesCard: Locator;
	readonly fieldsCard: Locator;
	readonly generatedApisCard: Locator;
	readonly validatorsCard: Locator;
	readonly creditsAvailableCard: Locator;
	readonly creditsUsedCard: Locator;

	// Sidebar navigation - use href-based selectors
	readonly sidebar: Locator;
	readonly dashboardNavLink: Locator;
	readonly fieldsNavLink: Locator;
	readonly typesNavLink: Locator;
	readonly validatorsNavLink: Locator;

	// Sign out
	readonly signOutButton: Locator;

	constructor(page: Page) {
		this.page = page;

		// Header - use role and text matching
		this.pageTitle = page.getByRole('heading', { name: 'Dashboard', level: 1 });
		this.welcomeMessage = page.getByText(/Welcome back/);

		// Stat cards - use data-testid selectors for stability
		this.statCards = page.locator('[data-testid^="stat-card-"]');
		this.typesCard = this.getStatCardLocator(STAT_CARD_TITLES.types);
		this.fieldsCard = this.getStatCardLocator(STAT_CARD_TITLES.fields);
		this.generatedApisCard = this.getStatCardLocator(STAT_CARD_TITLES.generatedApis);
		this.validatorsCard = this.getStatCardLocator(STAT_CARD_TITLES.validators);
		this.creditsAvailableCard = this.getStatCardLocator(STAT_CARD_TITLES.creditsAvailable);
		this.creditsUsedCard = this.getStatCardLocator(STAT_CARD_TITLES.creditsUsed);

		// Sidebar - use href-based navigation links
		this.sidebar = page.locator('nav, aside').first();
		this.dashboardNavLink = page.getByRole('link', { name: /dashboard/i });
		this.fieldsNavLink = page.locator('a[href="/field-registry"]');
		this.typesNavLink = page.locator('a[href="/types"]');
		this.validatorsNavLink = page.locator('a[href="/validators"]');

		// Sign out - use role-based selector
		this.signOutButton = page.getByRole('button', { name: /sign out/i });
	}

	/**
	 * Navigate to the dashboard
	 */
	async goto() {
		await this.page.goto('/dashboard');
	}

	/**
	 * Get stat card value by title
	 */
	async getStatCardValue(title: StatCardTitle): Promise<string> {
		const card = this.getStatCardLocator(title);
		const value = await card.locator('[data-testid="stat-value"]').textContent();
		return value?.trim() || '';
	}

	private getStatCardLocator(title: StatCardTitle): Locator {
		return this.page.locator(`[data-testid="${getStatCardTestId(title)}"]`);
	}

	/**
	 * Navigate to a specific section via sidebar
	 */
	async navigateTo(section: 'dashboard' | 'field-registry' | 'types' | 'validators') {
		const linkMap = {
			dashboard: this.dashboardNavLink,
			'field-registry': this.fieldsNavLink,
			types: this.typesNavLink,
			validators: this.validatorsNavLink
		};

		await linkMap[section].click();
	}

	/**
	 * Sign out from the dashboard
	 */
	async signOut() {
		await this.signOutButton.click();
	}

	/**
	 * Check if user is authenticated (dashboard is visible)
	 */
	async isAuthenticated(): Promise<boolean> {
		try {
			await this.pageTitle.waitFor({ state: 'visible', timeout: 5000 });
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get welcome message user name
	 */
	async getWelcomeUserName(): Promise<string> {
		const text = await this.welcomeMessage.textContent();
		const match = text?.match(/Welcome back, (.+?)!/);
		return match ? match[1] : '';
	}
}

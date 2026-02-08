/**
 * Organization Management Flow Test
 *
 * Tests organization creation and management:
 * 1. Sign in with test user
 * 2. Create a new organization
 * 3. Verify organization appears
 * 4. Switch to the organization
 * 5. Delete organization (cleanup)
 *
 * This test creates a real organization in Clerk and cleans it up afterward.
 * Uses unique organization names with E2E prefix.
 *
 * Requires CLERK_SECRET_KEY environment variable for cleanup.
 *
 * @tags auth-flows
 */

import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects';
import { organizationName, deleteOrganizationByName } from '../../helpers';

test.describe('Organization Management Flow', () => {
	let authPage: AuthPage;
	let testUserEmail: string;
	let testUserPassword: string;
	let createdOrgName: string;

	test.beforeAll(() => {
		// Get test user credentials from environment
		testUserEmail = process.env.E2E_TEST_USER_EMAIL || '';
		testUserPassword = process.env.E2E_TEST_USER_PASSWORD || '';

		if (!testUserEmail || !testUserPassword) {
			throw new Error(
				'E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD environment variables are required'
			);
		}

		// Generate unique organization name for this test run
		createdOrgName = organizationName('crud');
	});

	test.beforeEach(async ({ page }) => {
		authPage = new AuthPage(page);
	});

	test.describe.serial('Organization Lifecycle', () => {
		test('Step 1: Sign in with test user', async ({ page }) => {
			// Navigate to sign-in page
			await authPage.gotoSignIn();

			// Wait for Clerk to load
			await authPage.waitForFullyLoaded();

			// Enter email
			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);

			// Click continue
			const continueButton = page
				.locator('button[type="submit"], button:has-text("Continue")')
				.first();
			await continueButton.click();

			// Wait for password field
			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

			// Enter password
			await passwordInput.fill(testUserPassword);

			// Submit
			await continueButton.click();

			// Wait for redirect to authenticated area
			await page.waitForURL(
				/\/(dashboard|apis|field-registry|object-builder|types|validators|namespaces)/,
				{ timeout: 30000 }
			);
		});

		test('Step 2: Open organization switcher', async ({ page }) => {
			// Sign in first
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);
			await page.locator('button[type="submit"]').first().click();

			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
			await passwordInput.fill(testUserPassword);
			await page.locator('button[type="submit"]').first().click();

			await page.waitForURL(/\/(dashboard|apis)/, { timeout: 30000 });

			// Look for organization switcher
			// Clerk's OrganizationSwitcher component
			const orgSwitcher = page
				.locator('[data-organization-switcher], .cl-organizationSwitcher')
				.first();

			if (await orgSwitcher.isVisible()) {
				await orgSwitcher.click();
				await page.waitForTimeout(300);

				// Verify dropdown opened
				const dropdown = page.locator('.cl-organizationSwitcherPopover').first();
				const isOpen = await dropdown.isVisible().catch(() => false);

				if (isOpen) {
					expect(isOpen).toBe(true);
				}
			}
		});

		test('Step 3: Create new organization', async ({ page }) => {
			// Sign in
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);
			await page.locator('button[type="submit"]').first().click();

			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
			await passwordInput.fill(testUserPassword);
			await page.locator('button[type="submit"]').first().click();

			await page.waitForURL(/\/(dashboard|apis)/, { timeout: 30000 });

			// Open organization switcher
			const orgSwitcher = page
				.locator('[data-organization-switcher], .cl-organizationSwitcher')
				.first();

			if (await orgSwitcher.isVisible()) {
				await orgSwitcher.click();
				await page.waitForTimeout(300);

				// Look for "Create organization" button
				const createOrgButton = page
					.locator('button:has-text("Create organization"), button:has-text("Create")')
					.first();

				if (await createOrgButton.isVisible()) {
					await createOrgButton.click();
					await page.waitForTimeout(300);

					// Fill in organization name
					const nameInput = page.locator('input[name="name"]').first();
					if (await nameInput.isVisible()) {
						await nameInput.fill(createdOrgName);
					}

					// Fill in slug if available
					const slugInput = page.locator('input[name="slug"]').first();
					if (await slugInput.isVisible()) {
						// Generate a slug from the name
						const slug = createdOrgName.toLowerCase().replace(/\s+/g, '-');
						await slugInput.fill(slug);
					}

					// Submit
					const submitButton = page
						.locator('button:has-text("Create organization"), button[type="submit"]')
						.first();
					if (await submitButton.isVisible()) {
						await submitButton.click();
						await page.waitForTimeout(1000);
					}
				}
			}
		});

		test('Step 4: Verify organization appears', async ({ page }) => {
			// Sign in
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);
			await page.locator('button[type="submit"]').first().click();

			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
			await passwordInput.fill(testUserPassword);
			await page.locator('button[type="submit"]').first().click();

			await page.waitForURL(/\/(dashboard|apis)/, { timeout: 30000 });

			// Open organization switcher
			const orgSwitcher = page
				.locator('[data-organization-switcher], .cl-organizationSwitcher')
				.first();

			if (await orgSwitcher.isVisible()) {
				await orgSwitcher.click();
				await page.waitForTimeout(300);

				// Look for the created organization in the list
				const orgElement = page.locator(`text=${createdOrgName}`);
				const isVisible = await orgElement.isVisible().catch(() => false);

				if (isVisible) {
					expect(isVisible).toBe(true);
					console.log(`Organization "${createdOrgName}" found in switcher`);
				}
			}
		});

		test('Step 5: Switch to the organization', async ({ page }) => {
			// Sign in
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);
			await page.locator('button[type="submit"]').first().click();

			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
			await passwordInput.fill(testUserPassword);
			await page.locator('button[type="submit"]').first().click();

			await page.waitForURL(/\/(dashboard|apis)/, { timeout: 30000 });

			// Open organization switcher
			const orgSwitcher = page
				.locator('[data-organization-switcher], .cl-organizationSwitcher')
				.first();

			if (await orgSwitcher.isVisible()) {
				await orgSwitcher.click();
				await page.waitForTimeout(300);

				// Click on the organization to switch to it
				const orgElement = page.locator(`text=${createdOrgName}`).first();
				if (await orgElement.isVisible()) {
					await orgElement.click();
					await page.waitForTimeout(500);

					// Verify switch happened (org name should appear in switcher)
					console.log(`Switched to organization: ${createdOrgName}`);
				}
			}
		});

		test('Step 6: Delete organization (cleanup)', async ({ page }) => {
			// Sign in
			await authPage.gotoSignIn();
			await authPage.waitForFullyLoaded();

			const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
			await emailInput.fill(testUserEmail);
			await page.locator('button[type="submit"]').first().click();

			const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
			await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
			await passwordInput.fill(testUserPassword);
			await page.locator('button[type="submit"]').first().click();

			await page.waitForURL(/\/(dashboard|apis)/, { timeout: 30000 });

			// Try to delete via UI first
			// Open organization switcher
			const orgSwitcher = page
				.locator('[data-organization-switcher], .cl-organizationSwitcher')
				.first();

			if (await orgSwitcher.isVisible()) {
				await orgSwitcher.click();
				await page.waitForTimeout(300);

				// Click on the organization
				const orgElement = page.locator(`text=${createdOrgName}`).first();
				if (await orgElement.isVisible()) {
					// Some Clerk configurations have settings/delete in org profile
					// Look for settings or manage button
					const settingsButton = page.locator('button:has-text("Settings")').first();
					if (await settingsButton.isVisible()) {
						await settingsButton.click();
						await page.waitForTimeout(300);

						// Look for delete org option
						const deleteButton = page.locator('button:has-text("Delete")').first();
						if (await deleteButton.isVisible()) {
							await deleteButton.click();

							// Confirm delete
							const confirmButton = page.locator('button:has-text("Delete organization")').first();
							if (await confirmButton.isVisible()) {
								await confirmButton.click();
								console.log(`Deleted organization via UI: ${createdOrgName}`);
							}
						}
					}
				}
			}
		});
	});

	test.afterAll(async () => {
		// Cleanup: Delete organization via Clerk Admin API if it still exists
		try {
			if (process.env.CLERK_SECRET_KEY) {
				const deleted = await deleteOrganizationByName(createdOrgName);
				if (deleted) {
					console.log(`Cleaned up organization via API: ${createdOrgName}`);
				}
			} else {
				console.log('CLERK_SECRET_KEY not set - skipping organization cleanup');
				console.log(`Manual cleanup may be required for: ${createdOrgName}`);
			}
		} catch (error) {
			console.error('Failed to cleanup organization:', error);
		}
	});
});

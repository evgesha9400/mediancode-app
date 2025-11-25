/**
 * Dashboard Page Integration Tests
 *
 * Integration tests that verify the dashboard page's data layer works correctly.
 * These tests import and test the actual store functions used by the dashboard,
 * ensuring the stat card values are calculated correctly.
 *
 * Location mirrors: src/routes/dashboard/+page.svelte
 */

import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
	fieldsStore,
	getTotalFieldCount,
	getTotalApiCount
} from '$lib/stores/fields';
import { validatorsStore, getTotalValidatorCount } from '$lib/stores/validators';

describe('Dashboard Page - Store Integration', () => {
	describe('Stat Card Data Sources', () => {
		it('getTotalFieldCount returns count from fieldsStore', () => {
			const storeFields = get(fieldsStore);
			const totalCount = getTotalFieldCount();

			expect(totalCount).toBe(storeFields.length);
			expect(totalCount).toBeGreaterThan(0);
		});

		it('getTotalValidatorCount returns combined inline and custom count', () => {
			const totalCount = getTotalValidatorCount();
			const storeValidators = get(validatorsStore);

			// Store has all validators with usage info
			expect(storeValidators.length).toBe(totalCount);
			expect(totalCount).toBeGreaterThan(0);
		});

		it('getTotalApiCount returns unique API count from field usage', () => {
			const totalApis = getTotalApiCount();
			const fields = get(fieldsStore);

			// Calculate expected count manually
			const uniqueApis = new Set<string>();
			fields.forEach((field) => {
				field.usedInApis.forEach((apiId) => {
					uniqueApis.add(apiId);
				});
			});

			expect(totalApis).toBe(uniqueApis.size);
		});
	});

	describe('Store Data Structure', () => {
		it('fieldsStore contains fields with required properties', () => {
			const fields = get(fieldsStore);

			expect(Array.isArray(fields)).toBe(true);
			expect(fields.length).toBeGreaterThan(0);

			fields.forEach((field) => {
				expect(field).toHaveProperty('id');
				expect(field).toHaveProperty('name');
				expect(field).toHaveProperty('type');
				expect(field).toHaveProperty('validators');
				expect(field).toHaveProperty('usedInApis');
				expect(Array.isArray(field.validators)).toBe(true);
				expect(Array.isArray(field.usedInApis)).toBe(true);
			});
		});

		it('validatorsStore contains validators with usage info', () => {
			const validators = get(validatorsStore);

			expect(Array.isArray(validators)).toBe(true);
			expect(validators.length).toBeGreaterThan(0);

			validators.forEach((validator) => {
				expect(validator).toHaveProperty('name');
				expect(validator).toHaveProperty('category');
				expect(validator).toHaveProperty('type');
				expect(validator).toHaveProperty('usedInFields');
				expect(validator).toHaveProperty('fieldsUsingValidator');
				expect(typeof validator.usedInFields).toBe('number');
				expect(Array.isArray(validator.fieldsUsingValidator)).toBe(true);
			});
		});

		it('field names are unique in store', () => {
			const fields = get(fieldsStore);
			const names = fields.map((f) => f.name);
			const uniqueNames = new Set(names);

			expect(uniqueNames.size).toBe(names.length);
		});

		it('field IDs are unique in store', () => {
			const fields = get(fieldsStore);
			const ids = fields.map((f) => f.id);
			const uniqueIds = new Set(ids);

			expect(uniqueIds.size).toBe(ids.length);
		});
	});

	describe('Validator Categories', () => {
		it('validators have valid category values', () => {
			const validators = get(validatorsStore);
			const validCategories = ['string', 'numeric', 'collection'];

			validators.forEach((validator) => {
				expect(validCategories).toContain(validator.category);
			});
		});

		it('validators have valid type values', () => {
			const validators = get(validatorsStore);
			const validTypes = ['inline', 'custom'];

			validators.forEach((validator) => {
				expect(validTypes).toContain(validator.type);
			});
		});

		it('inline validators exist in store', () => {
			const validators = get(validatorsStore);
			const inlineValidators = validators.filter((v) => v.type === 'inline');

			expect(inlineValidators.length).toBeGreaterThan(0);
		});

		it('custom validators exist in store', () => {
			const validators = get(validatorsStore);
			const customValidators = validators.filter((v) => v.type === 'custom');

			expect(customValidators.length).toBeGreaterThan(0);
		});
	});

	describe('Validator-Field Relationship', () => {
		it('validators track which fields use them', () => {
			const validators = get(validatorsStore);
			const fields = get(fieldsStore);

			// Find a validator that's used by at least one field
			const usedValidator = validators.find((v) => v.usedInFields > 0);

			if (usedValidator) {
				// Verify the field count matches
				expect(usedValidator.fieldsUsingValidator.length).toBe(usedValidator.usedInFields);

				// Verify each field actually has this validator
				usedValidator.fieldsUsingValidator.forEach((fieldRef) => {
					const field = fields.find((f) => f.id === fieldRef.fieldId);
					expect(field).toBeDefined();
					if (field) {
						const hasValidator = field.validators.some((v) => v.name === usedValidator.name);
						expect(hasValidator).toBe(true);
					}
				});
			}
		});
	});

	describe('Dashboard Expected Values', () => {
		it('provides expected initial field count for stat card', () => {
			// Dashboard shows this value in "Total Fields" stat card
			const fieldCount = getTotalFieldCount();
			expect(fieldCount).toBe(10); // Based on initialFields in fields.ts
		});

		it('provides expected initial validator count for stat card', () => {
			// Dashboard shows this value in "Validators" stat card
			const validatorCount = getTotalValidatorCount();
			expect(validatorCount).toBe(14); // 11 inline + 3 custom
		});

		it('provides expected initial API count for stat card', () => {
			// Dashboard shows this value in "Active APIs" stat card
			// Initial fields have empty usedInApis arrays
			const apiCount = getTotalApiCount();
			expect(apiCount).toBe(0);
		});
	});
});

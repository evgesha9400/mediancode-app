/**
 * Dashboard Page Integration Tests
 *
 * Integration tests that verify the dashboard page's data layer works correctly.
 * These tests import and test the actual store functions used by the dashboard,
 * ensuring the stat card values are calculated correctly.
 *
 * Location mirrors: src/routes/dashboard/+page.svelte
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	fieldsStore,
	getTotalFieldCount,
	getTotalApiCount
} from '$lib/stores/fields';
import { fieldConstraintsStore, getTotalFieldConstraintCount } from '$lib/stores/fieldConstraints';
import {
	initialFields,
	initialFieldConstraints
} from '../../../fixtures/seedData';
import type { FieldConstraint } from '$lib/stores/fieldConstraints';

// Helper to transform FieldConstraintBase to FieldConstraint with usage count
function createFieldConstraintWithUsage(
	base: typeof initialFieldConstraints[0],
	fields: typeof initialFields
): FieldConstraint {
	const usedInFields = fields.filter(f => f.constraints.some(c => c.name === base.name)).length;

	return {
		...base,
		usedInFields
	};
}

describe('Dashboard Page - Store Integration', () => {
	// Set up stores with initial fixture data before each test
	beforeEach(() => {
		// Populate fields store
		fieldsStore.set([...initialFields]);

		// Populate field constraints store with usage info calculated from fields
		const fieldConstraintsWithUsage = initialFieldConstraints.map(base =>
			createFieldConstraintWithUsage(base, initialFields)
		);
		fieldConstraintsStore.set(fieldConstraintsWithUsage);
	});

	describe('Stat Card Data Sources', () => {
		it('getTotalFieldCount returns count from fieldsStore', () => {
			const storeFields = get(fieldsStore);
			const totalCount = getTotalFieldCount();

			expect(totalCount).toBe(storeFields.length);
			expect(totalCount).toBeGreaterThan(0);
		});

		it('getTotalFieldConstraintCount returns combined field constraint count', () => {
			const totalCount = getTotalFieldConstraintCount();
			const storeFieldConstraints = get(fieldConstraintsStore);

			// Store has all field constraints with usage info
			expect(storeFieldConstraints.length).toBe(totalCount);
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
				expect(field).toHaveProperty('constraints');
				expect(field).toHaveProperty('usedInApis');
				expect(Array.isArray(field.constraints)).toBe(true);
				expect(Array.isArray(field.usedInApis)).toBe(true);
			});
		});

		it('fieldConstraintsStore contains field constraints with usage info', () => {
			const fieldConstraints = get(fieldConstraintsStore);

			expect(Array.isArray(fieldConstraints)).toBe(true);
			expect(fieldConstraints.length).toBeGreaterThan(0);

			fieldConstraints.forEach((fc) => {
				expect(fc).toHaveProperty('name');
				expect(fc).toHaveProperty('parameterTypes');
				expect(fc).toHaveProperty('compatibleTypes');
				expect(fc).toHaveProperty('usedInFields');
				expect(typeof fc.usedInFields).toBe('number');
				expect(Array.isArray(fc.compatibleTypes)).toBe(true);
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

	describe('Field Constraint Properties', () => {
		it('field constraints have valid parameterTypes arrays', () => {
			const fieldConstraints = get(fieldConstraintsStore);

			fieldConstraints.forEach((fc) => {
				expect(Array.isArray(fc.parameterTypes)).toBe(true);
				expect(fc.parameterTypes.length).toBeGreaterThan(0);
			});
		});

		it('field constraints have compatibleTypes arrays', () => {
			const fieldConstraints = get(fieldConstraintsStore);

			fieldConstraints.forEach((fc) => {
				expect(Array.isArray(fc.compatibleTypes)).toBe(true);
				expect(fc.compatibleTypes.length).toBeGreaterThan(0);
			});
		});
	});

	describe('FieldConstraint-Field Relationship', () => {
		it('field constraints track usage count matching actual field references', () => {
			const fieldConstraints = get(fieldConstraintsStore);
			const fields = get(fieldsStore);

			// Find a field constraint that's used by at least one field
			const usedFieldConstraint = fieldConstraints.find((fc) => fc.usedInFields > 0);

			if (usedFieldConstraint) {
				// Verify the usage count matches actual field references
				const actualFieldsUsing = fields.filter(f =>
					f.constraints.some(c => c.name === usedFieldConstraint.name)
				);
				expect(usedFieldConstraint.usedInFields).toBe(actualFieldsUsing.length);
			}
		});
	});

	describe('Dashboard Expected Values', () => {
		it('provides expected initial field count for stat card', () => {
			// Dashboard shows this value in "Fields" stat card
			const fieldCount = getTotalFieldCount();
			expect(fieldCount).toBe(13); // 10 global + 3 user namespace fields
		});

		it('provides expected initial field constraint count for stat card', () => {
			// Dashboard shows this value in "Field Constraints" stat card
			const fieldConstraintCount = getTotalFieldConstraintCount();
			expect(fieldConstraintCount).toBe(8); // 8 field constraints (email_format and url_format removed)
		});

		it('provides expected initial API count for stat card', () => {
			// Dashboard shows this value in "Generated APIs" stat card
			// Fields reference 3 unique APIs: api-1, api-2, api-3
			const apiCount = getTotalApiCount();
			expect(apiCount).toBe(3);
		});
	});
});

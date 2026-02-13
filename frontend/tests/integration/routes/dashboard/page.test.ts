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
import { constraintsStore, getTotalConstraintCount } from '$lib/stores/constraints';
import {
	initialFields,
	initialConstraints
} from '$lib/stores/initialData';
import type { Constraint } from '$lib/stores/constraints';

// Helper to transform ConstraintBase to Constraint with usage info
function createConstraintWithUsage(
	base: typeof initialConstraints[0],
	fields: typeof initialFields
): Constraint {
	const fieldsUsingConstraint = fields
		.filter(f => f.constraints.some(c => c.name === base.name))
		.map(f => ({ name: f.name, fieldId: f.id }));

	return {
		...base,
		usedInFields: fieldsUsingConstraint.length,
		fieldsUsingConstraint
	};
}

describe('Dashboard Page - Store Integration', () => {
	// Set up stores with initial fixture data before each test
	beforeEach(() => {
		// Populate fields store
		fieldsStore.set([...initialFields]);

		// Populate constraints store with usage info calculated from fields
		const constraintsWithUsage = initialConstraints.map(base =>
			createConstraintWithUsage(base, initialFields)
		);
		constraintsStore.set(constraintsWithUsage);
	});

	describe('Stat Card Data Sources', () => {
		it('getTotalFieldCount returns count from fieldsStore', () => {
			const storeFields = get(fieldsStore);
			const totalCount = getTotalFieldCount();

			expect(totalCount).toBe(storeFields.length);
			expect(totalCount).toBeGreaterThan(0);
		});

		it('getTotalConstraintCount returns combined constraint count', () => {
			const totalCount = getTotalConstraintCount();
			const storeConstraints = get(constraintsStore);

			// Store has all constraints with usage info
			expect(storeConstraints.length).toBe(totalCount);
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

		it('constraintsStore contains constraints with usage info', () => {
			const constraints = get(constraintsStore);

			expect(Array.isArray(constraints)).toBe(true);
			expect(constraints.length).toBeGreaterThan(0);

			constraints.forEach((constraint) => {
				expect(constraint).toHaveProperty('name');
				expect(constraint).toHaveProperty('parameterType');
				expect(constraint).toHaveProperty('compatibleTypes');
				expect(constraint).toHaveProperty('usedInFields');
				expect(constraint).toHaveProperty('fieldsUsingConstraint');
				expect(typeof constraint.usedInFields).toBe('number');
				expect(Array.isArray(constraint.fieldsUsingConstraint)).toBe(true);
				expect(Array.isArray(constraint.compatibleTypes)).toBe(true);
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

	describe('Constraint Properties', () => {
		it('constraints have valid parameterType values', () => {
			const constraints = get(constraintsStore);

			constraints.forEach((constraint) => {
				expect(typeof constraint.parameterType).toBe('string');
				expect(constraint.parameterType.length).toBeGreaterThan(0);
			});
		});

		it('constraints have compatibleTypes arrays', () => {
			const constraints = get(constraintsStore);

			constraints.forEach((constraint) => {
				expect(Array.isArray(constraint.compatibleTypes)).toBe(true);
				expect(constraint.compatibleTypes.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Constraint-Field Relationship', () => {
		it('constraints track which fields use them', () => {
			const constraints = get(constraintsStore);
			const fields = get(fieldsStore);

			// Find a constraint that's used by at least one field
			const usedConstraint = constraints.find((c) => c.usedInFields > 0);

			if (usedConstraint) {
				// Verify the field count matches
				expect(usedConstraint.fieldsUsingConstraint.length).toBe(usedConstraint.usedInFields);

				// Verify each field actually has this constraint
				usedConstraint.fieldsUsingConstraint.forEach((fieldRef) => {
					const field = fields.find((f) => f.id === fieldRef.fieldId);
					expect(field).toBeDefined();
					if (field) {
						const hasConstraint = field.constraints.some((c) => c.name === usedConstraint.name);
						expect(hasConstraint).toBe(true);
					}
				});
			}
		});
	});

	describe('Dashboard Expected Values', () => {
		it('provides expected initial field count for stat card', () => {
			// Dashboard shows this value in "Fields" stat card
			const fieldCount = getTotalFieldCount();
			expect(fieldCount).toBe(13); // 10 global + 3 user namespace fields
		});

		it('provides expected initial constraint count for stat card', () => {
			// Dashboard shows this value in "Constraints" stat card
			const constraintCount = getTotalConstraintCount();
			expect(constraintCount).toBe(10); // All constraints from initialConstraints
		});

		it('provides expected initial API count for stat card', () => {
			// Dashboard shows this value in "Generated APIs" stat card
			// Fields reference 3 unique APIs: api-1, api-2, api-3
			const apiCount = getTotalApiCount();
			expect(apiCount).toBe(3);
		});
	});
});

/**
 * Validator Fixtures
 *
 * Mock field validators and model validators for testing.
 * Matches the FieldValidator and ModelValidator types from src/lib/types/index.ts.
 */

import type { FieldValidator, ModelValidator } from '$lib/types';

export const mockFieldValidators: FieldValidator[] = [
	{
		id: 'fv-001',
		namespaceId: '00000000-0000-0000-0000-000000000001',
		name: 'String Cleanup',
		description: 'Strip whitespace, lowercase, and optional length bounds',
		compatibleTypes: ['str'],
		mode: 'before',
		code: '    v = v.strip()\n    v = v.lower()\n    if len(v) > 255:\n        raise ValueError(\'Must be 255 characters or less\')\n    return v',
		usedInFields: 2,
		createdAt: '2026-01-15T10:00:00Z',
		updatedAt: '2026-01-15T10:00:00Z'
	},
	{
		id: 'fv-002',
		namespaceId: '00000000-0000-0000-0000-000000000001',
		name: 'Email Format',
		description: 'Validate email format with regex and normalize',
		compatibleTypes: ['str'],
		mode: 'after',
		code: '    if not re.match(r\'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\', v):\n        raise ValueError(\'Invalid email format\')\n    v = v.lower().strip()\n    return v',
		usedInFields: 1,
		createdAt: '2026-01-16T10:00:00Z',
		updatedAt: '2026-01-16T10:00:00Z'
	},
	{
		id: 'fv-003',
		namespaceId: '00000000-0000-0000-0000-000000000001',
		name: 'Number Range',
		description: 'Ensure a number falls within min/max bounds',
		compatibleTypes: ['int', 'float'],
		mode: 'after',
		code: '    if v < 0:\n        raise ValueError(\'Must be greater than or equal to 0\')\n    if v > 1000:\n        raise ValueError(\'Must be less than or equal to 1000\')\n    return v',
		usedInFields: 0,
		createdAt: '2026-01-17T10:00:00Z',
		updatedAt: '2026-01-17T10:00:00Z'
	}
];

/**
 * Get a field validator by ID
 */
export function getFieldValidatorById(id: string): FieldValidator | undefined {
	return mockFieldValidators.find(fv => fv.id === id);
}

/**
 * Get a field validator by name
 */
export function getFieldValidatorByName(name: string): FieldValidator | undefined {
	return mockFieldValidators.find(fv => fv.name === name);
}

/**
 * Get field validators by mode
 */
export function getFieldValidatorsByMode(mode: 'before' | 'after'): FieldValidator[] {
	return mockFieldValidators.filter(fv => fv.mode === mode);
}

// ============================================================================
// Model Validator Fixtures
// ============================================================================

export const mockModelValidators: ModelValidator[] = [
	{
		id: 'mv-001',
		namespaceId: '00000000-0000-0000-0000-000000000001',
		name: 'Date Range Check',
		description: 'Ensure end_date is after start_date',
		requiredFields: ['start_date', 'end_date'],
		mode: 'after',
		code: '    if self.end_date <= self.start_date:\n        raise ValueError(\'end_date must be after start_date\')\n    return self',
		usedInObjects: 2,
		createdAt: '2026-01-20T10:00:00Z',
		updatedAt: '2026-01-20T10:00:00Z'
	},
	{
		id: 'mv-002',
		namespaceId: '00000000-0000-0000-0000-000000000001',
		name: 'Company Fields Required',
		description: 'If company_name is set, company_id is required',
		requiredFields: ['company_name', 'company_id'],
		mode: 'after',
		code: '    if self.company_name and not self.company_id:\n        raise ValueError(\'company_id is required when company_name is provided\')\n    return self',
		usedInObjects: 1,
		createdAt: '2026-01-21T10:00:00Z',
		updatedAt: '2026-01-21T10:00:00Z'
	},
	{
		id: 'mv-003',
		namespaceId: '00000000-0000-0000-0000-000000000001',
		name: 'Discount Validation',
		description: 'Validate discount code and amount consistency',
		requiredFields: ['discount_code', 'discount_amount', 'total'],
		mode: 'after',
		code: '    if self.discount_code and self.discount_amount > self.total:\n        raise ValueError(\'Discount amount cannot exceed total\')\n    return self',
		usedInObjects: 0,
		createdAt: '2026-01-22T10:00:00Z',
		updatedAt: '2026-01-22T10:00:00Z'
	}
];

/**
 * Get a model validator by ID
 */
export function getModelValidatorById(id: string): ModelValidator | undefined {
	return mockModelValidators.find(mv => mv.id === id);
}

/**
 * Get a model validator by name
 */
export function getModelValidatorByName(name: string): ModelValidator | undefined {
	return mockModelValidators.find(mv => mv.name === name);
}

/**
 * Get model validators by mode
 */
export function getModelValidatorsByMode(mode: 'before' | 'after'): ModelValidator[] {
	return mockModelValidators.filter(mv => mv.mode === mode);
}

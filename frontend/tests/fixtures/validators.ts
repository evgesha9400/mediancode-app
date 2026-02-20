/**
 * Field Validator Fixtures
 *
 * Mock field validators for testing field validator features.
 * Matches the FieldValidator type from src/lib/types/index.ts.
 */

import type { FieldValidator } from '$lib/types';

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

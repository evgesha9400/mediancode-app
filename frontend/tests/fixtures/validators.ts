/**
 * Validator Fixtures
 *
 * Mock validators for testing validator-related features.
 *
 * Note: When src/lib/stores/initialData.ts is created for the validators
 * feature, this file should be updated to import from that centralized module
 * to ensure consistency between runtime stores and test fixtures.
 */

export interface ValidatorBase {
	id: string;
	name: string;
	description: string;
	type: 'string' | 'numeric';
	category: 'inline' | 'custom';
	parameterType: string;
	docsUrl?: string;
	exampleUsage?: string;
}

export interface Validator extends ValidatorBase {
	usedInFields: number;
	fieldsUsingValidator: Array<{ name: string; fieldId: string }>;
}

/**
 * Mock inline validators (built-in Pydantic field validators)
 */
export const mockInlineValidators: ValidatorBase[] = [
	{
		id: 'v-001',
		name: 'min_length',
		description: 'Minimum string length',
		type: 'string',
		category: 'inline',
		parameterType: 'int',
		docsUrl: 'https://docs.pydantic.dev/latest/concepts/fields/#string-constraints',
		exampleUsage: 'Field(min_length=1)'
	},
	{
		id: 'v-002',
		name: 'max_length',
		description: 'Maximum string length',
		type: 'string',
		category: 'inline',
		parameterType: 'int',
		docsUrl: 'https://docs.pydantic.dev/latest/concepts/fields/#string-constraints',
		exampleUsage: 'Field(max_length=255)'
	},
	{
		id: 'v-003',
		name: 'pattern',
		description: 'Regex pattern for string validation',
		type: 'string',
		category: 'inline',
		parameterType: 'str',
		docsUrl: 'https://docs.pydantic.dev/latest/concepts/fields/#string-constraints',
		exampleUsage: "Field(pattern=r'^[a-z]+$')"
	},
	{
		id: 'v-004',
		name: 'ge',
		description: 'Greater than or equal to',
		type: 'numeric',
		category: 'inline',
		parameterType: 'int | float',
		docsUrl: 'https://docs.pydantic.dev/latest/concepts/fields/#numeric-constraints',
		exampleUsage: 'Field(ge=0)'
	},
	{
		id: 'v-005',
		name: 'le',
		description: 'Less than or equal to',
		type: 'numeric',
		category: 'inline',
		parameterType: 'int | float',
		docsUrl: 'https://docs.pydantic.dev/latest/concepts/fields/#numeric-constraints',
		exampleUsage: 'Field(le=100)'
	}
];

/**
 * Mock custom validators (user-defined)
 */
export const mockCustomValidators: ValidatorBase[] = [
	{
		id: 'v-100',
		name: 'email_format',
		description: 'Validates email format using regex',
		type: 'string',
		category: 'custom',
		parameterType: 'None',
		exampleUsage: '@field_validator("email")'
	},
	{
		id: 'v-101',
		name: 'positive_number',
		description: 'Ensures value is a positive number',
		type: 'numeric',
		category: 'custom',
		parameterType: 'None',
		exampleUsage: '@field_validator("amount")'
	}
];

export const mockValidatorBases: ValidatorBase[] = [...mockInlineValidators, ...mockCustomValidators];

export const mockValidators: Validator[] = mockValidatorBases.map((base, index) => ({
	...base,
	usedInFields: index % 2 === 0 ? 3 : 1,
	fieldsUsingValidator:
		index % 2 === 0
			? [
					{ name: 'email', fieldId: '10000000-0000-0000-0000-000000000001' },
					{ name: 'username', fieldId: '10000000-0000-0000-0000-000000000002' },
					{ name: 'password', fieldId: '10000000-0000-0000-0000-000000000003' }
				]
			: [{ name: 'username', fieldId: '10000000-0000-0000-0000-000000000002' }]
}));

/**
 * Get a validator by name
 */
export function getValidatorByName(name: string): Validator | undefined {
	return mockValidators.find((validator) => validator.name === name);
}

/**
 * Get validators by type
 */
export function getValidatorsByType(
	type: 'string' | 'numeric'
): Validator[] {
	return mockValidators.filter((validator) => validator.type === type);
}

/**
 * Get validators by category
 */
export function getValidatorsByCategory(category: 'inline' | 'custom'): Validator[] {
	return mockValidators.filter((validator) => validator.category === category);
}

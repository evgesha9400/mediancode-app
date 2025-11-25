/**
 * Type Fixtures
 * 
 * Mock type definitions for testing type-related features.
 * Based on src/lib/stores/types.ts
 */

export type PrimitiveTypeName = 'str' | 'int' | 'float' | 'bool' | 'datetime' | 'uuid';
export type AbstractTypeName = 'numeric' | 'collection';
export type TypeName = PrimitiveTypeName | AbstractTypeName;

export interface TypeBase {
	name: TypeName;
	category: 'primitive' | 'abstract';
	pythonType: string;
	description: string;
	validatorCategories: string[];
}

export interface FieldType extends TypeBase {
	usedInFields: number;
}

export const mockPrimitiveTypes: TypeBase[] = [
	{
		name: 'str',
		category: 'primitive',
		pythonType: 'str',
		description: 'String type for text data',
		validatorCategories: ['string']
	},
	{
		name: 'int',
		category: 'primitive',
		pythonType: 'int',
		description: 'Integer type for whole numbers',
		validatorCategories: ['numeric']
	},
	{
		name: 'float',
		category: 'primitive',
		pythonType: 'float',
		description: 'Float type for decimal numbers',
		validatorCategories: ['numeric']
	},
	{
		name: 'bool',
		category: 'primitive',
		pythonType: 'bool',
		description: 'Boolean type for true/false values',
		validatorCategories: []
	},
	{
		name: 'datetime',
		category: 'primitive',
		pythonType: 'datetime',
		description: 'Datetime type for date and time values',
		validatorCategories: []
	},
	{
		name: 'uuid',
		category: 'primitive',
		pythonType: 'UUID',
		description: 'UUID type for unique identifiers',
		validatorCategories: []
	}
];

export const mockAbstractTypes: TypeBase[] = [
	{
		name: 'numeric',
		category: 'abstract',
		pythonType: 'int | float',
		description: 'Abstract numeric type (int or float)',
		validatorCategories: ['numeric']
	},
	{
		name: 'collection',
		category: 'abstract',
		pythonType: 'List | Set | Dict',
		description: 'Abstract collection type',
		validatorCategories: ['collection']
	}
];

export const mockTypes: TypeBase[] = [...mockPrimitiveTypes, ...mockAbstractTypes];

export const mockFieldTypes: FieldType[] = mockTypes.map((type, index) => ({
	...type,
	usedInFields: index % 3 === 0 ? 5 : index % 2 === 0 ? 2 : 0
}));

/**
 * Get a type by name
 */
export function getTypeByName(name: TypeName): TypeBase | undefined {
	return mockTypes.find((type) => type.name === name);
}

/**
 * Get types by category
 */
export function getTypesByCategory(category: 'primitive' | 'abstract'): TypeBase[] {
	return mockTypes.filter((type) => type.category === category);
}

/**
 * Type Fixtures
 * 
 * Mock type definitions for testing type-related features.
 * Based on src/lib/stores/types.ts
 */

export type PrimitiveTypeName = 'str' | 'int' | 'float' | 'bool' | 'datetime' | 'uuid';
export type AbstractTypeName = 'numeric';
export type TypeName = PrimitiveTypeName | AbstractTypeName;

export interface TypeBase {
	id: string;
	name: TypeName;
	category: 'primitive' | 'abstract';
	pythonType: string;
	description: string;
	compatibleTypes: string[];
}

export interface FieldType extends TypeBase {
	usedInFields: number;
}

export const mockPrimitiveTypes: TypeBase[] = [
	{
		id: '00000000-0000-0000-0001-000000000001',
		name: 'str',
		category: 'primitive',
		pythonType: 'str',
		description: 'String type for text data',
		compatibleTypes: ['string']
	},
	{
		id: '00000000-0000-0000-0001-000000000002',
		name: 'int',
		category: 'primitive',
		pythonType: 'int',
		description: 'Integer type for whole numbers',
		compatibleTypes: ['numeric']
	},
	{
		id: '00000000-0000-0000-0001-000000000003',
		name: 'float',
		category: 'primitive',
		pythonType: 'float',
		description: 'Float type for decimal numbers',
		compatibleTypes: ['numeric']
	},
	{
		id: '00000000-0000-0000-0001-000000000004',
		name: 'bool',
		category: 'primitive',
		pythonType: 'bool',
		description: 'Boolean type for true/false values',
		compatibleTypes: []
	},
	{
		id: '00000000-0000-0000-0001-000000000005',
		name: 'datetime',
		category: 'primitive',
		pythonType: 'datetime',
		description: 'Datetime type for date and time values',
		compatibleTypes: []
	},
	{
		id: '00000000-0000-0000-0001-000000000006',
		name: 'uuid',
		category: 'primitive',
		pythonType: 'UUID',
		description: 'UUID type for unique identifiers',
		compatibleTypes: []
	}
];

export const mockAbstractTypes: TypeBase[] = [
	{
		id: '00000000-0000-0000-0001-000000000007',
		name: 'numeric',
		category: 'abstract',
		pythonType: 'int | float',
		description: 'Abstract numeric type (int or float)',
		compatibleTypes: ['numeric']
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

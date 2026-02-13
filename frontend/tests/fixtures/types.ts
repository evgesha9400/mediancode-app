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
	pythonType: string;
	description: string;
	importPath: string | null;
	parentTypeId: string | null;
}

export interface FieldType extends TypeBase {
	usedInFields: number;
}

export const mockPrimitiveTypes: TypeBase[] = [
	{
		id: '00000000-0000-0000-0001-000000000001',
		name: 'str',
		pythonType: 'str',
		description: 'String type for text data',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000002',
		name: 'int',
		pythonType: 'int',
		description: 'Integer type for whole numbers',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000003',
		name: 'float',
		pythonType: 'float',
		description: 'Float type for decimal numbers',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000004',
		name: 'bool',
		pythonType: 'bool',
		description: 'Boolean type for true/false values',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000005',
		name: 'datetime',
		pythonType: 'datetime',
		description: 'Datetime type for date and time values',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000006',
		name: 'uuid',
		pythonType: 'UUID',
		description: 'UUID type for unique identifiers',
		importPath: null,
		parentTypeId: null
	}
];

export const mockAbstractTypes: TypeBase[] = [
	{
		id: '00000000-0000-0000-0001-000000000007',
		name: 'numeric',
		pythonType: 'int | float',
		description: 'Abstract numeric type (int or float)',
		importPath: null,
		parentTypeId: null
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
 * Get primitive types (all types except abstract ones like 'numeric')
 */
export function getPrimitiveTypes(): TypeBase[] {
	return mockPrimitiveTypes;
}

/**
 * Get abstract types (like 'numeric')
 */
export function getAbstractTypes(): TypeBase[] {
	return mockAbstractTypes;
}

/**
 * Type Fixtures
 *
 * Mock type definitions for testing type-related features.
 * Based on src/lib/stores/types.ts
 */

import { GLOBAL_NAMESPACE_ID } from '../../src/lib/utils/namespace';

export type PrimitiveTypeName = 'str' | 'int' | 'float' | 'bool' | 'datetime' | 'uuid';
export type TypeName = PrimitiveTypeName;

export interface TypeBase {
	id: string;
	namespaceId: string;
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
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'str',
		pythonType: 'str',
		description: 'String type for text data',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000002',
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'int',
		pythonType: 'int',
		description: 'Integer type for whole numbers',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000003',
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'float',
		pythonType: 'float',
		description: 'Float type for decimal numbers',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000004',
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'bool',
		pythonType: 'bool',
		description: 'Boolean type for true/false values',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000005',
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'datetime',
		pythonType: 'datetime',
		description: 'Datetime type for date and time values',
		importPath: null,
		parentTypeId: null
	},
	{
		id: '00000000-0000-0000-0001-000000000006',
		namespaceId: GLOBAL_NAMESPACE_ID,
		name: 'uuid',
		pythonType: 'UUID',
		description: 'UUID type for unique identifiers',
		importPath: null,
		parentTypeId: null
	}
];

export const mockTypes: TypeBase[] = [...mockPrimitiveTypes];

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
 * Get primitive types
 */
export function getPrimitiveTypes(): TypeBase[] {
	return mockPrimitiveTypes;
}

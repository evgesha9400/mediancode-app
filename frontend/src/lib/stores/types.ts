import { writable, derived, get } from 'svelte/store';
import { fieldsStore } from './fields';
import type { Field } from './fields';
import { BUILTIN_TYPE_IDS } from './initialData';

export type PrimitiveTypeName = 'str' | 'int' | 'float' | 'bool' | 'datetime' | 'uuid';
export type AbstractTypeName = 'numeric';
export type TypeName = PrimitiveTypeName | AbstractTypeName;

export interface TypeBase {
	id: string;
	name: TypeName;
	category: 'primitive' | 'abstract';
	pythonType: string;
	description: string;
	compatibleTypes: string[]; // Compatible validator categories
}

export interface FieldType extends TypeBase {
	usedInFields: number;
}

const primitiveTypes: TypeBase[] = [
	{
		id: BUILTIN_TYPE_IDS.str,
		name: 'str',
		category: 'primitive',
		pythonType: 'str',
		description: 'String type for text data',
		compatibleTypes: ['string']
	},
	{
		id: BUILTIN_TYPE_IDS.int,
		name: 'int',
		category: 'primitive',
		pythonType: 'int',
		description: 'Integer type for whole numbers',
		compatibleTypes: ['numeric']
	},
	{
		id: BUILTIN_TYPE_IDS.float,
		name: 'float',
		category: 'primitive',
		pythonType: 'float',
		description: 'Float type for decimal numbers',
		compatibleTypes: ['numeric']
	},
	{
		id: BUILTIN_TYPE_IDS.bool,
		name: 'bool',
		category: 'primitive',
		pythonType: 'bool',
		description: 'Boolean type for true/false values',
		compatibleTypes: []
	},
	{
		id: BUILTIN_TYPE_IDS.datetime,
		name: 'datetime',
		category: 'primitive',
		pythonType: 'datetime',
		description: 'DateTime type for date and time values',
		compatibleTypes: []
	},
	{
		id: BUILTIN_TYPE_IDS.uuid,
		name: 'uuid',
		category: 'primitive',
		pythonType: 'UUID',
		description: 'UUID type for unique identifiers',
		compatibleTypes: []
	}
];

const abstractTypes: TypeBase[] = [
	{
		id: '00000000-0000-0000-0001-000000000007',
		name: 'numeric',
		category: 'abstract',
		pythonType: 'int | float',
		description: 'Abstract grouping for numeric types (int, float)',
		compatibleTypes: ['numeric']
	}
];

const allTypesBase: TypeBase[] = [...primitiveTypes, ...abstractTypes];

// Base store for type definitions (without usage data)
// Exported for the loader to populate with API data
export const typesBaseStore = writable<TypeBase[]>(allTypesBase);

// Derived store that calculates type usage dynamically based on fieldsStore
export const typesStore = derived(
	[typesBaseStore, fieldsStore],
	([$typesBase, $fields]) => {
		// Calculate usage for each type
		return $typesBase.map(typeBase => {
			let usedInFields = 0;

			// For primitive types, count direct usage
			if (typeBase.category === 'primitive') {
				usedInFields = $fields.filter(field => field.type === typeBase.name).length;
			}
			// For abstract types, count usage of all related primitive types
			else if (typeBase.category === 'abstract') {
				if (typeBase.name === 'numeric') {
					usedInFields = $fields.filter(field => field.type === 'int' || field.type === 'float').length;
				}
			}

			return {
				...typeBase,
				usedInFields
			} as FieldType;
		});
	}
);

export function getTotalTypeCount(): number {
	return allTypesBase.length;
}

export function getPrimitiveTypes(): FieldType[] {
	return get(typesStore).filter(t => t.category === 'primitive');
}

export function searchTypes(types: FieldType[], query: string): FieldType[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return types;
	}

	return types.filter(type =>
		type.name.toLowerCase().includes(lowerQuery) ||
		type.pythonType.toLowerCase().includes(lowerQuery) ||
		type.description.toLowerCase().includes(lowerQuery) ||
		type.category.toLowerCase().includes(lowerQuery)
	);
}

// Get validator categories compatible with a specific field type
export function getValidatorCategoriesForType(typeName: PrimitiveTypeName): string[] {
	const type = get(typesStore).find(t => t.name === typeName);
	return type?.compatibleTypes || [];
}

/**
 * Get the UUID for a type by its name.
 * Uses the types store data (populated from API) for the name -> UUID mapping.
 */
export function getTypeIdByName(typeName: PrimitiveTypeName): string | undefined {
	const type = get(typesStore).find(t => t.name === typeName && t.category === 'primitive');
	return type?.id;
}

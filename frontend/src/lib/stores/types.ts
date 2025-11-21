import { writable, derived, get } from 'svelte/store';
import { fieldsStore } from './fields';
import type { Field } from './fields';

export type PrimitiveTypeName = 'str' | 'int' | 'float' | 'bool' | 'datetime' | 'uuid';
export type AbstractTypeName = 'numeric' | 'collection';
export type TypeName = PrimitiveTypeName | AbstractTypeName;

export interface TypeBase {
	name: TypeName;
	category: 'primitive' | 'abstract';
	pythonType: string;
	description: string;
	validatorCategories: string[]; // Compatible validator categories
}

export interface FieldType extends TypeBase {
	usedInFields: number;
}

const primitiveTypes: TypeBase[] = [
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
		description: 'DateTime type for date and time values',
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

const abstractTypes: TypeBase[] = [
	{
		name: 'numeric',
		category: 'abstract',
		pythonType: 'int | float',
		description: 'Abstract grouping for numeric types (int, float)',
		validatorCategories: ['numeric']
	},
	{
		name: 'collection',
		category: 'abstract',
		pythonType: 'List | Set | Tuple',
		description: 'Abstract grouping for collection types (lists, arrays, sets)',
		validatorCategories: ['collection']
	}
];

const allTypesBase: TypeBase[] = [...primitiveTypes, ...abstractTypes];

// Base store for type definitions (without usage data)
const typesBaseStore = writable<TypeBase[]>(allTypesBase);

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
				} else if (typeBase.name === 'collection') {
					// Currently no collection types in fields, but ready for future expansion
					usedInFields = 0;
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

export function getAbstractTypes(): FieldType[] {
	return get(typesStore).filter(t => t.category === 'abstract');
}

export function getTypeByName(name: TypeName): FieldType | undefined {
	return get(typesStore).find(t => t.name === name);
}

export function searchTypes(query: string): FieldType[] {
	const lowerQuery = query.toLowerCase().trim();
	const types = get(typesStore);

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
	return type?.validatorCategories || [];
}

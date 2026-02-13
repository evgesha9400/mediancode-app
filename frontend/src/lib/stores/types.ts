import { writable, derived, get } from 'svelte/store';
import { fieldsStore } from './fields';
import { BUILTIN_TYPE_IDS } from './initialData';

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

/**
 * Static mapping from type name to compatible validator categories.
 * This relationship is inherent to Python types and does not change at runtime.
 */
const VALIDATOR_COMPATIBILITY: Record<string, string[]> = {
	str: ['string'],
	int: ['numeric'],
	float: ['numeric'],
	bool: [],
	datetime: [],
	uuid: [],
	numeric: ['numeric']
};

export interface FieldType extends TypeBase {
	usedInFields: number;
}

const primitiveTypes: TypeBase[] = [
	{
		id: BUILTIN_TYPE_IDS.str,
		name: 'str',
		pythonType: 'str',
		description: 'String type for text data',
		importPath: null,
		parentTypeId: null
	},
	{
		id: BUILTIN_TYPE_IDS.int,
		name: 'int',
		pythonType: 'int',
		description: 'Integer type for whole numbers',
		importPath: null,
		parentTypeId: null
	},
	{
		id: BUILTIN_TYPE_IDS.float,
		name: 'float',
		pythonType: 'float',
		description: 'Float type for decimal numbers',
		importPath: null,
		parentTypeId: null
	},
	{
		id: BUILTIN_TYPE_IDS.bool,
		name: 'bool',
		pythonType: 'bool',
		description: 'Boolean type for true/false values',
		importPath: null,
		parentTypeId: null
	},
	{
		id: BUILTIN_TYPE_IDS.datetime,
		name: 'datetime',
		pythonType: 'datetime',
		description: 'DateTime type for date and time values',
		importPath: null,
		parentTypeId: null
	},
	{
		id: BUILTIN_TYPE_IDS.uuid,
		name: 'uuid',
		pythonType: 'UUID',
		description: 'UUID type for unique identifiers',
		importPath: null,
		parentTypeId: null
	}
];

const abstractTypes: TypeBase[] = [
	{
		id: '00000000-0000-0000-0001-000000000007',
		name: 'numeric',
		pythonType: 'int | float',
		description: 'Abstract grouping for numeric types (int, float)',
		importPath: null,
		parentTypeId: null
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

			// For the abstract 'numeric' type, count usage of all related primitive types
			if (typeBase.name === 'numeric') {
				usedInFields = $fields.filter(field => field.type === 'int' || field.type === 'float').length;
			} else {
				// For all other types, count direct usage
				usedInFields = $fields.filter(field => field.type === typeBase.name).length;
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
	const primitiveNames: TypeName[] = ['str', 'int', 'float', 'bool', 'datetime', 'uuid'];
	return get(typesStore).filter(t => primitiveNames.includes(t.name));
}

export function searchTypes(types: FieldType[], query: string): FieldType[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return types;
	}

	return types.filter(type =>
		type.name.toLowerCase().includes(lowerQuery) ||
		type.pythonType.toLowerCase().includes(lowerQuery) ||
		type.description.toLowerCase().includes(lowerQuery)
	);
}

// Get validator categories compatible with a specific field type
export function getValidatorCategoriesForType(typeName: PrimitiveTypeName): string[] {
	return VALIDATOR_COMPATIBILITY[typeName] || [];
}

/**
 * Get the UUID for a type by its name.
 * Uses the types store data (populated from API) for the name -> UUID mapping.
 */
export function getTypeIdByName(typeName: PrimitiveTypeName): string | undefined {
	const type = get(typesStore).find(t => t.name === typeName);
	return type?.id;
}

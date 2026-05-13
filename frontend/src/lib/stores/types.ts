import { writable, derived, get } from 'svelte/store';
import { fieldsStore } from './fields';

export type PrimitiveTypeName = 'str' | 'int' | 'float' | 'bool' | 'datetime' | 'uuid';
export type TypeName = PrimitiveTypeName;

export interface TypeBase {
	id: string;
	namespaceId: string;
	name: string;
	pythonType: string;
	description: string;
	importPath: string | null;
	parentTypeId: string | null;
}

export interface FieldType extends TypeBase {
	usedInFields: number;
}

// Base store for type definitions (without usage data)
// Starts empty — populated by the loader with API data
export const typesBaseStore = writable<TypeBase[]>([]);

// Derived store that calculates type usage dynamically based on fieldsStore
export const typesStore = derived(
	[typesBaseStore, fieldsStore],
	([$typesBase, $fields]) => {
		// Calculate usage for each type
		return $typesBase.map(typeBase => ({
			...typeBase,
			usedInFields: $fields.filter(field => field.type === typeBase.name).length
		} as FieldType));
	}
);

export function getTotalTypeCount(): number {
	return get(typesBaseStore).length;
}

export function getPrimitiveTypes(): FieldType[] {
	const primitiveNames: string[] = ['str', 'int', 'float', 'bool', 'datetime', 'uuid'];
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

/**
 * Get the UUID for a type by its name.
 * Uses the types store data (populated from API) for the name -> UUID mapping.
 * Accepts any type name string (primitive or constrained).
 */
export function getTypeIdByName(typeName: string): string | undefined {
	const type = get(typesStore).find(t => t.name === typeName);
	return type?.id;
}

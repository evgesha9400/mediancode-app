// src/lib/stores/storeTypes.ts
//
// Shared store-produced types and frequently co-imported domain type re-exports.

import type {
	FieldConstraintBase,
	Field as DomainField,
	FieldConstraintValue,
	ObjectDefinition as DomainObjectDefinition
} from '$lib/types';

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

export interface FieldConstraint extends FieldConstraintBase {
	usedInFields: number;
}

export type Field = DomainField;
export type ObjectDefinition = DomainObjectDefinition;
export type { FieldConstraintValue };

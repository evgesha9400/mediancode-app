// src/lib/stores/storeSelectors.ts
//
// Search helpers, lookups, and aggregate selectors over the canonical stores.

import { get } from 'svelte/store';
import type {
	Api,
	ApiEndpoint,
	FieldValidatorTemplate,
	ModelValidatorTemplate,
	Namespace
} from '$lib/types';
import type { Field, FieldConstraint, FieldType, ObjectDefinition } from './storeTypes';
import {
	activeNamespaceId,
	apisStore,
	endpointsStore,
	fieldConstraintsStore,
	fieldValidatorTemplatesStore,
	fieldsStore,
	modelValidatorTemplatesStore,
	namespacesStore,
	objectsStore,
	typesBaseStore,
	typesStore
} from './storeState';

export function getApiById(id: string): Api | undefined {
	return get(apisStore).find((api) => api.id === id);
}

export function getApisByNamespace(namespaceId: string): Api[] {
	return get(apisStore).filter((api) => api.namespaceId === namespaceId);
}

export function searchApis(apis: Api[], query: string): Api[] {
	if (!query.trim()) return apis;
	const lowerQuery = query.toLowerCase();
	return apis.filter(
		(api) =>
			api.title.toLowerCase().includes(lowerQuery) ||
			api.description.toLowerCase().includes(lowerQuery) ||
			api.baseUrl.toLowerCase().includes(lowerQuery)
	);
}

export function getEndpointById(id: string): ApiEndpoint | undefined {
	return get(endpointsStore).find((endpoint) => endpoint.id === id);
}

export function getEndpointCountByApi(apiId: string): number {
	return get(endpointsStore).filter((endpoint) => endpoint.apiId === apiId).length;
}

export function getEndpointsByApi(apiId: string): ApiEndpoint[] {
	return get(endpointsStore).filter((endpoint) => endpoint.apiId === apiId);
}

export function getEndpointCountByTagName(apiId: string, tagName: string): number {
	return get(endpointsStore).filter(
		(endpoint) => endpoint.apiId === apiId && endpoint.tagName === tagName
	).length;
}

export function getTotalEndpointCount(): number {
	return get(endpointsStore).length;
}

export function getFieldById(id: string): Field | undefined {
	return get(fieldsStore).find((field) => field.id === id);
}

export function getTotalFieldCount(): number {
	return get(fieldsStore).length;
}

export function getFieldsByNamespace(namespaceId: string): Field[] {
	return get(fieldsStore).filter((field) => field.namespaceId === namespaceId);
}

export function getFieldCountByNamespace(namespaceId: string): number {
	return get(fieldsStore).filter((field) => field.namespaceId === namespaceId).length;
}

export function getTotalApiCount(): number {
	const uniqueApis = new Set<string>();
	get(fieldsStore).forEach((field) => {
		field.usedInApis.forEach((apiId) => uniqueApis.add(apiId));
	});
	return uniqueApis.size;
}

export function searchFields(fields: Field[], query: string): Field[] {
	const lowerQuery = query.toLowerCase().trim();
	if (!lowerQuery) return fields;
	return fields.filter(
		(field) =>
			field.name.toLowerCase().includes(lowerQuery) ||
			field.type.toLowerCase().includes(lowerQuery) ||
			(field.container && field.container.toLowerCase().includes(lowerQuery)) ||
			field.description?.toLowerCase().includes(lowerQuery) ||
			field.constraints.some((constraint) => constraint.name.toLowerCase().includes(lowerQuery))
	);
}

export function getObjectById(id: string): ObjectDefinition | undefined {
	return get(objectsStore).find((object) => object.id === id);
}

export function getTotalObjectCount(): number {
	return get(objectsStore).length;
}

export function getObjectsByNamespace(namespaceId: string): ObjectDefinition[] {
	return get(objectsStore).filter((object) => object.namespaceId === namespaceId);
}

export function getObjectCountByNamespace(namespaceId: string): number {
	return get(objectsStore).filter((object) => object.namespaceId === namespaceId).length;
}

export function searchObjects(objects: ObjectDefinition[], query: string): ObjectDefinition[] {
	const lowerQuery = query.toLowerCase().trim();
	if (!lowerQuery) return objects;
	return objects.filter(
		(object) =>
			object.name.toLowerCase().includes(lowerQuery) ||
			object.description?.toLowerCase().includes(lowerQuery)
	);
}

export function getNamespaceById(id: string): Namespace | undefined {
	return get(namespacesStore).find((namespace) => namespace.id === id);
}

export function getTotalNamespaceCount(): number {
	return get(namespacesStore).length;
}

export function searchNamespaces(namespaces: Namespace[], query: string): Namespace[] {
	const lowerQuery = query.toLowerCase().trim();
	if (!lowerQuery) return namespaces;
	return namespaces.filter(
		(namespace) =>
			namespace.name.toLowerCase().includes(lowerQuery) ||
			namespace.description?.toLowerCase().includes(lowerQuery)
	);
}

export function getNamespaceEntityCount(namespaceId: string): number {
	return getNamespaceEntityDetails(namespaceId).total;
}

export function getNamespaceEntityDetails(namespaceId: string): {
	fields: number;
	fieldConstraints: number;
	objects: number;
	endpoints: number;
	apis: number;
	total: number;
} {
	const fields = get(fieldsStore).filter((field) => field.namespaceId === namespaceId).length;
	const fieldConstraints = get(fieldConstraintsStore).filter(
		(constraint) => constraint.namespaceId === namespaceId
	).length;
	const objects = get(objectsStore).filter((object) => object.namespaceId === namespaceId).length;
	const namespaceApiIds = new Set(
		get(apisStore)
			.filter((api) => api.namespaceId === namespaceId)
			.map((api) => api.id)
	);
	const endpoints = get(endpointsStore).filter((endpoint) => namespaceApiIds.has(endpoint.apiId)).length;
	const apis = namespaceApiIds.size;
	return {
		fields,
		fieldConstraints,
		objects,
		endpoints,
		apis,
		total: fields + fieldConstraints + objects + endpoints + apis
	};
}

export function setActiveNamespace(namespaceId: string): void {
	if (getNamespaceById(namespaceId)) {
		activeNamespaceId.set(namespaceId);
	}
}

export function searchTypes(types: FieldType[], query: string): FieldType[] {
	const lowerQuery = query.toLowerCase().trim();
	if (!lowerQuery) return types;
	return types.filter(
		(type) =>
			type.name.toLowerCase().includes(lowerQuery) ||
			type.pythonType.toLowerCase().includes(lowerQuery) ||
			type.description.toLowerCase().includes(lowerQuery)
	);
}

export function getTypeIdByName(typeName: string): string | undefined {
	return get(typesStore).find((type) => type.name === typeName)?.id;
}

export function getTotalTypeCount(): number {
	return get(typesBaseStore).length;
}

export function getPrimitiveTypes(): FieldType[] {
	const primitiveNames: string[] = ['str', 'int', 'float', 'bool', 'datetime', 'uuid'];
	return get(typesStore).filter((type) => primitiveNames.includes(type.name));
}

export function searchFieldConstraints(
	fieldConstraints: FieldConstraint[],
	query: string
): FieldConstraint[] {
	const lowerQuery = query.toLowerCase().trim();
	if (!lowerQuery) return fieldConstraints;
	return fieldConstraints.filter(
		(fieldConstraint) =>
			fieldConstraint.name.toLowerCase().includes(lowerQuery) ||
			fieldConstraint.description.toLowerCase().includes(lowerQuery) ||
			fieldConstraint.parameterTypes.some((type) => type.toLowerCase().includes(lowerQuery)) ||
			fieldConstraint.compatibleTypes.some((type) => type.toLowerCase().includes(lowerQuery))
	);
}

export function getTotalFieldConstraintCount(): number {
	return get(fieldConstraintsStore).length;
}

export function addFieldConstraint(fieldConstraint: FieldConstraint): void {
	fieldConstraintsStore.update((constraints) => [...constraints, fieldConstraint]);
}

export function getFieldConstraintsByFieldType(fieldTypeName: string): FieldConstraint[] {
	return get(fieldConstraintsStore).filter((constraint) =>
		constraint.compatibleTypes.includes(fieldTypeName)
	);
}

export function searchFieldValidatorTemplates(
	templates: FieldValidatorTemplate[],
	query: string
): FieldValidatorTemplate[] {
	const lowerQuery = query.toLowerCase().trim();
	if (!lowerQuery) return templates;
	return templates.filter(
		(template) =>
			template.name.toLowerCase().includes(lowerQuery) ||
			template.description.toLowerCase().includes(lowerQuery) ||
			template.compatibleTypes.some((type) => type.toLowerCase().includes(lowerQuery))
	);
}

export function getFieldValidatorTemplateById(id: string): FieldValidatorTemplate | undefined {
	return get(fieldValidatorTemplatesStore).find((template) => template.id === id);
}

export function searchModelValidatorTemplates(
	templates: ModelValidatorTemplate[],
	query: string
): ModelValidatorTemplate[] {
	const lowerQuery = query.toLowerCase().trim();
	if (!lowerQuery) return templates;
	return templates.filter(
		(template) =>
			template.name.toLowerCase().includes(lowerQuery) ||
			template.description.toLowerCase().includes(lowerQuery)
	);
}

export function getModelValidatorTemplateById(id: string): ModelValidatorTemplate | undefined {
	return get(modelValidatorTemplatesStore).find((template) => template.id === id);
}

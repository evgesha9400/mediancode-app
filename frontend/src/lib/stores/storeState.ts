// src/lib/stores/storeState.ts
//
// Canonical writable and derived stores for catalog data.

import { writable, derived } from 'svelte/store';
import type {
	Api,
	ApiEndpoint,
	FieldValidatorTemplate,
	ModelValidatorTemplate,
	Namespace
} from '$lib/types';
import { GLOBAL_NAMESPACE_ID } from '$lib/utils/namespace';
import type { Field, FieldConstraint, FieldType, ObjectDefinition, TypeBase } from './storeTypes';

export const fieldsStore = writable<Field[]>([]);
export const objectsStore = writable<ObjectDefinition[]>([]);
export const apisStore = writable<Api[]>([]);
export const endpointsStore = writable<ApiEndpoint[]>([]);
export const namespacesStore = writable<Namespace[]>([]);
export const activeNamespaceId = writable<string>(GLOBAL_NAMESPACE_ID);
export const typesBaseStore = writable<TypeBase[]>([]);
export const fieldConstraintsStore = writable<FieldConstraint[]>([]);
export const fieldValidatorTemplatesStore = writable<FieldValidatorTemplate[]>([]);
export const modelValidatorTemplatesStore = writable<ModelValidatorTemplate[]>([]);

export const activeNamespace = derived(
	[namespacesStore, activeNamespaceId],
	([$namespaces, $activeId]) => $namespaces.find((ns) => ns.id === $activeId)
);

export const typesStore = derived(
	[typesBaseStore, fieldsStore],
	([$typesBase, $fields]) =>
		$typesBase.map(
			(typeBase) =>
				({
					...typeBase,
					usedInFields: $fields.filter((field) => field.type === typeBase.name).length
				}) as FieldType
		)
);

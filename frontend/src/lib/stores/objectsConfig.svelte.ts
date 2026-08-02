// src/lib/stores/objectsConfig.svelte.ts
//
// Entity contract for Objects — validation, payloads, and hooks.

import type { ObjectDefinition } from '$lib/types';
import type { EntityContract } from './crudModel.svelte';
import {
	createObjectApi,
	updateObjectApi,
	deleteObjectApi,
	type CreateObjectRequest,
	type UpdateObjectRequest
} from '$lib/api/objects';
import { objectsStore, fieldsStore, apisStore } from './stores';
import { buildDeletionTooltip, checkObjectDeletion } from '$lib/utils/references';
import { isValidPascalCaseName } from '$lib/utils/validation';
import { get } from 'svelte/store';
import {
	getObjectMembersForCreate,
	getObjectMembersForUpdate,
	validateObjectMembership
} from '$lib/domain/objectMembership';

// Extended object type with computed properties for sorting
type ObjectWithCounts = ObjectDefinition & {
	memberCount: number;
	usedInApisCount: number;
};

export function createObjectsContract(deps: {
	getActiveNamespaceId: () => string;
	afterCreate?: (object: ObjectDefinition) => void;
}): EntityContract<ObjectDefinition, CreateObjectRequest, UpdateObjectRequest> {
	return {
		entityLabel: 'Object',
		nameKey: 'name',
		store: objectsStore,

		listView: {
			numericColumns: new Set(['memberCount', 'usedInApisCount']),
			highlightParamKey: 'highlight',
			getItemId: (obj) => obj.id,
			deriveExtra: (obj) => ({
				memberCount: obj.members.length,
				usedInApisCount: obj.usedInApis.length
			}),
			sortColumnMap: { members: 'memberCount', usedInApis: 'usedInApisCount' },
			drawerConfig: { trackEdits: true, allowDelete: true, closeDelay: 300 }
		},

		validate(item): Record<string, string> {
			const errors: Record<string, string> = {};
			if (!item.name.trim()) {
				errors.name = 'Object name is required';
			} else if (!isValidPascalCaseName(item.name)) {
				errors.name = 'Must be PascalCase (e.g. UserEmail)';
			}

			return {
				...errors,
				...validateObjectMembership(item.members, {
					sourceObjectName: item.name,
					fieldsById: new Map(get(fieldsStore).map((field) => [field.id, field])),
					objectsById: new Map(get(objectsStore).map((object) => [object.id, object]))
				})
			};
		},

		immediateErrors(item, formErrors): Record<string, string> {
			if (!item.name.trim()) return {};
			if (!isValidPascalCaseName(item.name)) {
				return { name: formErrors.name };
			}
			return {};
		},

		createDraft: () => ({
			id: '',
			namespaceId: deps.getActiveNamespaceId(),
			name: '',
			description: '',
			members: [],
			derivedRelationships: [],
			validators: [],
			usedInApis: []
		}),

		toCreatePayload(item) {
			return {
				ok: true,
				data: {
					namespaceId: item.namespaceId,
					name: item.name,
					description: item.description,
					members: getObjectMembersForCreate(item.members),
					validators:
						item.validators.length > 0
							? item.validators.map((v) => ({
									templateId: v.templateId,
									parameters: v.parameters ?? undefined,
									fieldMappings: v.fieldMappings
								}))
							: undefined
				}
			};
		},

		toUpdatePayload(item) {
			const { memberCount, usedInApisCount, ...clean } = item as ObjectWithCounts;
			return {
				ok: true,
				data: {
					name: clean.name,
					description: clean.description,
					members: getObjectMembersForUpdate(clean.members),
					validators: clean.validators.map((v) => ({
						templateId: v.templateId,
						parameters: v.parameters ?? undefined,
						fieldMappings: v.fieldMappings
					}))
				}
			};
		},

		api: { create: createObjectApi, update: updateObjectApi, delete: deleteObjectApi },

		afterCreate: deps.afterCreate,

		deletionGuard(item) {
			const hasMultipleRefs = item.usedInApis.length > 1;
			return {
				canDelete: !hasMultipleRefs,
				tooltip: hasMultipleRefs
					? buildDeletionTooltip(
							'object',
							'API',
							item.usedInApis.map((apiId) => {
								const api = get(apisStore).find((a) => a.id === apiId);
								return { name: api?.title ?? apiId };
							})
						)
					: ''
			};
		},

		preDeleteCheck(item) {
			return checkObjectDeletion(item.name, item.usedInApis);
		}
	};
}

// src/lib/stores/objectsConfig.svelte.ts
//
// Entity contract for Objects — validation, payloads, and hooks.

import type { ObjectDefinition, ObjectMember } from '$lib/types';
import type { EntityContract } from './crudModel.svelte';
import {
	createObjectApi,
	updateObjectApi,
	deleteObjectApi,
	type CreateObjectRequest,
	type UpdateObjectRequest
} from '$lib/api/objects';
import { objectsStore, apisStore, getFieldById } from './stores';
import { buildDeletionTooltip, checkObjectDeletion } from '$lib/utils/references';
import { isValidPascalCaseName } from '$lib/utils/validation';
import { get } from 'svelte/store';

// Sentinel prefix for client-generated member ids. The drawer assigns these
// so DnD has a stable key; the backend must never see them (reconcile-by-id
// would silently drop them — see _reconcile_members in api/services/object.py).
export const TEMP_MEMBER_ID_PREFIX = 'tmp-';
export const newTempMemberId = (): string => TEMP_MEMBER_ID_PREFIX + crypto.randomUUID();
export const isTempMemberId = (id: string | undefined): boolean =>
	id?.startsWith(TEMP_MEMBER_ID_PREFIX) ?? false;

function stripTempMemberIds(members: ObjectMember[]): ObjectMember[] {
	return members.map(({ id, ...rest }) =>
		id && !isTempMemberId(id) ? ({ ...rest, id } as ObjectMember) : (rest as ObjectMember)
	);
}

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

			for (const member of item.members) {
				if (member.memberType !== 'field') continue;
				const field = getFieldById(member.fieldId);
				if (!field) continue;

				const fieldName = field.name;
				const fieldType = field.type;

				if (member.role === 'pk') {
					if (fieldType !== 'int' && fieldType !== 'uuid' && fieldType !== 'uuid.UUID') {
						errors[`field_${member.fieldId}_role`] =
							`Field "${fieldName}" (${fieldType}) cannot be a primary key — only int and uuid types are supported`;
					}
				} else if (
					member.role === 'created_timestamp' ||
					member.role === 'updated_timestamp'
				) {
					if (
						!['datetime', 'date', 'datetime.datetime', 'datetime.date'].includes(
							fieldType
						)
					) {
						errors[`field_${member.fieldId}_role`] =
							`Field "${fieldName}" (${fieldType}) cannot be a ${member.role === 'created_timestamp' ? 'created' : 'updated'} timestamp — only datetime and date types are supported`;
					}
				} else if (member.role === 'generated_uuid') {
					if (fieldType !== 'uuid' && fieldType !== 'uuid.UUID') {
						errors[`field_${member.fieldId}_role`] =
							`Field "${fieldName}" (${fieldType}) cannot be a generated UUID — only uuid types are supported`;
					}
				}
			}

			return errors;
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
					members: stripTempMemberIds(item.members).map(({ id: _id, ...rest }) => rest),
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
					members: stripTempMemberIds(clean.members),
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

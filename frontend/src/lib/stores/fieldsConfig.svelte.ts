// src/lib/stores/fieldsConfig.svelte.ts
//
// Entity contract for Fields — validation, payloads, and hooks.

import type { Field } from '$lib/types';
import type { EntityContract } from './crudModel.svelte';
import {
	createFieldApi,
	updateFieldApi,
	deleteFieldApi,
	type CreateFieldRequest,
	type UpdateFieldRequest
} from '$lib/api/fields';
import { fieldsStore, apisStore } from './stores';
import { buildDeletionTooltip, checkFieldDeletion } from '$lib/utils/references';
import { isValidSnakeCaseName } from '$lib/utils/validation';
import { get } from 'svelte/store';

export function createFieldsContract(deps: {
	getActiveNamespaceId: () => string;
	getDefaultType: () => string;
	getTypeIdByName: (name: string) => string | undefined;
	afterCreate?: (field: Field) => void;
}): EntityContract<Field, CreateFieldRequest, UpdateFieldRequest> {
	return {
		entityLabel: 'Field',
		nameKey: 'name',
		store: fieldsStore,

		listView: {
			numericColumns: new Set(['usedInApisCount']),
			highlightParamKey: 'highlight',
			getItemId: (f) => f.id,
			deriveExtra: (f) => ({ usedInApisCount: f.usedInApis.length }),
			sortColumnMap: { usedInApis: 'usedInApisCount' },
			drawerConfig: { trackEdits: true, allowDelete: true, closeDelay: 300 }
		},

		validate(item): Record<string, string> {
			const errors: Record<string, string> = {};
			if (!item.name.trim()) {
				errors.name = 'Field name is required';
			} else if (!isValidSnakeCaseName(item.name)) {
				errors.name = 'Must be snake_case (e.g. user_email)';
			}
			if (!item.type) errors.type = 'Type is required';
			const emptyParam = item.constraints.find((c) => c.value === null || c.value === '');
			if (emptyParam) errors.constraints = `Constraint "${emptyParam.name}" requires a value`;

			if (item.defaultValue && item.defaultValue !== 'None') {
				if (item.type === 'int' && !/^-?\d+$/.test(item.defaultValue)) {
					errors.defaultValue = 'Default value must be a whole number';
				}
				if (item.type === 'float' && !/^-?\d+(\.\d+)?$/.test(item.defaultValue)) {
					errors.defaultValue = 'Default value must be a number';
				}
			}
			return errors;
		},

		immediateErrors(item, formErrors): Record<string, string> {
			if (!item.name.trim()) return {};
			if (!isValidSnakeCaseName(item.name)) {
				return { name: formErrors.name };
			}
			return {};
		},

		createDraft: () => ({
			id: '',
			namespaceId: deps.getActiveNamespaceId(),
			name: '',
			type: deps.getDefaultType(),
			container: null,
			constraints: [],
			validators: [],
			usedInApis: [],
			description: '',
			defaultValue: ''
		}),

		toCreatePayload(item) {
			const typeId = deps.getTypeIdByName(item.type);
			if (!typeId) return { ok: false, error: `Unknown type "${item.type}"` };
			return {
				ok: true,
				data: {
					namespaceId: item.namespaceId,
					name: item.name,
					typeId,
					container: item.container,
					description: item.description,
					defaultValue: item.defaultValue,
					constraints: item.constraints.map((c) => ({
						constraintId: c.constraintId,
						value: c.value
					})),
					validators:
						item.validators.length > 0
							? item.validators.map((v) => ({
									templateId: v.templateId,
									parameters: v.parameters ?? undefined
								}))
							: undefined
				}
			};
		},

		toUpdatePayload(item) {
			const typeId = deps.getTypeIdByName(item.type);
			if (!typeId) return { ok: false, error: `Unknown type "${item.type}"` };
			return {
				ok: true,
				data: {
					name: item.name,
					typeId,
					container: item.container,
					description: item.description,
					defaultValue: item.defaultValue,
					constraints: item.constraints.map((c) => ({
						constraintId: c.constraintId,
						value: c.value
					})),
					validators: item.validators.map((v) => ({
						templateId: v.templateId,
						parameters: v.parameters ?? undefined
					}))
				}
			};
		},

		api: { create: createFieldApi, update: updateFieldApi, delete: deleteFieldApi },

		afterCreate: deps.afterCreate,

		deletionGuard(item) {
			const hasMultipleRefs = item.usedInApis.length > 1;
			return {
				canDelete: !hasMultipleRefs,
				tooltip: hasMultipleRefs
					? buildDeletionTooltip(
							'field',
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
			return checkFieldDeletion(item.name, item.usedInApis);
		}
	};
}

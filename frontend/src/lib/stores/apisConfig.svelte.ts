// src/lib/stores/apisConfig.svelte.ts
//
// Entity contract for APIs — validation, payloads, and hooks.

import type { Api } from '$lib/types';
import type { EntityContract } from './crudModel.svelte';
import {
	createApiApi,
	updateApiApi,
	deleteApiApi,
	type CreateApiRequest,
	type UpdateApiRequest
} from '$lib/api/apis';
import { apisStore, endpointsStore } from './stores';
import { isValidPascalCaseName } from '$lib/utils/validation';

export function createApisContract(deps: {
	getActiveNamespaceId: () => string;
	getEndpointCount: (apiId: string) => number;
	afterCreate?: (api: Api) => void;
}): EntityContract<Api, CreateApiRequest, UpdateApiRequest> {
	return {
		entityLabel: 'API',
		nameKey: 'title',
		store: apisStore,
		duplicateErrorKey: 'title',

		listView: {
			numericColumns: new Set(['endpointCount']),
			getItemId: (api) => api.id,
			deriveExtra: (api) => ({
				endpointCount: deps.getEndpointCount(api.id)
			}),
			sortColumnMap: { endpoints: 'endpointCount' },
			drawerConfig: { trackEdits: false, allowDelete: false }
		},

		validate(item) {
			const errors: Record<string, string> = {};
			if (!item.title.trim()) {
				errors.title = 'API title is required';
			} else if (!isValidPascalCaseName(item.title)) {
				errors.title = 'Must be PascalCase (e.g. UserApi)';
			}
			return errors;
		},

		immediateErrors(item, formErrors): Record<string, string> {
			if (!item.title.trim()) return {};
			if (!isValidPascalCaseName(item.title)) {
				return { title: formErrors.title };
			}
			return {};
		},

		createDraft: () => ({
			id: '',
			namespaceId: deps.getActiveNamespaceId(),
			title: '',
			version: '1.0.0',
			description: '',
			baseUrl: '/api/v1',
			serverUrl: '',
			createdAt: '',
			updatedAt: ''
		}),

		toCreatePayload(item) {
			return {
				ok: true,
				data: {
					namespaceId: item.namespaceId,
					title: item.title,
					version: item.version,
					description: item.description,
					serverUrl: item.serverUrl,
					baseUrl: item.baseUrl
				}
			};
		},

		toUpdatePayload(item) {
			return {
				ok: true,
				data: {
					title: item.title,
					version: item.version,
					description: item.description,
					serverUrl: item.serverUrl,
					baseUrl: item.baseUrl
				}
			};
		},

		api: { create: createApiApi, update: updateApiApi, delete: deleteApiApi },

		afterCreate: deps.afterCreate,

		afterDelete(deleted) {
			endpointsStore.update((endpoints) =>
				endpoints.filter((e) => e.apiId !== deleted.id)
			);
		}
	};
}

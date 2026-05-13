// src/lib/stores/namespacesConfig.svelte.ts
//
// Entity contract for Namespaces — validation, payloads, and hooks.

import type { Namespace } from '$lib/types';
import type { EntityContract } from './crudModel.svelte';
import {
	createNamespaceApi,
	updateNamespaceApi,
	deleteNamespaceApi,
	type CreateNamespaceRequest,
	type UpdateNamespaceRequest
} from '$lib/api/namespaces';
import {
	namespacesStore,
	activeNamespaceId,
	getNamespaceEntityCount,
	getNamespaceEntityDetails
} from './stores';
import { GLOBAL_NAMESPACE_ID } from '$lib/utils/namespace';
import { get } from 'svelte/store';
import { showToast } from './toasts';

export function createNamespacesContract(deps: {
	getNamespaceEntityDetails: (id: string) => {
		total: number;
		fields: number;
		fieldConstraints: number;
		objects: number;
		endpoints: number;
		apis?: number;
	};
}): EntityContract<Namespace, CreateNamespaceRequest, UpdateNamespaceRequest> {
	function propagateDefault(namespace: Namespace) {
		if (namespace.isDefault) {
			const current = get(namespacesStore);
			namespacesStore.set(
				current.map((ns) =>
					ns.id === namespace.id ? namespace : { ...ns, isDefault: false }
				)
			);
			activeNamespaceId.set(namespace.id);
		}
	}

	return {
		entityLabel: 'Namespace',
		nameKey: 'name',
		store: namespacesStore,

		listView: {
			numericColumns: new Set(['entityCount']),
			getItemId: (ns) => ns.id,
			deriveExtra: (ns) => {
				const details = deps.getNamespaceEntityDetails(ns.id);
				return {
					entityCount: details.total,
					fieldCount: details.fields,
					fieldConstraintCount: details.fieldConstraints,
					objectCount: details.objects,
					endpointCount: details.endpoints
				};
			},
			sortColumnMap: {},
			drawerConfig: { trackEdits: true, allowDelete: true, closeDelay: 300 }
		},

		validate(item): Record<string, string> {
			const errors: Record<string, string> = {};
			if (!item.name.trim()) errors.name = 'Namespace name is required';
			return errors;
		},

		createDraft: () => ({
			id: '',
			name: '',
			description: '',
			isDefault: false,
			locked: false
		}),

		toCreatePayload(item) {
			return {
				ok: true,
				data: {
					name: item.name,
					description: item.description,
					...(item.isDefault ? { isDefault: true } : {})
				}
			};
		},

		toUpdatePayload(item) {
			if (item.locked) {
				return {
					ok: true,
					data: { ...(item.isDefault ? { isDefault: true } : {}) }
				};
			}
			return {
				ok: true,
				data: {
					name: item.name,
					description: item.description,
					...(item.isDefault ? { isDefault: true } : {})
				}
			};
		},

		api: {
			create: createNamespaceApi,
			update: updateNamespaceApi,
			delete: deleteNamespaceApi
		},

		deletionGuard(item) {
			if (item.locked) {
				return { canDelete: false, tooltip: 'Cannot delete the Global namespace' };
			}
			if (item.isDefault) {
				return { canDelete: false, tooltip: 'Cannot delete the default namespace' };
			}
			const details = deps.getNamespaceEntityDetails(item.id);
			if (details.total > 0) {
				return {
					canDelete: false,
					tooltip: `Cannot delete: Contains ${details.total} entities`
				};
			}
			return { canDelete: true, tooltip: '' };
		},

		preDeleteCheck(item) {
			const entityCount = getNamespaceEntityCount(item.id);
			if (entityCount > 0) {
				const details = getNamespaceEntityDetails(item.id);
				const parts: string[] = [];
				if (details.fields > 0)
					parts.push(`${details.fields} field${details.fields > 1 ? 's' : ''}`);
				if (details.fieldConstraints > 0)
					parts.push(
						`${details.fieldConstraints} field constraint${details.fieldConstraints > 1 ? 's' : ''}`
					);
				if (details.objects > 0)
					parts.push(`${details.objects} object${details.objects > 1 ? 's' : ''}`);
				if (details.endpoints > 0)
					parts.push(
						`${details.endpoints} endpoint${details.endpoints > 1 ? 's' : ''}`
					);
				if (details.apis > 0)
					parts.push(`${details.apis} API${details.apis > 1 ? 's' : ''}`);
				return {
					success: false,
					error: `Cannot delete namespace "${item.name}" because it contains ${parts.join(', ')}. Remove all entities before deleting.`
				};
			}
			return { success: true };
		},

		afterSave: propagateDefault,
		afterCreate: propagateDefault,

		afterDelete(deleted) {
			if (get(activeNamespaceId) === deleted.id) {
				activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
			}
		}
	};
}

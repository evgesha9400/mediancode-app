// src/lib/stores/apiModel.svelte.ts
//
// Per-entity CRUD model for APIs — thin wrapper around createEntityModel.

import type { Page } from '@sveltejs/kit';
import type { Api, FilterConfig } from '$lib/types';
import { createEntityModel, type EntityModelState } from './entityModel.svelte';
import { createApiAction, updateApiAction, deleteApiAction } from '$lib/domain/mutations';
import {
	apiValidate,
	apiCreateDraft,
	apiToCreatePayload,
	apiToUpdatePayload,
	apiDeletionGuard,
	type ApiContractDeps
} from '$lib/domain/contracts/apiContract';

// ============================================================================
// Configuration
// ============================================================================

export interface ApiModelConfig {
	/** Function returning namespace-filtered APIs */
	itemsStore: () => Api[];
	/** Domain-specific search function */
	searchFn: (items: Api[], query: string) => Api[];
	/** Filter sections config (reactive via function) */
	filterSections: () => FilterConfig;
	/** URL navigation scope */
	urlScope: {
		page: Page;
		goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
	};
	/** Returns the active namespace ID */
	getActiveNamespaceId: () => string;
	/** Returns namespace name for an API */
	getNamespaceName: (namespaceId: string) => string;
	/** Returns endpoint count for an API */
	getEndpointCount: (apiId: string) => number;
}

// ============================================================================
// State Interface
// ============================================================================

type ApiFilterState = Record<string, never>;

export type ApiModelState = EntityModelState<Api, ApiFilterState>;

// ============================================================================
// Factory
// ============================================================================

export function createApiModel(config: ApiModelConfig): ApiModelState {
	const deps: ApiContractDeps = { getActiveNamespaceId: config.getActiveNamespaceId };

	return createEntityModel<Api, ApiFilterState, any, any>({
		listConfig: {
			itemsStore: config.itemsStore,
			searchFn: config.searchFn,
			filterSections: config.filterSections,
			numericColumns: new Set(['endpointCount']),
			urlScope: config.urlScope,
			getItemId: (api) => api.id,
			deriveExtra: (api) => ({
				endpointCount: config.getEndpointCount(api.id),
				namespaceName: config.getNamespaceName(api.namespaceId)
			}),
			sortColumnMap: { endpoints: 'endpointCount', namespace: 'namespaceName' },
			drawerConfig: {
				trackEdits: false,
				allowDelete: false
			}
		},
		contracts: {
			validate: apiValidate,
			createDraft: () => apiCreateDraft(deps),
			toCreatePayload: apiToCreatePayload,
			toUpdatePayload: apiToUpdatePayload,
			deletionGuard: apiDeletionGuard
		},
		mutations: {
			create: createApiAction,
			update: updateApiAction,
			delete: deleteApiAction
		},
		entityLabel: 'API',
		getDisplayName: (api) => api.title
	});
}

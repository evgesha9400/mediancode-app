// src/lib/stores/objectsModel.svelte.ts
//
// Per-entity CRUD model for Objects — thin wrapper around createEntityModel.

import type { Page } from '@sveltejs/kit';
import type { ObjectDefinition, FilterConfig } from '$lib/types';
import { createEntityModel, type EntityModelState } from './entityModel.svelte';
import {
	createObjectAction,
	updateObjectAction,
	deleteObjectAction
} from '$lib/domain/mutations';
import {
	objectValidate,
	objectCreateDraft,
	objectToCreatePayload,
	objectToUpdatePayload,
	objectDeletionGuard,
	type ObjectContractDeps
} from '$lib/domain/contracts/objectContract';

// ============================================================================
// Configuration
// ============================================================================

export interface ObjectsModelConfig {
	/** Function returning namespace-filtered objects */
	itemsStore: () => ObjectDefinition[];
	/** Domain-specific search function */
	searchFn: (items: ObjectDefinition[], query: string) => ObjectDefinition[];
	/** Filter sections config (reactive via function) */
	filterSections: () => FilterConfig;
	/** URL navigation scope */
	urlScope: {
		page: Page;
		goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
	};
	/** Returns the active namespace ID */
	getActiveNamespaceId: () => string;
	/** Returns namespace name for an object */
	getNamespaceName: (namespaceId: string) => string;
}

// ============================================================================
// State Interface
// ============================================================================

type ObjectFilterState = Record<string, never>;

export type ObjectsModelState = EntityModelState<ObjectDefinition, ObjectFilterState>;

// ============================================================================
// Factory
// ============================================================================

export function createObjectsModel(config: ObjectsModelConfig): ObjectsModelState {
	const deps: ObjectContractDeps = {
		getActiveNamespaceId: config.getActiveNamespaceId
	};

	return createEntityModel<ObjectDefinition, ObjectFilterState, any, any>({
		listConfig: {
			itemsStore: config.itemsStore,
			searchFn: config.searchFn,
			filterSections: config.filterSections,
			numericColumns: new Set(['fieldCount', 'usedInApisCount']),
			urlScope: config.urlScope,
			highlightParamKey: 'highlight',
			getItemId: (obj) => obj.id,
			deriveExtra: (obj) => ({
				fieldCount: obj.fields.length,
				usedInApisCount: obj.usedInApis.length,
				namespaceName: config.getNamespaceName(obj.namespaceId)
			}),
			sortColumnMap: {
				fields: 'fieldCount',
				usedInApis: 'usedInApisCount',
				namespace: 'namespaceName'
			}
		},
		contracts: {
			validate: objectValidate,
			createDraft: () => objectCreateDraft(deps),
			toCreatePayload: objectToCreatePayload,
			toUpdatePayload: objectToUpdatePayload,
			deletionGuard: objectDeletionGuard
		},
		mutations: {
			create: createObjectAction,
			update: updateObjectAction,
			delete: deleteObjectAction
		},
		entityLabel: 'object'
	});
}

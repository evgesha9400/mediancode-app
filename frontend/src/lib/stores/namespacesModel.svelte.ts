// src/lib/stores/namespacesModel.svelte.ts
//
// Per-entity CRUD model for Namespaces — thin wrapper around createEntityModel.

import type { Page } from '@sveltejs/kit';
import type { Namespace, FilterConfig } from '$lib/types';
import { createEntityModel, type EntityModelState } from './entityModel.svelte';
import {
	createNamespaceAction,
	updateNamespaceAction,
	deleteNamespaceAction
} from '$lib/domain/mutations';
import {
	namespaceValidate,
	namespaceCreateDraft,
	namespaceToCreatePayload,
	namespaceToUpdatePayload,
	namespaceDeletionGuard,
	type NamespaceContractDeps
} from '$lib/domain/contracts/namespaceContract';

// ============================================================================
// Configuration
// ============================================================================

export interface NamespacesModelConfig {
	/** Function returning all namespaces */
	itemsStore: () => Namespace[];
	/** Domain-specific search function */
	searchFn: (items: Namespace[], query: string) => Namespace[];
	/** Filter sections config */
	filterSections: FilterConfig;
	/** URL navigation scope */
	urlScope: {
		page: Page;
		goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
	};
	/** Returns entity details for a namespace (used for derived counts and deletion guard) */
	getNamespaceEntityDetails: (id: string) => {
		total: number;
		fields: number;
		fieldConstraints: number;
		objects: number;
		endpoints: number;
	};
}

// ============================================================================
// State Interface
// ============================================================================

type NamespaceFilterState = {
	onlyUserCreated: boolean;
};

export type NamespacesModelState = EntityModelState<Namespace, NamespaceFilterState>;

// ============================================================================
// Factory
// ============================================================================

export function createNamespacesModel(config: NamespacesModelConfig): NamespacesModelState {
	const deps: NamespaceContractDeps = {
		getNamespaceEntityDetails: config.getNamespaceEntityDetails
	};

	return createEntityModel<Namespace, NamespaceFilterState, any, any>({
		listConfig: {
			itemsStore: config.itemsStore,
			searchFn: config.searchFn,
			filterSections: config.filterSections,
			numericColumns: new Set(['entityCount']),
			urlScope: config.urlScope,
			getItemId: (namespace) => namespace.id,
			deriveExtra: (namespace) => {
				const details = config.getNamespaceEntityDetails(namespace.id);
				return {
					entityCount: details.total,
					fieldCount: details.fields,
					fieldConstraintCount: details.fieldConstraints,
					objectCount: details.objects,
					endpointCount: details.endpoints
				};
			},
			sortColumnMap: {}
		},
		contracts: {
			validate: namespaceValidate,
			createDraft: namespaceCreateDraft,
			toCreatePayload: namespaceToCreatePayload,
			toUpdatePayload: namespaceToUpdatePayload,
			deletionGuard: (item) => namespaceDeletionGuard(item, deps),
			preSaveGuard: (item) => (item.locked ? 'Cannot edit locked namespaces' : undefined)
		},
		mutations: {
			create: createNamespaceAction,
			update: updateNamespaceAction,
			delete: deleteNamespaceAction
		},
		entityLabel: 'namespace'
	});
}

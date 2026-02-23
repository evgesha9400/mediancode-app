// src/lib/stores/fieldsModel.svelte.ts
//
// Per-entity CRUD model for Fields — thin wrapper around createEntityModel.

import type { Page } from '@sveltejs/kit';
import type { Field, FilterConfig } from '$lib/types';
import { createEntityModel, type EntityModelState } from './entityModel.svelte';
import { createFieldAction, updateFieldAction, deleteFieldAction } from '$lib/domain/mutations';
import {
	fieldValidate,
	fieldCreateDraft,
	fieldToCreatePayload,
	fieldToUpdatePayload,
	fieldDeletionGuard,
	type FieldContractDeps
} from '$lib/domain/contracts/fieldContract';

// ============================================================================
// Configuration
// ============================================================================

export interface FieldsModelConfig {
	/** Function returning namespace-filtered fields */
	itemsStore: () => Field[];
	/** Domain-specific search function */
	searchFn: (items: Field[], query: string) => Field[];
	/** Filter sections config (reactive via function) */
	filterSections: () => FilterConfig;
	/** URL navigation scope */
	urlScope: {
		page: Page;
		goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
	};
	/** Returns the active namespace ID */
	getActiveNamespaceId: () => string;
	/** Returns the default type name for new fields */
	getDefaultType: () => string;
	/** Resolves a type name to its ID */
	getTypeIdByName: (name: string) => string | undefined;
	/** Returns namespace name for a field */
	getNamespaceName: (namespaceId: string) => string;
}

// ============================================================================
// State Interface
// ============================================================================

type FieldFilterState = {
	selectedTypes: string[];
	onlyUsedInApis: boolean;
	onlyHasConstraints: boolean;
};

export type FieldsModelState = EntityModelState<Field, FieldFilterState>;

// ============================================================================
// Factory
// ============================================================================

export function createFieldsModel(config: FieldsModelConfig): FieldsModelState {
	const deps: FieldContractDeps = {
		getActiveNamespaceId: config.getActiveNamespaceId,
		getDefaultType: config.getDefaultType,
		getTypeIdByName: config.getTypeIdByName
	};

	return createEntityModel<Field, FieldFilterState, any, any>({
		listConfig: {
			itemsStore: config.itemsStore,
			searchFn: config.searchFn,
			filterSections: config.filterSections,
			numericColumns: new Set(['usedInApisCount']),
			urlScope: config.urlScope,
			highlightParamKey: 'highlight',
			getItemId: (field) => field.id,
			deriveExtra: (field) => ({
				usedInApisCount: field.usedInApis.length,
				namespaceName: config.getNamespaceName(field.namespaceId)
			}),
			sortColumnMap: { usedInApis: 'usedInApisCount', namespace: 'namespaceName' }
		},
		contracts: {
			validate: fieldValidate,
			createDraft: () => fieldCreateDraft(deps),
			toCreatePayload: (item) => fieldToCreatePayload(item, deps),
			toUpdatePayload: (item) => fieldToUpdatePayload(item, deps),
			deletionGuard: fieldDeletionGuard
		},
		mutations: {
			create: createFieldAction,
			update: updateFieldAction,
			delete: deleteFieldAction
		},
		entityLabel: 'field'
	});
}

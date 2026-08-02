/**
 * Store Loader Module
 *
 * Loads all store data from the backend API when the user is authenticated.
 * This module provides functions to initialize stores with backend data and
 * tracks loading state. Uses Promise.allSettled so that individual store
 * failures don't block the entire dashboard.
 */

import { writable, get } from 'svelte/store';
import { listNamespaces } from '$lib/api/namespaces';
import { listApis } from '$lib/api/apis';
import { listFields } from '$lib/api/fields';
import { listObjects } from '$lib/api/objects';
import { listEndpoints } from '$lib/api/endpoints';
import { listFieldConstraints } from '$lib/api/fieldConstraints';
import { listTypes } from '$lib/api/types';
import { listFieldValidatorTemplates } from '$lib/api/fieldValidatorTemplates';
import { listModelValidatorTemplates } from '$lib/api/modelValidatorTemplates';
import {
	namespacesStore,
	activeNamespaceId,
	apisStore,
	endpointsStore,
	fieldsStore,
	objectsStore,
	fieldConstraintsStore,
	typesBaseStore,
	fieldValidatorTemplatesStore,
	modelValidatorTemplatesStore
} from './stores';
import { SYSTEM_NAMESPACE_ID } from '$lib/utils/namespace';
import { hydrateStoredEndpoint } from '$lib/stores/endpointsConfig.svelte';

/**
 * Store loading state
 */
export interface LoadingState {
	isLoading: boolean;
	isLoaded: boolean;
	storeErrors: string[];
}

/**
 * Store for tracking loading state
 */
export const storeLoadingState = writable<LoadingState>({
	isLoading: false,
	isLoaded: false,
	storeErrors: []
});

/**
 * Store name constants — used in loader error tracking and checked by pages via .includes().
 * Import these in pages instead of duplicating the string literals.
 */
export const STORE_NAMES = {
	TYPES: 'Types',
	NAMESPACES: 'Namespaces',
	FIELD_CONSTRAINTS: 'Field Constraints',
	FIELD_VALIDATOR_TEMPLATES: 'Field Validator Templates',
	MODEL_VALIDATOR_TEMPLATES: 'Model Validator Templates',
	FIELDS: 'Fields',
	OBJECTS: 'Objects',
	APIS: 'APIs',
	ENDPOINTS: 'Endpoints',
} as const;

/** Store names for phase 1 (must load first — fields depend on types) */
const PHASE1_STORE_NAMES = [STORE_NAMES.TYPES, STORE_NAMES.NAMESPACES, STORE_NAMES.FIELD_CONSTRAINTS, STORE_NAMES.FIELD_VALIDATOR_TEMPLATES, STORE_NAMES.MODEL_VALIDATOR_TEMPLATES] as const;

/** Store names for phase 2 (depend on phase 1 stores being populated) */
const PHASE2_STORE_NAMES = [STORE_NAMES.FIELDS, STORE_NAMES.OBJECTS, STORE_NAMES.APIS, STORE_NAMES.ENDPOINTS] as const;

/**
 * Load all store data from the backend API
 *
 * Uses two-phase loading: types, namespaces, and field constraints load first
 * (phase 1), then fields, objects, APIs, and endpoints (phase 2). This ensures
 * the types store is populated before transformField() runs, which needs to
 * resolve typeId UUIDs to type names.
 *
 * Uses Promise.allSettled within each phase so that individual endpoint
 * failures don't prevent other stores from loading.
 *
 * @returns Promise that resolves when all fetches have settled
 */
export async function loadStoresFromApi(): Promise<void> {
	const currentState = get(storeLoadingState);

	// Skip if already loading or loaded
	if (currentState.isLoading || currentState.isLoaded) {
		return;
	}

	storeLoadingState.set({
		isLoading: true,
		isLoaded: false,
		storeErrors: []
	});

	const storeErrors: string[] = [];

	// Phase 1: Load types, namespaces, and field constraints first
	// Types MUST be in the store before fields are transformed
	const phase1Results = await Promise.allSettled([
		listTypes(),
		listNamespaces(),
		listFieldConstraints(),
		listFieldValidatorTemplates(),
		listModelValidatorTemplates()
	]);

	const types = phase1Results[0].status === 'fulfilled' ? phase1Results[0].value : [];
	const namespaces = phase1Results[1].status === 'fulfilled' ? phase1Results[1].value : [];
	const fieldConstraints = phase1Results[2].status === 'fulfilled' ? phase1Results[2].value : [];
	const fieldValidatorTemplates = phase1Results[3].status === 'fulfilled' ? phase1Results[3].value : [];
	const modelValidatorTemplates = phase1Results[4].status === 'fulfilled' ? phase1Results[4].value : [];

	phase1Results.forEach((result, i) => {
		if (result.status === 'rejected') {
			storeErrors.push(PHASE1_STORE_NAMES[i]);
			console.error(`[Store Loader] Failed to load ${PHASE1_STORE_NAMES[i]}:`, result.reason);
		}
	});

	// Populate phase 1 stores before phase 2 starts
	typesBaseStore.set(types);
	namespacesStore.set(namespaces);
	fieldConstraintsStore.set(fieldConstraints);
	fieldValidatorTemplatesStore.set(fieldValidatorTemplates);
	modelValidatorTemplatesStore.set(modelValidatorTemplates);

	// Phase 2: Load entities that depend on phase 1 stores
	const phase2Results = await Promise.allSettled([
		listFields(),
		listObjects(),
		listApis(),
		listEndpoints()
	]);

	const fields = phase2Results[0].status === 'fulfilled' ? phase2Results[0].value : [];
	const objects = phase2Results[1].status === 'fulfilled' ? phase2Results[1].value : [];
	const apis = phase2Results[2].status === 'fulfilled' ? phase2Results[2].value : [];
	const endpoints = phase2Results[3].status === 'fulfilled' ? phase2Results[3].value : [];

	phase2Results.forEach((result, i) => {
		if (result.status === 'rejected') {
			storeErrors.push(PHASE2_STORE_NAMES[i]);
			console.error(`[Store Loader] Failed to load ${PHASE2_STORE_NAMES[i]}:`, result.reason);
		}
	});

	// Populate phase 2 stores
	fieldsStore.set(fields);
	objectsStore.set(objects);
	apisStore.set(apis);
	endpointsStore.set(endpoints.map(hydrateStoredEndpoint));

	// Set active namespace: prefer user's default, fall back to system namespace id, then first
	const defaultNamespace = namespaces.find(ns => ns.isDefault);
	if (defaultNamespace) {
		activeNamespaceId.set(defaultNamespace.id);
	} else {
		const globalNamespace = namespaces.find(ns => ns.id === SYSTEM_NAMESPACE_ID);
		activeNamespaceId.set(globalNamespace?.id ?? namespaces[0]?.id ?? SYSTEM_NAMESPACE_ID);
	}

	storeLoadingState.set({
		isLoading: false,
		isLoaded: true,
		storeErrors
	});

	if (storeErrors.length > 0) {
		console.warn(`[Store Loader] Loaded with errors in: ${storeErrors.join(', ')}`);
	} else {
		console.log('[Store Loader] Successfully loaded all store data from API');
	}
}

/**
 * Reset stores to their initial state
 *
 * This should be called when the user signs out.
 */
export function resetStores(): void {
	// Reset loading state
	storeLoadingState.set({
		isLoading: false,
		isLoaded: false,
		storeErrors: []
	});

	// Reset stores to empty arrays
	namespacesStore.set([]);
	apisStore.set([]);
	fieldsStore.set([]);
	objectsStore.set([]);
	endpointsStore.set([]);
	fieldConstraintsStore.set([]);
	typesBaseStore.set([]);
	fieldValidatorTemplatesStore.set([]);
	modelValidatorTemplatesStore.set([]);
	activeNamespaceId.set('');

	console.log('[Store Loader] Stores reset to initial state');
}

/**
 * Reload all store data from the API
 *
 * Forces a reload even if data is already loaded.
 */
export async function reloadStores(): Promise<void> {
	// Reset loaded state to force reload
	storeLoadingState.update(state => ({
		...state,
		isLoaded: false
	}));

	await loadStoresFromApi();
}

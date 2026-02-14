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
import { namespacesStore, activeNamespaceId } from './namespaces';
import { apisStore, endpointsStore } from './apis';
import { fieldsStore } from './fields';
import { objectsStore } from './objects';
import { fieldConstraintsStore } from './fieldConstraints';
import { typesBaseStore } from './types';
import { GLOBAL_NAMESPACE_ID } from '$lib/constants';

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

/** Store names for phase 1 (must load first — fields depend on types) */
const PHASE1_STORE_NAMES = ['Types', 'Namespaces', 'Field Constraints'] as const;

/** Store names for phase 2 (depend on phase 1 stores being populated) */
const PHASE2_STORE_NAMES = ['Fields', 'Objects', 'APIs', 'Endpoints'] as const;

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
		listFieldConstraints()
	]);

	const types = phase1Results[0].status === 'fulfilled' ? phase1Results[0].value : [];
	const namespaces = phase1Results[1].status === 'fulfilled' ? phase1Results[1].value : [];
	const fieldConstraints = phase1Results[2].status === 'fulfilled' ? phase1Results[2].value : [];

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
	endpointsStore.set(endpoints);

	// Set active namespace to global if it exists, otherwise first namespace
	const globalNamespace = namespaces.find(ns => ns.id === GLOBAL_NAMESPACE_ID);
	if (globalNamespace) {
		activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
	} else if (namespaces.length > 0) {
		activeNamespaceId.set(namespaces[0].id);
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
	activeNamespaceId.set(GLOBAL_NAMESPACE_ID);

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

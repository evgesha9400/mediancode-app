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
import { listConstraints } from '$lib/api/constraints';
import { listTypes } from '$lib/api/types';
import { namespacesStore, activeNamespaceId } from './namespaces';
import { apisStore, endpointsStore } from './apis';
import { fieldsStore } from './fields';
import { objectsStore } from './objects';
import { constraintsStore } from './constraints';
import { typesBaseStore } from './types';
import { GLOBAL_NAMESPACE_ID } from './initialData';

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

/** Store names in the same order as the Promise.allSettled calls */
const STORE_NAMES = ['Namespaces', 'APIs', 'Fields', 'Objects', 'Endpoints', 'Constraints', 'Types'] as const;

/**
 * Load all store data from the backend API
 *
 * This function fetches all entities from the backend and populates
 * the corresponding Svelte stores. Uses Promise.allSettled so that
 * individual endpoint failures don't prevent other stores from loading.
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

	const results = await Promise.allSettled([
		listNamespaces(),
		listApis(),
		listFields(),
		listObjects(),
		listEndpoints(),
		listConstraints(),
		listTypes()
	]);

	// Extract values, defaulting failures to empty arrays
	const namespaces = results[0].status === 'fulfilled' ? results[0].value : [];
	const apis = results[1].status === 'fulfilled' ? results[1].value : [];
	const fields = results[2].status === 'fulfilled' ? results[2].value : [];
	const objects = results[3].status === 'fulfilled' ? results[3].value : [];
	const endpoints = results[4].status === 'fulfilled' ? results[4].value : [];
	const constraints = results[5].status === 'fulfilled' ? results[5].value : [];
	const types = results[6].status === 'fulfilled' ? results[6].value : [];

	// Collect per-store errors
	const storeErrors: string[] = [];
	results.forEach((result, i) => {
		if (result.status === 'rejected') {
			storeErrors.push(STORE_NAMES[i]);
			console.error(`[Store Loader] Failed to load ${STORE_NAMES[i]}:`, result.reason);
		}
	});

	// Always populate stores (empty array on failure)
	namespacesStore.set(namespaces);
	apisStore.set(apis);
	fieldsStore.set(fields);
	objectsStore.set(objects);
	endpointsStore.set(endpoints);
	constraintsStore.set(constraints);
	typesBaseStore.set(types);

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
	constraintsStore.set([]);
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

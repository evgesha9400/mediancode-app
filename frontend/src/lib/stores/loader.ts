/**
 * Store Loader Module
 *
 * Loads all store data from the backend API when the user is authenticated.
 * This module provides functions to initialize stores with backend data and
 * tracks loading state.
 */

import { writable, get } from 'svelte/store';
import { listNamespaces } from '$lib/api/namespaces';
import { listApis } from '$lib/api/apis';
import { listFields } from '$lib/api/fields';
import { listObjects } from '$lib/api/objects';
import { listEndpoints } from '$lib/api/endpoints';
import { listValidators } from '$lib/api/validators';
import { namespacesStore, activeNamespaceId } from './namespaces';
import { apisStore, endpointsStore } from './apis';
import { fieldsStore } from './fields';
import { objectsStore } from './objects';
import { validatorsStore } from './validators';
import { GLOBAL_NAMESPACE_ID } from './initialData';

/**
 * Store loading state
 */
export interface LoadingState {
	isLoading: boolean;
	isLoaded: boolean;
	error: string | null;
}

/**
 * Store for tracking loading state
 */
export const storeLoadingState = writable<LoadingState>({
	isLoading: false,
	isLoaded: false,
	error: null
});

/**
 * Load all store data from the backend API
 *
 * This function fetches all entities from the backend and populates
 * the corresponding Svelte stores. It should be called when the user
 * is authenticated.
 *
 * @returns Promise that resolves when all data is loaded
 * @throws Error if any API call fails
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
		error: null
	});

	try {
		// Fetch all data in parallel for better performance
		// Note: Tags are now embedded in APIs, so no separate listTags call
		const [namespaces, apis, fields, objects, endpoints, validators] = await Promise.all([
			listNamespaces(),
			listApis(),
			listFields(),
			listObjects(),
			listEndpoints(),
			listValidators()
		]);

		// Update stores with fetched data
		namespacesStore.set(namespaces);
		apisStore.set(apis);
		fieldsStore.set(fields);
		objectsStore.set(objects);
		endpointsStore.set(endpoints);
		validatorsStore.set(validators);

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
			error: null
		});

		console.log('[Store Loader] Successfully loaded all store data from API');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to load data from API';

		storeLoadingState.set({
			isLoading: false,
			isLoaded: false,
			error: errorMessage
		});

		console.error('[Store Loader] Failed to load store data:', error);
		throw error;
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
		error: null
	});

	// Reset stores to empty arrays
	// Note: Tags are now embedded in APIs, so no separate tagsStore reset
	namespacesStore.set([]);
	apisStore.set([]);
	fieldsStore.set([]);
	objectsStore.set([]);
	endpointsStore.set([]);
	validatorsStore.set([]);
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

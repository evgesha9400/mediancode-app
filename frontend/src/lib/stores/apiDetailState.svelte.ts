/**
 * API Detail State Container
 *
 * Encapsulates UI state and domain operations for the API detail page.
 * Follows the listViewState pattern: owns all state using Svelte runes and
 * delegates domain logic to apis.ts store.
 *
 * Supports two modes:
 * - New API mode (apiId === 'new'): Draft state kept locally until Save
 * - Edit mode: Loads existing API from store
 */

import { get } from 'svelte/store';
import type { Api, ApiEndpoint, PathParam, ResponseShape } from '$lib/types';
import {
	apisStore,
	endpointsStore,
	addApi,
	updateApi,
	getApiById,
	addEndpoint,
	getEndpointCountByTagName,
	updateEndpoint,
	deleteEndpoint,
	reconcilePathParams,
	normalizeEndpoint
} from './apis';
import { fieldsStore } from './fields';
import { objectsStore } from './objects';
import { fieldConstraintsStore } from './fieldConstraints';
import { showToast } from './toasts';
import { deepClone, generateId } from '$lib/utils/ids';

/**
 * Toast message constants
 */
const MESSAGES = {
	API_CREATED: 'API created successfully',
	API_SAVED: 'API saved successfully',
	ENDPOINT_SAVED: 'Endpoint saved successfully',
	ENDPOINT_DUPLICATED: 'Endpoint duplicated successfully',
	ENDPOINT_DELETED: 'Endpoint deleted successfully',
	CODE_GENERATION_SOON: 'Code generation coming soon',
	UNSAVED_CHANGES: 'You have unsaved changes'
} as const;

/**
 * State returned by the factory for use in the API detail page.
 * All state properties are reactive and can be bound directly in templates.
 */
export interface ApiDetailState {
	// Whether this is a new API (not yet saved to store)
	readonly isNewApi: boolean;

	// The API being edited
	readonly api: Api | null;
	editedApi: Api | null;

	// Derived tags (unique tagName values from endpoints)
	readonly tags: string[];
	readonly endpoints: ApiEndpoint[];

	// The namespace ID for this API (derived from editedApi)
	readonly apiNamespaceId: string;

	// Drawer state
	drawerOpen: boolean;
	selectedEndpoint: ApiEndpoint | null;
	editedEndpoint: ApiEndpoint | null;

	// Tag combobox state
	tagInputValue: string;
	tagDropdownOpen: boolean;

	// Endpoint deletion confirmation state
	showEndpointDeleteConfirm: boolean;

	// Close confirmation state
	showCloseConfirm: boolean;

	// Derived state
	readonly hasApiChanges: boolean;
	readonly hasEndpointChanges: boolean;
	readonly hasAnyChanges: boolean;

	// API metadata actions
	handleApiUpdate: (updates: Partial<Api>) => void;
	handleSaveApi: () => boolean;
	handleDiscardApiChanges: () => void;

	// Delete action (only for saved APIs)
	handleDeleteApi: () => void;

	// Close actions
	handleClose: () => void;
	handleSaveAndClose: () => void;
	handleDiscardAndClose: () => void;
	cancelClose: () => void;

	// Tag actions
	handleTagSelect: (tagName: string | undefined) => void;

	// Endpoint list actions
	handleAddEndpoint: () => void;
	handleDeleteEndpoint: () => void;
	handleDeleteEndpointClick: () => void;
	cancelDeleteEndpoint: () => void;
	handleDuplicateEndpoint: (endpointId: string) => void;

	// Drawer actions
	openEndpoint: (endpoint: ApiEndpoint) => void;
	closeDrawer: () => void;
	handleSaveEndpoint: () => boolean;
	handleUndoEndpoint: () => void;
	handleCancelEndpoint: () => void;

	// Endpoint editing actions
	handlePathChange: (newPath: string) => void;
	handlePathParamUpdate: (paramName: string, fieldId: string) => void;

	// Query parameters object selection
	handleSelectQueryParamsObject: (objectId: string | undefined) => void;

	// Request body object selection
	handleSelectRequestBodyObject: (objectId: string | undefined) => void;

	// Response body object selection
	handleSelectResponseBodyObject: (objectId: string | undefined) => void;
	handleEnvelopeToggle: (enabled: boolean) => void;

	// Response shape configuration
	handleSetResponseShape: (shape: ResponseShape) => void;
	handleResetResponseDefaults: () => void;

	// Code generation
	handleGenerateCode: () => void;

	// Helper
	getEndpointsUsingTag: (tagName: string) => number;
}

/**
 * Configuration for creating API detail state
 */
export interface ApiDetailStateConfig {
	apiId: string; // 'new' for creating a new API
	namespaceId: string;
	onClose: () => void;
	onApiCreated?: (apiId: string) => void; // Called after new API is saved
}

/**
 * Creates a default API object for new APIs
 */
function createDefaultApi(id: string, namespaceId: string): Api {
	const now = new Date().toISOString();
	return {
		id,
		namespaceId,
		title: 'Untitled API',
		version: '1.0.0',
		description: '',
		baseUrl: '/api/v1',
		serverUrl: '',
		createdAt: now,
		updatedAt: now
	};
}

/**
 * Creates a default endpoint object
 */
function createDefaultEndpointLocal(apiId: string): ApiEndpoint {
	return {
		id: generateId('endpoint'),
		apiId,
		method: 'GET',
		path: '/',
		description: '',
		pathParams: [],
		useEnvelope: true,
		responseShape: 'object'
	};
}

/**
 * Creates the API detail state container for a specific API
 */
export function createApiDetailState(config: ApiDetailStateConfig): ApiDetailState {
	const { apiId: configApiId, namespaceId, onClose, onApiCreated } = config;

	// Determine if this is a new API
	const isNewApi = configApiId === 'new';

	// Generate a real ID for new APIs upfront
	const actualApiId = isNewApi ? generateId('api') : configApiId;

	// Subscribe to stores - these will update reactively
	let allApis = $state(get(apisStore));
	let allEndpoints = $state(get(endpointsStore));

	// Draft state for new APIs (local only, not in stores)
	let draftEndpoints = $state<ApiEndpoint[]>([]);

	// Track if a new API has been saved (transitions from draft to saved)
	let hasBeenSaved = $state(false);

	// The current API from store (null for new APIs until saved)
	let storedApi = $derived(allApis.find(a => a.id === actualApiId) ?? null);

	// For new APIs that haven't been saved, api is null; otherwise use stored
	let api = $derived((isNewApi && !hasBeenSaved) ? null : storedApi);

	// Edited copy of API for tracking changes
	let editedApi = $state<Api | null>(
		isNewApi ? createDefaultApi(actualApiId, namespaceId) : null
	);

	// Initialize editedApi when existing api is loaded
	$effect(() => {
		if (!isNewApi && storedApi && !editedApi) {
			editedApi = deepClone(storedApi);
		}
	});

	// Derived: the namespace ID for this API
	let apiNamespaceId = $derived(editedApi?.namespaceId ?? namespaceId);

	// Derived tags: collect unique tagName values from endpoints
	let tags = $derived.by(() => {
		const currentEndpoints = (isNewApi && !hasBeenSaved) ? draftEndpoints : allEndpoints.filter(e => e.apiId === actualApiId);
		const tagNames = new Set<string>();
		for (const ep of currentEndpoints) {
			if (ep.tagName) tagNames.add(ep.tagName);
		}
		return [...tagNames].sort();
	});

	// Derived filtered state for endpoints
	// For new APIs that haven't been saved, use draft state; otherwise use store
	let endpoints = $derived(
		(isNewApi && !hasBeenSaved)
			? draftEndpoints
			: allEndpoints.filter(e => e.apiId === actualApiId)
	);

	// Subscribe to store updates
	apisStore.subscribe(value => allApis = value);
	endpointsStore.subscribe(value => allEndpoints = value);

	// Drawer state
	let drawerOpen = $state(false);
	let selectedEndpoint = $state<ApiEndpoint | null>(null);
	let editedEndpoint = $state<ApiEndpoint | null>(null);

	// Tag combobox state
	let tagInputValue = $state('');
	let tagDropdownOpen = $state(false);

	// Endpoint deletion confirmation state
	let showEndpointDeleteConfirm = $state(false);

	// Close confirmation state
	let showCloseConfirm = $state(false);

	// Derived: Track if there are unsaved API changes
	let hasApiChanges = $derived.by(() => {
		if (isNewApi && !hasBeenSaved) {
			// For new APIs that haven't been saved yet, always consider it as having changes
			return true;
		}
		// After saving (or for existing APIs), compare edited vs stored
		if (!editedApi || !storedApi) return false;
		return JSON.stringify(editedApi) !== JSON.stringify(storedApi);
	});

	// Derived: Track if there are unsaved endpoint changes
	let hasEndpointChanges = $derived(
		editedEndpoint && selectedEndpoint
			? JSON.stringify(editedEndpoint) !== JSON.stringify(selectedEndpoint)
			: false
	);

	// Derived: Any unsaved changes
	let hasAnyChanges = $derived(hasApiChanges || hasEndpointChanges);

	// ============================================================================
	// API Metadata Operations
	// ============================================================================

	function handleApiUpdate(updates: Partial<Api>): void {
		if (!editedApi) return;
		editedApi = { ...editedApi, ...updates };
	}

	function handleSaveApi(): boolean {
		if (!editedApi) return false;

		if (isNewApi && !hasBeenSaved) {
			// Commit new API to store
			addApi(editedApi);

			// Add all draft endpoints to store
			for (const endpoint of draftEndpoints) {
				addEndpoint(endpoint);
			}

			// Mark as saved - now we switch to using store data
			hasBeenSaved = true;

			// Clear draft arrays (data is now in stores)
			draftEndpoints = [];

			showToast(MESSAGES.API_CREATED, 'success');

			// Notify parent to update URL (replace /apis/new with /apis/{id})
			if (onApiCreated) {
				onApiCreated(actualApiId);
			}

			return true;
		}

		// Existing API (or previously saved new API) - just update
		updateApi(actualApiId, editedApi);
		showToast(MESSAGES.API_SAVED, 'success');
		return true;
	}

	function handleDiscardApiChanges(): void {
		if (isNewApi) {
			// Reset to default for new APIs
			editedApi = createDefaultApi(actualApiId, namespaceId);
			draftEndpoints = [];
		} else if (storedApi) {
			editedApi = deepClone(storedApi);
		}
	}

	function handleDeleteApi(): void {
		// This should only be called for saved APIs (handled in UI)
		// The actual deletion is handled by the parent component
		// since it needs to navigate away after deletion
	}

	// ============================================================================
	// Close Operations
	// ============================================================================

	function handleClose(): void {
		if (hasAnyChanges) {
			showCloseConfirm = true;
		} else {
			onClose();
		}
	}

	function handleSaveAndClose(): void {
		handleSaveApi();
		if (hasEndpointChanges && editedEndpoint) {
			handleSaveEndpoint();
		}
		showCloseConfirm = false;
		onClose();
	}

	function handleDiscardAndClose(): void {
		showCloseConfirm = false;
		onClose();
	}

	function cancelClose(): void {
		showCloseConfirm = false;
	}

	// ============================================================================
	// Tag Operations
	// ============================================================================

	function getEndpointsUsingTag(tagName: string): number {
		if (isNewApi && !hasBeenSaved) {
			return draftEndpoints.filter(e => e.tagName === tagName).length;
		}
		return getEndpointCountByTagName(actualApiId, tagName);
	}

	function handleTagSelect(tagName: string | undefined): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, tagName };
		tagInputValue = tagName ?? '';
		tagDropdownOpen = false;
	}

	// ============================================================================
	// Endpoint List Operations
	// ============================================================================

	function handleAddEndpoint(): void {
		const newEndpoint = createDefaultEndpointLocal(actualApiId);

		if (isNewApi && !hasBeenSaved) {
			// Add to draft state
			draftEndpoints = [...draftEndpoints, newEndpoint];
		} else {
			// Add to store immediately
			addEndpoint(newEndpoint);
		}

		openEndpoint(newEndpoint);
	}

	function handleDeleteEndpointClick(): void {
		showEndpointDeleteConfirm = true;
	}

	function handleDeleteEndpoint(): void {
		if (!editedEndpoint) return;

		const endpointId = editedEndpoint.id;

		if (isNewApi && !hasBeenSaved) {
			// Remove from draft state
			draftEndpoints = draftEndpoints.filter(e => e.id !== endpointId);
			showToast(MESSAGES.ENDPOINT_DELETED, 'success');
			showEndpointDeleteConfirm = false;
			closeDrawer();
		} else {
			// Delete from store
			const result = deleteEndpoint(endpointId);

			if (result.success) {
				showToast(MESSAGES.ENDPOINT_DELETED, 'success');
				showEndpointDeleteConfirm = false;
				closeDrawer();
			} else if (result.error) {
				showToast(result.error, 'error');
			}
		}
	}

	function cancelDeleteEndpoint(): void {
		showEndpointDeleteConfirm = false;
	}

	function handleDuplicateEndpoint(endpointId: string): void {
		// Find the endpoint to duplicate
		const original = isNewApi && !hasBeenSaved
			? draftEndpoints.find(e => e.id === endpointId)
			: allEndpoints.find(e => e.id === endpointId);

		if (!original) {
			showToast('Failed to duplicate endpoint', 'error');
			return;
		}

		// Create a copy with new ID
		const duplicated: ApiEndpoint = {
			...deepClone(original),
			id: generateId('endpoint'),
			path: original.path + '-copy',
			// PathParams are simple {name, fieldId} — just clone them
			pathParams: original.pathParams.map(p => ({ ...p }))
		};

		if (isNewApi && !hasBeenSaved) {
			draftEndpoints = [...draftEndpoints, duplicated];
		} else {
			addEndpoint(duplicated);
		}

		showToast(MESSAGES.ENDPOINT_DUPLICATED, 'success');
	}

	// ============================================================================
	// Drawer Operations
	// ============================================================================

	function openEndpoint(endpoint: ApiEndpoint): void {
		const normalized = normalizeEndpoint(endpoint);

		selectedEndpoint = normalized;
		editedEndpoint = deepClone(normalized);
		drawerOpen = true;

		tagInputValue = normalized.tagName ?? '';
		tagDropdownOpen = false;
	}

	function closeDrawer(): void {
		drawerOpen = false;
		showEndpointDeleteConfirm = false;

		setTimeout(() => {
			selectedEndpoint = null;
			editedEndpoint = null;
		}, 300);
	}

	function handleSaveEndpoint(): boolean {
		if (!editedEndpoint || !selectedEndpoint) return false;

		if (isNewApi && !hasBeenSaved) {
			// Update in draft state
			draftEndpoints = draftEndpoints.map(e =>
				e.id === editedEndpoint!.id ? editedEndpoint! : e
			);
		} else {
			// Update in store
			updateEndpoint(editedEndpoint.id, editedEndpoint);
		}

		selectedEndpoint = editedEndpoint;
		showToast(MESSAGES.ENDPOINT_SAVED, 'success');
		closeDrawer();
		return true;
	}

	function handleUndoEndpoint(): void {
		if (!selectedEndpoint) return;

		editedEndpoint = deepClone(selectedEndpoint);

		tagInputValue = editedEndpoint?.tagName ?? '';
	}

	function handleCancelEndpoint(): void {
		closeDrawer();
	}

	// ============================================================================
	// Endpoint Editing Operations
	// ============================================================================

	function handlePathChange(newPath: string): void {
		if (!editedEndpoint) return;

		const { path, pathParams } = reconcilePathParams(newPath, editedEndpoint.pathParams);

		editedEndpoint = {
			...editedEndpoint,
			path,
			pathParams
		};
	}

	function handlePathParamUpdate(paramName: string, fieldId: string): void {
		if (!editedEndpoint) return;

		const updatedParams = editedEndpoint.pathParams.map(p =>
			p.name === paramName ? { ...p, fieldId } : p
		);
		editedEndpoint = { ...editedEndpoint, pathParams: updatedParams };
	}

	// ============================================================================
	// Query Parameters Object Selection
	// ============================================================================

	function handleSelectQueryParamsObject(objectId: string | undefined): void {
		if (!editedEndpoint) return;

		editedEndpoint = {
			...editedEndpoint,
			queryParamsObjectId: objectId
		};
	}

	// ============================================================================
	// Request Body Object Selection
	// ============================================================================

	function handleSelectRequestBodyObject(objectId: string | undefined): void {
		if (!editedEndpoint) return;

		editedEndpoint = {
			...editedEndpoint,
			requestBodyObjectId: objectId
		};
	}

	// ============================================================================
	// Response Body Object Selection
	// ============================================================================

	function handleSelectResponseBodyObject(objectId: string | undefined): void {
		if (!editedEndpoint) return;

		editedEndpoint = {
			...editedEndpoint,
			responseBodyObjectId: objectId
		};
	}

	function handleEnvelopeToggle(enabled: boolean): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, useEnvelope: enabled };
	}

	// ============================================================================
	// Response Shape Configuration
	// ============================================================================

	function handleSetResponseShape(shape: ResponseShape): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, responseShape: shape };
	}

	function handleResetResponseDefaults(): void {
		if (!editedEndpoint) return;

		editedEndpoint = {
			...editedEndpoint,
			useEnvelope: true,
			responseShape: 'object',
			responseBodyObjectId: undefined
		};
	}

	// ============================================================================
	// Code Generation
	// ============================================================================

	function handleGenerateCode(): void {
		if (!editedApi) return;

		// Require API to be saved before generating code
		if (isNewApi && !hasBeenSaved) {
			showToast('Please save the API before generating code', 'warning', 5000);
			return;
		}

		// TODO: Implement when backend is deployed
		// The new endpoint structure is: POST /apis/{actualApiId}/generate
		// The backend will automatically retrieve all related entities by API ID
		//
		// Implementation outline:
		// 1. Get Clerk session token: const token = await clerk?.session?.getToken();
		// 2. Call fetch(`${API_BASE_URL}/apis/${actualApiId}/generate`, {
		//      method: 'POST',
		//      headers: { 'Authorization': `Bearer ${token}` }
		//    });
		// 3. Handle zip file download from response blob
		// 4. Show success/error toast

		console.log('Generate code for API:', actualApiId);
		showToast('Code generation will be available when backend is deployed', 'info', 5000);
	}

	// ============================================================================
	// Return State API
	// ============================================================================

	return {
		// Mode flag (readonly)
		get isNewApi() { return isNewApi && !hasBeenSaved; },

		// API data (readonly)
		get api() { return api; },

		get editedApi() { return editedApi; },
		set editedApi(v: Api | null) { editedApi = v; },

		// Store subscriptions (readonly)
		get tags() { return tags; },
		get endpoints() { return endpoints; },

		// Namespace (readonly)
		get apiNamespaceId() { return apiNamespaceId; },

		// Drawer state (read/write)
		get drawerOpen() { return drawerOpen; },
		set drawerOpen(v: boolean) { drawerOpen = v; },

		get selectedEndpoint() { return selectedEndpoint; },
		set selectedEndpoint(v: ApiEndpoint | null) { selectedEndpoint = v; },

		get editedEndpoint() { return editedEndpoint; },
		set editedEndpoint(v: ApiEndpoint | null) { editedEndpoint = v; },

		// Tag combobox state (read/write)
		get tagInputValue() { return tagInputValue; },
		set tagInputValue(v: string) { tagInputValue = v; },

		get tagDropdownOpen() { return tagDropdownOpen; },
		set tagDropdownOpen(v: boolean) { tagDropdownOpen = v; },

		get showEndpointDeleteConfirm() { return showEndpointDeleteConfirm; },
		set showEndpointDeleteConfirm(v: boolean) { showEndpointDeleteConfirm = v; },

		get showCloseConfirm() { return showCloseConfirm; },
		set showCloseConfirm(v: boolean) { showCloseConfirm = v; },

		// Derived state (readonly)
		get hasApiChanges() { return hasApiChanges; },
		get hasEndpointChanges() { return hasEndpointChanges; },
		get hasAnyChanges() { return hasAnyChanges; },

		// Actions
		handleApiUpdate,
		handleSaveApi,
		handleDiscardApiChanges,
		handleDeleteApi,
		handleClose,
		handleSaveAndClose,
		handleDiscardAndClose,
		cancelClose,
		handleTagSelect,
		handleAddEndpoint,
		handleDeleteEndpoint,
		handleDeleteEndpointClick,
		cancelDeleteEndpoint,
		handleDuplicateEndpoint,
		openEndpoint,
		closeDrawer,
		handleSaveEndpoint,
		handleUndoEndpoint,
		handleCancelEndpoint,
		handlePathChange,
		handlePathParamUpdate,
		handleSelectQueryParamsObject,
		handleSelectRequestBodyObject,
		handleSelectResponseBodyObject,
		handleEnvelopeToggle,
		handleSetResponseShape,
		handleResetResponseDefaults,
		handleGenerateCode,
		getEndpointsUsingTag
	};
}

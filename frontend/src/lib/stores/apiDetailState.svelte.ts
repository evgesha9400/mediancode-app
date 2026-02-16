/**
 * API Detail State Container
 *
 * Encapsulates UI state for the API detail page.
 * All mutations go through the canonical domain layer (save-per-action).
 *
 * Two modes:
 * - New API mode (apiId === 'new'): User fills metadata, clicks "Create API"
 *   which calls the backend, then transitions to edit mode.
 * - Edit mode: Loads existing API from store; every endpoint change is
 *   immediately persisted via domain actions.
 */

import { fromStore } from 'svelte/store';
import type { Api, ApiEndpoint, ResponseShape } from '$lib/types';
import {
	apisStore,
	endpointsStore,
	getApiById,
	getEndpointCountByTagName
} from './apis';
import { showToast } from './toasts';
import { deepClone, generateId } from '$lib/utils/ids';
import {
	createApiAction,
	updateApiAction,
	createEndpointAction,
	updateEndpointAction,
	deleteEndpointAction
} from '$lib/domain/mutations';
import { reconcilePathParams, normalizeEndpoint } from '$lib/domain/endpointReducer';

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
	// Whether this is a new API (not yet created on backend)
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

	// Loading state for async operations
	readonly isSaving: boolean;

	// API metadata actions
	handleApiUpdate: (updates: Partial<Api>) => void;
	handleSaveApi: () => Promise<boolean>;
	handleDiscardApiChanges: () => void;

	// Delete action (only for saved APIs)
	handleDeleteApi: () => void;

	// Close actions
	handleClose: () => void;
	handleSaveAndClose: () => Promise<void>;
	handleDiscardAndClose: () => void;
	cancelClose: () => void;

	// Tag actions
	handleTagSelect: (tagName: string | undefined) => void;

	// Endpoint list actions
	handleAddEndpoint: () => Promise<void>;
	handleDeleteEndpoint: () => Promise<void>;
	handleDeleteEndpointClick: () => void;
	cancelDeleteEndpoint: () => void;
	handleDuplicateEndpoint: (endpointId: string) => Promise<void>;

	// Drawer actions
	openEndpoint: (endpoint: ApiEndpoint) => void;
	closeDrawer: () => void;
	handleSaveEndpoint: () => Promise<boolean>;
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
	onApiCreated?: (apiId: string) => void; // Called after new API is created on backend
}

/**
 * Creates a default API object for new APIs (local draft only)
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
 * Creates the API detail state container for a specific API
 */
export function createApiDetailState(config: ApiDetailStateConfig): ApiDetailState {
	const { apiId: configApiId, namespaceId, onClose, onApiCreated } = config;

	// Determine if this is a new API
	const isNewApi = configApiId === 'new';

	// For new APIs, generate a placeholder ID for local use only.
	// The real ID comes from the backend after createApiAction.
	const localApiId = isNewApi ? generateId('api') : configApiId;

	// Track the backend-assigned ID (set after createApiAction succeeds)
	let backendApiId = $state(isNewApi ? '' : configApiId);

	// The effective API ID to use for store lookups
	let effectiveApiId = $derived(backendApiId || localApiId);

	// Subscribe to stores reactively via fromStore (automatic cleanup)
	const apisState = fromStore(apisStore);
	const endpointsState = fromStore(endpointsStore);
	let allApis = $derived(apisState.current);
	let allEndpoints = $derived(endpointsState.current);

	// Track if a new API has been created on the backend
	let hasBeenCreated = $state(!isNewApi);

	// The current API from store
	let storedApi = $derived(allApis.find(a => a.id === effectiveApiId) ?? null);

	// For new APIs that haven't been created, api is null
	let api = $derived(hasBeenCreated ? storedApi : null);

	// Edited copy of API for tracking changes
	let editedApi = $state<Api | null>(
		isNewApi ? createDefaultApi(localApiId, namespaceId) : null
	);

	// Initialize editedApi when existing api is loaded
	$effect(() => {
		if (!isNewApi && storedApi && !editedApi) {
			editedApi = deepClone(storedApi);
		}
	});

	// Derived: the namespace ID for this API
	let apiNamespaceId = $derived(editedApi?.namespaceId ?? namespaceId);

	// Endpoints from the store (empty until API is created on backend)
	let endpoints = $derived(
		hasBeenCreated
			? allEndpoints.filter(e => e.apiId === effectiveApiId)
			: []
	);

	// Derived tags: collect unique tagName values from endpoints
	let tags = $derived.by(() => {
		const tagNames = new Set<string>();
		for (const ep of endpoints) {
			if (ep.tagName) tagNames.add(ep.tagName);
		}
		return [...tagNames].sort();
	});

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

	// Loading state
	let isSaving = $state(false);

	// Derived: Track if there are unsaved API changes
	let hasApiChanges = $derived.by(() => {
		if (!hasBeenCreated) {
			// New API not yet created — always has changes (the metadata draft)
			return true;
		}
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

	async function handleSaveApi(): Promise<boolean> {
		if (!editedApi) return false;
		isSaving = true;

		try {
			if (!hasBeenCreated) {
				// Create new API on backend
				const result = await createApiAction({
					namespaceId: editedApi.namespaceId,
					title: editedApi.title,
					version: editedApi.version,
					description: editedApi.description,
					baseUrl: editedApi.baseUrl,
					serverUrl: editedApi.serverUrl
				});

				if (!result.success) {
					showToast(result.error ?? 'Failed to create API', 'error');
					return false;
				}

				// Update tracking with backend-assigned ID
				backendApiId = result.data!.id;
				hasBeenCreated = true;
				editedApi = deepClone(result.data!);

				showToast(MESSAGES.API_CREATED, 'success');

				// Notify parent to update URL
				if (onApiCreated) {
					onApiCreated(result.data!.id);
				}

				return true;
			}

			// Existing API — update via backend
			const result = await updateApiAction(effectiveApiId, {
				title: editedApi.title,
				version: editedApi.version,
				description: editedApi.description,
				baseUrl: editedApi.baseUrl,
				serverUrl: editedApi.serverUrl
			});

			if (!result.success) {
				showToast(result.error ?? 'Failed to save API', 'error');
				return false;
			}

			editedApi = deepClone(result.data!);
			showToast(MESSAGES.API_SAVED, 'success');
			return true;
		} finally {
			isSaving = false;
		}
	}

	function handleDiscardApiChanges(): void {
		if (!hasBeenCreated) {
			editedApi = createDefaultApi(localApiId, namespaceId);
		} else if (storedApi) {
			editedApi = deepClone(storedApi);
		}
	}

	function handleDeleteApi(): void {
		// Handled by parent component (needs to navigate away after deletion)
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

	async function handleSaveAndClose(): Promise<void> {
		await handleSaveApi();
		if (hasEndpointChanges && editedEndpoint) {
			await handleSaveEndpoint();
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
		if (!hasBeenCreated) return 0;
		return getEndpointCountByTagName(effectiveApiId, tagName);
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

	async function handleAddEndpoint(): Promise<void> {
		if (!hasBeenCreated) {
			showToast('Please create the API first before adding endpoints', 'warning');
			return;
		}

		isSaving = true;
		try {
			const result = await createEndpointAction({
				apiId: effectiveApiId,
				method: 'GET',
				path: '/',
				description: '',
				pathParams: [],
				useEnvelope: true,
				responseShape: 'object'
			});

			if (!result.success) {
				showToast(result.error ?? 'Failed to add endpoint', 'error');
				return;
			}

			openEndpoint(result.data!);
		} finally {
			isSaving = false;
		}
	}

	function handleDeleteEndpointClick(): void {
		showEndpointDeleteConfirm = true;
	}

	async function handleDeleteEndpoint(): Promise<void> {
		if (!editedEndpoint) return;

		isSaving = true;
		try {
			const result = await deleteEndpointAction(editedEndpoint.id);

			if (result.success) {
				showToast(MESSAGES.ENDPOINT_DELETED, 'success');
				showEndpointDeleteConfirm = false;
				closeDrawer();
			} else {
				showToast(result.error ?? 'Failed to delete endpoint', 'error');
			}
		} finally {
			isSaving = false;
		}
	}

	function cancelDeleteEndpoint(): void {
		showEndpointDeleteConfirm = false;
	}

	async function handleDuplicateEndpoint(endpointId: string): Promise<void> {
		const original = allEndpoints.find(e => e.id === endpointId);
		if (!original) {
			showToast('Failed to duplicate endpoint', 'error');
			return;
		}

		isSaving = true;
		try {
			const result = await createEndpointAction({
				apiId: original.apiId,
				method: original.method,
				path: original.path + '-copy',
				description: original.description,
				tagName: original.tagName,
				pathParams: original.pathParams.map(p => ({ ...p })),
				queryParamsObjectId: original.queryParamsObjectId,
				requestBodyObjectId: original.requestBodyObjectId,
				responseBodyObjectId: original.responseBodyObjectId,
				useEnvelope: original.useEnvelope,
				responseShape: original.responseShape
			});

			if (result.success) {
				showToast(MESSAGES.ENDPOINT_DUPLICATED, 'success');
			} else {
				showToast(result.error ?? 'Failed to duplicate endpoint', 'error');
			}
		} finally {
			isSaving = false;
		}
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

	async function handleSaveEndpoint(): Promise<boolean> {
		if (!editedEndpoint || !selectedEndpoint) return false;

		isSaving = true;
		try {
			const result = await updateEndpointAction(editedEndpoint.id, {
				method: editedEndpoint.method,
				path: editedEndpoint.path,
				description: editedEndpoint.description,
				tagName: editedEndpoint.tagName ?? null,
				pathParams: editedEndpoint.pathParams,
				queryParamsObjectId: editedEndpoint.queryParamsObjectId ?? null,
				requestBodyObjectId: editedEndpoint.requestBodyObjectId ?? null,
				responseBodyObjectId: editedEndpoint.responseBodyObjectId ?? null,
				useEnvelope: editedEndpoint.useEnvelope,
				responseShape: editedEndpoint.responseShape
			});

			if (!result.success) {
				showToast(result.error ?? 'Failed to save endpoint', 'error');
				return false;
			}

			selectedEndpoint = result.data!;
			editedEndpoint = deepClone(result.data!);
			showToast(MESSAGES.ENDPOINT_SAVED, 'success');
			closeDrawer();
			return true;
		} finally {
			isSaving = false;
		}
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
		editedEndpoint = { ...editedEndpoint, path, pathParams };
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
		editedEndpoint = { ...editedEndpoint, queryParamsObjectId: objectId };
	}

	// ============================================================================
	// Request Body Object Selection
	// ============================================================================

	function handleSelectRequestBodyObject(objectId: string | undefined): void {
		if (!editedEndpoint) return;
		editedEndpoint = { ...editedEndpoint, requestBodyObjectId: objectId };
	}

	// ============================================================================
	// Response Body Object Selection
	// ============================================================================

	function handleSelectResponseBodyObject(objectId: string | undefined): void {
		if (!editedEndpoint) return;
		editedEndpoint = { ...editedEndpoint, responseBodyObjectId: objectId };
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

		if (!hasBeenCreated) {
			showToast('Please save the API before generating code', 'warning', 5000);
			return;
		}

		console.log('Generate code for API:', effectiveApiId);
		showToast('Code generation will be available when backend is deployed', 'info', 5000);
	}

	// ============================================================================
	// Return State API
	// ============================================================================

	return {
		get isNewApi() { return !hasBeenCreated; },
		get api() { return api; },
		get editedApi() { return editedApi; },
		set editedApi(v: Api | null) { editedApi = v; },
		get tags() { return tags; },
		get endpoints() { return endpoints; },
		get apiNamespaceId() { return apiNamespaceId; },
		get drawerOpen() { return drawerOpen; },
		set drawerOpen(v: boolean) { drawerOpen = v; },
		get selectedEndpoint() { return selectedEndpoint; },
		set selectedEndpoint(v: ApiEndpoint | null) { selectedEndpoint = v; },
		get editedEndpoint() { return editedEndpoint; },
		set editedEndpoint(v: ApiEndpoint | null) { editedEndpoint = v; },
		get tagInputValue() { return tagInputValue; },
		set tagInputValue(v: string) { tagInputValue = v; },
		get tagDropdownOpen() { return tagDropdownOpen; },
		set tagDropdownOpen(v: boolean) { tagDropdownOpen = v; },
		get showEndpointDeleteConfirm() { return showEndpointDeleteConfirm; },
		set showEndpointDeleteConfirm(v: boolean) { showEndpointDeleteConfirm = v; },
		get showCloseConfirm() { return showCloseConfirm; },
		set showCloseConfirm(v: boolean) { showCloseConfirm = v; },
		get hasApiChanges() { return hasApiChanges; },
		get hasEndpointChanges() { return hasEndpointChanges; },
		get hasAnyChanges() { return hasAnyChanges; },
		get isSaving() { return isSaving; },
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

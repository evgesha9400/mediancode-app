/**
 * API Generator State Container
 *
 * @deprecated This file is deprecated. Use apiDetailState.svelte.ts instead.
 * The /api-generator route now redirects to /apis.
 *
 * Encapsulates UI state and domain operations for the API generator page.
 * Follows the listViewState pattern: owns all state using Svelte runes and
 * delegates domain logic to apis.ts store.
 *
 * This consolidates ~400 lines of page-level logic into a testable, reusable module.
 */

import { get } from 'svelte/store';
import type { ApiMetadata, ApiEndpoint, ApiTag, EndpointParameter, ResponseShape } from '$lib/types';
import {
	apiMetadataStore,
	apisStore,
	endpointsStore,
	updateApiMetadata,
	addEndpoint,
	getTagByName,
	getEndpointById,
	getEndpointCountByTagName,
	addTagToApi,
	deleteTagFromApi,
	createDefaultEndpoint,
	updateEndpoint,
	duplicateEndpoint,
	deleteEndpoint,
	reconcilePathParams,
	normalizeEndpoint,
	createApi
} from './apis';
import { activeNamespaceId } from './namespaces';
import { fieldsStore, getFieldById } from './fields';
import { objectsStore } from './objects';
import { validatorsStore } from './validators';
import { showToast } from './toasts';
import { deepClone, generateParamId } from '$lib/utils/ids';

// Legacy API ID for backwards compatibility
const LEGACY_API_ID = 'legacy-api-generator';

/**
 * Toast message constants
 */
const MESSAGES = {
	ENDPOINT_SAVED: 'Endpoint saved successfully',
	ENDPOINT_DUPLICATED: 'Endpoint duplicated successfully',
	ENDPOINT_DELETED: 'Endpoint deleted successfully',
	TAG_CREATED: (name: string) => `Tag "${name}" created`,
	CODE_GENERATION_SOON: 'Code generation coming soon'
} as const;

/**
 * State returned by the factory for use in the API generator page.
 * All state properties are reactive and can be bound directly in templates.
 */
export interface ApiGeneratorState {
	// Reactive store subscriptions
	readonly metadata: ApiMetadata;
	readonly tags: ApiTag[];
	readonly endpoints: ApiEndpoint[];

	// Drawer state
	drawerOpen: boolean;
	selectedEndpoint: ApiEndpoint | null;
	editedEndpoint: ApiEndpoint | null;

	// Tag combobox state
	tagInputValue: string;
	tagDropdownOpen: boolean;
	tagToDelete: ApiTag | null;

	// Endpoint deletion confirmation state
	showEndpointDeleteConfirm: boolean;

	// Derived state
	readonly hasChanges: boolean;
	readonly exactTagMatch: ApiTag | undefined;

	// Metadata actions
	handleMetadataUpdate: (updates: Partial<ApiMetadata>) => void;

	// Tag actions
	handleTagSelect: (tagName: string | undefined) => void;
	handleCreateTag: () => void;
	handleDeleteTagClick: (e: Event, tag: ApiTag) => void;
	confirmDeleteTag: () => void;
	cancelDeleteTag: () => void;

	// Endpoint list actions
	handleAddEndpoint: () => void;
	handleDeleteEndpoint: () => void;
	handleDeleteEndpointClick: () => void;
	cancelDeleteEndpoint: () => void;
	handleDuplicateEndpoint: (endpointId: string) => void;

	// Drawer actions
	openEndpoint: (endpoint: ApiEndpoint) => void;
	closeDrawer: () => void;
	handleSave: () => boolean;
	handleUndo: () => void;
	handleCancel: () => void;

	// Endpoint editing actions
	handlePathChange: (newPath: string) => void;
	handlePathParamUpdate: (paramId: string, updates: Partial<EndpointParameter>) => void;
	handlePathParamDelete: (paramId: string) => void;

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
 * Creates the API generator state container
 */
export function createApiGeneratorState(): ApiGeneratorState {
	// Subscribe to stores - these will update reactively
	// We use direct store subscriptions instead of $effect for testability
	let metadata = $state(get(apiMetadataStore));
	let allApis = $state(get(apisStore));
	let allEndpoints = $state(get(endpointsStore));
	let currentNamespaceId = $state(get(activeNamespaceId));

	// Get tags from the legacy API (or empty array if it doesn't exist)
	let tags = $derived(allApis.find(a => a.id === LEGACY_API_ID)?.tags ?? []);
	let endpoints = $derived(allEndpoints.filter(e => e.namespaceId === currentNamespaceId));

	// Subscribe to store updates and update local state
	apiMetadataStore.subscribe(value => metadata = value);
	apisStore.subscribe(value => allApis = value);
	endpointsStore.subscribe(value => allEndpoints = value);
	activeNamespaceId.subscribe(value => currentNamespaceId = value);

	// Drawer state
	let drawerOpen = $state(false);
	let selectedEndpoint = $state<ApiEndpoint | null>(null);
	let editedEndpoint = $state<ApiEndpoint | null>(null);

	// Tag combobox state
	let tagInputValue = $state('');
	let tagDropdownOpen = $state(false);
	let tagToDelete = $state<ApiTag | null>(null);

	// Endpoint deletion confirmation state
	let showEndpointDeleteConfirm = $state(false);

	// Derived: Track if there are unsaved changes
	let hasChanges = $derived(
		editedEndpoint && selectedEndpoint
			? JSON.stringify(editedEndpoint) !== JSON.stringify(selectedEndpoint)
			: false
	);

	// Derived: Check if input matches an existing tag exactly
	let exactTagMatch = $derived(
		tags.find((t: ApiTag) => t.name.toLowerCase() === tagInputValue.toLowerCase().trim())
	);

	// ============================================================================
	// Metadata Operations
	// ============================================================================

	function handleMetadataUpdate(updates: Partial<ApiMetadata>): void {
		updateApiMetadata(updates);
	}

	// ============================================================================
	// Tag Operations
	// ============================================================================

	function getEndpointsUsingTag(tagName: string): number {
		return getEndpointCountByTagName(LEGACY_API_ID, tagName);
	}

	function handleTagSelect(tagName: string | undefined): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, tagName };
		tagInputValue = tagName ?? '';
		tagDropdownOpen = false;
	}

	function handleCreateTag(): void {
		if (!editedEndpoint || !tagInputValue.trim() || exactTagMatch) return;

		const newTag = addTagToApi(LEGACY_API_ID, tagInputValue.trim());

		if (!newTag) {
			showToast('Tag already exists', 'error');
			return;
		}

		editedEndpoint = { ...editedEndpoint, tagName: newTag.name };
		tagDropdownOpen = false;
		showToast(MESSAGES.TAG_CREATED(newTag.name), 'success');
	}

	function handleDeleteTagClick(e: Event, tag: ApiTag): void {
		e.stopPropagation();
		tagToDelete = tag;
	}

	function confirmDeleteTag(): void {
		if (!tagToDelete) return;

		const tagName = tagToDelete.name;
		const result = deleteTagFromApi(LEGACY_API_ID, tagName);

		// If current endpoint uses this tag, clear it from both edited and selected
		// to prevent Undo from resurrecting the deleted tag reference
		if (editedEndpoint?.tagName === tagName) {
			editedEndpoint = { ...editedEndpoint, tagName: undefined };
			tagInputValue = '';
		}
		if (selectedEndpoint?.tagName === tagName) {
			selectedEndpoint = { ...selectedEndpoint, tagName: undefined };
		}

		tagToDelete = null;

		if (result.success && result.error) {
			showToast(result.error, 'success');
		}
	}

	function cancelDeleteTag(): void {
		tagToDelete = null;
	}

	// ============================================================================
	// Endpoint List Operations
	// ============================================================================

	function handleAddEndpoint(): void {
		// createDefaultEndpoint() adds the endpoint to the store automatically
		const newEndpoint = createDefaultEndpoint(currentNamespaceId, LEGACY_API_ID);
		// Automatically open the new endpoint in the drawer
		openEndpoint(newEndpoint);
	}

	function handleDeleteEndpointClick(): void {
		showEndpointDeleteConfirm = true;
	}

	function handleDeleteEndpoint(): void {
		if (!editedEndpoint) return;

		const endpointId = editedEndpoint.id;
		const result = deleteEndpoint(endpointId);

		if (result.success) {
			showToast(MESSAGES.ENDPOINT_DELETED, 'success');
			showEndpointDeleteConfirm = false;
			closeDrawer();
		} else if (result.error) {
			showToast(result.error, 'error');
		}
	}

	function cancelDeleteEndpoint(): void {
		showEndpointDeleteConfirm = false;
	}

	function handleDuplicateEndpoint(endpointId: string): void {
		const duplicated = duplicateEndpoint(endpointId);

		if (duplicated) {
			showToast(MESSAGES.ENDPOINT_DUPLICATED, 'success');
		} else {
			showToast('Failed to duplicate endpoint', 'error');
		}
	}

	// ============================================================================
	// Drawer Operations
	// ============================================================================

	function openEndpoint(endpoint: ApiEndpoint): void {
		// Normalize endpoint to ensure all response shape fields exist
		const normalized = normalizeEndpoint(endpoint);

		selectedEndpoint = normalized;
		editedEndpoint = deepClone(normalized);
		drawerOpen = true;

		// Initialize tag input
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

	function handleSave(): boolean {
		if (!editedEndpoint || !selectedEndpoint) return false;

		updateEndpoint(editedEndpoint.id, editedEndpoint);
		selectedEndpoint = editedEndpoint;
		showToast(MESSAGES.ENDPOINT_SAVED, 'success');
		closeDrawer();
		return true;
	}


	function handleUndo(): void {
		if (!selectedEndpoint) return;

		editedEndpoint = deepClone(selectedEndpoint);

		// Sync tag input with restored endpoint
		tagInputValue = editedEndpoint?.tagName ?? '';
	}

	function handleCancel(): void {
		closeDrawer();
	}

	// ============================================================================
	// Endpoint Editing Operations
	// ============================================================================

	function handlePathChange(newPath: string): void {
		if (!editedEndpoint) return;

		// Use centralized reconciliation logic (changes stay local until Save)
		const { path, pathParams } = reconcilePathParams(newPath, editedEndpoint.pathParams);

		// Update local edited state only (changes persist on Save)
		editedEndpoint = {
			...editedEndpoint,
			path,
			pathParams
		};
	}

	function handlePathParamUpdate(paramId: string, updates: Partial<EndpointParameter>): void {
		if (!editedEndpoint) return;

		const updatedParams = editedEndpoint.pathParams.map(p =>
			p.id === paramId ? { ...p, ...updates } : p
		);
		editedEndpoint = { ...editedEndpoint, pathParams: updatedParams };
	}

	function handlePathParamDelete(paramId: string): void {
		if (!editedEndpoint) return;

		const updatedParams = editedEndpoint.pathParams.filter(p => p.id !== paramId);
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

		// Simple shape switching - both options use object fields
		// No need to clear anything as both 'object' and 'list' use responseBodyFieldIds
		editedEndpoint = { ...editedEndpoint, responseShape: shape };
	}

	function handleResetResponseDefaults(): void {
		if (!editedEndpoint) return;

		editedEndpoint = {
			...editedEndpoint,
			useEnvelope: true,
			responseShape: 'object',
			// Clear object selection when resetting
			responseBodyObjectId: undefined
		};
	}

	// ============================================================================
	// Code Generation
	// ============================================================================

	function handleGenerateCode(): void {
		// Gather all data from stores for code generation
		const requestPayload = {
			metadata: get(apiMetadataStore),
			apis: get(apisStore),
			endpoints: get(endpointsStore),
			objects: get(objectsStore),
			fields: get(fieldsStore),
			validators: get(validatorsStore)
		};

		// Log the payload for development/testing
		console.log('Generate request payload:', requestPayload);

		// TODO: Make API call to /v1/generate endpoint
		// This will be implemented when the backend is deployed
		showToast('Code generation will be available when backend is deployed', 'info', 5000);
	}

	// ============================================================================
	// Return State API
	// ============================================================================

	return {
		// Store subscriptions (readonly)
		get metadata() { return metadata; },
		get tags() { return tags; },
		get endpoints() { return endpoints; },

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

		get tagToDelete() { return tagToDelete; },
		set tagToDelete(v: ApiTag | null) { tagToDelete = v; },

		get showEndpointDeleteConfirm() { return showEndpointDeleteConfirm; },
		set showEndpointDeleteConfirm(v: boolean) { showEndpointDeleteConfirm = v; },

		// Derived state (readonly)
		get hasChanges() { return hasChanges; },
		get exactTagMatch() { return exactTagMatch; },

		// Actions
		handleMetadataUpdate,
		handleTagSelect,
		handleCreateTag,
		handleDeleteTagClick,
		confirmDeleteTag,
		cancelDeleteTag,
		handleAddEndpoint,
		handleDeleteEndpoint,
		handleDeleteEndpointClick,
		cancelDeleteEndpoint,
		handleDuplicateEndpoint,
		openEndpoint,
		closeDrawer,
		handleSave,
		handleUndo,
		handleCancel,
		handlePathChange,
		handlePathParamUpdate,
		handlePathParamDelete,
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

/**
 * API Generator State Container
 *
 * Encapsulates UI state and domain operations for the API generator page.
 * Follows the listViewState pattern: owns all state using Svelte runes and
 * delegates domain logic to apis.ts store.
 *
 * This consolidates ~400 lines of page-level logic into a testable, reusable module.
 */

import { get } from 'svelte/store';
import type { ApiMetadata, ApiEndpoint, EndpointTag, EndpointParameter, ResponseShape, ResponseItemShape } from '$lib/types';
import {
	apiMetadataStore,
	tagsStore,
	endpointsStore,
	updateApiMetadata,
	addEndpoint,
	getTagById,
	getEndpointById,
	getEndpointCountByTag,
	createTag,
	deleteTagWithCleanup,
	createDefaultEndpoint,
	updateEndpoint,
	duplicateEndpoint,
	deleteEndpoint,
	reconcilePathParams,
	normalizeEndpoint
} from './apis';
import { getFieldById } from './fields';
import { showToast } from './toasts';
import { deepClone, generateParamId } from '$lib/utils/ids';

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
	readonly tags: EndpointTag[];
	readonly endpoints: ApiEndpoint[];

	// Drawer state
	drawerOpen: boolean;
	selectedEndpoint: ApiEndpoint | null;
	editedEndpoint: ApiEndpoint | null;

	// Tag combobox state
	tagInputValue: string;
	tagDropdownOpen: boolean;
	tagToDelete: EndpointTag | null;

	// Derived state
	readonly hasChanges: boolean;
	readonly exactTagMatch: EndpointTag | undefined;

	// Metadata actions
	handleMetadataUpdate: (updates: Partial<ApiMetadata>) => void;

	// Tag actions
	handleTagSelect: (tagId: string | undefined) => void;
	handleCreateTag: () => void;
	handleDeleteTagClick: (e: Event, tag: EndpointTag) => void;
	confirmDeleteTag: () => void;
	cancelDeleteTag: () => void;

	// Endpoint list actions
	handleAddEndpoint: () => void;
	handleDeleteEndpoint: (endpointId: string) => void;
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
	handleQueryParamUpdate: (paramId: string, updates: Partial<EndpointParameter>) => void;
	handleQueryParamDelete: (paramId: string) => void;
	handleAddQueryParam: () => void;

	// Request body field selection
	handleAddRequestBodyField: (fieldId: string) => void;
	handleRemoveRequestBodyField: (fieldId: string) => void;

	// Response body field selection
	handleAddResponseBodyField: (fieldId: string) => void;
	handleRemoveResponseBodyField: (fieldId: string) => void;
	handleEnvelopeToggle: (enabled: boolean) => void;

	// Response shape configuration
	handleSetResponseShape: (shape: ResponseShape) => void;
	handleSetResponseItemShape: (itemShape: ResponseItemShape) => void;
	handleSetResponsePrimitiveField: (fieldId: string | undefined) => void;
	handleResetResponseDefaults: () => void;

	// Code generation
	handleGenerateCode: () => void;

	// Helper
	getEndpointsUsingTag: (tagId: string) => number;
}

/**
 * Creates the API generator state container
 */
export function createApiGeneratorState(): ApiGeneratorState {
	// Subscribe to stores - these will update reactively
	// We use direct store subscriptions instead of $effect for testability
	let metadata = $state(get(apiMetadataStore));
	let tags = $state(get(tagsStore));
	let endpoints = $state(get(endpointsStore));

	// Subscribe to store updates and update local state
	apiMetadataStore.subscribe(value => metadata = value);
	tagsStore.subscribe(value => tags = value);
	endpointsStore.subscribe(value => endpoints = value);

	// Drawer state
	let drawerOpen = $state(false);
	let selectedEndpoint = $state<ApiEndpoint | null>(null);
	let editedEndpoint = $state<ApiEndpoint | null>(null);

	// Tag combobox state
	let tagInputValue = $state('');
	let tagDropdownOpen = $state(false);
	let tagToDelete = $state<EndpointTag | null>(null);

	// Derived: Track if there are unsaved changes
	let hasChanges = $derived(
		editedEndpoint && selectedEndpoint
			? JSON.stringify(editedEndpoint) !== JSON.stringify(selectedEndpoint)
			: false
	);

	// Derived: Check if input matches an existing tag exactly
	let exactTagMatch = $derived(
		tags.find((t: EndpointTag) => t.name.toLowerCase() === tagInputValue.toLowerCase().trim())
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

	function getEndpointsUsingTag(tagId: string): number {
		return getEndpointCountByTag(tagId);
	}

	function handleTagSelect(tagId: string | undefined): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, tagId };
		tagInputValue = tagId ? (getTagById(tagId)?.name || '') : '';
		tagDropdownOpen = false;
	}

	function handleCreateTag(): void {
		if (!editedEndpoint || !tagInputValue.trim() || exactTagMatch) return;

		const newTag = createTag(tagInputValue.trim());

		if (!newTag) {
			showToast('Tag already exists', 'error');
			return;
		}

		editedEndpoint = { ...editedEndpoint, tagId: newTag.id };
		tagDropdownOpen = false;
		showToast(MESSAGES.TAG_CREATED(newTag.name), 'success');
	}

	function handleDeleteTagClick(e: Event, tag: EndpointTag): void {
		e.stopPropagation();
		tagToDelete = tag;
	}

	function confirmDeleteTag(): void {
		if (!tagToDelete) return;

		const result = deleteTagWithCleanup(tagToDelete.id);

		// If current endpoint uses this tag, clear it from both edited and selected
		// to prevent Undo from resurrecting the deleted tag reference
		if (editedEndpoint?.tagId === tagToDelete.id) {
			editedEndpoint = { ...editedEndpoint, tagId: undefined };
			tagInputValue = '';
		}
		if (selectedEndpoint?.tagId === tagToDelete.id) {
			selectedEndpoint = { ...selectedEndpoint, tagId: undefined };
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
		const newEndpoint = createDefaultEndpoint();
		// Automatically open the new endpoint in the drawer
		openEndpoint(newEndpoint);
	}

	function handleDeleteEndpoint(endpointId: string): void {
		const result = deleteEndpoint(endpointId);

		if (result.success) {
			showToast(MESSAGES.ENDPOINT_DELETED, 'success');

			// Close drawer if deleting the currently open endpoint
			if (selectedEndpoint?.id === endpointId) {
				closeDrawer();
			}
		} else if (result.error) {
			showToast(result.error, 'error');
		}
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
		tagInputValue = normalized.tagId ? (getTagById(normalized.tagId)?.name || '') : '';
		tagDropdownOpen = false;
	}

	function closeDrawer(): void {
		drawerOpen = false;

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
		return true;
	}


	function handleUndo(): void {
		if (!selectedEndpoint) return;

		editedEndpoint = deepClone(selectedEndpoint);

		// Sync tag input with restored endpoint
		tagInputValue = editedEndpoint?.tagId
			? (getTagById(editedEndpoint.tagId)?.name || '')
			: '';
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

	function handleQueryParamUpdate(paramId: string, updates: Partial<EndpointParameter>): void {
		if (!editedEndpoint) return;

		const updatedParams = editedEndpoint.queryParams.map(p =>
			p.id === paramId ? { ...p, ...updates } : p
		);
		editedEndpoint = { ...editedEndpoint, queryParams: updatedParams };
	}

	function handleQueryParamDelete(paramId: string): void {
		if (!editedEndpoint) return;

		const updatedParams = editedEndpoint.queryParams.filter(p => p.id !== paramId);
		editedEndpoint = { ...editedEndpoint, queryParams: updatedParams };
	}

	function handleAddQueryParam(): void {
		if (!editedEndpoint) return;

		// Create new parameter locally (changes persist on Save)
		const newParam: EndpointParameter = {
			id: generateParamId(),
			name: 'new_param',
			type: '',
			description: '',
			required: false
		};

		// Update local edited state only
		editedEndpoint = {
			...editedEndpoint,
			queryParams: [...editedEndpoint.queryParams, newParam]
		};
	}

	// ============================================================================
	// Request Body Field Selection
	// ============================================================================

	function handleAddRequestBodyField(fieldId: string): void {
		if (!editedEndpoint) return;

		// Validate field exists in registry
		const field = getFieldById(fieldId);
		if (!field) {
			showToast('Field not found in registry', 'error');
			return;
		}

		// Prevent duplicates
		if (editedEndpoint.requestBodyFieldIds.includes(fieldId)) return;

		editedEndpoint = {
			...editedEndpoint,
			requestBodyFieldIds: [...editedEndpoint.requestBodyFieldIds, fieldId]
		};
	}

	function handleRemoveRequestBodyField(fieldId: string): void {
		if (!editedEndpoint) return;

		editedEndpoint = {
			...editedEndpoint,
			requestBodyFieldIds: editedEndpoint.requestBodyFieldIds.filter(id => id !== fieldId)
		};
	}

	// ============================================================================
	// Response Body Field Selection
	// ============================================================================

	function handleAddResponseBodyField(fieldId: string): void {
		if (!editedEndpoint) return;

		// Validate field exists in registry
		const field = getFieldById(fieldId);
		if (!field) {
			showToast('Field not found in registry', 'error');
			return;
		}

		// Prevent duplicates
		if (editedEndpoint.responseBodyFieldIds.includes(fieldId)) return;

		editedEndpoint = {
			...editedEndpoint,
			responseBodyFieldIds: [...editedEndpoint.responseBodyFieldIds, fieldId]
		};
	}

	function handleRemoveResponseBodyField(fieldId: string): void {
		if (!editedEndpoint) return;

		editedEndpoint = {
			...editedEndpoint,
			responseBodyFieldIds: editedEndpoint.responseBodyFieldIds.filter(id => id !== fieldId)
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

		// Clear conflicting selections when switching shapes
		const updates: Partial<ApiEndpoint> = { responseShape: shape };

		if (shape === 'primitive') {
			// Clear object/list field selections when switching to primitive
			updates.responseBodyFieldIds = [];
			// Keep responsePrimitiveFieldId if set, otherwise leave undefined
		} else if (shape === 'object') {
			// Clear primitive selection when switching to object
			updates.responsePrimitiveFieldId = undefined;
			// Keep responseBodyFieldIds for object shape
		} else if (shape === 'list') {
			// Keep current item shape, but clear primitive field if item shape is object
			if (editedEndpoint.responseItemShape === 'object') {
				updates.responsePrimitiveFieldId = undefined;
			} else {
				// Clear object fields if item shape is primitive
				updates.responseBodyFieldIds = [];
			}
		}

		editedEndpoint = { ...editedEndpoint, ...updates };
	}

	function handleSetResponseItemShape(itemShape: ResponseItemShape): void {
		if (!editedEndpoint) return;

		// Clear conflicting selections when switching item shapes
		const updates: Partial<ApiEndpoint> = { responseItemShape: itemShape };

		if (itemShape === 'primitive') {
			// Clear object fields when switching to primitive items
			updates.responseBodyFieldIds = [];
		} else {
			// Clear primitive field when switching to object items
			updates.responsePrimitiveFieldId = undefined;
		}

		editedEndpoint = { ...editedEndpoint, ...updates };
	}

	function handleSetResponsePrimitiveField(fieldId: string | undefined): void {
		if (!editedEndpoint) return;

		// Validate field exists if provided
		if (fieldId) {
			const field = getFieldById(fieldId);
			if (!field) {
				showToast('Field not found in registry', 'error');
				return;
			}
		}

		editedEndpoint = { ...editedEndpoint, responsePrimitiveFieldId: fieldId };
	}

	function handleResetResponseDefaults(): void {
		if (!editedEndpoint) return;

		editedEndpoint = {
			...editedEndpoint,
			useEnvelope: true,
			responseShape: 'object',
			responseItemShape: 'object',
			// Clear field selections when resetting
			responseBodyFieldIds: [],
			responsePrimitiveFieldId: undefined
		};
	}

	// ============================================================================
	// Code Generation
	// ============================================================================

	function handleGenerateCode(): void {
		showToast(MESSAGES.CODE_GENERATION_SOON, 'info', 3000);
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
		set tagToDelete(v: EndpointTag | null) { tagToDelete = v; },

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
		handleDuplicateEndpoint,
		openEndpoint,
		closeDrawer,
		handleSave,
		handleUndo,
		handleCancel,
		handlePathChange,
		handlePathParamUpdate,
		handlePathParamDelete,
		handleQueryParamUpdate,
		handleQueryParamDelete,
		handleAddQueryParam,
		handleAddRequestBodyField,
		handleRemoveRequestBodyField,
		handleAddResponseBodyField,
		handleRemoveResponseBodyField,
		handleEnvelopeToggle,
		handleSetResponseShape,
		handleSetResponseItemShape,
		handleSetResponsePrimitiveField,
		handleResetResponseDefaults,
		handleGenerateCode,
		getEndpointsUsingTag
	};
}

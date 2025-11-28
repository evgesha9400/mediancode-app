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
import type { ApiMetadata, ApiEndpoint, EndpointTag, EndpointParameter, BodyMode, BodyValidationError } from '$lib/types';
import {
	apiMetadataStore,
	tagsStore,
	endpointsStore,
	updateApiMetadata,
	getTagById,
	getEndpointById,
	getEndpointCountByTag,
	createTag,
	deleteTagWithCleanup,
	createDefaultEndpoint,
	updateEndpoint,
	duplicateEndpoint,
	deleteEndpoint,
	reconcilePathParams
} from './apis';
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
	CODE_GENERATION_SOON: 'Code generation coming soon',
	VALIDATION_ERROR_REQUEST: 'Fix request body errors before saving',
	VALIDATION_ERROR_RESPONSE: 'Fix response body errors before saving'
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

	// Request body editing actions
	handleRequestBodyModeChange: (mode: BodyMode) => void;
	handleRequestBodyFieldUpdate: (fieldId: string, updates: Partial<EndpointParameter>) => void;
	handleRequestBodyFieldDelete: (fieldId: string) => void;
	handleAddRequestBodyField: () => void;
	handleRequestBodyJsonChange: (json: string) => void;

	// Response body editing actions
	handleResponseBodyModeChange: (mode: BodyMode) => void;
	handleResponseBodyFieldUpdate: (fieldId: string, updates: Partial<EndpointParameter>) => void;
	handleResponseBodyFieldDelete: (fieldId: string) => void;
	handleAddResponseBodyField: () => void;
	handleResponseBodyJsonChange: (json: string) => void;
	handleCopyRequestToResponse: () => void;
	handleEnvelopeToggle: (enabled: boolean) => void;

	// Body validation
	readonly requestBodyErrors: BodyValidationError[];
	readonly responseBodyErrors: BodyValidationError[];

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
		selectedEndpoint = endpoint;
		editedEndpoint = deepClone(endpoint);
		drawerOpen = true;

		// Initialize tag input
		tagInputValue = endpoint.tagId ? (getTagById(endpoint.tagId)?.name || '') : '';
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

		// Validate request body before saving
		if (getRequestBodyErrors().length > 0) {
			showToast(MESSAGES.VALIDATION_ERROR_REQUEST, 'error');
			return false;
		}

		// Validate response body before saving
		if (getResponseBodyErrors().length > 0) {
			showToast(MESSAGES.VALIDATION_ERROR_RESPONSE, 'error');
			return false;
		}

		// Serialize structured bodies to legacy fields for backwards compatibility
		const endpointToSave = {
			...editedEndpoint,
			requestBody: serializeRequestBody(editedEndpoint),
			responseBody: serializeResponseBody(editedEndpoint)
		};

		updateEndpoint(endpointToSave.id, endpointToSave);
		selectedEndpoint = endpointToSave;
		showToast(MESSAGES.ENDPOINT_SAVED, 'success');
		return true;
	}

	// ============================================================================
	// Body Serialization (for legacy field compatibility)
	// ============================================================================

	/**
	 * Serialize request body from structured fields to legacy string format
	 */
	function serializeRequestBody(endpoint: ApiEndpoint): string | undefined {
		if (endpoint.requestBodyMode === 'none') {
			return undefined;
		}

		if (endpoint.requestBodyMode === 'fields') {
			// Build JSON from fields
			const body: Record<string, any> = {};
			endpoint.requestBodyFields.forEach(field => {
				// Use field name as key (type information is metadata, not in JSON)
				body[field.name] = getExampleValue(field.type);
			});
			return JSON.stringify(body, null, 2);
		}

		if (endpoint.requestBodyMode === 'json') {
			// Use raw JSON (validate it first)
			try {
				const parsed = JSON.parse(endpoint.requestBodyJson);
				return JSON.stringify(parsed, null, 2);
			} catch {
				return endpoint.requestBodyJson;
			}
		}

		return undefined;
	}

	/**
	 * Serialize response body from structured fields to legacy string format
	 */
	function serializeResponseBody(endpoint: ApiEndpoint): string {
		if (endpoint.responseBodyMode === 'none') {
			return '{}';
		}

		let bodyContent: any = {};

		if (endpoint.responseBodyMode === 'fields') {
			// Build JSON from fields
			endpoint.responseBodyFields.forEach(field => {
				bodyContent[field.name] = getExampleValue(field.type);
			});
		} else if (endpoint.responseBodyMode === 'json') {
			// Use raw JSON (validate it first)
			try {
				bodyContent = JSON.parse(endpoint.responseBodyJson);
			} catch {
				return endpoint.responseBodyJson;
			}
		}

		// Wrap in envelope if enabled
		if (endpoint.useEnvelope) {
			bodyContent = {
				success: true,
				data: bodyContent,
				error: null
			};
		}

		return JSON.stringify(bodyContent, null, 2);
	}

	/**
	 * Get example value for a field type (used in serialization)
	 */
	function getExampleValue(type: string): any {
		const normalizedType = type.toLowerCase();

		if (normalizedType === 'string') {
			return 'string';
		} else if (normalizedType === 'int' || normalizedType === 'integer') {
			return 0;
		} else if (normalizedType === 'float' || normalizedType === 'number' || normalizedType === 'double') {
			return 0.0;
		} else if (normalizedType === 'bool' || normalizedType === 'boolean') {
			return true;
		} else if (normalizedType === 'uuid') {
			return '00000000-0000-0000-0000-000000000000';
		} else if (normalizedType === 'datetime') {
			return '2024-01-01T00:00:00Z';
		} else if (normalizedType === 'date') {
			return '2024-01-01';
		} else if (normalizedType === 'time') {
			return '00:00:00';
		} else {
			return null;
		}
	}

	// Helper functions to get current validation errors (for use in handleSave)
	function getRequestBodyErrors(): BodyValidationError[] {
		if (!editedEndpoint) return [];

		if (editedEndpoint.requestBodyMode === 'fields') {
			return validateBodyFields(editedEndpoint.requestBodyFields);
		} else if (editedEndpoint.requestBodyMode === 'json') {
			return validateJson(editedEndpoint.requestBodyJson);
		}

		return [];
	}

	function getResponseBodyErrors(): BodyValidationError[] {
		if (!editedEndpoint) return [];

		if (editedEndpoint.responseBodyMode === 'fields') {
			return validateBodyFields(editedEndpoint.responseBodyFields);
		} else if (editedEndpoint.responseBodyMode === 'json') {
			return validateJson(editedEndpoint.responseBodyJson);
		}

		return [];
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
	// Request Body Operations
	// ============================================================================

	function handleRequestBodyModeChange(mode: BodyMode): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, requestBodyMode: mode };
	}

	function handleRequestBodyFieldUpdate(fieldId: string, updates: Partial<EndpointParameter>): void {
		if (!editedEndpoint) return;

		const updatedFields = editedEndpoint.requestBodyFields.map(f =>
			f.id === fieldId ? { ...f, ...updates } : f
		);
		editedEndpoint = { ...editedEndpoint, requestBodyFields: updatedFields };
	}

	function handleRequestBodyFieldDelete(fieldId: string): void {
		if (!editedEndpoint) return;

		const updatedFields = editedEndpoint.requestBodyFields.filter(f => f.id !== fieldId);
		editedEndpoint = { ...editedEndpoint, requestBodyFields: updatedFields };
	}

	function handleAddRequestBodyField(): void {
		if (!editedEndpoint) return;

		const newField: EndpointParameter = {
			id: generateParamId(),
			name: 'new_field',
			type: '',
			description: '',
			required: false
		};

		editedEndpoint = {
			...editedEndpoint,
			requestBodyFields: [...editedEndpoint.requestBodyFields, newField]
		};
	}

	function handleRequestBodyJsonChange(json: string): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, requestBodyJson: json };
	}

	// ============================================================================
	// Response Body Operations
	// ============================================================================

	function handleResponseBodyModeChange(mode: BodyMode): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, responseBodyMode: mode };
	}

	function handleResponseBodyFieldUpdate(fieldId: string, updates: Partial<EndpointParameter>): void {
		if (!editedEndpoint) return;

		const updatedFields = editedEndpoint.responseBodyFields.map(f =>
			f.id === fieldId ? { ...f, ...updates } : f
		);
		editedEndpoint = { ...editedEndpoint, responseBodyFields: updatedFields };
	}

	function handleResponseBodyFieldDelete(fieldId: string): void {
		if (!editedEndpoint) return;

		const updatedFields = editedEndpoint.responseBodyFields.filter(f => f.id !== fieldId);
		editedEndpoint = { ...editedEndpoint, responseBodyFields: updatedFields };
	}

	function handleAddResponseBodyField(): void {
		if (!editedEndpoint) return;

		const newField: EndpointParameter = {
			id: generateParamId(),
			name: 'new_field',
			type: '',
			description: '',
			required: false
		};

		editedEndpoint = {
			...editedEndpoint,
			responseBodyFields: [...editedEndpoint.responseBodyFields, newField]
		};
	}

	function handleResponseBodyJsonChange(json: string): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, responseBodyJson: json };
	}

	function handleCopyRequestToResponse(): void {
		if (!editedEndpoint) return;

		// Clone request body fields with new IDs
		const clonedFields = editedEndpoint.requestBodyFields.map(f => ({
			...f,
			id: generateParamId()
		}));

		editedEndpoint = {
			...editedEndpoint,
			responseBodyMode: editedEndpoint.requestBodyMode,
			responseBodyFields: clonedFields,
			responseBodyJson: editedEndpoint.requestBodyJson
		};
	}

	function handleEnvelopeToggle(enabled: boolean): void {
		if (!editedEndpoint) return;

		editedEndpoint = { ...editedEndpoint, useEnvelope: enabled };
	}

	// ============================================================================
	// Body Validation
	// ============================================================================

	function validateBodyFields(fields: EndpointParameter[]): BodyValidationError[] {
		const errors: BodyValidationError[] = [];

		fields.forEach(field => {
			if (!field.name.trim()) {
				errors.push({ field: field.id, message: 'Field name is required' });
			}
			if (!field.type.trim()) {
				errors.push({ field: field.id, message: 'Field type is required' });
			}
		});

		return errors;
	}

	function validateJson(json: string): BodyValidationError[] {
		if (!json.trim()) {
			return [];
		}

		try {
			JSON.parse(json);
			return [];
		} catch (e) {
			return [{ message: 'Invalid JSON syntax' }];
		}
	}

	// Derived validation errors (use helper functions for reactivity)
	let requestBodyErrors = $derived.by(() => getRequestBodyErrors());
	let responseBodyErrors = $derived.by(() => getResponseBodyErrors());

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
		handleRequestBodyModeChange,
		handleRequestBodyFieldUpdate,
		handleRequestBodyFieldDelete,
		handleAddRequestBodyField,
		handleRequestBodyJsonChange,
		handleResponseBodyModeChange,
		handleResponseBodyFieldUpdate,
		handleResponseBodyFieldDelete,
		handleAddResponseBodyField,
		handleResponseBodyJsonChange,
		handleCopyRequestToResponse,
		handleEnvelopeToggle,
		get requestBodyErrors() { return requestBodyErrors; },
		get responseBodyErrors() { return responseBodyErrors; },
		handleGenerateCode,
		getEndpointsUsingTag
	};
}

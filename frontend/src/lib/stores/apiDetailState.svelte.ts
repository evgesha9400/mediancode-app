/**
 * API Detail State Container
 *
 * Encapsulates UI state for the API detail page.
 * All mutations go through the canonical domain layer (save-per-action).
 *
 * Existing-API only: creation is handled on the list page via a drawer.
 * This factory manages:
 * - Endpoint CRUD (add, save, undo, delete, duplicate)
 * - Edit API drawer (metadata editing)
 * - Tag section state (Swagger-style collapsible groups)
 */

import { fromStore } from 'svelte/store';
import type { Api, ApiEndpoint, ResponseShape } from '$lib/types';
import {
	apisStore,
	endpointsStore,
	getEndpointCountByTagName
} from './apis';
import { showToast } from './toasts';
import { deepClone } from '$lib/utils/ids';
import {
	updateApiAction,
	deleteApiAction,
	createEndpointAction,
	updateEndpointAction,
	deleteEndpointAction
} from '$lib/domain/mutations';
import { reconcilePathParams, normalizeEndpoint } from '$lib/domain/endpointReducer';

/**
 * Toast message constants
 */
const MESSAGES = {
	API_SAVED: 'API saved successfully',
	API_DELETED: 'API deleted successfully',
	ENDPOINT_SAVED: 'Endpoint saved successfully',
	ENDPOINT_DUPLICATED: 'Endpoint duplicated successfully',
	ENDPOINT_DELETED: 'Endpoint deleted successfully'
} as const;

/**
 * A tag section: a group of endpoints sharing a tag name.
 */
export interface TagSection {
	tag: string;
	endpoints: ApiEndpoint[];
}

/**
 * State returned by the factory for use in the API detail page.
 */
export interface ApiDetailState {
	// The API from the store
	readonly api: Api | null;

	// Derived tags (unique tagName values from endpoints)
	readonly tags: string[];
	readonly endpoints: ApiEndpoint[];

	// The namespace ID for this API
	readonly apiNamespaceId: string;

	// --- Tag sections (Swagger-style) ---
	readonly allTagSections: TagSection[];
	readonly expandedTags: Set<string>;
	toggleTagSection: (tag: string) => void;

	// --- Edit API drawer ---
	readonly editDrawerOpen: boolean;
	editForm: { title: string; version: string; description: string; serverUrl: string; baseUrl: string };
	readonly hasEditChanges: boolean;
	readonly showEditDeleteConfirm: boolean;
	openEditDrawer: () => void;
	closeEditDrawer: () => void;
	handleEditSave: () => Promise<void>;
	handleEditUndo: () => void;
	handleDeleteApi: () => Promise<void>;
	handleEditDeleteClick: () => void;
	cancelEditDelete: () => void;

	// --- Endpoint drawer ---
	readonly isCreating: boolean;
	endpointDrawerOpen: boolean;
	selectedEndpoint: ApiEndpoint | null;
	editedEndpoint: ApiEndpoint | null;

	// Tag combobox state
	tagInputValue: string;
	tagDropdownOpen: boolean;

	// Endpoint deletion confirmation state
	showEndpointDeleteConfirm: boolean;

	// Derived state
	readonly hasEndpointChanges: boolean;

	// Loading state for async operations
	readonly isSaving: boolean;

	// Tag actions
	handleTagSelect: (tagName: string | undefined) => void;

	// Endpoint list actions
	handleAddEndpoint: () => void;
	handleCreateEndpoint: () => Promise<void>;
	handleCancelCreate: () => void;
	handleDeleteEndpoint: () => Promise<void>;
	handleDeleteEndpointClick: () => void;
	cancelDeleteEndpoint: () => void;
	handleDuplicateEndpoint: (endpointId: string) => Promise<void>;

	// Endpoint drawer actions
	openEndpoint: (endpoint: ApiEndpoint) => void;
	closeEndpointDrawer: () => void;
	handleSaveEndpoint: () => Promise<boolean>;
	handleUndoEndpoint: () => void;

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

	// Helper
	getEndpointsUsingTag: (tagName: string) => number;
}

/**
 * Configuration for creating API detail state
 */
export interface ApiDetailStateConfig {
	apiId: string;              // Always a real API ID (never 'new')
	onNavigateBack: () => void; // Called on back/delete-success
}

/**
 * Creates the API detail state container for a specific existing API
 */
export function createApiDetailState(config: ApiDetailStateConfig): ApiDetailState {
	const { apiId, onNavigateBack } = config;

	// Subscribe to stores reactively via fromStore (automatic cleanup)
	const apisState = fromStore(apisStore);
	const endpointsState = fromStore(endpointsStore);
	let allApis = $derived(apisState.current);
	let allEndpoints = $derived(endpointsState.current);

	// The current API from store
	let storedApi = $derived(allApis.find(a => a.id === apiId) ?? null);
	let api = $derived(storedApi);

	// Derived: the namespace ID for this API
	let apiNamespaceId = $derived(storedApi?.namespaceId ?? '');

	// Endpoints from the store
	let endpoints = $derived(allEndpoints.filter(e => e.apiId === apiId));

	// Derived tags: collect unique tagName values from endpoints
	let tags = $derived.by(() => {
		const tagNames = new Set<string>();
		for (const ep of endpoints) {
			if (ep.tagName) tagNames.add(ep.tagName);
		}
		return [...tagNames].sort();
	});

	// ============================================================================
	// Tag Sections (Swagger-style collapsible groups)
	// ============================================================================

	let allTagSections = $derived.by((): TagSection[] => {
		const groups = new Map<string, ApiEndpoint[]>();
		for (const ep of endpoints) {
			const tag = ep.tagName || 'default';
			const existing = groups.get(tag) ?? [];
			existing.push(ep);
			groups.set(tag, existing);
		}
		// Sort alphabetically, but put 'default' last
		return [...groups.entries()]
			.sort(([a], [b]) => {
				if (a === 'default') return 1;
				if (b === 'default') return -1;
				return a.localeCompare(b);
			})
			.map(([tag, eps]) => ({ tag, endpoints: eps }));
	});

	let expandedTags = $state(new Set<string>());
	let expandedTagsInitialized = $state(false);

	$effect(() => {
		const sections = allTagSections;
		if (!expandedTagsInitialized && sections.length > 0) {
			expandedTags = new Set(sections.map(s => s.tag));
			expandedTagsInitialized = true;
		}
	});

	function toggleTagSection(tag: string): void {
		const next = new Set(expandedTags);
		if (next.has(tag)) {
			next.delete(tag);
		} else {
			next.add(tag);
		}
		expandedTags = next;
	}

	// ============================================================================
	// Edit API Drawer
	// ============================================================================

	let editDrawerOpen = $state(false);
	let editForm = $state({
		title: '',
		version: '',
		description: '',
		serverUrl: '',
		baseUrl: ''
	});
	let originalEditFormSnapshot = $state('');
	let hasEditChanges = $derived(JSON.stringify(editForm) !== originalEditFormSnapshot);
	let showEditDeleteConfirm = $state(false);

	function openEditDrawer(): void {
		// Close endpoint drawer first
		closeEndpointDrawer();
		if (storedApi) {
			editForm = {
				title: storedApi.title,
				version: storedApi.version,
				description: storedApi.description,
				serverUrl: storedApi.serverUrl,
				baseUrl: storedApi.baseUrl
			};
			originalEditFormSnapshot = JSON.stringify(editForm);
		}
		showEditDeleteConfirm = false;
		editDrawerOpen = true;
	}

	function closeEditDrawer(): void {
		editDrawerOpen = false;
		showEditDeleteConfirm = false;
	}

	async function handleEditSave(): Promise<void> {
		isSaving = true;
		try {
			const result = await updateApiAction(apiId, {
				title: editForm.title,
				version: editForm.version,
				description: editForm.description,
				serverUrl: editForm.serverUrl,
				baseUrl: editForm.baseUrl
			});

			if (!result.success) {
				showToast(result.error ?? 'Failed to save API', 'error');
				return;
			}

			originalEditFormSnapshot = JSON.stringify(editForm);
			showToast(MESSAGES.API_SAVED, 'success');
			closeEditDrawer();
		} finally {
			isSaving = false;
		}
	}

	function handleEditUndo(): void {
		if (originalEditFormSnapshot) {
			editForm = JSON.parse(originalEditFormSnapshot);
		}
	}

	function handleEditDeleteClick(): void {
		showEditDeleteConfirm = true;
	}

	function cancelEditDelete(): void {
		showEditDeleteConfirm = false;
	}

	async function handleDeleteApi(): Promise<void> {
		isSaving = true;
		try {
			const apiTitle = storedApi?.title ?? 'this API';
			const result = await deleteApiAction(apiId);

			if (result.success) {
				showToast(`API "${apiTitle}" deleted successfully`, 'success');
				closeEditDrawer();
				onNavigateBack();
			} else {
				showToast(result.error ?? 'Failed to delete API', 'error');
			}
		} finally {
			isSaving = false;
		}
	}

	// ============================================================================
	// Endpoint Drawer
	// ============================================================================

	let endpointDrawerOpen = $state(false);
	let selectedEndpoint = $state<ApiEndpoint | null>(null);
	let editedEndpoint = $state<ApiEndpoint | null>(null);

	// Tag combobox state
	let tagInputValue = $state('');
	let tagDropdownOpen = $state(false);

	// Endpoint deletion confirmation state
	let showEndpointDeleteConfirm = $state(false);

	// Create mode state
	let isCreating = $state(false);

	// Loading state
	let isSaving = $state(false);

	// Defaults used when creating a new endpoint (also used for change detection)
	const CREATE_DEFAULTS = {
		method: 'GET' as const,
		path: '/',
		description: '',
		tagName: undefined as string | undefined,
		pathParams: [] as { name: string; fieldId: string }[],
		queryParamsObjectId: undefined as string | undefined,
		requestBodyObjectId: undefined as string | undefined,
		responseBodyObjectId: undefined as string | undefined,
		useEnvelope: true,
		responseShape: 'object' as const
	};

	// Derived: Track if there are unsaved endpoint changes
	let hasEndpointChanges = $derived.by(() => {
		if (!editedEndpoint) return false;
		if (isCreating) {
			return editedEndpoint.method !== CREATE_DEFAULTS.method
				|| editedEndpoint.path !== CREATE_DEFAULTS.path
				|| editedEndpoint.description !== CREATE_DEFAULTS.description
				|| editedEndpoint.tagName !== CREATE_DEFAULTS.tagName
				|| editedEndpoint.pathParams.length !== CREATE_DEFAULTS.pathParams.length
				|| editedEndpoint.queryParamsObjectId !== CREATE_DEFAULTS.queryParamsObjectId
				|| editedEndpoint.requestBodyObjectId !== CREATE_DEFAULTS.requestBodyObjectId
				|| editedEndpoint.responseBodyObjectId !== CREATE_DEFAULTS.responseBodyObjectId
				|| editedEndpoint.useEnvelope !== CREATE_DEFAULTS.useEnvelope
				|| editedEndpoint.responseShape !== CREATE_DEFAULTS.responseShape;
		}
		if (!selectedEndpoint) return false;
		return JSON.stringify(editedEndpoint) !== JSON.stringify(selectedEndpoint);
	});

	// ============================================================================
	// Tag Operations
	// ============================================================================

	function getEndpointsUsingTag(tagName: string): number {
		return getEndpointCountByTagName(apiId, tagName);
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
		closeEditDrawer();
		isCreating = true;
		selectedEndpoint = null;
		editedEndpoint = {
			id: '',
			apiId,
			method: CREATE_DEFAULTS.method,
			path: CREATE_DEFAULTS.path,
			description: CREATE_DEFAULTS.description,
			pathParams: [],
			useEnvelope: CREATE_DEFAULTS.useEnvelope,
			responseShape: CREATE_DEFAULTS.responseShape,
			expanded: false
		};
		endpointDrawerOpen = true;
		tagInputValue = '';
		tagDropdownOpen = false;
	}

	async function handleCreateEndpoint(): Promise<void> {
		if (!editedEndpoint) return;

		isSaving = true;
		try {
			const result = await createEndpointAction({
				apiId,
				method: editedEndpoint.method,
				path: editedEndpoint.path,
				description: editedEndpoint.description,
				tagName: editedEndpoint.tagName,
				pathParams: editedEndpoint.pathParams,
				queryParamsObjectId: editedEndpoint.queryParamsObjectId,
				requestBodyObjectId: editedEndpoint.requestBodyObjectId,
				responseBodyObjectId: editedEndpoint.responseBodyObjectId,
				useEnvelope: editedEndpoint.useEnvelope,
				responseShape: editedEndpoint.responseShape
			});

			if (!result.success) {
				showToast(result.error ?? 'Failed to create endpoint', 'error');
				return;
			}

			showToast('Endpoint created successfully', 'success');
			isCreating = false;
			closeEndpointDrawer();
		} finally {
			isSaving = false;
		}
	}

	function handleCancelCreate(): void {
		isCreating = false;
		closeEndpointDrawer();
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
				closeEndpointDrawer();
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
	// Endpoint Drawer Operations
	// ============================================================================

	function openEndpoint(endpoint: ApiEndpoint): void {
		closeEditDrawer();
		const normalized = normalizeEndpoint(endpoint);
		selectedEndpoint = normalized;
		editedEndpoint = deepClone(normalized);
		endpointDrawerOpen = true;
		tagInputValue = normalized.tagName ?? '';
		tagDropdownOpen = false;
	}

	function closeEndpointDrawer(): void {
		endpointDrawerOpen = false;
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
			closeEndpointDrawer();
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
	// Return State API
	// ============================================================================

	return {
		get api() { return api; },
		get tags() { return tags; },
		get endpoints() { return endpoints; },
		get apiNamespaceId() { return apiNamespaceId; },

		// Tag sections
		get allTagSections() { return allTagSections; },
		get expandedTags() { return expandedTags; },
		toggleTagSection,

		// Edit drawer
		get editDrawerOpen() { return editDrawerOpen; },
		get editForm() { return editForm; },
		set editForm(v) { editForm = v; },
		get hasEditChanges() { return hasEditChanges; },
		get showEditDeleteConfirm() { return showEditDeleteConfirm; },
		openEditDrawer,
		closeEditDrawer,
		handleEditSave,
		handleEditUndo,
		handleDeleteApi,
		handleEditDeleteClick,
		cancelEditDelete,

		// Endpoint drawer
		get endpointDrawerOpen() { return endpointDrawerOpen; },
		set endpointDrawerOpen(v: boolean) { endpointDrawerOpen = v; },
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
		get hasEndpointChanges() { return hasEndpointChanges; },
		get isSaving() { return isSaving; },

		// Tag actions
		handleTagSelect,

		// Endpoint list actions
		handleAddEndpoint,
		handleDeleteEndpoint,
		handleDeleteEndpointClick,
		cancelDeleteEndpoint,
		handleDuplicateEndpoint,

		// Endpoint drawer actions
		openEndpoint,
		closeEndpointDrawer,
		handleSaveEndpoint,
		handleUndoEndpoint,

		// Endpoint editing actions
		handlePathChange,
		handlePathParamUpdate,
		handleSelectQueryParamsObject,
		handleSelectRequestBodyObject,
		handleSelectResponseBodyObject,
		handleEnvelopeToggle,
		handleSetResponseShape,
		handleResetResponseDefaults,

		getEndpointsUsingTag
	};
}

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
import type { Api, ApiEndpoint, PathParam, QueryParam, ResponseShape } from '$lib/types';
import {
	apisStore,
	endpointsStore,
	getEndpointCountByTagName
} from './apis';
import { objectsStore } from './objects';
import { fieldsStore } from './fields';
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
import {
	validateEndpointParams,
	resolveTargetFields,
	type ValidationError,
	type TargetField
} from '$lib/domain/paramInference';
import { isValidSnakeCaseName, isValidPascalCaseName } from '$lib/utils/validation';

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
	readonly editFormErrors: Record<string, string>;
	readonly editFormValid: boolean;
	readonly editVisibleErrors: Record<string, string>;
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
	readonly pathError: string;

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
	handlePathParamFieldSelect: (paramName: string, fieldName: string) => void;

	// Target object (resolved from objectId)
	readonly targetFields: TargetField[];
	readonly validationErrors: ValidationError[];

	// Query param CRUD
	handleAddQueryParamFromField: (fieldName: string) => void;
	handleUpdateQueryParam: (index: number, updates: Partial<QueryParam>) => void;
	handleRemoveQueryParam: (index: number) => void;

	// Pagination toggle
	handleTogglePagination: () => void;

	// Query parameters object selection (deprecated, kept for compat)
	handleSelectQueryParamsObject: (objectId: string | undefined) => void;

	// Object selection (merged request/response body)
	handleSelectObject: (objectId: string | undefined) => void;
	handleEnvelopeToggle: (enabled: boolean) => void;

	// Response shape configuration
	/** Whether the path ends with {param}, indicating a detail endpoint */
	readonly isDetailPath: boolean;
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
	const objectsState = fromStore(objectsStore);
	const fieldsState = fromStore(fieldsStore);
	let allApis = $derived(apisState.current);
	let allEndpoints = $derived(endpointsState.current);
	let allObjects = $derived(objectsState.current);
	let allFields = $derived(fieldsState.current);

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
	let editFormTouched = $state(false);

	let editFormErrors = $derived.by(() => {
		const errors: Record<string, string> = {};
		if (!editForm.title.trim()) {
			errors.title = 'API title is required';
		} else if (!isValidPascalCaseName(editForm.title)) {
			errors.title = 'Must be PascalCase (e.g. UserApi)';
		}
		return errors;
	});

	let editFormValid = $derived(Object.keys(editFormErrors).length === 0);

	let editImmediateErrors = $derived.by((): Record<string, string> => {
		if (!editForm.title.trim()) return {};
		if (!isValidPascalCaseName(editForm.title)) {
			return { title: editFormErrors.title };
		}
		return {};
	});

	let editVisibleErrors: Record<string, string> = $derived({ ...editImmediateErrors, ...(editFormTouched ? editFormErrors : {}) });

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
		editFormTouched = false;
		editDrawerOpen = true;
	}

	function closeEditDrawer(): void {
		editDrawerOpen = false;
		showEditDeleteConfirm = false;
	}

	async function handleEditSave(): Promise<void> {
		editFormTouched = true;
		if (!editFormValid) return;

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
	let pathError = $state('');

	// Defaults used when creating a new endpoint (also used for change detection)
	const CREATE_DEFAULTS = {
		method: 'GET' as const,
		path: '/',
		description: '',
		tagName: undefined as string | undefined,
		pathParams: [] as PathParam[],
		queryParams: [] as QueryParam[],
		queryParamsObjectId: undefined as string | undefined,
		objectId: undefined as string | undefined,
		useEnvelope: true,
		responseShape: 'object' as const,
		pagination: false
	};

	// ============================================================================
	// Target Object and Validation (param inference)
	// ============================================================================

	// Fields on the target object (for populating dropdowns)
	// Target is always objectId -- there is no separate target selection
	let targetFields = $derived.by((): TargetField[] => {
		if (!editedEndpoint?.objectId) return [];
		return resolveTargetFields(editedEndpoint.objectId, allObjects, allFields);
	});

	// Live validation errors
	let validationErrors = $derived.by((): ValidationError[] => {
		if (!editedEndpoint) return [];
		return validateEndpointParams({
			responseShape: editedEndpoint.responseShape,
			objectId: editedEndpoint.objectId,
			targetFields,
			pathParams: editedEndpoint.pathParams,
			queryParams: editedEndpoint.queryParams ?? []
		});
	});

	// Derived: Track if there are unsaved endpoint changes
	let hasEndpointChanges = $derived.by(() => {
		if (!editedEndpoint) return false;
		if (isCreating) {
			return editedEndpoint.method !== CREATE_DEFAULTS.method
				|| editedEndpoint.path !== CREATE_DEFAULTS.path
				|| editedEndpoint.description !== CREATE_DEFAULTS.description
				|| editedEndpoint.tagName !== CREATE_DEFAULTS.tagName
				|| editedEndpoint.pathParams.length !== CREATE_DEFAULTS.pathParams.length
				|| (editedEndpoint.queryParams ?? []).length !== CREATE_DEFAULTS.queryParams.length
				|| editedEndpoint.queryParamsObjectId !== CREATE_DEFAULTS.queryParamsObjectId
				|| editedEndpoint.objectId !== CREATE_DEFAULTS.objectId
				|| editedEndpoint.useEnvelope !== CREATE_DEFAULTS.useEnvelope
				|| editedEndpoint.responseShape !== CREATE_DEFAULTS.responseShape
				|| (editedEndpoint.pagination ?? false) !== CREATE_DEFAULTS.pagination;
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
			queryParams: [],
			useEnvelope: CREATE_DEFAULTS.useEnvelope,
			responseShape: CREATE_DEFAULTS.responseShape,
			pagination: CREATE_DEFAULTS.pagination,
			expanded: false
		};
		endpointDrawerOpen = true;
		tagInputValue = '';
		tagDropdownOpen = false;
	}

	async function handleCreateEndpoint(): Promise<void> {
		if (!editedEndpoint) return;
		if (pathError) return;

		isSaving = true;
		try {
			const result = await createEndpointAction({
				apiId,
				method: editedEndpoint.method,
				path: editedEndpoint.path,
				description: editedEndpoint.description,
				tagName: editedEndpoint.tagName,
				pathParams: editedEndpoint.pathParams,
				queryParams: editedEndpoint.queryParams ?? [],
				queryParamsObjectId: editedEndpoint.queryParamsObjectId,
				objectId: editedEndpoint.objectId,
				useEnvelope: editedEndpoint.useEnvelope,
				responseShape: editedEndpoint.responseShape,
				pagination: editedEndpoint.pagination ?? false
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
				queryParams: (original.queryParams ?? []).map(q => ({ ...q })),
				queryParamsObjectId: original.queryParamsObjectId,
				objectId: original.objectId,
				useEnvelope: original.useEnvelope,
				responseShape: original.responseShape,
				pagination: original.pagination ?? false
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
		pathError = '';
	}

	function closeEndpointDrawer(): void {
		endpointDrawerOpen = false;
		showEndpointDeleteConfirm = false;
		pathError = '';
		setTimeout(() => {
			selectedEndpoint = null;
			editedEndpoint = null;
		}, 300);
	}

	async function handleSaveEndpoint(): Promise<boolean> {
		if (!editedEndpoint || !selectedEndpoint) return false;
		if (pathError) return false;

		isSaving = true;
		try {
			const result = await updateEndpointAction(editedEndpoint.id, {
				method: editedEndpoint.method,
				path: editedEndpoint.path,
				description: editedEndpoint.description,
				tagName: editedEndpoint.tagName ?? null,
				pathParams: editedEndpoint.pathParams,
				queryParams: editedEndpoint.queryParams ?? [],
				queryParamsObjectId: editedEndpoint.queryParamsObjectId ?? null,
				objectId: editedEndpoint.objectId ?? null,
				useEnvelope: editedEndpoint.useEnvelope,
				responseShape: editedEndpoint.responseShape,
				pagination: editedEndpoint.pagination ?? false
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
		pathError = '';
	}

	// ============================================================================
	// Detail Path Detection
	// ============================================================================

	/** Regex: path ends with a {param} segment, indicating a detail endpoint */
	const DETAIL_PATH_RE = /\{[^}]+\}$/;

	// Derived: true when the current path ends with {param}
	let isDetailPath = $derived(
		editedEndpoint ? DETAIL_PATH_RE.test(editedEndpoint.path) : false
	);

	// ============================================================================
	// Endpoint Editing Operations
	// ============================================================================

	function handlePathChange(newPath: string): void {
		if (!editedEndpoint) return;
		const { path, pathParams } = reconcilePathParams(newPath, editedEndpoint.pathParams);

		// Auto-link new (unlinked) path params by name match against the target object
		const autoLinkedParams = pathParams.map(p => {
			if (p.field) return p; // already linked, preserve
			const match = targetFields.find(f => f.name.toLowerCase() === p.name.toLowerCase());
			return match ? { ...p, field: match.name } : p;
		});

		// Auto-set response shape: detail paths always return a single object
		const autoResponseShape = DETAIL_PATH_RE.test(path) ? 'object' as const : editedEndpoint.responseShape;

		editedEndpoint = { ...editedEndpoint, path, pathParams: autoLinkedParams, responseShape: autoResponseShape };

		const invalidParam = autoLinkedParams.find(p => p.name && !isValidSnakeCaseName(p.name));
		pathError = invalidParam
			? `Path parameter '${invalidParam.name}' must be snake_case (e.g. user_id)`
			: '';
	}

	function handlePathParamUpdate(paramName: string, fieldId: string): void {
		if (!editedEndpoint) return;
		const updatedParams = editedEndpoint.pathParams.map(p =>
			p.name === paramName ? { ...p, fieldId } : p
		);
		editedEndpoint = { ...editedEndpoint, pathParams: updatedParams };
	}

	function handlePathParamFieldSelect(paramName: string, fieldName: string): void {
		if (!editedEndpoint) return;
		const updatedParams = editedEndpoint.pathParams.map(p =>
			p.name === paramName ? { ...p, field: fieldName } : p
		);
		editedEndpoint = { ...editedEndpoint, pathParams: updatedParams };
	}

	// ============================================================================
	// Query Param CRUD
	// ============================================================================

	function handleAddQueryParamFromField(fieldName: string): void {
		if (!editedEndpoint) return;
		const newParam: QueryParam = {
			name: fieldName,
			field: fieldName,
			operator: 'eq'
		};
		editedEndpoint = {
			...editedEndpoint,
			queryParams: [...(editedEndpoint.queryParams ?? []), newParam]
		};
	}

	function handleUpdateQueryParam(index: number, updates: Partial<QueryParam>): void {
		if (!editedEndpoint) return;
		const qps = [...(editedEndpoint.queryParams ?? [])];
		qps[index] = { ...qps[index], ...updates };
		editedEndpoint = { ...editedEndpoint, queryParams: qps };
	}

	function handleRemoveQueryParam(index: number): void {
		if (!editedEndpoint) return;
		const qps = [...(editedEndpoint.queryParams ?? [])];
		qps.splice(index, 1);
		editedEndpoint = { ...editedEndpoint, queryParams: qps };
	}

	// ============================================================================
	// Pagination Toggle
	// ============================================================================

	function handleTogglePagination(): void {
		if (!editedEndpoint) return;
		editedEndpoint = {
			...editedEndpoint,
			pagination: !(editedEndpoint.pagination ?? false)
		};
	}

	// ============================================================================
	// Query Parameters Object Selection (deprecated, kept for backward compat)
	// ============================================================================

	function handleSelectQueryParamsObject(objectId: string | undefined): void {
		if (!editedEndpoint) return;
		editedEndpoint = { ...editedEndpoint, queryParamsObjectId: objectId };
	}

	// ============================================================================
	// Object Selection (merged request/response body)
	// ============================================================================

	function handleSelectObject(objectId: string | undefined): void {
		if (!editedEndpoint) return;

		// Resolve field names on the new object for auto-linking
		const newTargetFields = objectId
			? resolveTargetFields(objectId, allObjects, allFields)
			: [];
		const fieldNameSet = new Set(newTargetFields.map(f => f.name.toLowerCase()));

		editedEndpoint = {
			...editedEndpoint,
			objectId,
			// Auto-link path params by case-insensitive name match; clear if no match
			pathParams: editedEndpoint.pathParams.map(p => {
				const match = newTargetFields.find(f => f.name.toLowerCase() === p.name.toLowerCase());
				return { ...p, field: match ? match.name : '' };
			}),
			// Clear query params and pagination when object changes
			queryParams: [],
			pagination: false
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
		// Detail paths are locked to 'object' — ignore attempts to change
		if (isDetailPath) return;
		editedEndpoint = { ...editedEndpoint, responseShape: shape };
	}

	function handleResetResponseDefaults(): void {
		if (!editedEndpoint) return;
		editedEndpoint = {
			...editedEndpoint,
			useEnvelope: true,
			responseShape: 'object',
			objectId: undefined
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
		get editFormErrors() { return editFormErrors; },
		get editFormValid() { return editFormValid; },
		get editVisibleErrors() { return editVisibleErrors; },
		get showEditDeleteConfirm() { return showEditDeleteConfirm; },
		openEditDrawer,
		closeEditDrawer,
		handleEditSave,
		handleEditUndo,
		handleDeleteApi,
		handleEditDeleteClick,
		cancelEditDelete,

		// Endpoint drawer
		get isCreating() { return isCreating; },
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
		get pathError() { return pathError; },

		// Tag actions
		handleTagSelect,

		// Endpoint list actions
		handleAddEndpoint,
		handleCreateEndpoint,
		handleCancelCreate,
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
		handlePathParamFieldSelect,

		// Target object and validation
		get targetFields() { return targetFields; },
		get validationErrors() { return validationErrors; },

		// Query param CRUD
		handleAddQueryParamFromField,
		handleUpdateQueryParam,
		handleRemoveQueryParam,

		// Pagination toggle
		handleTogglePagination,

		handleSelectQueryParamsObject,
		handleSelectObject,
		handleEnvelopeToggle,
		get isDetailPath() { return isDetailPath; },
		handleSetResponseShape,
		handleResetResponseDefaults,

		getEndpointsUsingTag
	};
}

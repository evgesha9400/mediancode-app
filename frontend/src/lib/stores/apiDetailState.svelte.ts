/**
 * API Detail State Container
 *
 * Encapsulates UI state for the API detail page.
 * Mutations call API services directly with optimistic store updates.
 *
 * Existing-API only: creation is handled on the list page via a drawer.
 * This factory manages:
 * - Endpoint CRUD (add, save, undo, delete, duplicate)
 * - Edit API drawer (metadata editing)
 * - Tag section state (Swagger-style collapsible groups)
 */

import { fromStore, get } from 'svelte/store';
import type { Api, ApiEndpoint, QueryParam, ResponseShape } from '$lib/types';
import {
	apisStore,
	endpointsStore,
	getEndpointCountByApi,
	getEndpointCountByTagName,
	objectsStore,
	fieldsStore
} from './stores';
import { showToast } from './toasts';
import { deepClone } from '$lib/utils/ids';
import { mapApiError } from '$lib/domain/errorMap';
import { reconcilePathParams } from '$lib/domain/endpointReducer';
import {
	validateEndpointParams,
	resolveTargetFields,
	type ValidationError,
	type TargetField
} from '$lib/domain/paramInference';
import { isValidSnakeCaseName } from '$lib/utils/validation';
import { createApisContract } from './apisConfig.svelte';
import {
	applyEndpointUpdate,
	createEndpointDraft,
	endpointApi,
	hydrateStoredEndpoint,
	toCreateEndpointPayload,
	toDuplicateEndpointPayload,
	toUpdateEndpointPayload
} from './endpointsConfig.svelte';

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
	handlePathParamFieldSelect: (paramName: string, fieldName: string, fieldId?: string) => void;

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
	readonly responseShapeLocked: boolean;
	readonly responseShapeLockedReason: string;
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
	const apiContract = createApisContract({
		getActiveNamespaceId: () => storedApi?.namespaceId ?? '',
		getEndpointCount: getEndpointCountByApi
	});

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
	let editDraft = $derived.by((): Api | null => {
		if (!storedApi) return null;
		return { ...storedApi, ...editForm };
	});

	let editFormErrors = $derived.by(() => {
		if (!editDraft) return {};
		return apiContract.validate(editDraft);
	});

	let editFormValid = $derived(editDraft !== null && Object.keys(editFormErrors).length === 0);

	let editImmediateErrors = $derived.by((): Record<string, string> => {
		if (!editDraft) return {};
		return apiContract.immediateErrors?.(editDraft, editFormErrors) ?? {};
	});

	let editVisibleErrors: Record<string, string> = $derived({ ...editImmediateErrors, ...(editFormTouched ? editFormErrors : {}) });

	function toEditForm(api: Api) {
		return {
			title: api.title,
			version: api.version,
			description: api.description,
			serverUrl: api.serverUrl,
			baseUrl: api.baseUrl
		};
	}

	function openEditDrawer(): void {
		// Close endpoint drawer first
		closeEndpointDrawer();
		if (storedApi) {
			editForm = toEditForm(storedApi);
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
		if (!editDraft) return;
		editFormTouched = true;
		if (!editFormValid) return;

		const payloadResult = apiContract.toUpdatePayload(editDraft);
		if (!payloadResult.ok) {
			showToast(payloadResult.error, 'error', 5000);
			return;
		}

		isSaving = true;
		const previousApis = get(apisStore);
		apisStore.update(apis =>
			apis.map(a => (a.id === apiId ? { ...a, ...payloadResult.data, updatedAt: new Date().toISOString() } : a))
		);

		try {
			const saved = await apiContract.api.update(apiId, payloadResult.data);
			apisStore.update(apis => apis.map(a => (a.id === saved.id ? saved : a)));
			editForm = toEditForm(saved);
			originalEditFormSnapshot = JSON.stringify(editForm);
			showToast(MESSAGES.API_SAVED, 'success');
			closeEditDrawer();
		} catch (err) {
			apisStore.set(previousApis);
			showToast(mapApiError(err, 'save API'), 'error');
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
		if (!storedApi) return;
		isSaving = true;
		const deletedApi = storedApi;
		const apiTitle = deletedApi.title;

		try {
			await apiContract.api.delete(apiId);
			apisStore.update(apis => apis.filter(a => a.id !== apiId));
			endpointsStore.update(eps => eps.filter(e => e.apiId !== deletedApi.id));
			showToast(`API "${apiTitle}" deleted successfully`, 'success');
			closeEditDrawer();
			onNavigateBack();
		} catch (err) {
			showToast(mapApiError(err, 'delete API'), 'error');
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

		let createEndpointDefaults = $derived(createEndpointDraft(apiId));

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
				return editedEndpoint.method !== createEndpointDefaults.method
					|| editedEndpoint.path !== createEndpointDefaults.path
					|| editedEndpoint.description !== createEndpointDefaults.description
					|| editedEndpoint.tagName !== createEndpointDefaults.tagName
					|| editedEndpoint.pathParams.length !== createEndpointDefaults.pathParams.length
					|| (editedEndpoint.queryParams ?? []).length !== createEndpointDefaults.queryParams.length
					|| editedEndpoint.queryParamsObjectId !== createEndpointDefaults.queryParamsObjectId
					|| editedEndpoint.objectId !== createEndpointDefaults.objectId
					|| editedEndpoint.useEnvelope !== createEndpointDefaults.useEnvelope
					|| editedEndpoint.responseShape !== createEndpointDefaults.responseShape
					|| (editedEndpoint.pagination ?? false) !== createEndpointDefaults.pagination;
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
		editedEndpoint = createEndpointDraft(apiId);
		endpointDrawerOpen = true;
		tagInputValue = '';
		tagDropdownOpen = false;
	}

	async function handleCreateEndpoint(): Promise<void> {
		if (!editedEndpoint) return;
		if (pathError) return;

		isSaving = true;
		try {
			const endpoint = await endpointApi.create(toCreateEndpointPayload(editedEndpoint));
			const hydrated = hydrateStoredEndpoint(endpoint, get(objectsStore), get(fieldsStore));
			endpointsStore.update(eps => [...eps, hydrated]);
			showToast('Endpoint created successfully', 'success');
			isCreating = false;
			closeEndpointDrawer();
		} catch (err) {
			showToast(mapApiError(err, 'create endpoint'), 'error');
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
			await endpointApi.delete(editedEndpoint.id);
			endpointsStore.update(eps => eps.filter(e => e.id !== editedEndpoint!.id));
			showToast(MESSAGES.ENDPOINT_DELETED, 'success');
			showEndpointDeleteConfirm = false;
			closeEndpointDrawer();
		} catch (err) {
			showToast(mapApiError(err, 'delete endpoint'), 'error');
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
			const endpoint = await endpointApi.create(toDuplicateEndpointPayload(original));
			const hydrated = hydrateStoredEndpoint(endpoint, get(objectsStore), get(fieldsStore));
			endpointsStore.update(eps => [...eps, hydrated]);
			showToast(MESSAGES.ENDPOINT_DUPLICATED, 'success');
		} catch (err) {
			showToast(mapApiError(err, 'duplicate endpoint'), 'error');
		} finally {
			isSaving = false;
		}
	}

	// ============================================================================
	// Endpoint Drawer Operations
	// ============================================================================

	function openEndpoint(endpoint: ApiEndpoint): void {
		closeEditDrawer();
		const hydrated = hydrateStoredEndpoint(endpoint, get(objectsStore), get(fieldsStore));
		selectedEndpoint = hydrated;
		editedEndpoint = deepClone(hydrated);
		endpointDrawerOpen = true;
		tagInputValue = hydrated.tagName ?? '';
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

		const payload = toUpdateEndpointPayload(editedEndpoint);

		isSaving = true;
		const previousEndpoints = get(endpointsStore);
		endpointsStore.update(eps =>
			eps.map(e => (e.id === editedEndpoint!.id ? applyEndpointUpdate(e, payload) : e))
		);

		try {
			const endpoint = await endpointApi.update(editedEndpoint.id, payload);
			const hydrated = hydrateStoredEndpoint(endpoint, get(objectsStore), get(fieldsStore));
			endpointsStore.update(eps => eps.map(e => (e.id === hydrated.id ? hydrated : e)));
			selectedEndpoint = hydrated;
			editedEndpoint = deepClone(hydrated);
			showToast(MESSAGES.ENDPOINT_SAVED, 'success');
			closeEndpointDrawer();
			return true;
		} catch (err) {
			endpointsStore.set(previousEndpoints);
			showToast(mapApiError(err, 'save endpoint'), 'error');
			return false;
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

	// Derived: true when method is not GET (only GET supports list responses)
	let isNonGetMethod = $derived(
		editedEndpoint ? editedEndpoint.method !== 'GET' : false
	);

	// Derived: whether response shape toggle should be locked to "object"
	let responseShapeLocked = $derived(isDetailPath || isNonGetMethod);

	let responseShapeLockedReason = $derived.by(() => {
		if (isDetailPath) return 'Detail endpoints always return a single object';
		if (isNonGetMethod) return 'Only GET endpoints can return a list';
		return '';
	});

	// Auto-set response shape to 'object' when method changes to non-GET
	$effect(() => {
		if (isNonGetMethod && editedEndpoint && editedEndpoint.responseShape !== 'object') {
			editedEndpoint = { ...editedEndpoint, responseShape: 'object' };
		}
	});

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

		// Detail path: auto-link last path param to PK field if unlinked
		const isDetail = DETAIL_PATH_RE.test(path);
		if (isDetail && autoLinkedParams.length > 0) {
			const lastIdx = autoLinkedParams.length - 1;
			const lastParam = autoLinkedParams[lastIdx];
			if (!lastParam.field) {
				const pkField = targetFields.find(f => f.isPk);
				if (pkField) {
					autoLinkedParams[lastIdx] = { ...lastParam, field: pkField.name };
				}
			}
		}

		// Auto-set response shape: detail paths always return a single object
		const autoResponseShape = isDetail ? 'object' as const : editedEndpoint.responseShape;

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

	function handlePathParamFieldSelect(paramName: string, fieldName: string, fieldIdArg?: string): void {
		const ep = editedEndpoint;
		if (!ep) return;
		const updatedParams = ep.pathParams.map(p => {
			if (p.name !== paramName) return p;
			if (!fieldName) {
				return { ...p, field: '', fieldId: '' };
			}
			let nextFieldId = fieldIdArg ?? '';
			if (!nextFieldId && ep.objectId) {
				const obj = allObjects.find(o => o.id === ep.objectId);
				const member = obj?.members.find(m => m.memberType === 'scalar' && m.name === fieldName);
				if (member?.memberType === 'scalar') nextFieldId = member.fieldId;
			}
			return { ...p, field: fieldName, fieldId: nextFieldId || p.fieldId };
		});
		editedEndpoint = { ...ep, pathParams: updatedParams };
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

		// Auto-link path params by case-insensitive name match; clear if no match
		const autoLinkedParams = editedEndpoint.pathParams.map(p => {
			const match = newTargetFields.find(f => f.name.toLowerCase() === p.name.toLowerCase());
			return { ...p, field: match ? match.name : '' };
		});

		// Detail path: auto-link last path param to PK field if still unlinked
		const isDetail = DETAIL_PATH_RE.test(editedEndpoint.path);
		if (isDetail && autoLinkedParams.length > 0) {
			const lastIdx = autoLinkedParams.length - 1;
			const lastParam = autoLinkedParams[lastIdx];
			if (!lastParam.field) {
				const pkField = newTargetFields.find(f => f.isPk);
				if (pkField) {
					autoLinkedParams[lastIdx] = { ...lastParam, field: pkField.name };
				}
			}
		}

			const withObject = { ...editedEndpoint, objectId, pathParams: autoLinkedParams };
			const hydrated = hydrateStoredEndpoint(withObject, allObjects, allFields);

		editedEndpoint = {
			...hydrated,
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
		// Locked to 'object' for detail paths and non-GET methods
		if (responseShapeLocked) return;
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
		get responseShapeLocked() { return responseShapeLocked; },
		get responseShapeLockedReason() { return responseShapeLockedReason; },
		handleSetResponseShape,
		handleResetResponseDefaults,

		getEndpointsUsingTag
	};
}

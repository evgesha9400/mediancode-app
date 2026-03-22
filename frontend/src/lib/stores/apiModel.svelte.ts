// src/lib/stores/apiModel.svelte.ts
//
// Per-entity CRUD model for APIs.
// Composes listViewState for search/filter/sort/drawer, adds entity-specific
// CRUD orchestration (validate, save, create, delete, undo) inline.

import type { Page } from '@sveltejs/kit';
import type { Api, FilterConfig } from '$lib/types';
import type { DrawerMode } from './listViewState.svelte';
import type { MultiSortState } from '$lib/utils/sorting';
import { createListViewState } from './listViewState.svelte';
import {
	createApiApi,
	updateApiApi,
	deleteApiApi,
	type CreateApiRequest,
	type UpdateApiRequest
} from '$lib/api/apis';
import { mapApiError } from '$lib/domain/errorMap';
import { apisStore, endpointsStore } from './apis';
import { get } from 'svelte/store';
import { composeState } from '$lib/utils/compose';
import { isValidPascalCaseName } from '$lib/utils/validation';
import { showToast } from './toasts';

// ============================================================================
// Configuration
// ============================================================================

export interface ApiModelConfig {
	/** Function returning namespace-filtered APIs */
	itemsStore: () => Api[];
	/** Domain-specific search function */
	searchFn: (items: Api[], query: string) => Api[];
	/** Filter sections config (reactive via function) */
	filterSections: () => FilterConfig;
	/** URL navigation scope */
	urlScope: {
		page: Page;
		goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
	};
	/** Returns the active namespace ID */
	getActiveNamespaceId: () => string;
	/** Returns namespace name for an API */
	getNamespaceName: (namespaceId: string) => string;
	/** Returns endpoint count for an API */
	getEndpointCount: (apiId: string) => number;
}

// ============================================================================
// State Interface
// ============================================================================

export interface ApiModelState {
	// --- List view state (search, filter, sort, drawer) ---
	query: string;
	filters: ApiFilterState;
	filtersOpen: boolean;
	drawerOpen: boolean;
	selectedItem: Api | null;
	editedItem: Api | null;
	originalItem: Api | null;
	showDeleteConfirm: boolean;

	readonly mode: DrawerMode;
	readonly results: Api[];
	readonly sorts: MultiSortState;
	readonly activeFiltersCount: number;
	readonly hasChanges: boolean;
	readonly highlightedId: string | null;

	handleSort: (columnKey: string, shiftKey: boolean) => void;
	selectItem: (item: Api) => void;
	resetFilters: () => void;
	toggleFilters: () => void;

	// --- CRUD-specific state ---
	readonly isSaving: boolean;
	readonly isDeleting: boolean;
	readonly isFormValid: boolean;
	readonly visibleErrors: Record<string, string>;
	readonly canDelete: boolean;
	readonly deleteTooltip: string;

	// --- CRUD actions ---
	openCreate: () => void;
	closeDrawer: () => void;
	handleSave: () => Promise<void>;
	handleCreate: () => Promise<void>;
	handleUndo: () => void;
	handleDelete: () => Promise<void>;
	isSelected: (item: Api) => boolean;
}

type ApiFilterState = Record<string, never>;

// ============================================================================
// Factory
// ============================================================================

export function createApiModel(config: ApiModelConfig): ApiModelState {
	const {
		itemsStore,
		searchFn,
		filterSections,
		urlScope,
		getActiveNamespaceId,
		getNamespaceName,
		getEndpointCount
	} = config;

	// --- Create list view state (shared utility) ---
	const listState = createListViewState<Api, ApiFilterState>({
		itemsStore,
		searchFn,
		filterSections,
		numericColumns: new Set(['endpointCount']),
		urlScope,
		getItemId: (api) => api.id,
		deriveExtra: (api) => ({
			endpointCount: getEndpointCount(api.id),
			namespaceName: getNamespaceName(api.namespaceId)
		}),
		sortColumnMap: { endpoints: 'endpointCount', namespace: 'namespaceName' },
		drawerConfig: {
			trackEdits: false,
			allowDelete: false
		}
	});

	// --- CRUD-specific state ---
	let isSaving = $state(false);
	let isDeleting = $state(false);
	let formTouched = $state(false);
	let serverErrors = $state<Record<string, string>>({});

	// --- Derived validation ---
	let formErrors = $derived.by(() => {
		if (!listState.editedItem) return {};
		return validate(listState.editedItem);
	});

	let immediateErrors = $derived.by(() => {
		if (!listState.editedItem || !listState.editedItem.title.trim()) return {};
		if (!isValidPascalCaseName(listState.editedItem.title)) {
			return { title: formErrors.title };
		}
		return {};
	});

	let isFormValid = $derived(listState.editedItem !== null && Object.keys(formErrors).length === 0);
	let visibleErrors = $derived({ ...immediateErrors, ...(formTouched ? formErrors : {}), ...serverErrors });

	// --- Derived deletion guard (APIs are always deletable) ---
	let canDelete = $derived(true);
	let deleteTooltip = $derived('');

	// --- Entity-specific logic ---

	function validate(item: Api): Record<string, string> {
		const errors: Record<string, string> = {};
		if (!item.title.trim()) {
			errors.title = 'API title is required';
		} else if (!isValidPascalCaseName(item.title)) {
			errors.title = 'Must be PascalCase (e.g. UserApi)';
		}
		return errors;
	}

	function createDraft(): Api {
		return {
			id: '',
			namespaceId: getActiveNamespaceId(),
			title: '',
			version: '1.0.0',
			description: '',
			baseUrl: '/api/v1',
			serverUrl: '',
			createdAt: '',
			updatedAt: ''
		};
	}

	function toCreatePayload(item: Api): { ok: true; data: CreateApiRequest } | { ok: false; error: string } {
		return {
			ok: true,
			data: {
				namespaceId: item.namespaceId,
				title: item.title,
				version: item.version,
				description: item.description,
				serverUrl: item.serverUrl,
				baseUrl: item.baseUrl
			}
		};
	}

	function toUpdatePayload(item: Api): { ok: true; data: UpdateApiRequest } | { ok: false; error: string } {
		return {
			ok: true,
			data: {
				title: item.title,
				version: item.version,
				description: item.description,
				serverUrl: item.serverUrl,
				baseUrl: item.baseUrl
			}
		};
	}

	// --- Internal helpers ---

	function resetFormState() {
		formTouched = false;
		serverErrors = {};
	}

	function closeDrawer() {
		listState.closeDrawer();
		resetFormState();
	}

	function openCreate() {
		listState.openCreate(createDraft());
		resetFormState();
	}

	function isSelected(item: Api): boolean {
		return listState.selectedItem?.id === item.id;
	}

	function handleUndo() {
		if (listState.originalItem) {
			listState.editedItem = JSON.parse(JSON.stringify(listState.originalItem));
			resetFormState();
		}
	}

	// --- Save (update existing) ---
	async function handleSave() {
		if (!listState.editedItem || isSaving) return;

		formTouched = true;
		if (!isFormValid) return;

		const entityName = listState.editedItem.title;
		isSaving = true;

		const payloadResult = toUpdatePayload(listState.editedItem);
		if (!payloadResult.ok) {
			showToast(payloadResult.error, 'error', 5000);
			isSaving = false;
			return;
		}

		const previousApis = get(apisStore);
		apisStore.update(apis =>
			apis.map(a => (a.id === listState.editedItem!.id ? { ...a, ...payloadResult.data, updatedAt: new Date().toISOString() } as Api : a))
		);

		try {
			const api = await updateApiApi(listState.editedItem.id, payloadResult.data);
			apisStore.update(apis => apis.map(a => (a.id === api.id ? api : a)));
			listState.selectedItem = api;
			listState.originalItem = JSON.parse(JSON.stringify(api));
			showToast(`API "${entityName}" updated successfully`, 'success', 3000);
			closeDrawer();
		} catch (err) {
			apisStore.set(previousApis);
			const error = mapApiError(err, 'update API');
			if (error.includes('already exists')) {
				serverErrors = { title: error };
			} else {
				showToast(error, 'error', 5000);
			}
		} finally {
			isSaving = false;
		}
	}

	// --- Create (new entity) ---
	async function handleCreate() {
		if (!listState.editedItem || isSaving) return;

		formTouched = true;
		if (!isFormValid) return;

		isSaving = true;

		const payloadResult = toCreatePayload(listState.editedItem);
		if (!payloadResult.ok) {
			showToast(payloadResult.error, 'error', 5000);
			isSaving = false;
			return;
		}

		try {
			const api = await createApiApi(payloadResult.data);
			apisStore.update(apis => [...apis, api]);
			showToast(`API "${api.title}" created successfully`, 'success', 3000);
			closeDrawer();
			urlScope.goto(`/apis/${api.id}`);
		} catch (err) {
			const error = mapApiError(err, 'create API');
			if (error.includes('already exists')) {
				serverErrors = { title: error };
			} else {
				showToast(error, 'error', 5000);
			}
		} finally {
			isSaving = false;
		}
	}

	// --- Delete ---
	async function handleDelete() {
		if (!listState.editedItem || isDeleting) return;

		const entityName = listState.editedItem.title;
		isDeleting = true;

		try {
			await deleteApiApi(listState.editedItem.id);
			apisStore.update(apis => apis.filter(a => a.id !== listState.editedItem!.id));
			endpointsStore.update(endpoints => endpoints.filter(e => e.apiId !== listState.editedItem!.id));
			closeDrawer();
			showToast(`API "${entityName}" deleted successfully`, 'success', 3000);
		} catch (err) {
			showToast(mapApiError(err, 'delete API'), 'error', 5000);
		} finally {
			isDeleting = false;
		}
	}

	// --- Compose list view state with CRUD-specific state ---
	return composeState(listState, {
		// CRUD-specific state
		get isSaving() { return isSaving; },
		get isDeleting() { return isDeleting; },
		get isFormValid() { return isFormValid; },
		get visibleErrors() { return visibleErrors; },
		get canDelete() { return canDelete; },
		get deleteTooltip() { return deleteTooltip; },

		// CRUD actions (override closeDrawer from listState with CRUD-aware version)
		openCreate,
		closeDrawer,
		handleSave,
		handleCreate,
		handleUndo,
		handleDelete,
		isSelected
	}) as ApiModelState;
}

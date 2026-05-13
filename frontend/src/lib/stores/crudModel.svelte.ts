// src/lib/stores/crudModel.svelte.ts
//
// Generic CRUD model factory. Composes listViewState with entity-specific
// validation, payload mapping, and API calls via an EntityContract.

import type { Page } from '@sveltejs/kit';
import type { FilterConfig } from '$lib/types';
import type { DrawerMode, ListViewConfig } from './listViewState.svelte';
import type { MultiSortState } from '$lib/utils/sorting';
import { createListViewState } from './listViewState.svelte';
import { mapApiError } from '$lib/domain/errorMap';
import { showToast } from './toasts';
import { get, type Writable } from 'svelte/store';

// ============================================================================
// EntityContract — the ONLY thing each entity must provide
// ============================================================================

export interface EntityContract<T extends { id: string }, CreateReq, UpdateReq> {
	/** Display label for toast messages (e.g. "Field", "API") */
	entityLabel: string;

	/** Key on T that holds the display name (for toasts) */
	nameKey: keyof T & string;

	/** The writable store that holds all items */
	store: Writable<T[]>;

	/** listViewState configuration (entity-specific parts) */
	listView: Pick<
		ListViewConfig<T>,
		'numericColumns' | 'highlightParamKey' | 'getItemId' | 'deriveExtra' | 'sortColumnMap' | 'drawerConfig'
	>;

	/** Validation */
	validate: (item: T) => Record<string, string>;

	/** Create a blank draft for the "create" flow */
	createDraft: () => T;

	/** Convert edited item to create request payload */
	toCreatePayload: (item: T) => { ok: true; data: CreateReq } | { ok: false; error: string };

	/** Convert edited item to update request payload */
	toUpdatePayload: (item: T) => { ok: true; data: UpdateReq } | { ok: false; error: string };

	/** API functions */
	api: {
		create: (data: CreateReq) => Promise<T>;
		update: (id: string, data: UpdateReq) => Promise<T>;
		delete: (id: string) => Promise<void>;
	};

	/** Optional: Immediate errors (shown before form is "touched") */
	immediateErrors?: (item: T, formErrors: Record<string, string>) => Record<string, string>;

	/** Optional: Deletion guard (canDelete + tooltip) */
	deletionGuard?: (item: T) => { canDelete: boolean; tooltip: string };

	/** Optional: Pre-delete check (defense in depth, runs on fresh store data) */
	preDeleteCheck?: (item: T) => { success: boolean; error?: string };

	/** Optional: Post-save hook */
	afterSave?: (saved: T) => void;

	/** Optional: Post-create hook */
	afterCreate?: (created: T) => void;

	/** Optional: Post-delete hook */
	afterDelete?: (deleted: T) => void;

	/** Optional: Which key to route "already exists" server errors to (default: 'name') */
	duplicateErrorKey?: string;
}

// ============================================================================
// CrudCallConfig — page-level config passed at the call site
// ============================================================================

export interface CrudCallConfig<T, FilterState extends Record<string, any>> {
	itemsStore: () => T[];
	searchFn: (items: T[], query: string) => T[];
	filterSections: FilterConfig | (() => FilterConfig);
	urlScope: {
		page: Page;
		goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
	};
}

// ============================================================================
// CrudModelState — the unified interface all pages consume
// ============================================================================

export interface CrudModelState<T> {
	// List view state
	query: string;
	filters: any;
	filtersOpen: boolean;
	drawerOpen: boolean;
	selectedItem: T | null;
	editedItem: T | null;
	originalItem: T | null;
	showDeleteConfirm: boolean;
	readonly mode: DrawerMode;
	readonly results: T[];
	readonly sorts: MultiSortState;
	readonly activeFiltersCount: number;
	readonly hasChanges: boolean;
	readonly highlightedId: string | null;
	handleSort: (columnKey: string, shiftKey: boolean) => void;
	selectItem: (item: T) => void;
	resetFilters: () => void;
	toggleFilters: () => void;

	// CRUD state
	readonly isSaving: boolean;
	readonly isDeleting: boolean;
	readonly isFormValid: boolean;
	readonly visibleErrors: Record<string, string>;
	readonly canDelete: boolean;
	readonly deleteTooltip: string;

	// CRUD actions
	openCreate: () => void;
	closeDrawer: () => void;
	handleSave: () => Promise<void>;
	handleCreate: () => Promise<void>;
	handleUndo: () => void;
	handleDelete: () => Promise<void>;
	isSelected: (item: T) => boolean;
}

// ============================================================================
// Factory
// ============================================================================

export function createCrudModel<
	T extends { id: string },
	FilterState extends Record<string, any>,
	CreateReq,
	UpdateReq
>(
	contract: EntityContract<T, CreateReq, UpdateReq>,
	callConfig: CrudCallConfig<T, FilterState>
): CrudModelState<T> {
	// --- Create list view state ---
	const listState = createListViewState<T, FilterState>({
		itemsStore: callConfig.itemsStore,
		searchFn: callConfig.searchFn,
		filterSections: callConfig.filterSections,
		urlScope: callConfig.urlScope,
		...contract.listView
	});

	// --- CRUD state ---
	let isSaving = $state(false);
	let isDeleting = $state(false);
	let formTouched = $state(false);
	let serverErrors = $state<Record<string, string>>({});

	// --- Derived validation ---
	let formErrors = $derived.by(() => {
		if (!listState.editedItem) return {};
		return contract.validate(listState.editedItem);
	});

	let isFormValid = $derived(
		listState.editedItem !== null && Object.keys(formErrors).length === 0
	);

	let immediateErrors = $derived.by(() => {
		if (!listState.editedItem) return {};
		return contract.immediateErrors?.(listState.editedItem, formErrors) ?? {};
	});

	let visibleErrors = $derived({
		...immediateErrors,
		...(formTouched ? formErrors : {}),
		...serverErrors
	});

	// --- Derived deletion guard ---
	let deletionGuardResult = $derived.by(() => {
		if (!listState.editedItem) return { canDelete: true, tooltip: '' };
		return contract.deletionGuard?.(listState.editedItem) ?? { canDelete: true, tooltip: '' };
	});

	let canDelete = $derived(deletionGuardResult.canDelete);
	let deleteTooltip = $derived(deletionGuardResult.tooltip);

	// --- Helpers ---

	function resetFormState() {
		formTouched = false;
		serverErrors = {};
	}

	function closeDrawer() {
		listState.closeDrawer();
		resetFormState();
	}

	function openCreate() {
		listState.openCreate(contract.createDraft());
		resetFormState();
	}

	function isSelected(item: T): boolean {
		return listState.selectedItem?.id === item.id;
	}

	function handleUndo() {
		if (listState.originalItem) {
			listState.editedItem = JSON.parse(JSON.stringify(listState.originalItem));
			resetFormState();
		}
	}

	function handleServerError(err: unknown, action: string) {
		const error = mapApiError(err, action);
		const dupKey = contract.duplicateErrorKey ?? 'name';
		if (error.includes('already exists')) {
			serverErrors = { [dupKey]: error };
		} else {
			showToast(error, 'error', 5000);
		}
	}

	// --- Save (update existing) ---
	async function handleSave() {
		if (!listState.editedItem || isSaving) return;

		formTouched = true;
		if (!isFormValid) return;

		const displayName = String(listState.editedItem[contract.nameKey]);
		isSaving = true;

		const payloadResult = contract.toUpdatePayload(listState.editedItem);
		if (!payloadResult.ok) {
			showToast(payloadResult.error, 'error', 5000);
			isSaving = false;
			return;
		}

		const previous = get(contract.store);
		contract.store.update((items) =>
			items.map((i) =>
				i.id === listState.editedItem!.id
					? ({ ...i, ...payloadResult.data } as T)
					: i
			)
		);

		try {
			const saved = await contract.api.update(listState.editedItem.id, payloadResult.data);
			contract.store.update((items) => items.map((i) => (i.id === saved.id ? saved : i)));
			listState.selectedItem = saved;
			listState.originalItem = JSON.parse(JSON.stringify(saved));
			showToast(
				`${contract.entityLabel} "${displayName}" updated successfully`,
				'success',
				3000
			);
			contract.afterSave?.(saved);
			closeDrawer();
		} catch (err) {
			contract.store.set(previous);
			handleServerError(err, `update ${contract.entityLabel.toLowerCase()}`);
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

		const payloadResult = contract.toCreatePayload(listState.editedItem);
		if (!payloadResult.ok) {
			showToast(payloadResult.error, 'error', 5000);
			isSaving = false;
			return;
		}

		try {
			const created = await contract.api.create(payloadResult.data);
			contract.store.update((items) => [...items, created]);
			const displayName = String(created[contract.nameKey]);
			showToast(
				`${contract.entityLabel} "${displayName}" created successfully`,
				'success',
				3000
			);
			contract.afterCreate?.(created);
			closeDrawer();
		} catch (err) {
			handleServerError(err, `create ${contract.entityLabel.toLowerCase()}`);
		} finally {
			isSaving = false;
		}
	}

	// --- Delete ---
	async function handleDelete() {
		if (!listState.editedItem || isDeleting) return;

		const displayName = String(listState.editedItem[contract.nameKey]);
		const deletedItem = listState.editedItem;
		isDeleting = true;

		// Pre-flight check
		if (contract.preDeleteCheck) {
			const fresh = get(contract.store).find((i) => i.id === deletedItem.id);
			if (fresh) {
				const check = contract.preDeleteCheck(fresh);
				if (!check.success) {
					isDeleting = false;
					showToast(check.error || `Cannot delete ${contract.entityLabel.toLowerCase()}`, 'error', 5000);
					return;
				}
			}
		}

		try {
			await contract.api.delete(deletedItem.id);
			contract.store.update((items) => items.filter((i) => i.id !== deletedItem.id));
			contract.afterDelete?.(deletedItem);
			closeDrawer();
			showToast(
				`${contract.entityLabel} "${displayName}" deleted successfully`,
				'success',
				3000
			);
		} catch (err) {
			showToast(mapApiError(err, `delete ${contract.entityLabel.toLowerCase()}`), 'error', 5000);
		} finally {
			isDeleting = false;
		}
	}

	// --- Compose list view + CRUD state ---
	const target = {} as CrudModelState<T>;
	Object.defineProperties(target, Object.getOwnPropertyDescriptors(listState));
	Object.defineProperties(
		target,
		Object.getOwnPropertyDescriptors({
			get isSaving() { return isSaving; },
			get isDeleting() { return isDeleting; },
			get isFormValid() { return isFormValid; },
			get visibleErrors() { return visibleErrors; },
			get canDelete() { return canDelete; },
			get deleteTooltip() { return deleteTooltip; },
			openCreate,
			closeDrawer,
			handleSave,
			handleCreate,
			handleUndo,
			handleDelete,
			isSelected
		})
	);
	return target;
}

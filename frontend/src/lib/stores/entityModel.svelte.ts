// src/lib/stores/entityModel.svelte.ts
//
// Generic CRUD entity model factory.
// Composes createListViewState for search/filter/sort/drawer, adds
// generic CRUD orchestration (validate, save, create, delete, undo).

import type { ListViewConfig } from './listViewState.svelte';
import type { DrawerMode } from './listViewState.svelte';
import type { MultiSortState } from '$lib/utils/sorting';
import type { ActionResult } from '$lib/domain/mutations';
import { createListViewState } from './listViewState.svelte';
import { composeState } from '$lib/utils/compose';
import { showToast } from './toasts';

// ============================================================================
// Types
// ============================================================================

export type PayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface EntityContracts<Item, CreatePayload, UpdatePayload> {
	validate: (item: Item) => Record<string, string>;
	createDraft: () => Item;
	toCreatePayload: (item: Item) => PayloadResult<CreatePayload>;
	toUpdatePayload: (item: Item) => PayloadResult<UpdatePayload>;
	deletionGuard: (item: Item) => { canDelete: boolean; tooltip: string };
	/** Optional pre-save guard. Return error message to block, undefined to proceed. */
	preSaveGuard?: (item: Item) => string | undefined;
}

export interface MutationActions<Item, CreatePayload, UpdatePayload> {
	create: (payload: CreatePayload) => Promise<ActionResult<Item>>;
	update: (id: string, payload: UpdatePayload) => Promise<ActionResult<Item>>;
	delete: (id: string) => Promise<ActionResult<void>>;
}

export interface EntityModelConfig<Item, FilterState, CreatePayload, UpdatePayload> {
	listConfig: ListViewConfig<Item>;
	contracts: EntityContracts<Item, CreatePayload, UpdatePayload>;
	mutations: MutationActions<Item, CreatePayload, UpdatePayload>;
	entityLabel: string;
	/** Extract display name from item. Defaults to item.name */
	getDisplayName?: (item: Item) => string;
}

export interface EntityModelState<Item, FilterState> {
	// List view state
	query: string;
	filters: FilterState;
	filtersOpen: boolean;
	drawerOpen: boolean;
	selectedItem: Item | null;
	editedItem: Item | null;
	originalItem: Item | null;
	showDeleteConfirm: boolean;
	readonly mode: DrawerMode;
	readonly results: Item[];
	readonly sorts: MultiSortState;
	readonly activeFiltersCount: number;
	readonly hasChanges: boolean;
	readonly highlightedId: string | null;
	handleSort: (columnKey: string, shiftKey: boolean) => void;
	selectItem: (item: Item) => void;
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
	isSelected: (item: Item) => boolean;
}

// ============================================================================
// Factory
// ============================================================================

export function createEntityModel<
	Item extends { id: string },
	FilterState extends Record<string, any>,
	CreatePayload,
	UpdatePayload
>(
	config: EntityModelConfig<Item, FilterState, CreatePayload, UpdatePayload>
): EntityModelState<Item, FilterState> {
	const { listConfig, contracts, mutations, entityLabel } = config;
	const getDisplayName = config.getDisplayName ?? ((item: any) => item.name);

	// --- Create list view state (shared utility) ---
	const listState = createListViewState<Item, FilterState>({
		...listConfig,
		drawerConfig: {
			trackEdits: true,
			allowDelete: true,
			closeDelay: 300,
			...listConfig.drawerConfig
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
		return contracts.validate(listState.editedItem);
	});

	let isFormValid = $derived(listState.editedItem !== null && Object.keys(formErrors).length === 0);
	let visibleErrors = $derived({ ...(formTouched ? formErrors : {}), ...serverErrors });

	// --- Derived deletion guard ---
	let deletionGuardResult = $derived.by(() => {
		if (!listState.editedItem) return { canDelete: true, tooltip: '' };
		return contracts.deletionGuard(listState.editedItem);
	});

	let canDelete = $derived(deletionGuardResult.canDelete);
	let deleteTooltip = $derived(deletionGuardResult.tooltip);

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
		listState.openCreate(contracts.createDraft());
		resetFormState();
	}

	function isSelected(item: Item): boolean {
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

		// Optional pre-save guard
		if (contracts.preSaveGuard) {
			const guardError = contracts.preSaveGuard(listState.editedItem);
			if (guardError) {
				showToast(guardError, 'error', 3000);
				return;
			}
		}

		formTouched = true;
		if (!isFormValid) return;

		const entityName = getDisplayName(listState.editedItem);
		isSaving = true;

		const payloadResult = contracts.toUpdatePayload(listState.editedItem);
		if (!payloadResult.ok) {
			showToast(payloadResult.error, 'error', 5000);
			isSaving = false;
			return;
		}

		const result = await mutations.update(listState.editedItem.id, payloadResult.data);

		if (!result.success) {
			isSaving = false;
			if (result.error?.includes('already exists')) {
				serverErrors = { name: result.error };
			} else {
				showToast(result.error || `Failed to update ${entityLabel}`, 'error', 5000);
			}
			return;
		}

		listState.selectedItem = result.data!;
		listState.originalItem = JSON.parse(JSON.stringify(result.data!));
		showToast(
			`${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} "${entityName}" updated successfully`,
			'success',
			3000
		);
		closeDrawer();
		isSaving = false;
	}

	// --- Create (new entity) ---
	async function handleCreate() {
		if (!listState.editedItem || isSaving) return;

		formTouched = true;
		if (!isFormValid) return;

		isSaving = true;

		const payloadResult = contracts.toCreatePayload(listState.editedItem);
		if (!payloadResult.ok) {
			showToast(payloadResult.error, 'error', 5000);
			isSaving = false;
			return;
		}

		const result = await mutations.create(payloadResult.data);

		if (!result.success) {
			isSaving = false;
			if (result.error?.includes('already exists')) {
				serverErrors = { name: result.error };
			} else {
				showToast(result.error || `Failed to create ${entityLabel}`, 'error', 5000);
			}
			return;
		}

		showToast(
			`${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} "${getDisplayName(result.data!)}" created successfully`,
			'success',
			3000
		);
		closeDrawer();
		isSaving = false;
	}

	// --- Delete ---
	async function handleDelete() {
		if (!listState.editedItem || isDeleting) return;

		const entityName = getDisplayName(listState.editedItem);
		isDeleting = true;

		const result = await mutations.delete(listState.editedItem.id);

		if (result.success) {
			closeDrawer();
			isDeleting = false;
			showToast(
				`${entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)} "${entityName}" deleted successfully`,
				'success',
				3000
			);
		} else {
			isDeleting = false;
			showToast(result.error || `Failed to delete ${entityLabel}`, 'error', 5000);
		}
	}

	// --- Compose and return ---
	return composeState(listState, {
		get isSaving() {
			return isSaving;
		},
		get isDeleting() {
			return isDeleting;
		},
		get isFormValid() {
			return isFormValid;
		},
		get visibleErrors() {
			return visibleErrors;
		},
		get canDelete() {
			return canDelete;
		},
		get deleteTooltip() {
			return deleteTooltip;
		},
		openCreate,
		closeDrawer,
		handleSave,
		handleCreate,
		handleUndo,
		handleDelete,
		isSelected
	}) as EntityModelState<Item, FilterState>;
}

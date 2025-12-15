/**
 * List View State Factory
 *
 * Creates stateful list view management using Svelte runes. This factory owns all state
 * and provides bindable properties (.value) and derived functions for list pages.
 *
 * This consolidates 80-150 lines of duplicate state logic per page into a single,
 * testable, and maintainable pattern.
 */

import type { Page } from '@sveltejs/kit';
import type { FilterConfig } from '$lib/types';
import type { MultiSortState } from '$lib/utils/sorting';
import { parseMultiSortFromUrl, buildMultiSortUrl, handleSortClick, sortDataMultiColumn } from '$lib/utils/sorting';
import { browser } from '$app/environment';

/**
 * Configuration for the drawer behavior
 */
export interface DrawerConfig {
  /** Enable edit mode tracking (originalItem vs editedItem) */
  trackEdits?: boolean;
  /** Enable delete confirmation flow */
  allowDelete?: boolean;
  /** Delay in ms before clearing selection on drawer close (for animations) */
  closeDelay?: number;
}

/**
 * Configuration input for creating list view state
 */
export interface ListViewConfig<Item> {
  /** Function that returns the reactive array of items */
  itemsStore: () => Item[];

  /** Domain-specific search function */
  searchFn: (items: Item[], query: string) => Item[];

  /** Filter sections configuration (can be reactive via function) */
  filterSections: FilterConfig | (() => FilterConfig);

  /** Set of column keys that should use numeric sorting */
  numericColumns: Set<string>;

  /** Object exposing page store and goto for URL navigation */
  urlScope: {
    page: Page;
    goto: (url: string, opts?: { replaceState?: boolean; keepFocus?: boolean }) => Promise<void>;
  };

  /** Optional: Key of the URL parameter used for highlight navigation */
  highlightParamKey?: string;

  /** Optional: Callback when an item is selected via highlight navigation */
  onHighlightSelect?: (item: Item) => void;

  /** Optional: Function to derive extra computed properties on items */
  deriveExtra?: (item: Item) => Record<string, any>;

  /** Optional: Function to get item ID (defaults to item.id) */
  getItemId?: (item: Item) => string;

  /** Optional: Map sort column names to derived property names */
  sortColumnMap?: Record<string, string>;

  /** Optional: Drawer configuration */
  drawerConfig?: DrawerConfig;
}

/**
 * State returned by the factory for use in components.
 * All state properties are reactive and can be bound directly in templates.
 */
export interface ListViewState<Item, FilterState> {
  // Reactive state properties (can be bound with bind: or read/written directly)
  query: string;
  filters: FilterState;
  filtersOpen: boolean;
  drawerOpen: boolean;
  selectedItem: Item | null;
  editedItem: Item | null;
  originalItem: Item | null;
  validationErrors: Record<string, string>;
  showDeleteConfirm: boolean;

  // Derived state (readonly, automatically recomputed)
  readonly results: Item[];
  readonly sorts: MultiSortState;
  readonly activeFiltersCount: number;
  readonly hasChanges: boolean;
  readonly highlightedId: string | null;

  // Action methods
  handleSort: (columnKey: string, shiftKey: boolean) => void;
  selectItem: (item: Item) => void;
  closeDrawer: () => void;
  resetFilters: () => void;
  toggleFilters: () => void;
}

/**
 * Creates a stateful list view with unified search, filter, sort, and drawer logic.
 * The factory owns all state internally using Svelte runes.
 */
export function createListViewState<Item, FilterState extends Record<string, any>>(
  config: ListViewConfig<Item>
): ListViewState<Item, FilterState> {
  const {
    itemsStore,
    searchFn,
    filterSections,
    numericColumns,
    urlScope,
    highlightParamKey,
    onHighlightSelect,
    deriveExtra,
    sortColumnMap,
    drawerConfig = {},
    getItemId = (item: any) => item.id
  } = config;

  const { trackEdits = false, closeDelay = 300 } = drawerConfig;

  // Normalize filterSections to support both static and reactive configs
  const getFilterSections = (): FilterConfig => {
    return typeof filterSections === 'function' ? filterSections() : filterSections;
  };

  // Create initial filter state from config
  function createInitialFilterState(): FilterState {
    const state: any = {};
    for (const section of getFilterSections()) {
      if (section.type === 'checkbox-group') {
        state[section.key] = [];
      } else if (section.type === 'toggle') {
        state[section.key] = false;
      }
    }
    return state as FilterState;
  }

  // Internal state using Svelte runes
  let query = $state('');
  let filters = $state<FilterState>(createInitialFilterState());
  let filtersOpen = $state(false);
  let drawerOpen = $state(false);
  let selectedItem = $state<Item | null>(null);
  let editedItem = $state<Item | null>(null);
  let originalItem = $state<Item | null>(null);
  let validationErrors = $state<Record<string, string>>({});
  let showDeleteConfirm = $state(false);
  let processedHighlightId = $state<string | null>(null);

  // Derived: Parse sorts from URL
  let sorts = $derived.by((): MultiSortState => {
    return parseMultiSortFromUrl(new URLSearchParams(urlScope.page.url.search));
  });

  // Derived: Parse highlight parameter from URL
  let highlightedId = $derived.by((): string | null => {
    if (!highlightParamKey) return null;
    return urlScope.page.url.searchParams.get(highlightParamKey);
  });

  // Derived: Filtered and sorted results
  let results = $derived.by((): Item[] => {
    const items = itemsStore();

    // Apply search
    let result = searchFn(items, query);

    // Apply filters
    for (const section of getFilterSections()) {
      const filterValue = filters[section.key as keyof FilterState];

      if (section.type === 'checkbox-group') {
        const selected = filterValue as string[];
        if (selected && selected.length > 0) {
          result = result.filter((item: any) => {
            // Use custom predicate if provided
            if (section.predicate) {
              return section.predicate(item, selected);
            }

            // Default behavior: match against item[section.key]
            const itemValue = item[section.key];
            // Handle both single values and arrays
            if (Array.isArray(itemValue)) {
              return itemValue.some((v: any) => selected.includes(String(v)));
            }
            return selected.includes(String(itemValue));
          });
        }
      } else if (section.type === 'toggle') {
        const toggled = filterValue as boolean;
        if (toggled) {
          result = result.filter((item: any) => {
            // Use custom predicate if provided
            if (section.predicate) {
              return section.predicate(item, toggled);
            }

            // Default behavior: check truthiness of item[section.key]
            const itemValue = item[section.key];
            // For boolean toggles, expect truthy values or non-zero counts
            if (typeof itemValue === 'boolean') return itemValue;
            if (typeof itemValue === 'number') return itemValue > 0;
            if (Array.isArray(itemValue)) return itemValue.length > 0;
            return !!itemValue;
          });
        }
      }
    }

    // Apply computed fields if configured
    if (deriveExtra) {
      result = result.map(item => ({
        ...item,
        ...deriveExtra(item)
      }));
    }

    // Remap sort columns if configured (for computed fields)
    let remappedSorts = sorts;
    if (sortColumnMap) {
      remappedSorts = sorts.map(sort => ({
        ...sort,
        column: sortColumnMap[sort.column] || sort.column
      }));
    }

    // Apply sorting
    return sortDataMultiColumn(result, remappedSorts, numericColumns);
  });

  // Derived: Active filters count
  let activeFiltersCount = $derived.by((): number => {
    let count = 0;
    for (const section of getFilterSections()) {
      const filterValue = filters[section.key as keyof FilterState];

      if (section.type === 'checkbox-group') {
        const selected = filterValue as string[];
        if (selected && selected.length > 0) count++;
      } else if (section.type === 'toggle') {
        if (filterValue) count++;
      }
    }
    return count;
  });

  // Derived: Check if there are unsaved changes
  let hasChanges = $derived.by((): boolean => {
    if (!trackEdits || !originalItem || !editedItem) return false;
    return JSON.stringify(originalItem) !== JSON.stringify(editedItem);
  });

  // Effect: Handle highlight parameter auto-selection
  $effect(() => {
    if (highlightParamKey && browser && highlightedId) {
      const items = itemsStore();

      // Only process if we haven't already processed this highlight ID
      if (highlightedId !== processedHighlightId && items.length > 0) {
        const item = items.find(i => getItemId(i) === highlightedId);

        if (item && !drawerOpen) {
          selectItem(item);
          processedHighlightId = highlightedId;

          // Clear the highlight parameter after opening
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete(highlightParamKey);
          window.history.replaceState({}, '', newUrl.pathname + newUrl.search);

          onHighlightSelect?.(item);
        }
      }
    } else if (browser && !highlightedId && processedHighlightId) {
      // Reset when highlight parameter is removed
      processedHighlightId = null;
    }
  });

  // Action: Handle sort column click
  function handleSort(columnKey: string, shiftKey: boolean): void {
    const newSorts = handleSortClick(columnKey, sorts, shiftKey);
    const urlParams = buildMultiSortUrl(newSorts);
    urlScope.goto(`?${urlParams}`, { replaceState: false, keepFocus: true });
  }

  // Action: Select an item and open drawer
  function selectItem(item: Item): void {
    const itemId = getItemId(item);
    const currentId = selectedItem ? getItemId(selectedItem) : null;
    const isSameItem = itemId === currentId;
    const wasOpen = drawerOpen;

    // If clicking the same item while drawer is open, do nothing (already showing)
    if (isSameItem && wasOpen) {
      return;
    }

    // If drawer is open for a different item, close it first for clean state transition
    if (wasOpen && !isSameItem) {
      drawerOpen = false;
    }

    selectedItem = item;

    if (trackEdits) {
      // Use JSON clone instead of structuredClone to handle Svelte 5 reactive proxies
      editedItem = JSON.parse(JSON.stringify(item));
      originalItem = JSON.parse(JSON.stringify(item));
    }

    // Use setTimeout to ensure state is cleared before reopening when switching items
    if (wasOpen && !isSameItem) {
      setTimeout(() => {
        drawerOpen = true;
        validationErrors = {};
        showDeleteConfirm = false;
      }, 0);
    } else {
      drawerOpen = true;
      validationErrors = {};
      showDeleteConfirm = false;
    }
  }

  // Action: Close drawer with delay
  function closeDrawer(): void {
    drawerOpen = false;

    setTimeout(() => {
      selectedItem = null;
      editedItem = null;
      originalItem = null;
      validationErrors = {};
      showDeleteConfirm = false;
    }, closeDelay);
  }

  // Action: Reset filters
  function resetFilters(): void {
    filters = createInitialFilterState();
    filtersOpen = false;
  }

  // Action: Toggle filters panel
  function toggleFilters(): void {
    filtersOpen = !filtersOpen;
  }

  // Return state object exposing reactive runes directly
  return {
    // Reactive state (exposed as getters/setters that Svelte can track)
    get query() { return query; },
    set query(v: string) { query = v; },

    get filters() { return filters; },
    set filters(v: FilterState) { filters = v; },

    get filtersOpen() { return filtersOpen; },
    set filtersOpen(v: boolean) { filtersOpen = v; },

    get drawerOpen() { return drawerOpen; },
    set drawerOpen(v: boolean) { drawerOpen = v; },

    get selectedItem() { return selectedItem; },
    set selectedItem(v: Item | null) { selectedItem = v; },

    get editedItem() { return editedItem; },
    set editedItem(v: Item | null) { editedItem = v; },

    get originalItem() { return originalItem; },
    set originalItem(v: Item | null) { originalItem = v; },

    get validationErrors() { return validationErrors; },
    set validationErrors(v: Record<string, string>) { validationErrors = v; },

    get showDeleteConfirm() { return showDeleteConfirm; },
    set showDeleteConfirm(v: boolean) { showDeleteConfirm = v; },

    // Derived state (exposed as getters that Svelte can track)
    get results() { return results; },
    get sorts() { return sorts; },
    get activeFiltersCount() { return activeFiltersCount; },
    get hasChanges() { return hasChanges; },
    get highlightedId() { return highlightedId; },

    // Action methods
    handleSort,
    selectItem,
    closeDrawer,
    resetFilters,
    toggleFilters
  };
}

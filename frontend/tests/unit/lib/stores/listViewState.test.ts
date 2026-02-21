/**
 * List View State Tests
 *
 * Unit tests for the listViewState store.
 * Location mirrors: src/lib/stores/listViewState.svelte.ts
 *
 * Tests the createListViewState factory: initial state, search, filtering,
 * sorting, drawer operations, and derived state.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks -- must be declared before imports that use them
// ---------------------------------------------------------------------------

vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/state', () => ({
  page: {
    url: new URL('http://localhost/fields'),
    params: {},
    route: { id: '/fields' },
    status: 200,
    error: null,
    data: {},
    form: null,
    state: {}
  }
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  createListViewState,
  type ListViewConfig,
  type ListViewState,
  type DrawerMode,
  type DrawerConfig
} from '$lib/stores/listViewState.svelte';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { effect_root } from 'svelte/internal/client';
import { flushSync } from 'svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TestItem {
  id: string;
  name: string;
  category: string;
  active: boolean;
}

type TestFilterState = {
  selectedCategories: string[];
  onlyActive: boolean;
};

function makeItem(overrides: Partial<TestItem> & { id: string; name: string }): TestItem {
  return {
    category: 'default',
    active: true,
    ...overrides
  };
}

const DEFAULT_ITEMS: TestItem[] = [
  makeItem({ id: '1', name: 'Alpha', category: 'a', active: true }),
  makeItem({ id: '2', name: 'Beta', category: 'b', active: false }),
  makeItem({ id: '3', name: 'Charlie', category: 'a', active: true })
];

function createTestListViewState(
  overrides: Partial<ListViewConfig<TestItem>> = {},
  items: TestItem[] = DEFAULT_ITEMS
): {
  state: ListViewState<TestItem, TestFilterState>;
  cleanup: () => void;
} {
  let state!: ListViewState<TestItem, TestFilterState>;

  const cleanup = effect_root(() => {
    state = createListViewState<TestItem, TestFilterState>({
      itemsStore: () => items,
      searchFn: (allItems, query) => {
        if (!query.trim()) return allItems;
        return allItems.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
      },
      filterSections: [
        {
          key: 'selectedCategories',
          label: 'Category',
          type: 'checkbox-group',
          options: [
            { value: 'a', label: 'Category A' },
            { value: 'b', label: 'Category B' }
          ],
          predicate: (item: TestItem, selected: string[]) => selected.includes(item.category)
        },
        {
          key: 'onlyActive',
          label: 'Only Active',
          type: 'toggle',
          predicate: (item: TestItem, toggled: boolean) => toggled ? item.active : true
        }
      ],
      numericColumns: new Set<string>(),
      urlScope: { page: page as any, goto: goto as any },
      drawerConfig: {
        trackEdits: true,
        allowDelete: true,
        closeDelay: 0 // No delay in tests
      },
      ...overrides
    });
  });

  return { state, cleanup };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('listViewState - Exports', () => {
  it('should export createListViewState as a function', () => {
    expect(typeof createListViewState).toBe('function');
  });

  it('should export DrawerMode type values correctly', () => {
    const modes: DrawerMode[] = ['closed', 'editing', 'creating'];
    expect(modes).toHaveLength(3);
  });
});

describe('listViewState - Initial State', () => {
  let state: ListViewState<TestItem, TestFilterState>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should start with empty query', () => {
    ({ state, cleanup } = createTestListViewState());

    expect(state.query).toBe('');
  });

  it('should start with default filter state', () => {
    ({ state, cleanup } = createTestListViewState());

    expect(state.filters.selectedCategories).toEqual([]);
    expect(state.filters.onlyActive).toBe(false);
  });

  it('should start with drawer closed', () => {
    ({ state, cleanup } = createTestListViewState());

    expect(state.drawerOpen).toBe(false);
    expect(state.mode).toBe('closed');
    expect(state.selectedItem).toBeNull();
    expect(state.editedItem).toBeNull();
    expect(state.originalItem).toBeNull();
  });

  it('should start with filters panel closed', () => {
    ({ state, cleanup } = createTestListViewState());

    expect(state.filtersOpen).toBe(false);
    expect(state.activeFiltersCount).toBe(0);
  });

  it('should return all items as results with no filters', () => {
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    expect(state.results).toHaveLength(3);
  });

  it('should start with no validation errors', () => {
    ({ state, cleanup } = createTestListViewState());

    expect(state.validationErrors).toEqual({});
    expect(state.showDeleteConfirm).toBe(false);
  });

  it('should have no changes initially', () => {
    ({ state, cleanup } = createTestListViewState());

    expect(state.hasChanges).toBe(false);
  });
});

describe('listViewState - Search', () => {
  let state: ListViewState<TestItem, TestFilterState>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should filter results by search query', () => {
    ({ state, cleanup } = createTestListViewState());

    state.query = 'Alpha';
    flushSync();

    expect(state.results).toHaveLength(1);
    expect(state.results[0].name).toBe('Alpha');
  });

  it('should return all results for empty query', () => {
    ({ state, cleanup } = createTestListViewState());

    state.query = '   ';
    flushSync();

    expect(state.results).toHaveLength(3);
  });

  it('should support case-insensitive search', () => {
    ({ state, cleanup } = createTestListViewState());

    state.query = 'beta';
    flushSync();

    expect(state.results).toHaveLength(1);
    expect(state.results[0].name).toBe('Beta');
  });
});

describe('listViewState - Filters', () => {
  let state: ListViewState<TestItem, TestFilterState>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should filter by checkbox-group', () => {
    ({ state, cleanup } = createTestListViewState());

    state.filters = { ...state.filters, selectedCategories: ['a'] };
    flushSync();

    expect(state.results).toHaveLength(2);
    expect(state.results.every(r => r.category === 'a')).toBe(true);
  });

  it('should filter by toggle', () => {
    ({ state, cleanup } = createTestListViewState());

    state.filters = { ...state.filters, onlyActive: true };
    flushSync();

    expect(state.results).toHaveLength(2);
    expect(state.results.every(r => r.active)).toBe(true);
  });

  it('should count active filters', () => {
    ({ state, cleanup } = createTestListViewState());

    state.filters = { selectedCategories: ['a'], onlyActive: true };
    flushSync();

    expect(state.activeFiltersCount).toBe(2);
  });

  it('should reset filters to initial state', () => {
    ({ state, cleanup } = createTestListViewState());

    state.filters = { selectedCategories: ['a'], onlyActive: true };
    state.filtersOpen = true;
    flushSync();

    state.resetFilters();
    flushSync();

    expect(state.filters.selectedCategories).toEqual([]);
    expect(state.filters.onlyActive).toBe(false);
    expect(state.filtersOpen).toBe(false);
  });

  it('should toggle filters panel', () => {
    ({ state, cleanup } = createTestListViewState());

    expect(state.filtersOpen).toBe(false);

    state.toggleFilters();
    flushSync();
    expect(state.filtersOpen).toBe(true);

    state.toggleFilters();
    flushSync();
    expect(state.filtersOpen).toBe(false);
  });
});

describe('listViewState - Drawer (Editing Mode)', () => {
  let state: ListViewState<TestItem, TestFilterState>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should open drawer for selected item', () => {
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    state.selectItem(DEFAULT_ITEMS[0]);
    flushSync();

    expect(state.drawerOpen).toBe(true);
    expect(state.mode).toBe('editing');
    expect(state.selectedItem).not.toBeNull();
    expect(state.selectedItem!.id).toBe('1');
  });

  it('should clone item into editedItem and originalItem when trackEdits enabled', () => {
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    state.selectItem(DEFAULT_ITEMS[0]);
    flushSync();

    expect(state.editedItem).not.toBeNull();
    expect(state.originalItem).not.toBeNull();
    expect(state.editedItem!.name).toBe('Alpha');
    expect(state.originalItem!.name).toBe('Alpha');
    // Should be different objects (cloned)
    expect(state.editedItem).not.toBe(state.selectedItem);
  });

  it('should close drawer and clear state', () => {
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    state.selectItem(DEFAULT_ITEMS[0]);
    flushSync();

    state.closeDrawer();
    flushSync();

    expect(state.drawerOpen).toBe(false);
    expect(state.mode).toBe('closed');
    // With closeDelay=0, items should be cleared immediately (via setTimeout 0)
  });

  it('should detect hasChanges when edited item differs', () => {
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    state.selectItem(DEFAULT_ITEMS[0]);
    flushSync();

    expect(state.hasChanges).toBe(false);

    state.editedItem = { ...state.editedItem!, name: 'Modified' };
    flushSync();

    expect(state.hasChanges).toBe(true);
  });

  it('should not detect changes when trackEdits is disabled', () => {
    ({ state, cleanup } = createTestListViewState({
      drawerConfig: { trackEdits: false, closeDelay: 0 }
    }));
    flushSync();

    state.selectItem(DEFAULT_ITEMS[0]);
    flushSync();

    // Without trackEdits, editedItem and originalItem are not populated
    expect(state.hasChanges).toBe(false);
  });
});

describe('listViewState - Drawer (Creating Mode)', () => {
  let state: ListViewState<TestItem, TestFilterState>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should open drawer in creating mode with draft', () => {
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    const draft = makeItem({ id: '', name: '' });
    state.openCreate(draft);
    flushSync();

    expect(state.drawerOpen).toBe(true);
    expect(state.mode).toBe('creating');
    expect(state.editedItem).not.toBeNull();
    expect(state.editedItem!.id).toBe('');
    expect(state.selectedItem).toBeNull();
    expect(state.originalItem).toBeNull();
  });

  it('should clear validation state on create', () => {
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    state.validationErrors = { name: 'Required' };
    state.showDeleteConfirm = true;
    flushSync();

    const draft = makeItem({ id: '', name: '' });
    state.openCreate(draft);
    flushSync();

    expect(state.validationErrors).toEqual({});
    expect(state.showDeleteConfirm).toBe(false);
  });
});

describe('listViewState - selectItem edge cases', () => {
  let state: ListViewState<TestItem, TestFilterState>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should do nothing when selecting the same item while drawer is open', () => {
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    state.selectItem(DEFAULT_ITEMS[0]);
    flushSync();

    // Select the same item again
    state.selectItem(DEFAULT_ITEMS[0]);
    flushSync();

    expect(state.drawerOpen).toBe(true);
    expect(state.selectedItem!.id).toBe('1');
  });

  it('should switch to different item when drawer is already open', () => {
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    state.selectItem(DEFAULT_ITEMS[0]);
    flushSync();

    expect(state.selectedItem!.id).toBe('1');

    // Select a different item
    state.selectItem(DEFAULT_ITEMS[1]);
    flushSync();

    expect(state.selectedItem!.id).toBe('2');
    expect(state.editedItem!.name).toBe('Beta');
  });
});

describe('listViewState - deriveExtra', () => {
  let state: ListViewState<TestItem, TestFilterState>;
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should add derived properties to results', () => {
    ({ state, cleanup } = createTestListViewState({
      deriveExtra: (item) => ({
        nameLength: item.name.length
      })
    }));
    flushSync();

    const results = state.results as (TestItem & { nameLength: number })[];
    expect(results[0].nameLength).toBe(results[0].name.length);
  });
});

describe('listViewState - handleSort', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('should call goto with sort URL parameters', () => {
    let state: ListViewState<TestItem, TestFilterState>;
    ({ state, cleanup } = createTestListViewState());
    flushSync();

    state.handleSort('name', false);

    expect(goto).toHaveBeenCalledWith(
      expect.stringContaining('sort='),
      expect.objectContaining({ replaceState: false })
    );
  });
});

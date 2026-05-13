/**
 * Test ID Utilities
 *
 * Shared constants and functions for generating consistent test IDs across components and tests.
 * This ensures that E2E selectors and component test IDs never drift.
 */

// Search
export const SEARCH_INPUT_ID = 'search-input';
export const SEARCH_CLEAR_ID = 'search-clear';

// Filters
export const FILTER_TOGGLE_ID = 'filter-toggle';
export const FILTER_PANEL_ID = 'filter-panel';
export function getFilterCheckboxId(section: string, value: string): string {
	return `filter-${section}-${value}`.toLowerCase().replace(/\s+/g, '-');
}

// Table
export const TABLE_ID = 'data-table';

/**
 * HTML attribute on list `<td>` cells (via `TableList*Cell` components).
 * Value must match the `SortableColumn` `column` key for that column (E2E + sort alignment).
 */
export const TABLE_COL_ATTR = 'data-col';

/**
 * Playwright/CSS selector for a cell in a row given a column key.
 *
 * @example
 * row.locator(getTableRowCellSelector('defaultValue'))
 */
export function getTableRowCellSelector(column: string): string {
	return `td[${TABLE_COL_ATTR}="${column}"]`;
}

/**
 * Stable `data-testid` for a data row. Set on `<tr>` in entity list tables (not header).
 */
export function getTableRowId(id: string): string {
	return `table-row-${id}`;
}

export function getSortColumnId(column: string): string {
	return `sort-${column}`;
}

// Empty state
export const EMPTY_STATE_ID = 'empty-state';

// Error / retry
export const ERROR_STATE_ID = 'error-state';
export const RETRY_BUTTON_ID = 'retry-button';

/**
 * Generate a test ID for a StatCard component based on its title.
 *
 * @param title - The title of the stat card (e.g., "Total Fields", "Credits Available")
 * @returns A slugified test ID (e.g., "stat-card-total-fields", "stat-card-credits-available")
 *
 * @example
 * getStatCardTestId("Total Fields") // "stat-card-total-fields"
 * getStatCardTestId("Credits Available") // "stat-card-credits-available"
 */
export function getStatCardTestId(title: string): string {
	return `stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`;
}

// ---------------------------------------------------------------------------
// Drawer panels — data-testid on DrawerStack outer column (`panel.id` from routes)
// ---------------------------------------------------------------------------

/**
 * Stable `data-testid` for a drawer stack column. Matches `DrawerStackPanel.id`
 * from list/detail routes (e.g. `'field'`, `'object'`, `'edit-api'`).
 */
export function getDrawerPanelTestId(panelId: string): string {
	return `drawer-panel-${panelId}`;
}

// ---------------------------------------------------------------------------
// DetailField (read-only drawer blocks) — root wrapper per label
// ---------------------------------------------------------------------------

/**
 * Value for `data-testid` on `DetailField` root. Label must be unique within the drawer body.
 */
export function getDetailFieldTestId(label: string): string {
	return `detail-field-${label
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')}`;
}

// ---------------------------------------------------------------------------
// Field form controls (Fields drawer / CRUD E2E)
// ---------------------------------------------------------------------------

export const FIELD_TYPE_DROPDOWN_LIST = 'field-type-dropdown-list';

/** Root wrapper around FieldConstraintSelectorDropdown (for scoping options). */
export const FIELD_CONSTRAINT_SELECTOR_ROOT = 'field-constraint-selector-root';

export const FIELD_CONSTRAINT_DROPDOWN_LIST = 'field-constraint-dropdown-list';

/** One row in FieldConstraintEditor. */
export const FIELD_CONSTRAINT_ROW = 'field-constraint-row';

/** Root of DefaultValueInput (preset + text modes). */
export const FIELD_DEFAULT_VALUE_CONTROL = 'field-default-value-control';

export const FIELD_DEFAULT_VALUE_PRESET_LIST = 'field-default-value-preset-list';

/** Shown when a preset (e.g. None/True/False) is selected. */
export const FIELD_DEFAULT_VALUE_PRESET_DISPLAY = 'field-default-value-preset-display';

/**
 * Error line under FormField or next to linked controls; matches FormField `id` / forId.
 *
 * @example getFormFieldErrorTestId('fields-name') → field-error-fields-name
 */
export function getFormFieldErrorTestId(fieldInputId: string): string {
	return `field-error-${fieldInputId}`;
}

// ---------------------------------------------------------------------------
// Object form (Objects drawer / CRUD E2E)
// ---------------------------------------------------------------------------

export const OBJECT_MEMBER_SEARCH = 'object-member-search';

export const OBJECT_MEMBER_DROPDOWN = 'object-member-dropdown';

/** DnD list container for scalar + relationship members. */
export const OBJECT_MEMBER_LIST = 'object-member-list';

/** One member block (scalar or relationship). */
export const OBJECT_MEMBER_ROW = 'object-member-row';

export const OBJECT_MEMBER_DRAG_HANDLE = 'object-member-drag-handle';

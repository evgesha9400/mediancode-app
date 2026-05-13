/**
 * Sorting utility for table columns with URL parameter persistence
 * Provides a consistent sorting interface across all pages with multi-column support
 */

export type SortDirection = 'asc' | 'desc';

export interface SortColumn {
	column: string;
	direction: SortDirection;
}

export type MultiSortState = SortColumn[];

/**
 * Parse multi-column sort state from URL search parameters
 * Format: ?sort=column1:asc,column2:desc,column3:asc
 */
export function parseMultiSortFromUrl(searchParams: URLSearchParams): MultiSortState {
	const sortParam = searchParams.get('sort');

	if (!sortParam) {
		return [];
	}

	const sorts: MultiSortState = [];
	const parts = sortParam.split(',');

	for (const part of parts) {
		const [column, direction] = part.split(':');
		if (column && (direction === 'asc' || direction === 'desc')) {
			sorts.push({ column, direction });
		}
	}

	return sorts;
}

/**
 * Build URL search params string from multi-column sort state
 * Format: column1:asc,column2:desc,column3:asc
 */
export function buildMultiSortUrl(sorts: MultiSortState): string {
	const params = new URLSearchParams();

	if (sorts.length > 0) {
		const sortString = sorts.map(s => `${s.column}:${s.direction}`).join(',');
		params.set('sort', sortString);
	}

	return params.toString();
}

/**
 * Handle sort column click with support for Shift key modifier
 * Normal click: Single-column sort (replaces all existing sorts)
 * Shift+Click: Multi-column sort (adds/modifies within existing sorts)
 */
export function handleSortClick(
	columnKey: string,
	currentSorts: MultiSortState,
	shiftKey: boolean
): MultiSortState {
	const existingIndex = currentSorts.findIndex(s => s.column === columnKey);

	if (!shiftKey) {
		// Normal click: single-column mode
		if (existingIndex === -1) {
			// Column not sorted: add as only sort (asc)
			return [{ column: columnKey, direction: 'asc' }];
		} else {
			// Column already sorted: cycle direction
			const current = currentSorts[existingIndex];
			if (current.direction === 'asc') {
				// asc -> desc
				return [{ column: columnKey, direction: 'desc' }];
			} else {
				// desc -> remove (clear all sorts, return to default)
				return [];
			}
		}
	} else {
		// Shift+Click: multi-column mode
		if (existingIndex === -1) {
			// Column not sorted: add to end (asc)
			return [...currentSorts, { column: columnKey, direction: 'asc' }];
		} else {
			// Column already sorted: cycle direction or remove
			const current = currentSorts[existingIndex];
			if (current.direction === 'asc') {
				// asc -> desc (keep position)
				return currentSorts.map((s, i) =>
					i === existingIndex ? { ...s, direction: 'desc' as SortDirection } : s
				);
			} else {
				// desc -> remove from sort chain
				return currentSorts.filter((_, i) => i !== existingIndex);
			}
		}
	}
}

/**
 * Sort an array of objects by multiple columns in priority order
 * Each column can specify if it should use numeric comparison
 */
export function sortDataMultiColumn<T>(
	data: T[],
	sorts: MultiSortState,
	numericColumns: Set<string> = new Set()
): T[] {
	if (sorts.length === 0) {
		return data;
	}

	return [...data].sort((a, b) => {
		// Apply sorts in priority order
		for (const sort of sorts) {
			const aValue = (a as any)[sort.column];
			const bValue = (b as any)[sort.column];
			const isNumeric = numericColumns.has(sort.column);

			let comparison = 0;

			if (isNumeric) {
				// Numeric comparison
				const aNum = typeof aValue === 'number' ? aValue : 0;
				const bNum = typeof bValue === 'number' ? bValue : 0;
				comparison = aNum - bNum;
			} else {
				// Case-insensitive string comparison
				const aStr = String(aValue || '').toLowerCase();
				const bStr = String(bValue || '').toLowerCase();

				if (aStr < bStr) comparison = -1;
				else if (aStr > bStr) comparison = 1;
			}

			// Apply direction
			if (comparison !== 0) {
				return sort.direction === 'asc' ? comparison : -comparison;
			}
			// If equal, continue to next sort column
		}

		return 0;
	});
}

/**
 * Get the Font Awesome icon class for a sort button in multi-column mode
 */
export function getMultiSortIcon(columnKey: string, sorts: MultiSortState): string {
	const sort = sorts.find(s => s.column === columnKey);

	if (!sort) {
		return 'fa-sort';
	}

	return sort.direction === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
}

/**
 * Get the priority badge number for a sorted column (1-based)
 * Returns null if column is not sorted
 */
export function getSortPriority(columnKey: string, sorts: MultiSortState): number | null {
	const index = sorts.findIndex(s => s.column === columnKey);
	return index === -1 ? null : index + 1;
}

/**
 * Get ARIA label for sort button in multi-column mode (for accessibility)
 */
export function getMultiSortAriaLabel(
	columnKey: string,
	columnName: string,
	sorts: MultiSortState
): string {
	const sort = sorts.find(s => s.column === columnKey);
	const priority = getSortPriority(columnKey, sorts);

	if (!sort || priority === null) {
		return `Sort by ${columnName}. Click to sort, Shift+Click to add to sort`;
	}

	const directionText = sort.direction === 'asc' ? 'ascending' : 'descending';
	const nextAction = sort.direction === 'asc' ? 'descending' : 'clear sort';

	if (sorts.length === 1) {
		return `${columnName} sorted ${directionText}. Click to sort ${nextAction}, Shift+Click to add to sort`;
	}

	return `${columnName} sorted ${directionText}, priority ${priority}. Click to sort ${nextAction}, Shift+Click to modify`;
}

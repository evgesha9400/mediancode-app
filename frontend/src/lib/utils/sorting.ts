/**
 * Sorting utility for table columns with URL parameter persistence
 * Provides a consistent sorting interface across all pages
 */

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
	sortBy: string | null;
	sortDir: SortDirection;
}

/**
 * Parse sort state from URL search parameters
 */
export function parseSortFromUrl(searchParams: URLSearchParams): SortState {
	const sortBy = searchParams.get('sortBy');
	const sortDir = searchParams.get('sortDir') as SortDirection;

	return {
		sortBy: sortBy || null,
		sortDir: sortDir === 'asc' || sortDir === 'desc' ? sortDir : null
	};
}

/**
 * Build URL search params string from sort state
 */
export function buildSortUrl(sortBy: string | null, sortDir: SortDirection): string {
	const params = new URLSearchParams();

	if (sortBy && sortDir) {
		params.set('sortBy', sortBy);
		params.set('sortDir', sortDir);
	}

	return params.toString();
}

/**
 * Cycle through sort states: null -> asc -> desc -> null
 */
export function cycleSortDirection(currentDir: SortDirection): SortDirection {
	if (currentDir === null) return 'asc';
	if (currentDir === 'asc') return 'desc';
	return null;
}

/**
 * Sort an array of objects by a specific key
 * Handles both string (alphabetical) and numeric sorting
 */
export function sortData<T>(
	data: T[],
	sortBy: string | null,
	sortDir: SortDirection,
	isNumeric: boolean = false
): T[] {
	if (!sortBy || !sortDir) {
		return data;
	}

	return [...data].sort((a, b) => {
		const aValue = (a as any)[sortBy];
		const bValue = (b as any)[sortBy];

		if (isNumeric) {
			// Numeric comparison
			const aNum = typeof aValue === 'number' ? aValue : 0;
			const bNum = typeof bValue === 'number' ? bValue : 0;
			return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
		} else {
			// Case-insensitive string comparison
			const aStr = String(aValue || '').toLowerCase();
			const bStr = String(bValue || '').toLowerCase();

			if (aStr < bStr) return sortDir === 'asc' ? -1 : 1;
			if (aStr > bStr) return sortDir === 'asc' ? 1 : -1;
			return 0;
		}
	});
}

/**
 * Get the Font Awesome icon class for a sort button
 */
export function getSortIcon(columnKey: string, currentSortBy: string | null, currentSortDir: SortDirection): string {
	if (currentSortBy !== columnKey || currentSortDir === null) {
		return 'fa-sort';
	}
	return currentSortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
}

/**
 * Get ARIA label for sort button (for accessibility)
 */
export function getSortAriaLabel(columnKey: string, columnName: string, currentSortBy: string | null, currentSortDir: SortDirection): string {
	if (currentSortBy !== columnKey || currentSortDir === null) {
		return `Sort by ${columnName}`;
	}
	if (currentSortDir === 'asc') {
		return `${columnName} sorted ascending. Click to sort descending`;
	}
	return `${columnName} sorted descending. Click to clear sort`;
}

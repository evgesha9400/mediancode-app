/**
 * Sorting Utility Tests
 *
 * Unit tests for sorting utilities.
 * Location mirrors: src/lib/utils/sorting.ts
 */

import { describe, it, expect } from 'vitest';
import {
	parseMultiSortFromUrl,
	buildMultiSortUrl,
	handleSortClick,
	sortDataMultiColumn,
	getMultiSortIcon,
	getSortPriority,
	getMultiSortAriaLabel,
	type MultiSortState
} from '$lib/utils/sorting';

describe('sorting utilities', () => {
	describe('parseMultiSortFromUrl', () => {
		it('returns empty array when no sort param', () => {
			const params = new URLSearchParams();
			expect(parseMultiSortFromUrl(params)).toEqual([]);
		});

		it('parses single column sort', () => {
			const params = new URLSearchParams('sort=name:asc');
			expect(parseMultiSortFromUrl(params)).toEqual([{ column: 'name', direction: 'asc' }]);
		});

		it('parses multi-column sort', () => {
			const params = new URLSearchParams('sort=name:asc,type:desc,priority:asc');
			expect(parseMultiSortFromUrl(params)).toEqual([
				{ column: 'name', direction: 'asc' },
				{ column: 'type', direction: 'desc' },
				{ column: 'priority', direction: 'asc' }
			]);
		});

		it('ignores invalid direction values', () => {
			const params = new URLSearchParams('sort=name:invalid,type:desc');
			expect(parseMultiSortFromUrl(params)).toEqual([{ column: 'type', direction: 'desc' }]);
		});
	});

	describe('buildMultiSortUrl', () => {
		it('returns empty string for empty sorts', () => {
			expect(buildMultiSortUrl([])).toBe('');
		});

		it('builds URL for single sort', () => {
			const sorts: MultiSortState = [{ column: 'name', direction: 'asc' }];
			expect(buildMultiSortUrl(sorts)).toBe('sort=name%3Aasc');
		});

		it('builds URL for multi-column sort', () => {
			const sorts: MultiSortState = [
				{ column: 'name', direction: 'asc' },
				{ column: 'type', direction: 'desc' }
			];
			expect(buildMultiSortUrl(sorts)).toBe('sort=name%3Aasc%2Ctype%3Adesc');
		});
	});

	describe('handleSortClick', () => {
		describe('normal click (no shift)', () => {
			it('adds new column as only sort (asc)', () => {
				const result = handleSortClick('name', [], false);
				expect(result).toEqual([{ column: 'name', direction: 'asc' }]);
			});

			it('cycles asc to desc', () => {
				const current: MultiSortState = [{ column: 'name', direction: 'asc' }];
				const result = handleSortClick('name', current, false);
				expect(result).toEqual([{ column: 'name', direction: 'desc' }]);
			});

			it('cycles desc to clear', () => {
				const current: MultiSortState = [{ column: 'name', direction: 'desc' }];
				const result = handleSortClick('name', current, false);
				expect(result).toEqual([]);
			});

			it('replaces existing sort with new column', () => {
				const current: MultiSortState = [{ column: 'name', direction: 'asc' }];
				const result = handleSortClick('type', current, false);
				expect(result).toEqual([{ column: 'type', direction: 'asc' }]);
			});
		});

		describe('shift click', () => {
			it('adds new column to existing sorts', () => {
				const current: MultiSortState = [{ column: 'name', direction: 'asc' }];
				const result = handleSortClick('type', current, true);
				expect(result).toEqual([
					{ column: 'name', direction: 'asc' },
					{ column: 'type', direction: 'asc' }
				]);
			});

			it('cycles existing column direction', () => {
				const current: MultiSortState = [
					{ column: 'name', direction: 'asc' },
					{ column: 'type', direction: 'asc' }
				];
				const result = handleSortClick('name', current, true);
				expect(result).toEqual([
					{ column: 'name', direction: 'desc' },
					{ column: 'type', direction: 'asc' }
				]);
			});

			it('removes column when cycling from desc', () => {
				const current: MultiSortState = [
					{ column: 'name', direction: 'desc' },
					{ column: 'type', direction: 'asc' }
				];
				const result = handleSortClick('name', current, true);
				expect(result).toEqual([{ column: 'type', direction: 'asc' }]);
			});
		});
	});

	describe('sortDataMultiColumn', () => {
		const testData = [
			{ name: 'Charlie', age: 30, priority: 1 },
			{ name: 'Alice', age: 25, priority: 2 },
			{ name: 'Bob', age: 30, priority: 3 },
			{ name: 'Alice', age: 35, priority: 4 }
		];

		it('returns original data when no sorts', () => {
			const result = sortDataMultiColumn(testData, []);
			expect(result).toEqual(testData);
		});

		it('sorts by single string column asc', () => {
			const result = sortDataMultiColumn(testData, [{ column: 'name', direction: 'asc' }]);
			expect(result[0].name).toBe('Alice');
			expect(result[1].name).toBe('Alice');
			expect(result[2].name).toBe('Bob');
			expect(result[3].name).toBe('Charlie');
		});

		it('sorts by single string column desc', () => {
			const result = sortDataMultiColumn(testData, [{ column: 'name', direction: 'desc' }]);
			expect(result[0].name).toBe('Charlie');
			expect(result[3].name).toBe('Alice');
		});

		it('sorts by numeric column', () => {
			const result = sortDataMultiColumn(
				testData,
				[{ column: 'age', direction: 'asc' }],
				new Set(['age'])
			);
			expect(result[0].age).toBe(25);
			expect(result[3].age).toBe(35);
		});

		it('applies multi-column sort in priority order', () => {
			const result = sortDataMultiColumn(
				testData,
				[
					{ column: 'name', direction: 'asc' },
					{ column: 'age', direction: 'asc' }
				],
				new Set(['age'])
			);
			// Alice entries should be first, sorted by age
			expect(result[0]).toEqual({ name: 'Alice', age: 25, priority: 2 });
			expect(result[1]).toEqual({ name: 'Alice', age: 35, priority: 4 });
		});
	});

	describe('getMultiSortIcon', () => {
		it('returns fa-sort for unsorted column', () => {
			expect(getMultiSortIcon('name', [])).toBe('fa-sort');
		});

		it('returns fa-sort-up for asc', () => {
			const sorts: MultiSortState = [{ column: 'name', direction: 'asc' }];
			expect(getMultiSortIcon('name', sorts)).toBe('fa-sort-up');
		});

		it('returns fa-sort-down for desc', () => {
			const sorts: MultiSortState = [{ column: 'name', direction: 'desc' }];
			expect(getMultiSortIcon('name', sorts)).toBe('fa-sort-down');
		});
	});

	describe('getSortPriority', () => {
		it('returns null for unsorted column', () => {
			expect(getSortPriority('name', [])).toBeNull();
		});

		it('returns 1-based priority', () => {
			const sorts: MultiSortState = [
				{ column: 'name', direction: 'asc' },
				{ column: 'type', direction: 'desc' }
			];
			expect(getSortPriority('name', sorts)).toBe(1);
			expect(getSortPriority('type', sorts)).toBe(2);
		});
	});

	describe('getMultiSortAriaLabel', () => {
		it('returns appropriate label for unsorted column', () => {
			const label = getMultiSortAriaLabel('name', 'Name', []);
			expect(label).toContain('Sort by Name');
			expect(label).toContain('Shift+Click');
		});

		it('returns appropriate label for sorted column', () => {
			const sorts: MultiSortState = [{ column: 'name', direction: 'asc' }];
			const label = getMultiSortAriaLabel('name', 'Name', sorts);
			expect(label).toContain('ascending');
		});
	});
});

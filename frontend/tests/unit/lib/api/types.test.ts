/**
 * Types API Service Tests
 *
 * Unit tests for the types API service.
 * Location mirrors: src/lib/api/types.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
	apiGet: vi.fn()
}));

import { listTypes } from '$lib/api/types';
import { apiGet } from '$lib/api/client';

describe('Types API Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('listTypes', () => {
		it('should be exported as a function', () => {
			expect(typeof listTypes).toBe('function');
		});

		it('should call apiGet with /types endpoint', async () => {
			(apiGet as any).mockResolvedValue([]);

			await listTypes();

			expect(apiGet).toHaveBeenCalledWith('/types');
		});

		it('should transform backend response to frontend types', async () => {
			const mockResponse = [
				{
					id: 'type-1',
					namespaceId: 'ns-1',
					name: 'str',
					pythonType: 'str',
					description: 'A string type',
					importPath: null,
					parentTypeId: null,
					usedInFields: 5
				}
			];
			(apiGet as any).mockResolvedValue(mockResponse);

			const result = await listTypes();

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'type-1',
				namespaceId: 'ns-1',
				name: 'str',
				pythonType: 'str',
				description: 'A string type',
				importPath: null,
				parentTypeId: null,
				usedInFields: 5
			});
		});
	});
});

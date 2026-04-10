// tests/unit/lib/stores/crudModel.test.ts
//
// Generic CRUD model factory — deeper coverage in *Model.test.ts files.

import { describe, it, expect, vi, afterEach } from 'vitest';

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
vi.mock('$lib/domain/errorMap', () => ({
	mapApiError: vi.fn((_err: unknown, context: string) => `Failed to ${context}`)
}));
vi.mock('$lib/stores/toasts', () => ({
	showToast: vi.fn()
}));

import { createCrudModel } from '$lib/stores/crudModel.svelte';
import { createFieldsContract } from '$lib/stores/fieldsConfig.svelte';
import { page } from '$app/state';
import { goto } from '$app/navigation';
import { effect_root } from 'svelte/internal/client';

describe('crudModel', () => {
	let cleanup: (() => void) | undefined;

	afterEach(() => {
		cleanup?.();
		cleanup = undefined;
	});

	it('createCrudModel runs inside a Svelte effect root', () => {
		let resultCount = -1;
		cleanup = effect_root(() => {
			const contract = createFieldsContract({
				getActiveNamespaceId: () => 'ns-1',
				getDefaultType: () => 'str',
				getTypeIdByName: () => 't-1'
			});
			const model = createCrudModel(contract, {
				itemsStore: () => [],
				searchFn: (items) => items,
				filterSections: [],
				urlScope: { page: page as any, goto: goto as any }
			});
			resultCount = model.results.length;
		});
		expect(resultCount).toBe(0);
	});
});

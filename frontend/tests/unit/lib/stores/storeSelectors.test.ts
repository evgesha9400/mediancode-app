// tests/unit/lib/stores/storeSelectors.test.ts
//
// Lookup and search helpers over catalog stores.

import { describe, it, expect } from 'vitest';
import { searchApis } from '$lib/stores/storeSelectors';
import type { Api } from '$lib/types';

function makeApi(overrides: Partial<Api> = {}): Api {
	return {
		id: 'api-1',
		namespaceId: 'ns-1',
		title: 'UserApi',
		version: '1.0.0',
		description: '',
		baseUrl: '/api/v1',
		serverUrl: '',
		createdAt: '',
		updatedAt: '',
		...overrides
	};
}

describe('storeSelectors', () => {
	it('searchApis matches title', () => {
		const apis = [makeApi({ title: 'OrderApi' }), makeApi({ id: 'api-2', title: 'UserApi' })];
		expect(searchApis(apis, 'order')).toHaveLength(1);
		expect(searchApis(apis, 'user')).toHaveLength(1);
	});
});

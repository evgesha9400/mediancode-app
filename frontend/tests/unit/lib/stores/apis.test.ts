import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	apisStore,
	endpointsStore,
	getApiById,
	getApisByNamespace,
	searchApis,
	getEndpointById,
	getEndpointCountByApi,
	getEndpointsByApi,
	getEndpointCountByTagName,
	getTotalEndpointCount
} from '$lib/stores/stores';
import { GLOBAL_NAMESPACE_ID } from '$lib/utils/namespace';
import { createMockEndpoint, createMockApi } from '../../../shared/testUtils';

const TEST_API_ID = 'cccccccc-0000-0000-0000-000000000001';

describe('apis store - API Selectors', () => {
	beforeEach(() => {
		apisStore.set([
			createMockApi({ id: 'api-1', title: 'Users API', description: 'User management', baseUrl: '/api/users' }),
			createMockApi({ id: 'api-2', title: 'Products API', description: 'Product catalog', baseUrl: '/api/products', namespaceId: 'ns-1' }),
			createMockApi({ id: 'api-3', title: 'Orders API', description: 'Order processing', baseUrl: '/api/orders' })
		]);
	});

	it('should get API by ID', () => {
		const api = getApiById('api-1');
		expect(api).toBeDefined();
		expect(api?.title).toBe('Users API');

		expect(getApiById('non-existent')).toBeUndefined();
	});

	it('should get APIs by namespace', () => {
		const globalApis = getApisByNamespace(GLOBAL_NAMESPACE_ID);
		expect(globalApis).toHaveLength(2); // api-1 and api-3

		const ns1Apis = getApisByNamespace('ns-1');
		expect(ns1Apis).toHaveLength(1);
		expect(ns1Apis[0].title).toBe('Products API');
	});

	it('should search APIs by title', () => {
		const apis = get(apisStore);
		const results = searchApis(apis, 'Users');

		expect(results).toHaveLength(1);
		expect(results[0].title).toBe('Users API');
	});

	it('should search APIs by description', () => {
		const apis = get(apisStore);
		const results = searchApis(apis, 'catalog');

		expect(results).toHaveLength(1);
		expect(results[0].title).toBe('Products API');
	});

	it('should search APIs by baseUrl', () => {
		const apis = get(apisStore);
		const results = searchApis(apis, '/api/orders');

		expect(results).toHaveLength(1);
		expect(results[0].title).toBe('Orders API');
	});

	it('should return all APIs for empty search query', () => {
		const apis = get(apisStore);
		const results = searchApis(apis, '');

		expect(results).toHaveLength(3);
	});

	it('should be case insensitive when searching', () => {
		const apis = get(apisStore);
		const results = searchApis(apis, 'USERS');

		expect(results).toHaveLength(1);
		expect(results[0].title).toBe('Users API');
	});
});

describe('apis store - Endpoint Selectors', () => {
	beforeEach(() => {
		apisStore.set([createMockApi({ id: TEST_API_ID })]);
		endpointsStore.set([
			createMockEndpoint({ id: 'ep-1', apiId: TEST_API_ID, path: '/users', tagName: 'Users' }),
			createMockEndpoint({ id: 'ep-2', apiId: TEST_API_ID, method: 'POST', path: '/users', tagName: 'Users' }),
			createMockEndpoint({ id: 'ep-3', apiId: TEST_API_ID, path: '/posts', tagName: 'Posts' }),
			createMockEndpoint({ id: 'ep-4', apiId: 'other-api', path: '/other' })
		]);
	});

	it('should get endpoint by ID', () => {
		const endpoint = getEndpointById('ep-1');
		expect(endpoint).toBeDefined();
		expect(endpoint?.path).toBe('/users');

		expect(getEndpointById('non-existent')).toBeUndefined();
	});

	it('should count endpoints by API', () => {
		expect(getEndpointCountByApi(TEST_API_ID)).toBe(3);
		expect(getEndpointCountByApi('other-api')).toBe(1);
		expect(getEndpointCountByApi('non-existent')).toBe(0);
	});

	it('should get endpoints by API', () => {
		const endpoints = getEndpointsByApi(TEST_API_ID);
		expect(endpoints).toHaveLength(3);
		expect(endpoints.every(e => e.apiId === TEST_API_ID)).toBe(true);
	});

	it('should count endpoints by tag name', () => {
		expect(getEndpointCountByTagName(TEST_API_ID, 'Users')).toBe(2);
		expect(getEndpointCountByTagName(TEST_API_ID, 'Posts')).toBe(1);
		expect(getEndpointCountByTagName(TEST_API_ID, 'NonExistent')).toBe(0);
	});

	it('should count total endpoints', () => {
		expect(getTotalEndpointCount()).toBe(4);

		endpointsStore.set([]);
		expect(getTotalEndpointCount()).toBe(0);
	});
});

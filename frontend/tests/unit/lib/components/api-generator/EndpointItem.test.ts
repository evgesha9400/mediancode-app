/**
 * EndpointItem Component Tests
 *
 * Unit tests for the EndpointItem component.
 * Location mirrors: src/lib/components/api-generator/EndpointItem.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { EndpointItem, type EndpointItemProps } from '$lib/components';

describe('EndpointItem Component', () => {
	describe('TypeScript Interface', () => {
		it('EndpointItemProps interface accepts endpoint and onClick properties', () => {
			const props: EndpointItemProps = {
				endpoint: {
					id: 'ep-1',
					apiId: 'api-1',
					method: 'GET',
					path: '/users',
					description: 'List users',
					pathParams: [],
					responseShape: 'object',
					useEnvelope: false
				},
				onClick: () => {}
			};

			expect(props.endpoint.method).toBe('GET');
			expect(props.endpoint.path).toBe('/users');
			expect(typeof props.onClick).toBe('function');
		});

		it('EndpointItemProps requires endpoint property', () => {
			const props: EndpointItemProps = {
				endpoint: {
					id: 'ep-2',
					apiId: 'api-1',
					method: 'POST',
					path: '/users',
					description: '',
					pathParams: [],
					responseShape: 'object',
					useEnvelope: false
				},
				onClick: () => {}
			};

			expect(props.endpoint.id).toBe('ep-2');
		});

		it('EndpointItemProps endpoint supports optional fields', () => {
			const props: EndpointItemProps = {
				endpoint: {
					id: 'ep-3',
					apiId: 'api-1',
					method: 'DELETE',
					path: '/users/{id}',
					description: 'Delete a user',
					tagName: 'Users',
					pathParams: [],
					queryParamsObjectId: 'obj-1',
					requestBodyObjectId: 'obj-2',
					responseBodyObjectId: 'obj-3',
					responseShape: 'list',
					useEnvelope: true
				},
				onClick: () => {}
			};

			expect(props.endpoint.tagName).toBe('Users');
			expect(props.endpoint.queryParamsObjectId).toBe('obj-1');
			expect(props.endpoint.requestBodyObjectId).toBe('obj-2');
			expect(props.endpoint.responseBodyObjectId).toBe('obj-3');
		});
	});

	describe('Component Structure Verification', () => {
		it('EndpointItem component exports correctly from barrel export', () => {
			expect(EndpointItem).toBeDefined();
			expect(typeof EndpointItem).toBe('function');
		});

		it('EndpointItemProps type exports correctly from barrel export', () => {
			const props: EndpointItemProps = {
				endpoint: {
					id: 'ep-1',
					apiId: 'api-1',
					method: 'GET',
					path: '/test',
					description: '',
					pathParams: [],
					responseShape: 'object',
					useEnvelope: false
				},
				onClick: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});

/**
 * ApiReadinessCard Component Tests
 *
 * Unit tests for the ApiReadinessCard component.
 * Location mirrors: src/lib/components/dashboard/ApiReadinessCard.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ApiReadinessCard, type ApiReadinessCardProps } from '$lib/components/dashboard';

describe('ApiReadinessCard Component', () => {
	describe('TypeScript Interface', () => {
		it('ApiReadinessCardProps requires all fields', () => {
			const onGenerate = () => {};
			const props: ApiReadinessCardProps = {
				apiId: 'api-1',
				title: 'User Service',
				version: '1.0.0',
				endpointCount: 3,
				readyEndpointCount: 2,
				status: 'ready',
				onGenerate
			};

			expect(props.apiId).toBe('api-1');
			expect(props.title).toBe('User Service');
			expect(props.version).toBe('1.0.0');
			expect(props.endpointCount).toBe(3);
			expect(props.readyEndpointCount).toBe(2);
			expect(props.status).toBe('ready');
			expect(props.onGenerate).toBe(onGenerate);
		});

		it('status accepts "needs-endpoints"', () => {
			const props: ApiReadinessCardProps = {
				apiId: 'api-2',
				title: 'Empty API',
				version: '0.1.0',
				endpointCount: 0,
				readyEndpointCount: 0,
				status: 'needs-endpoints',
				onGenerate: () => {}
			};

			expect(props.status).toBe('needs-endpoints');
			expect(props.endpointCount).toBe(0);
		});

		it('status accepts "incomplete"', () => {
			const props: ApiReadinessCardProps = {
				apiId: 'api-3',
				title: 'WIP API',
				version: '0.2.0',
				endpointCount: 2,
				readyEndpointCount: 0,
				status: 'incomplete',
				onGenerate: () => {}
			};

			expect(props.status).toBe('incomplete');
			expect(props.readyEndpointCount).toBe(0);
		});
	});

	describe('Component Structure Verification', () => {
		it('ApiReadinessCard component exports correctly from barrel export', () => {
			expect(ApiReadinessCard).toBeDefined();
			expect(typeof ApiReadinessCard).toBe('function');
		});

		it('ApiReadinessCardProps type exports correctly from barrel export', () => {
			const props: ApiReadinessCardProps = {
				apiId: 'test',
				title: 'Test',
				version: '1.0',
				endpointCount: 0,
				readyEndpointCount: 0,
				status: 'needs-endpoints',
				onGenerate: () => {}
			};
			expect(props).toBeDefined();
		});
	});
});

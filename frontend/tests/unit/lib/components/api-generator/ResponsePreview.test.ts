/**
 * ResponsePreview Component Tests
 *
 * Unit tests for the ResponsePreview component.
 * Location mirrors: src/lib/components/api-generator/ResponsePreview.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ResponsePreview, type ResponsePreviewProps } from '$lib/components';

describe('ResponsePreview Component', () => {
	describe('TypeScript Interface', () => {
		it('ResponsePreviewProps interface accepts all required properties', () => {
			const props: ResponsePreviewProps = {
				responseShape: 'object'
			};

			expect(props.responseShape).toBe('object');
			expect(props.selectedObjectId).toBeUndefined();
		});

		it('ResponsePreviewProps accepts optional selectedObjectId', () => {
			const props: ResponsePreviewProps = {
				selectedObjectId: 'obj-1',
				responseShape: 'list'
			};

			expect(props.selectedObjectId).toBe('obj-1');
			expect(props.responseShape).toBe('list');
		});

		it('ResponsePreviewProps supports both response shapes', () => {
			const objectProps: ResponsePreviewProps = {
				responseShape: 'object'
			};
			const listProps: ResponsePreviewProps = {
				responseShape: 'list'
			};

			expect(objectProps.responseShape).toBe('object');
			expect(listProps.responseShape).toBe('list');
		});
	});

	describe('Component Structure Verification', () => {
		it('ResponsePreview component exports correctly from barrel export', () => {
			expect(ResponsePreview).toBeDefined();
			expect(typeof ResponsePreview).toBe('function');
		});

		it('ResponsePreviewProps type exports correctly from barrel export', () => {
			const props: ResponsePreviewProps = {
				responseShape: 'object'
			};

			expect(props).toBeDefined();
		});
	});
});

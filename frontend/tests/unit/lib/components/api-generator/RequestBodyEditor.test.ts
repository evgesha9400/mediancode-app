/**
 * RequestBodyEditor Component Tests
 *
 * Unit tests for the RequestBodyEditor component.
 * Location mirrors: src/lib/components/api-generator/RequestBodyEditor.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { RequestBodyEditor, type RequestBodyEditorProps } from '$lib/components';

describe('RequestBodyEditor Component', () => {
	describe('TypeScript Interface', () => {
		it('RequestBodyEditorProps interface accepts all required properties', () => {
			const props: RequestBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				onSelectObject: () => {}
			};

			expect(props.endpointNamespaceId).toBe('ns-1');
			expect(typeof props.onSelectObject).toBe('function');
		});

		it('RequestBodyEditorProps selectedObjectId is optional', () => {
			const propsWithout: RequestBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				onSelectObject: () => {}
			};

			expect(propsWithout.selectedObjectId).toBeUndefined();

			const propsWith: RequestBodyEditorProps = {
				...propsWithout,
				selectedObjectId: 'obj-1'
			};

			expect(propsWith.selectedObjectId).toBe('obj-1');
		});

		it('RequestBodyEditorProps onSelectObject receives objectId or undefined', () => {
			let selectedId: string | undefined;

			const props: RequestBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				onSelectObject: (objectId) => {
					selectedId = objectId;
				}
			};

			props.onSelectObject('obj-1');
			expect(selectedId).toBe('obj-1');

			props.onSelectObject(undefined);
			expect(selectedId).toBeUndefined();
		});
	});

	describe('Component Structure Verification', () => {
		it('RequestBodyEditor component exports correctly from barrel export', () => {
			expect(RequestBodyEditor).toBeDefined();
			expect(typeof RequestBodyEditor).toBe('function');
		});

		it('RequestBodyEditorProps type exports correctly from barrel export', () => {
			const props: RequestBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				onSelectObject: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});

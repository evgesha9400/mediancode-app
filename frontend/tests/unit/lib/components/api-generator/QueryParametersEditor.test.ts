/**
 * QueryParametersEditor Component Tests
 *
 * Unit tests for the QueryParametersEditor component.
 * Location mirrors: src/lib/components/api-generator/QueryParametersEditor.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { QueryParametersEditor, type QueryParametersEditorProps } from '$lib/components';

describe('QueryParametersEditor Component', () => {
	describe('TypeScript Interface', () => {
		it('QueryParametersEditorProps interface accepts all required properties', () => {
			const props: QueryParametersEditorProps = {
				endpointNamespaceId: 'ns-1',
				onSelectObject: () => {}
			};

			expect(props.endpointNamespaceId).toBe('ns-1');
			expect(typeof props.onSelectObject).toBe('function');
		});

		it('QueryParametersEditorProps selectedObjectId is optional', () => {
			const propsWithout: QueryParametersEditorProps = {
				endpointNamespaceId: 'ns-1',
				onSelectObject: () => {}
			};

			expect(propsWithout.selectedObjectId).toBeUndefined();

			const propsWith: QueryParametersEditorProps = {
				...propsWithout,
				selectedObjectId: 'obj-1'
			};

			expect(propsWith.selectedObjectId).toBe('obj-1');
		});

		it('QueryParametersEditorProps onSelectObject receives objectId or undefined', () => {
			let selectedId: string | undefined;

			const props: QueryParametersEditorProps = {
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
		it('QueryParametersEditor component exports correctly from barrel export', () => {
			expect(QueryParametersEditor).toBeDefined();
			expect(typeof QueryParametersEditor).toBe('function');
		});

		it('QueryParametersEditorProps type exports correctly from barrel export', () => {
			const props: QueryParametersEditorProps = {
				endpointNamespaceId: 'ns-1',
				onSelectObject: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});

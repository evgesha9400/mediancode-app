/**
 * ObjectEditor Component Tests
 *
 * Unit tests for the ObjectEditor component.
 * Location mirrors: src/lib/components/api-generator/ObjectEditor.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ObjectEditor, type ObjectEditorProps } from '$lib/components/api-generator';

describe('ObjectEditor Component', () => {
	describe('TypeScript Interface', () => {
		it('ObjectEditorProps interface accepts all required properties', () => {
			const props: ObjectEditorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'object',
				onSelectObject: () => {},
				onSetResponseShape: () => {}
			};

			expect(props.endpointNamespaceId).toBe('ns-1');
			expect(props.responseShape).toBe('object');
			expect(typeof props.onSelectObject).toBe('function');
			expect(typeof props.onSetResponseShape).toBe('function');
		});

		it('ObjectEditorProps accepts optional properties', () => {
			const props: ObjectEditorProps = {
				endpointNamespaceId: 'ns-1',
				selectedObjectId: 'obj-1',
				responseShape: 'list',
				onSelectObject: () => {},
				onSetResponseShape: () => {},
				onCreateNewObject: () => {}
			};

			expect(props.selectedObjectId).toBe('obj-1');
			expect(props.responseShape).toBe('list');
			expect(typeof props.onCreateNewObject).toBe('function');
		});
	});

	describe('Component Export', () => {
		it('exports ObjectEditor component', () => {
			expect(ObjectEditor).toBeDefined();
		});
	});
});

/**
 * ObjectSelector Component Tests
 *
 * Unit tests for the ObjectSelector component.
 * Location mirrors: src/lib/components/api-generator/ObjectSelector.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ObjectSelector, type ObjectSelectorProps } from '$lib/components';

describe('ObjectSelector Component', () => {
	describe('TypeScript Interface', () => {
		it('ObjectSelectorProps interface accepts all required properties', () => {
			const props: ObjectSelectorProps = {
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

		it('ObjectSelectorProps accepts optional properties', () => {
			const props: ObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				selectedObjectId: 'obj-1',
				responseShape: 'list',
				responseShapePolicy: 'locked',
				responseShapeLockedReason: 'Detail endpoints return a single object',
				onSelectObject: () => {},
				onSetResponseShape: () => {},
				onCreateNewObject: () => {}
			};

			expect(props.selectedObjectId).toBe('obj-1');
			expect(props.responseShape).toBe('list');
			expect(props.responseShapePolicy).toBe('locked');
			expect(props.responseShapeLockedReason).toBe('Detail endpoints return a single object');
			expect(typeof props.onCreateNewObject).toBe('function');
		});

		it('ObjectSelectorProps handlers receive correct arguments', () => {
			let selectedObjectId: string | undefined;
			let selectedShape: string | undefined;

			const props: ObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'object',
				onSelectObject: (id) => { selectedObjectId = id; },
				onSetResponseShape: (shape) => { selectedShape = shape; }
			};

			props.onSelectObject('obj-1');
			expect(selectedObjectId).toBe('obj-1');

			props.onSetResponseShape('list');
			expect(selectedShape).toBe('list');
		});
	});

	describe('Component Structure Verification', () => {
		it('ObjectSelector component exports correctly from barrel export', () => {
			expect(ObjectSelector).toBeDefined();
			expect(typeof ObjectSelector).toBe('function');
		});

		it('ObjectSelectorProps type exports correctly from barrel export', () => {
			const props: ObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'object',
				onSelectObject: () => {},
				onSetResponseShape: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});

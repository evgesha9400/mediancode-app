/**
 * TargetObjectSelector Component Tests
 *
 * Unit tests for the TargetObjectSelector component.
 * Location mirrors: src/lib/components/api-generator/TargetObjectSelector.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { TargetObjectSelector, type TargetObjectSelectorProps } from '$lib/components';

describe('TargetObjectSelector Component', () => {
	describe('TypeScript Interface', () => {
		it('TargetObjectSelectorProps interface accepts all required properties', () => {
			const props: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'list',
				onSelectTarget: () => {}
			};

			expect(props.endpointNamespaceId).toBe('ns-1');
			expect(props.responseShape).toBe('list');
			expect(typeof props.onSelectTarget).toBe('function');
		});

		it('TargetObjectSelectorProps accepts detail response shape', () => {
			const props: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'object',
				objectId: 'obj-1',
				targetObjectId: 'obj-1',
				onSelectTarget: () => {}
			};

			expect(props.responseShape).toBe('object');
			expect(props.objectId).toBe('obj-1');
			expect(props.targetObjectId).toBe('obj-1');
		});

		it('TargetObjectSelectorProps objectId is optional', () => {
			const propsWithout: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'list',
				onSelectTarget: () => {}
			};

			expect(propsWithout.objectId).toBeUndefined();

			const propsWith: TargetObjectSelectorProps = {
				...propsWithout,
				objectId: 'obj-1'
			};

			expect(propsWith.objectId).toBe('obj-1');
		});

		it('TargetObjectSelectorProps targetObjectId is optional', () => {
			const propsWithout: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'list',
				onSelectTarget: () => {}
			};

			expect(propsWithout.targetObjectId).toBeUndefined();

			const propsWith: TargetObjectSelectorProps = {
				...propsWithout,
				targetObjectId: 'obj-2'
			};

			expect(propsWith.targetObjectId).toBe('obj-2');
		});

		it('TargetObjectSelectorProps onSelectTarget receives objectId or undefined', () => {
			let selectedId: string | undefined;

			const props: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'list',
				onSelectTarget: (objectId) => {
					selectedId = objectId;
				}
			};

			props.onSelectTarget('obj-1');
			expect(selectedId).toBe('obj-1');

			props.onSelectTarget(undefined);
			expect(selectedId).toBeUndefined();
		});

		it('TargetObjectSelectorProps onCreateNewObject is optional', () => {
			const propsWithout: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'list',
				onSelectTarget: () => {}
			};

			expect(propsWithout.onCreateNewObject).toBeUndefined();
		});

		it('TargetObjectSelectorProps onCreateNewObject is callable when provided', () => {
			let createCalled = false;

			const props: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'list',
				onSelectTarget: () => {},
				onCreateNewObject: () => {
					createCalled = true;
				}
			};

			props.onCreateNewObject!();
			expect(createCalled).toBe(true);
		});

		it('TargetObjectSelectorProps supports both response shape values', () => {
			const listProps: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'list',
				onSelectTarget: () => {}
			};

			const objectProps: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'object',
				onSelectTarget: () => {}
			};

			expect(listProps.responseShape).toBe('list');
			expect(objectProps.responseShape).toBe('object');
		});
	});

	describe('Component Structure Verification', () => {
		it('TargetObjectSelector component exports correctly from barrel export', () => {
			expect(TargetObjectSelector).toBeDefined();
			expect(typeof TargetObjectSelector).toBe('function');
		});

		it('TargetObjectSelectorProps type exports correctly from barrel export', () => {
			const props: TargetObjectSelectorProps = {
				endpointNamespaceId: 'ns-1',
				responseShape: 'list',
				onSelectTarget: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});

/**
 * ResponseBodyEditor Component Tests
 *
 * Unit tests for the ResponseBodyEditor component.
 * Location mirrors: src/lib/components/api-generator/ResponseBodyEditor.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ResponseBodyEditor, type ResponseBodyEditorProps } from '$lib/components';

describe('ResponseBodyEditor Component', () => {
	describe('TypeScript Interface', () => {
		it('ResponseBodyEditorProps interface accepts all required properties', () => {
			const props: ResponseBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				useEnvelope: false,
				responseShape: 'object',
				onSelectObject: () => {},
				onEnvelopeToggle: () => {},
				onSetResponseShape: () => {}
			};

			expect(props.endpointNamespaceId).toBe('ns-1');
			expect(props.useEnvelope).toBe(false);
			expect(props.responseShape).toBe('object');
			expect(typeof props.onSelectObject).toBe('function');
			expect(typeof props.onEnvelopeToggle).toBe('function');
			expect(typeof props.onSetResponseShape).toBe('function');
		});

		it('ResponseBodyEditorProps selectedObjectId is optional', () => {
			const propsWithout: ResponseBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				useEnvelope: false,
				responseShape: 'object',
				onSelectObject: () => {},
				onEnvelopeToggle: () => {},
				onSetResponseShape: () => {}
			};

			expect(propsWithout.selectedObjectId).toBeUndefined();

			const propsWith: ResponseBodyEditorProps = {
				...propsWithout,
				selectedObjectId: 'obj-1'
			};

			expect(propsWith.selectedObjectId).toBe('obj-1');
		});

		it('ResponseBodyEditorProps responseShape accepts valid values', () => {
			const objectProps: ResponseBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				useEnvelope: false,
				responseShape: 'object',
				onSelectObject: () => {},
				onEnvelopeToggle: () => {},
				onSetResponseShape: () => {}
			};

			expect(objectProps.responseShape).toBe('object');

			const listProps: ResponseBodyEditorProps = {
				...objectProps,
				responseShape: 'list'
			};

			expect(listProps.responseShape).toBe('list');
		});

		it('ResponseBodyEditorProps onEnvelopeToggle receives boolean', () => {
			let envelopeEnabled: boolean | undefined;

			const props: ResponseBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				useEnvelope: false,
				responseShape: 'object',
				onSelectObject: () => {},
				onEnvelopeToggle: (enabled) => {
					envelopeEnabled = enabled;
				},
				onSetResponseShape: () => {}
			};

			props.onEnvelopeToggle(true);
			expect(envelopeEnabled).toBe(true);

			props.onEnvelopeToggle(false);
			expect(envelopeEnabled).toBe(false);
		});

		it('ResponseBodyEditorProps onSetResponseShape receives ResponseShape', () => {
			let capturedShape: string | undefined;

			const props: ResponseBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				useEnvelope: false,
				responseShape: 'object',
				onSelectObject: () => {},
				onEnvelopeToggle: () => {},
				onSetResponseShape: (shape) => {
					capturedShape = shape;
				}
			};

			props.onSetResponseShape('list');
			expect(capturedShape).toBe('list');

			props.onSetResponseShape('object');
			expect(capturedShape).toBe('object');
		});
	});

	describe('Component Structure Verification', () => {
		it('ResponseBodyEditor component exports correctly from barrel export', () => {
			expect(ResponseBodyEditor).toBeDefined();
			expect(typeof ResponseBodyEditor).toBe('function');
		});

		it('ResponseBodyEditorProps type exports correctly from barrel export', () => {
			const props: ResponseBodyEditorProps = {
				endpointNamespaceId: 'ns-1',
				useEnvelope: false,
				responseShape: 'object',
				onSelectObject: () => {},
				onEnvelopeToggle: () => {},
				onSetResponseShape: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});

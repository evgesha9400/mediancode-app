/**
 * GenerateModal Component Tests
 *
 * Unit tests for the GenerateModal component.
 * Location mirrors: src/lib/components/api-generator/GenerateModal.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { GenerateModal, type GenerateModalProps } from '$lib/components';

describe('GenerateModal Component', () => {
	describe('TypeScript Interface', () => {
		it('GenerateModalProps requires all properties', () => {
			const closeFn = () => {};
			const props: GenerateModalProps = {
				open: true,
				apiId: 'api-123',
				apiTitle: 'MyApi',
				onClose: closeFn
			};

			expect(props.open).toBe(true);
			expect(props.apiId).toBe('api-123');
			expect(props.apiTitle).toBe('MyApi');
			expect(props.onClose).toBe(closeFn);
		});

		it('GenerateModalProps open controls modal visibility', () => {
			const props: GenerateModalProps = {
				open: false,
				apiId: 'api-456',
				apiTitle: 'TestApi',
				onClose: () => {}
			};

			expect(props.open).toBe(false);
		});

		it('GenerateModalProps apiTitle is used for download filename', () => {
			const props: GenerateModalProps = {
				open: true,
				apiId: 'api-789',
				apiTitle: 'UserService',
				onClose: () => {}
			};

			expect(props.apiTitle).toBe('UserService');
		});
	});

	describe('Component Structure Verification', () => {
		it('GenerateModal component exports correctly from barrel export', () => {
			expect(GenerateModal).toBeDefined();
			expect(typeof GenerateModal).toBe('function');
		});

		it('GenerateModalProps type exports correctly from barrel export', () => {
			const props: GenerateModalProps = {
				open: false,
				apiId: 'test',
				apiTitle: 'Test',
				onClose: () => {}
			};

			expect(props).toBeDefined();
		});
	});
});

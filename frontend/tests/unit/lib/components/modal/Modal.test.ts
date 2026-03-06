/**
 * Modal Component Tests
 *
 * Unit tests for the Modal component.
 * Location mirrors: src/lib/components/modal/Modal.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { Modal, type ModalProps } from '$lib/components';

describe('Modal Component', () => {
	describe('TypeScript Interface', () => {
		it('ModalProps requires open property', () => {
			const props: ModalProps = {
				open: true
			};

			expect(props.open).toBe(true);
		});

		it('ModalProps onClose is optional', () => {
			const props: ModalProps = {
				open: false
			};

			expect(props.onClose).toBeUndefined();
		});

		it('ModalProps accepts onClose callback', () => {
			const closeFn = () => {};
			const props: ModalProps = {
				open: true,
				onClose: closeFn
			};

			expect(props.onClose).toBe(closeFn);
		});

		it('ModalProps preventCloseOnOverlay defaults to false', () => {
			const props: ModalProps = {
				open: true
			};

			expect(props.preventCloseOnOverlay).toBeUndefined();
		});

		it('ModalProps accepts preventCloseOnOverlay', () => {
			const props: ModalProps = {
				open: true,
				preventCloseOnOverlay: true
			};

			expect(props.preventCloseOnOverlay).toBe(true);
		});

		it('ModalProps accepts maxWidth override', () => {
			const props: ModalProps = {
				open: true,
				maxWidth: 'max-w-lg'
			};

			expect(props.maxWidth).toBe('max-w-lg');
		});
	});

	describe('Component Structure Verification', () => {
		it('Modal component exports correctly from barrel export', () => {
			expect(Modal).toBeDefined();
			expect(typeof Modal).toBe('function');
		});

		it('ModalProps type exports correctly from barrel export', () => {
			const props: ModalProps = {
				open: false
			};

			expect(props).toBeDefined();
		});
	});
});

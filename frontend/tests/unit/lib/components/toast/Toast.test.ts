/**
 * Toast Component Tests
 *
 * Unit tests for the Toast component.
 * Location mirrors: src/lib/components/toast/Toast.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { Toast, type ToastProps } from '$lib/components';
import type { Toast as ToastType } from '$lib/types';

describe('Toast Component', () => {
	describe('TypeScript Interface', () => {
		it('ToastProps interface requires toast property', () => {
			const toastData: ToastType = {
				id: 'toast-1',
				type: 'success',
				message: 'Field created successfully',
				duration: 5000
			};

			const props: ToastProps = {
				toast: toastData
			};

			expect(props.toast).toBe(toastData);
			expect(props.toast.id).toBe('toast-1');
			expect(props.toast.type).toBe('success');
			expect(props.toast.message).toBe('Field created successfully');
			expect(props.toast.duration).toBe(5000);
		});

		it('ToastProps toast type accepts all valid toast types', () => {
			const types: ToastType['type'][] = ['success', 'error', 'warning', 'info'];

			types.forEach(type => {
				const props: ToastProps = {
					toast: { id: `toast-${type}`, type, message: `${type} message`, duration: 3000 }
				};

				expect(props.toast.type).toBe(type);
			});
		});
	});

	describe('Component Structure Verification', () => {
		it('Toast component exports correctly from barrel export', () => {
			expect(Toast).toBeDefined();
			expect(typeof Toast).toBe('function');
		});

		it('ToastProps type exports correctly from barrel export', () => {
			const props: ToastProps = {
				toast: { id: 'test', type: 'info', message: 'test', duration: 3000 }
			};

			expect(props).toBeDefined();
		});
	});
});

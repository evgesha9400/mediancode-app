/**
 * DrawerFooterDeleteConfirm — TypeScript contract tests.
 * Location mirrors: src/lib/components/drawer/DrawerFooterDeleteConfirm.svelte
 *
 * Svelte 5 $props() components are not rendered in jsdom here.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	DrawerFooterDeleteConfirm,
	type DrawerFooterDeleteConfirmProps
} from '$lib/components';

describe('DrawerFooterDeleteConfirm', () => {
	it('DrawerFooterDeleteConfirmProps accepts full delete-confirm configuration', () => {
		const onCancel = vi.fn();
		const onConfirm = vi.fn();

		const props: DrawerFooterDeleteConfirmProps = {
			prompt: 'Delete this item?',
			promptId: 'test-delete-prompt',
			actionsAriaLabel: 'Confirm or cancel delete',
			busy: false,
			onCancel,
			onConfirm
		};

		expect(props.prompt).toBe('Delete this item?');
		expect(props.busy).toBe(false);
	});

	it('exports component from barrel', () => {
		expect(DrawerFooterDeleteConfirm).toBeDefined();
		expect(typeof DrawerFooterDeleteConfirm).toBe('function');
	});
});

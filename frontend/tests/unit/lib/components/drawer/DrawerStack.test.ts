import { describe, it, expect } from 'vitest';
import { DrawerStack, type DrawerStackProps, type DrawerStackPanel } from '$lib/components';

describe('DrawerStack Component', () => {
	describe('TypeScript Interface', () => {
		it('DrawerStackPanel requires id, title, width, and content', () => {
			const panel: DrawerStackPanel = {
				id: 'panel-1',
				title: 'Test Panel',
				width: 400,
				content: (() => {}) as any
			};
			expect(panel.id).toBe('panel-1');
			expect(panel.title).toBe('Test Panel');
			expect(panel.width).toBe(400);
		});

		it('DrawerStackPanel accepts optional minWidth', () => {
			const panel: DrawerStackPanel = {
				id: 'panel-1',
				title: 'Test',
				width: 400,
				minWidth: 300,
				content: (() => {}) as any
			};
			expect(panel.minWidth).toBe(300);
		});

		it('DrawerStackPanel accepts optional footer and onClose', () => {
			const panel: DrawerStackPanel = {
				id: 'panel-1',
				title: 'Test',
				width: 400,
				content: (() => {}) as any,
				footer: (() => {}) as any,
				onClose: () => {}
			};
			expect(panel.footer).toBeDefined();
			expect(panel.onClose).toBeDefined();
		});

		it('DrawerStackProps requires panels and onPopPanel', () => {
			const props: DrawerStackProps = {
				panels: [],
				onPopPanel: () => {}
			};
			expect(props.panels).toEqual([]);
			expect(typeof props.onPopPanel).toBe('function');
		});
	});

	describe('Component Structure Verification', () => {
		it('DrawerStack component exports correctly from barrel export', () => {
			expect(DrawerStack).toBeDefined();
			expect(typeof DrawerStack).toBe('function');
		});
	});
});

import { describe, it, expect, beforeEach } from 'vitest';
import { sidebarState } from '$lib/stores/sidebar.svelte';

describe('sidebarState', () => {
	beforeEach(() => {
		window.innerWidth = 1400;
		const cleanup = sidebarState.initViewportMonitoring();
		cleanup();
		sidebarState.endDrawerMotion();
		sidebarState.setDrawerPanelWidth(0);
		sidebarState.unlockCollapsed();
	});

	describe('exports', () => {
		it('exports sidebarState object', () => {
			expect(sidebarState).toBeDefined();
		});

		it('has collapsed getter', () => {
			expect(typeof sidebarState.collapsed).toBe('boolean');
		});

		it('has hidden getter', () => {
			expect(typeof sidebarState.hidden).toBe('boolean');
		});

		it('has width getter', () => {
			expect(typeof sidebarState.width).toBe('number');
		});

		it('has isViewportNarrow getter', () => {
			expect(typeof sidebarState.isViewportNarrow).toBe('boolean');
		});

		it('has availableDrawerWidth getter', () => {
			expect(typeof sidebarState.availableDrawerWidth).toBe('number');
		});

		it('has drawerMotionActive getter', () => {
			expect(typeof sidebarState.drawerMotionActive).toBe('boolean');
		});

		it('has renderedWidth getter', () => {
			expect(typeof sidebarState.renderedWidth).toBe('number');
		});
	});

	describe('setDrawerPanelWidth', () => {
		it('accepts a numeric width', () => {
			sidebarState.setDrawerPanelWidth(500);
			// No error thrown
			expect(true).toBe(true);
		});

		it('resets to zero', () => {
			sidebarState.setDrawerPanelWidth(500);
			sidebarState.setDrawerPanelWidth(0);
			expect(true).toBe(true);
		});

		it('keeps the rendered width stable during drawer motion while logical width updates', () => {
			expect(sidebarState.width).toBe(256);
			expect(sidebarState.renderedWidth).toBe(256);

			sidebarState.startDrawerMotion();
			sidebarState.setDrawerPanelWidth(1900);

			expect(sidebarState.drawerMotionActive).toBe(true);
			expect(sidebarState.width).toBe(64);
			expect(sidebarState.availableDrawerWidth).toBeGreaterThan(0);
			expect(sidebarState.renderedWidth).toBe(256);

			sidebarState.endDrawerMotion();

			expect(sidebarState.drawerMotionActive).toBe(false);
			expect(sidebarState.renderedWidth).toBe(64);
		});
	});

	describe('navigation lock', () => {
		it('lockCollapsed sets collapsed to true', () => {
			sidebarState.lockCollapsed();
			expect(sidebarState.collapsed).toBe(true);
		});

		it('unlockCollapsed releases the lock', () => {
			sidebarState.lockCollapsed();
			sidebarState.unlockCollapsed();
			// collapsed state now depends on viewport/drawer, not the lock
			expect(typeof sidebarState.collapsed).toBe('boolean');
		});
	});

	describe('initViewportMonitoring', () => {
		it('returns a cleanup function', () => {
			const cleanup = sidebarState.initViewportMonitoring();
			expect(typeof cleanup).toBe('function');
			cleanup();
		});
	});
});

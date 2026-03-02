import { browser } from '$app/environment';

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 64;
const BREAKPOINT = 1024;

let viewportWidth = $state(browser ? window.innerWidth : 1920);
let totalDrawerPanelWidth = $state(0);
let navigationLock = $state(false);

export const sidebarState = {
  get collapsed(): boolean {
    // Stay collapsed during navigation to prevent expand-then-navigate flash
    if (navigationLock) return true;
    // Always collapse on narrow viewports
    if (viewportWidth < BREAKPOINT) return true;
    // Collapse when drawer panels wouldn't fit alongside expanded sidebar
    if (totalDrawerPanelWidth > 0 && totalDrawerPanelWidth + EXPANDED_WIDTH > viewportWidth) return true;
    return false;
  },
  get hidden(): boolean {
    return viewportWidth < BREAKPOINT && totalDrawerPanelWidth > 0;
  },
  get width(): number {
    if (this.hidden) return 0;
    if (this.collapsed) return COLLAPSED_WIDTH;
    return EXPANDED_WIDTH;
  },
  get isViewportNarrow(): boolean {
    return viewportWidth < BREAKPOINT;
  },
  get availableDrawerWidth(): number {
    return viewportWidth - this.width;
  },
  setDrawerPanelWidth(total: number) {
    totalDrawerPanelWidth = total;
  },
  lockCollapsed() {
    navigationLock = true;
  },
  unlockCollapsed() {
    navigationLock = false;
  },
  initViewportMonitoring(): (() => void) {
    if (!browser) return () => {};
    viewportWidth = window.innerWidth;
    const handler = () => {
      viewportWidth = window.innerWidth;
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }
};

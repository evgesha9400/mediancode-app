import { browser } from '$app/environment';

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 64;
const BREAKPOINT = 1024;

let viewportWidth = $state(browser ? window.innerWidth : 1920);
let totalDrawerPanelWidth = $state(0);
let navigationLock = $state(false);
let drawerMotionActive = $state(false);
let renderedWidth = $state(browser && window.innerWidth < BREAKPOINT ? COLLAPSED_WIDTH : EXPANDED_WIDTH);

function calculateCollapsed(): boolean {
  if (navigationLock) return true;
  if (viewportWidth < BREAKPOINT) return true;
  if (totalDrawerPanelWidth > 0 && totalDrawerPanelWidth + EXPANDED_WIDTH > viewportWidth) return true;
  return false;
}

/**
 * Prefer this inside UI `$derived.by(() => isSidebarCollapsed())` instead of `sidebarState.collapsed`.
 * A plain `$derived(sidebarState.collapsed)` may not subscribe to this module’s `$state` updates.
 */
export function isSidebarCollapsed(): boolean {
  return calculateCollapsed();
}

function calculateHidden(): boolean {
  return viewportWidth < BREAKPOINT && totalDrawerPanelWidth > 0;
}

function calculateWidth(): number {
  if (calculateHidden()) return 0;
  if (calculateCollapsed()) return COLLAPSED_WIDTH;
  return EXPANDED_WIDTH;
}

function syncRenderedWidth(): void {
  if (!drawerMotionActive) {
    renderedWidth = calculateWidth();
  }
}

export const sidebarState = {
  get collapsed(): boolean {
    return isSidebarCollapsed();
  },
  get hidden(): boolean {
    return calculateHidden();
  },
  get width(): number {
    return calculateWidth();
  },
  get renderedWidth(): number {
    return renderedWidth;
  },
  get isViewportNarrow(): boolean {
    return viewportWidth < BREAKPOINT;
  },
  get drawerMotionActive(): boolean {
    return drawerMotionActive;
  },
  get availableDrawerWidth(): number {
    return viewportWidth - calculateWidth();
  },
  setDrawerPanelWidth(total: number) {
    totalDrawerPanelWidth = total;
    syncRenderedWidth();
  },
  startDrawerMotion() {
    drawerMotionActive = true;
  },
  endDrawerMotion() {
    drawerMotionActive = false;
    renderedWidth = calculateWidth();
  },
  lockCollapsed() {
    navigationLock = true;
    syncRenderedWidth();
  },
  unlockCollapsed() {
    navigationLock = false;
    syncRenderedWidth();
  },
  initViewportMonitoring(): (() => void) {
    if (!browser) return () => {};
    viewportWidth = window.innerWidth;
    syncRenderedWidth();
    const handler = () => {
      viewportWidth = window.innerWidth;
      syncRenderedWidth();
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }
};

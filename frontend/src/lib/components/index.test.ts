/**
 * Barrel Export Smoke Test
 *
 * This file serves as a compile-time verification that all component exports
 * from the barrel export (src/lib/components/index.ts) are valid and can be
 * imported without TypeScript errors.
 *
 * Purpose:
 * - Catch breaking changes to component APIs
 * - Verify all type exports are valid
 * - Ensure barrel export structure remains intact
 *
 * Usage:
 * Run `npx svelte-check` to validate this file compiles without errors
 */

// Component imports - these should all compile successfully
import {
  // Drawer components
  Drawer,
  DrawerHeader,
  DrawerContent,
  DrawerFooter,

  // Table components
  Table,
  SortableColumn,
  EmptyState,

  // Search components
  SearchBar,
  FilterPanel,

  // Toast components
  Toast,
  ToastContainer,

  // Tooltip component
  Tooltip,

  // Layout components
  PageHeader,

  // Standalone components
  DashboardLayout,
  Sidebar,
  StatCard,
} from '$lib/components';

// Type imports - these should all compile successfully
import type {
  // Drawer types
  DrawerProps,
  DrawerHeaderProps,
  DrawerContentProps,
  DrawerFooterProps,

  // Table types
  TableProps,
  SortableColumnProps,
  EmptyStateProps,

  // Search types
  SearchBarProps,
  FilterPanelProps,

  // Toast types
  ToastProps,
  ToastContainerProps,

  // Tooltip types
  TooltipProps,

  // Layout types
  PageHeaderProps,

  // Standalone component types
  DashboardLayoutProps,
  SidebarProps,
  StatCardProps,
} from '$lib/components';

/**
 * Type-level assertions to verify exports are correct
 * These verify TypeScript recognizes all exported types and components
 */

// Collect all components to verify they're constructable (have default exports)
const components = [
  Drawer,
  DrawerHeader,
  DrawerContent,
  DrawerFooter,
  Table,
  SortableColumn,
  EmptyState,
  SearchBar,
  FilterPanel,
  Toast,
  ToastContainer,
  Tooltip,
  PageHeader,
  DashboardLayout,
  Sidebar,
  StatCard,
] as const;

// Type assertions for prop interfaces - ensures types are valid
export type PropTypes = [
  DrawerProps,
  DrawerHeaderProps,
  DrawerContentProps,
  DrawerFooterProps,
  TableProps,
  SortableColumnProps,
  EmptyStateProps,
  SearchBarProps,
  FilterPanelProps,
  ToastProps,
  ToastContainerProps,
  TooltipProps,
  PageHeaderProps,
  DashboardLayoutProps,
  SidebarProps,
  StatCardProps,
];

// PropTypes tuple above serves as a compile-time check that all prop types exist

/**
 * Export a simple function to indicate this file has been processed
 * Returns the count of verified components
 */
export function barrelExportSmokeTest(): number {
  return components.length;
}

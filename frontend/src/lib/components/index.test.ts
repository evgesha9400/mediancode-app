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
  ActivityItem,
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
  ActivityItemProps,
  StatCardProps,
} from '$lib/components';

/**
 * Type-level assertions to verify exports are correct
 * These don't run at runtime but ensure TypeScript recognizes the types
 */

// Verify component types are constructable (have default exports)
const _drawer: typeof Drawer = Drawer;
const _drawerHeader: typeof DrawerHeader = DrawerHeader;
const _drawerContent: typeof DrawerContent = DrawerContent;
const _drawerFooter: typeof DrawerFooter = DrawerFooter;

const _table: typeof Table = Table;
const _sortableColumn: typeof SortableColumn = SortableColumn;
const _emptyState: typeof EmptyState = EmptyState;

const _searchBar: typeof SearchBar = SearchBar;
const _filterPanel: typeof FilterPanel = FilterPanel;

const _toast: typeof Toast = Toast;
const _toastContainer: typeof ToastContainer = ToastContainer;

const _tooltip: typeof Tooltip = Tooltip;

const _pageHeader: typeof PageHeader = PageHeader;

const _dashboardLayout: typeof DashboardLayout = DashboardLayout;
const _sidebar: typeof Sidebar = Sidebar;
const _activityItem: typeof ActivityItem = ActivityItem;
const _statCard: typeof StatCard = StatCard;

// Verify prop types are valid interfaces/types
const _drawerPropsCheck: DrawerProps = {} as DrawerProps;
const _drawerHeaderPropsCheck: DrawerHeaderProps = {} as DrawerHeaderProps;
const _drawerContentPropsCheck: DrawerContentProps = {} as DrawerContentProps;
const _drawerFooterPropsCheck: DrawerFooterProps = {} as DrawerFooterProps;

const _tablePropsCheck: TableProps = {} as TableProps;
const _sortableColumnPropsCheck: SortableColumnProps = {} as SortableColumnProps;
const _emptyStatePropsCheck: EmptyStateProps = {} as EmptyStateProps;

const _searchBarPropsCheck: SearchBarProps = {} as SearchBarProps;
const _filterPanelPropsCheck: FilterPanelProps = {} as FilterPanelProps;

const _toastPropsCheck: ToastProps = {} as ToastProps;
const _toastContainerPropsCheck: ToastContainerProps = {} as ToastContainerProps;

const _tooltipPropsCheck: TooltipProps = {} as TooltipProps;

const _pageHeaderPropsCheck: PageHeaderProps = {} as PageHeaderProps;

const _dashboardLayoutPropsCheck: DashboardLayoutProps = {} as DashboardLayoutProps;
const _sidebarPropsCheck: SidebarProps = {} as SidebarProps;
const _activityItemPropsCheck: ActivityItemProps = {} as ActivityItemProps;
const _statCardPropsCheck: StatCardProps = {} as StatCardProps;

/**
 * Export a simple function to indicate this file has been processed
 * This is a no-op but ensures the file is valid TypeScript
 */
export function barrelExportSmokeTest(): boolean {
  return true;
}

// Main component library barrel export
// Single entry point for all UI components and their type definitions

// Drawer components
export * from './drawer';

// Table components
export * from './table';

// Search components
export * from './search';

// Toast components
export * from './toast';

// Tooltip component
export * from './tooltip';

// Layout components
export * from './layout';

// API Generator components
export * from './api-generator';

// Standalone components
export { default as DashboardLayout } from './DashboardLayout.svelte';
export { default as Sidebar } from './Sidebar.svelte';
export { default as ActivityItem } from './ActivityItem.svelte';
export { default as StatCard } from './StatCard.svelte';
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export { default as TagEditModal } from './TagEditModal.svelte';

// Standalone component types
export type { DashboardLayoutProps } from './DashboardLayout.svelte';
export type { SidebarProps } from './Sidebar.svelte';
export type { ActivityItemProps } from './ActivityItem.svelte';
export type { StatCardProps } from './StatCard.svelte';
export type { ToastContainerProps } from './toast/ToastContainer.svelte';
export type { ConfirmDialogProps } from './ConfirmDialog.svelte';
export type { TagEditModalProps } from './TagEditModal.svelte';

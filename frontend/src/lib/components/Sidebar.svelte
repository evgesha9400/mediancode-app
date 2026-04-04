<script module lang="ts">
  export interface SidebarProps {
    activeRoute: string;
  }
</script>

<script lang="ts">
  import type { NavItem } from '$lib/types';
  import { beforeNavigate, afterNavigate } from '$app/navigation';
  import { Logo } from '$lib/components/logo';
  import { Tooltip } from '$lib/components/tooltip';
  import { ClerkSidebarUser } from '$lib/components/clerk';
  import { sidebarState } from '$lib/stores/sidebar.svelte';
  import {
    dashboardTextPrimary,
    sidebarNavItemActive,
    sidebarNavItemBase,
    sidebarNavItemInactive,
    sidebarShellMotionLocked,
    sidebarSectionDividerHorizontal,
    sidebarShell,
  } from '$lib/ui/classes';

  interface Props extends SidebarProps {}

  let { activeRoute }: Props = $props();

  let collapsed = $derived(sidebarState.collapsed);
  let sidebarShellClass = $derived(sidebarState.drawerMotionActive ? sidebarShellMotionLocked : sidebarShell);

  beforeNavigate(() => {
    if (collapsed) sidebarState.lockCollapsed();
  });

  afterNavigate(() => {
    sidebarState.unlockCollapsed();
  });

  const dashboardItem: NavItem = {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'fa-house'
  };

  const catalogItems: NavItem[] = [
    { href: '/types', label: 'Types', icon: 'fa-shapes' },
    { href: '/validators/field-constraints', label: 'Field Constraints', icon: 'fa-shield-halved' },
    { href: '/validators/field-validators', label: 'Field Validators', icon: 'fa-bolt' },
    { href: '/validators/model-validators', label: 'Model Validators', icon: 'fa-diagram-project' },
  ];

  const componentItems: NavItem[] = [
    { href: '/fields', label: 'Fields', icon: 'fa-vector-square' },
    { href: '/objects', label: 'Objects', icon: 'fa-cubes' },
    { href: '/apis', label: 'APIs', icon: 'fa-code' },
    { href: '/namespaces', label: 'Namespaces', icon: 'fa-layer-group' },
  ];

  function isActive(href: string): boolean {
    if (activeRoute === href) return true;
    if (href !== '/' && activeRoute.startsWith(href)) return true;
    return false;
  }

</script>

<nav
  class={sidebarShellClass}
  style="width: {sidebarState.renderedWidth}px;"
  aria-label="Main navigation"
  data-testid="dashboard-sidebar"
>
  <div class="{collapsed ? 'p-3 pb-2' : 'px-4 pt-4 pb-2'}">
    <a
      href="/"
      class="flex items-center hover:opacity-80 transition-opacity cursor-pointer {collapsed ? 'justify-center' : 'space-x-3'}"
    >
      <Logo size="md" />
      {#if !collapsed}
        <span class="text-lg font-inter font-bold {dashboardTextPrimary} tracking-tight whitespace-nowrap">Median Code</span>
      {/if}
    </a>
  </div>

  <!-- No horizontal padding: nav rows bleed to sidebar edges; headings use px-4 to align with logo -->
  <div class="flex-1 overflow-y-auto min-h-0 {collapsed ? 'pt-0 pb-2' : 'pt-2 pb-2'}">
    <ul class="space-y-1 {collapsed ? 'mb-2' : 'mb-6'}">
      <li class="w-full">
        <Tooltip text={dashboardItem.label} position="right" disabled={!collapsed} wrapperClass="w-full">
          <a
            href={dashboardItem.href}
            class="{sidebarNavItemBase} {isActive(dashboardItem.href) ? sidebarNavItemActive : sidebarNavItemInactive} {collapsed ? 'justify-center' : 'gap-3 px-4'}"
          >
            <i class="fa-solid {dashboardItem.icon} {collapsed ? 'text-base' : 'w-5'}"></i>
            {#if !collapsed}
              <span class="font-medium">{dashboardItem.label}</span>
            {/if}
          </a>
        </Tooltip>
      </li>
    </ul>

    <!-- Catalog -->
    {#if !collapsed}
      <h2 class="text-xs uppercase tracking-wider text-mono-500 mb-3 font-bold px-4">Catalog</h2>
    {:else}
      <div class="{sidebarSectionDividerHorizontal}"></div>
    {/if}
    <ul class="space-y-1 {collapsed ? 'mb-2' : 'mb-6'}">
      {#each catalogItems as item}
        <li class="w-full">
          <Tooltip text={item.label} position="right" disabled={!collapsed} wrapperClass="w-full">
            <a
              href={item.href}
              class="{sidebarNavItemBase} {isActive(item.href) ? sidebarNavItemActive : sidebarNavItemInactive} {collapsed ? 'justify-center' : 'gap-3 px-4'}"
            >
              <i class="fa-solid {item.icon} {collapsed ? 'text-base' : 'w-5'}"></i>
              {#if !collapsed}
                <span class="font-medium">{item.label}</span>
              {/if}
            </a>
          </Tooltip>
        </li>
      {/each}
    </ul>

    <!-- Components -->
    {#if !collapsed}
      <h2 class="text-xs uppercase tracking-wider text-mono-500 mb-3 font-bold px-4">Components</h2>
    {:else}
      <div class="{sidebarSectionDividerHorizontal}"></div>
    {/if}
    <ul class="space-y-1">
      {#each componentItems as item}
        <li class="w-full">
          <Tooltip text={item.label} position="right" disabled={!collapsed} wrapperClass="w-full">
            <a
              href={item.href}
              class="{sidebarNavItemBase} {isActive(item.href) ? sidebarNavItemActive : sidebarNavItemInactive} {collapsed ? 'justify-center' : 'gap-3 px-4'}"
            >
              <i class="fa-solid {item.icon} {collapsed ? 'text-base' : 'w-5'}"></i>
              {#if !collapsed}
                <span class="font-medium">{item.label}</span>
              {/if}
            </a>
          </Tooltip>
        </li>
      {/each}
    </ul>
  </div>

  <!-- User Section with Clerk UserButton -->
  <div
    class="{collapsed ? 'px-2 pt-2 pb-2 flex justify-center' : 'px-4 pt-2 pb-4'}"
    data-testid="sidebar-user-section"
  >
    <ClerkSidebarUser {collapsed} />
  </div>
</nav>

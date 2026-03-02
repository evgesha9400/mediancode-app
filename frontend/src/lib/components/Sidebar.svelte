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

  interface Props extends SidebarProps {}

  let { activeRoute }: Props = $props();

  let collapsed = $derived(sidebarState.collapsed);

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
    { href: '/fields', label: 'Fields', icon: 'fa-table-list' },
    { href: '/objects', label: 'Objects', icon: 'fa-cubes' },
  ];

  const componentItems: NavItem[] = [
    { href: '/namespaces', label: 'Namespaces', icon: 'fa-layer-group' },
    { href: '/apis', label: 'APIs', icon: 'fa-code' },
  ];

  function isActive(href: string): boolean {
    if (activeRoute === href) return true;
    if (href !== '/' && activeRoute.startsWith(href)) return true;
    return false;
  }

</script>

<nav
  class="bg-mono-900 text-white flex flex-col shrink-0 transition-[width] duration-[400ms] overflow-hidden"
  style="width: {sidebarState.width}px;"
  aria-label="Main navigation"
  data-testid="dashboard-sidebar"
>
  <div class="border-b border-mono-800 {collapsed ? 'p-3' : 'p-4'}">
    <a
      href="/"
      class="flex items-center hover:opacity-80 transition-opacity cursor-pointer {collapsed ? 'justify-center' : 'space-x-2'}"
    >
      <Logo size="md" variant="dark" />
      {#if !collapsed}
        <h1 class="text-lg font-semibold whitespace-nowrap">Median Code</h1>
      {/if}
    </a>
  </div>

  <div class="flex-1 overflow-y-auto {collapsed ? 'p-2' : 'p-4'}">
    <ul class="space-y-1 {collapsed ? 'mb-2' : 'mb-6'}">
      <li>
        <Tooltip text={dashboardItem.label} position="right" disabled={!collapsed}>
          <a
            href={dashboardItem.href}
            class="rounded-md cursor-pointer {isActive(dashboardItem.href) ? 'bg-mono-800' : 'hover:bg-mono-800'} {collapsed ? 'flex justify-center py-2' : 'flex items-center space-x-2 px-2 py-1.5'}"
          >
            <i class="fa-solid {dashboardItem.icon} {collapsed ? 'text-base' : 'w-5'}"></i>
            {#if !collapsed}
              <span>{dashboardItem.label}</span>
            {/if}
          </a>
        </Tooltip>
      </li>
    </ul>

    <!-- Catalog -->
    {#if !collapsed}
      <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Catalog</h2>
    {:else}
      <div class="border-t border-mono-700 my-2"></div>
    {/if}
    <ul class="space-y-1 {collapsed ? 'mb-2' : 'mb-6'}">
      {#each catalogItems as item}
        <li>
          <Tooltip text={item.label} position="right" disabled={!collapsed}>
            <a
              href={item.href}
              class="rounded-md cursor-pointer {isActive(item.href) ? 'bg-mono-800' : 'hover:bg-mono-800'} {collapsed ? 'flex justify-center py-2' : 'flex items-center space-x-2 px-2 py-1.5'}"
            >
              <i class="fa-solid {item.icon} {collapsed ? 'text-base' : 'w-5'}"></i>
              {#if !collapsed}
                <span>{item.label}</span>
              {/if}
            </a>
          </Tooltip>
        </li>
      {/each}
    </ul>

    <!-- Components -->
    {#if !collapsed}
      <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Components</h2>
    {:else}
      <div class="border-t border-mono-700 my-2"></div>
    {/if}
    <ul class="space-y-1">
      {#each componentItems as item}
        <li>
          <Tooltip text={item.label} position="right" disabled={!collapsed}>
            <a
              href={item.href}
              class="rounded-md cursor-pointer {isActive(item.href) ? 'bg-mono-800' : 'hover:bg-mono-800'} {collapsed ? 'flex justify-center py-2' : 'flex items-center space-x-2 px-2 py-1.5'}"
            >
              <i class="fa-solid {item.icon} {collapsed ? 'text-base' : 'w-5'}"></i>
              {#if !collapsed}
                <span>{item.label}</span>
              {/if}
            </a>
          </Tooltip>
        </li>
      {/each}
    </ul>
  </div>

  <!-- User Section with Clerk UserButton -->
  <div
    class="border-t border-mono-800 {collapsed ? 'p-2 flex justify-center' : 'p-4'}"
    data-testid="sidebar-user-section"
  >
    <ClerkSidebarUser {collapsed} />
  </div>
</nav>

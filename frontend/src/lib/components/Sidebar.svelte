<script module lang="ts">
  export interface SidebarProps {
    activeRoute: string;
  }
</script>

<script lang="ts">
  import type { NavItem } from '$lib/types';
  import { Logo } from '$lib/components/logo';
  import { ClerkSidebarUser } from '$lib/components/clerk';

  interface Props extends SidebarProps {}

  let { activeRoute }: Props = $props();

  const dashboardItem: NavItem = {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'fa-house'
  };

  const coreComponentItems: NavItem[] = [
    { href: '/types', label: 'Types', icon: 'fa-shapes' },
    {
      href: '/validators',
      label: 'Validators',
      icon: 'fa-check-circle',
      children: [
        { href: '/validators/field-constraints', label: 'Field Constraints', icon: 'fa-shield-halved' },
        { href: '/validators/field-validators', label: 'Field Validators', icon: 'fa-input-text' },
        { href: '/validators/model-validators', label: 'Model Validators', icon: 'fa-diagram-project' }
      ]
    },
    { href: '/fields', label: 'Fields', icon: 'fa-table-list' },
    { href: '/objects', label: 'Objects', icon: 'fa-cubes' },
    { href: '/apis', label: 'APIs', icon: 'fa-code' }
  ];

  const configItems: NavItem[] = [
    { href: '/namespaces', label: 'Namespaces', icon: 'fa-layer-group' }
  ];

  function isActive(href: string): boolean {
    if (activeRoute === href) return true;
    if (href !== '/' && activeRoute.startsWith(href)) return true;
    return false;
  }

</script>

<nav
  class="w-64 bg-mono-900 text-white flex flex-col"
  aria-label="Main navigation"
  data-testid="dashboard-sidebar"
>
  <div class="p-4 border-b border-mono-800">
    <a href="/" class="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
      <Logo size="md" variant="dark" />
      <h1 class="text-lg font-semibold">Median Code</h1>
    </a>
  </div>

  <div class="flex-1 overflow-y-auto p-4">
    <ul class="space-y-1 mb-6">
      <li>
        <a
          href={dashboardItem.href}
          class="flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer {isActive(dashboardItem.href) ? 'bg-mono-800' : 'hover:bg-mono-800'}"
        >
          <i class="fa-solid {dashboardItem.icon} w-5"></i>
          <span>{dashboardItem.label}</span>
        </a>
      </li>
    </ul>

    <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Core Components</h2>
    <ul class="space-y-1">
      {#each coreComponentItems as item}
        <li>
          {#if item.children}
            <!-- Parent item with nested children -->
            <div class="flex items-center space-x-2 px-2 py-1.5 rounded-md">
              <i class="fa-solid {item.icon} w-5"></i>
              <span>{item.label}</span>
            </div>
            <ul class="mt-0.5 space-y-0.5 ml-7 border-l border-mono-500 pl-3">
              {#each item.children as child}
                <li>
                  {#if child.disabled}
                    <span
                      class="flex items-center space-x-2 px-2 py-1.5 rounded-md text-mono-600 cursor-not-allowed select-none"
                      title="Under construction"
                    >
                      <span>{child.label}</span>
                    </span>
                  {:else}
                    <a
                      href={child.href}
                      class="flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer {isActive(child.href) ? 'bg-mono-800' : 'hover:bg-mono-800'}"
                    >
                      <span>{child.label}</span>
                    </a>
                  {/if}
                </li>
              {/each}
            </ul>
          {:else if item.disabled}
            <button
              type="button"
              class="w-full flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-mono-800 cursor-pointer text-left"
              disabled
            >
              <i class="fa-solid {item.icon} w-5"></i>
              <span class="opacity-60">{item.label}</span>
            </button>
          {:else}
            <a
              href={item.href}
              class="flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer {isActive(item.href) ? 'bg-mono-800' : 'hover:bg-mono-800'}"
            >
              <i class="fa-solid {item.icon} w-5"></i>
              <span>{item.label}</span>
            </a>
          {/if}
        </li>
      {/each}
    </ul>
  </div>

  <div class="p-4 border-t border-mono-800">
    <h2 class="text-xs uppercase tracking-wider text-mono-400 mb-3 font-medium">Configuration</h2>
    <ul class="space-y-1">
      {#each configItems as item}
        <li>
          <a
            href={item.href}
            class="flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer {isActive(item.href) ? 'bg-mono-800' : 'hover:bg-mono-800'}"
          >
            <i class="fa-solid {item.icon} w-5"></i>
            <span>{item.label}</span>
          </a>
        </li>
      {/each}
    </ul>
  </div>

  <!-- User Section with Clerk UserButton -->
  <div
    class="p-4 border-t border-mono-800"
    data-testid="sidebar-user-section"
  >
    <ClerkSidebarUser />
  </div>
</nav>

<script lang="ts">
  import { clerkState, signOut } from '$lib/clerk';
  import { goto } from '$app/navigation';
  import type { NavItem } from '$lib/types';

  interface Props {
    activeRoute: string;
  }

  let { activeRoute }: Props = $props();

  async function handleSignOut() {
    await signOut();
    goto('/signin');
  }

  const dashboardItem: NavItem = {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'fa-house'
  };

  const coreComponentItems: NavItem[] = [
    { href: '/types', label: 'Types', icon: 'fa-shapes' },
    { href: '/validators', label: 'Validators', icon: 'fa-check-circle' },
    { href: '/field-registry', label: 'Field Registry', icon: 'fa-table-list' },
    { href: '/api-designer', label: 'API Designer', icon: 'fa-code', disabled: true }
  ];

  function isActive(href: string): boolean {
    return activeRoute === href;
  }
</script>

<div class="w-64 bg-mono-900 text-white flex flex-col">
  <div class="p-4 border-b border-mono-800">
    <a href="/" class="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
      <i class="fa-solid fa-code text-xl"></i>
      <h1 class="text-lg font-semibold">Median Code</h1>
    </a>
  </div>

  <div class="p-4">
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
          {#if item.disabled}
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

  <div class="mt-auto p-4 border-t border-mono-800">
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-2">
        {#if $clerkState.user?.imageUrl}
          <img
            src={$clerkState.user.imageUrl}
            alt="User avatar"
            class="w-8 h-8 rounded-full"
          />
        {:else}
          <div class="w-8 h-8 rounded-full bg-mono-700 flex items-center justify-center">
            <i class="fa-solid fa-user text-sm"></i>
          </div>
        {/if}
        <div class="flex-1 min-w-0">
          <p class="text-sm truncate">
            {$clerkState.user?.fullName || 'Developer'}
          </p>
          <p class="text-xs text-mono-400 truncate">Developer</p>
        </div>
      </div>
      <button
        onclick={handleSignOut}
        class="text-mono-400 hover:text-white transition-colors p-1"
        title="Sign out"
      >
        <i class="fa-solid fa-arrow-right-from-bracket"></i>
      </button>
    </div>
  </div>
</div>

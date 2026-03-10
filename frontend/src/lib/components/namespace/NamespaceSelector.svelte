<!--
  NamespaceSelector - Dropdown selector for switching between namespaces

  Displays the current active namespace and allows users to switch between
  available namespaces. The selector shows a globe icon for the global namespace
  and a layer-group icon for user-created namespaces.

  @component
  @example
  <NamespaceSelector />
-->
<script module lang="ts">
  export interface NamespaceSelectorProps {
    /**
     * Optional CSS class to apply to the container
     */
    class?: string;
  }
</script>

<script lang="ts">
  import {
    namespacesStore,
    activeNamespaceId,
    activeNamespace,
    setActiveNamespace
  } from '$lib/stores/namespaces';
  import type { Namespace } from '$lib/types';

  function isGlobalNamespace(ns: Namespace | undefined): boolean {
    return ns?.name?.toLowerCase() === 'global';
  }

  interface Props extends NamespaceSelectorProps {}

  let { class: className = '' }: Props = $props();

  let isOpen = $state(false);

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  function selectNamespace(namespace: Namespace) {
    setActiveNamespace(namespace.id);
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-namespace-selector]')) {
      isOpen = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });
</script>

<div class="relative {className}" data-namespace-selector>
  <button
    type="button"
    onclick={toggleDropdown}
    class="flex items-center space-x-2 px-3 py-1.5 border border-mono-600 bg-mono-900 hover:bg-mono-800 transition-colors text-sm"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    {#if isGlobalNamespace($activeNamespace)}
      <i class="fa-solid fa-earth-americas text-mono-400 text-xs"></i>
    {:else}
      <i class="fa-solid fa-layer-group text-mono-400 text-xs"></i>
    {/if}
    <span class="text-mono-300">{$activeNamespace?.name ?? 'Select namespace'}</span>
    <i class="fa-solid fa-chevron-down text-mono-400 text-xs transition-transform" class:rotate-180={isOpen}></i>
  </button>

  {#if isOpen}
    <div
      class="absolute top-full right-0 mt-1 w-56 bg-mono-900 shadow-xl shadow-black/30 border border-mono-700 z-50 overflow-hidden"
      role="listbox"
    >
      <div class="p-2 border-b border-mono-700 bg-mono-800">
        <span class="text-xs font-medium text-mono-400 uppercase tracking-wider">Namespace</span>
      </div>
      <div class="py-1 max-h-60 overflow-y-auto">
        {#each $namespacesStore as namespace}
          <button
            type="button"
            onclick={() => selectNamespace(namespace)}
            class="w-full px-3 py-2 flex items-center space-x-2 hover:bg-mono-800 transition-colors text-left"
            class:bg-mono-800={$activeNamespaceId === namespace.id}
            role="option"
            aria-selected={$activeNamespaceId === namespace.id}
          >
            {#if isGlobalNamespace(namespace)}
              <i class="fa-solid fa-earth-americas text-mono-400 text-xs w-4"></i>
            {:else}
              <i class="fa-solid fa-layer-group text-mono-400 text-xs w-4"></i>
            {/if}
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-1.5">
                <span class="text-sm text-mono-100 block truncate">{namespace.name}</span>
                {#if namespace.isDefault}
                  <span class="px-1 py-0.5 text-[10px] bg-mono-700 text-mono-400 flex-shrink-0">Default</span>
                {/if}
              </div>
              {#if namespace.description}
                <span class="text-xs text-mono-400 block truncate">{namespace.description}</span>
              {/if}
            </div>
            {#if $activeNamespaceId === namespace.id}
              <i class="fa-solid fa-check text-green-400 text-xs"></i>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

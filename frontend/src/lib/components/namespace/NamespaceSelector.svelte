<!--
  NamespaceSelector - Dropdown selector for switching between namespaces

  Displays the current active namespace and allows users to switch between
  available namespaces. The selector shows a locked icon for the global namespace.

  @component
  @example
  <NamespaceSelector />
-->
<script lang="ts">
  import {
    namespacesStore,
    activeNamespaceId,
    activeNamespace,
    setActiveNamespace
  } from '$lib/stores/namespaces';
  import type { Namespace } from '$lib/types';

  export interface NamespaceSelectorProps {
    /**
     * Optional CSS class to apply to the container
     */
    class?: string;
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
    class="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-mono-300 bg-white hover:bg-mono-50 transition-colors text-sm"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    {#if $activeNamespace?.locked}
      <i class="fa-solid fa-lock text-mono-400 text-xs"></i>
    {:else}
      <i class="fa-solid fa-layer-group text-mono-400 text-xs"></i>
    {/if}
    <span class="text-mono-700">{$activeNamespace?.name ?? 'Select namespace'}</span>
    <i class="fa-solid fa-chevron-down text-mono-400 text-xs transition-transform" class:rotate-180={isOpen}></i>
  </button>

  {#if isOpen}
    <div
      class="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-mono-200 z-50 overflow-hidden"
      role="listbox"
    >
      <div class="p-2 border-b border-mono-100 bg-mono-50">
        <span class="text-xs font-medium text-mono-500 uppercase tracking-wider">Namespace</span>
      </div>
      <div class="py-1 max-h-60 overflow-y-auto">
        {#each $namespacesStore as namespace}
          <button
            type="button"
            onclick={() => selectNamespace(namespace)}
            class="w-full px-3 py-2 flex items-center space-x-2 hover:bg-mono-50 transition-colors text-left"
            class:bg-mono-100={$activeNamespaceId === namespace.id}
            role="option"
            aria-selected={$activeNamespaceId === namespace.id}
          >
            {#if namespace.locked}
              <i class="fa-solid fa-lock text-mono-400 text-xs w-4"></i>
            {:else}
              <i class="fa-solid fa-layer-group text-mono-400 text-xs w-4"></i>
            {/if}
            <div class="flex-1 min-w-0">
              <span class="text-sm text-mono-800 block truncate">{namespace.name}</span>
              {#if namespace.description}
                <span class="text-xs text-mono-500 block truncate">{namespace.description}</span>
              {/if}
            </div>
            {#if $activeNamespaceId === namespace.id}
              <i class="fa-solid fa-check text-mono-600 text-xs"></i>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

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
  } from '$lib/stores/stores';
  import type { Namespace } from '$lib/types';
  import { inputGlassAuto, popoverGlassMenuChrome, themeAccentText } from '$lib/ui/classes';

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
    class="inline-flex items-center space-x-3 cursor-pointer shadow-inner {inputGlassAuto} hover:bg-surface-raised font-inter"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    {#if isGlobalNamespace($activeNamespace)}
      <i class="fa-solid fa-earth-americas text-fg-muted text-xs"></i>
    {:else}
      <i class="fa-solid fa-layer-group text-fg-muted text-xs"></i>
    {/if}
    <span class="text-fg-secondary">{$activeNamespace?.name ?? 'Select namespace'}</span>
    <i class="fa-solid fa-chevron-down text-fg-muted text-xs transition-transform" class:rotate-180={isOpen}></i>
  </button>

  {#if isOpen}
    <div
      class="{popoverGlassMenuChrome} absolute top-full right-0 mt-2 min-w-[200px] w-max max-w-sm"
      role="listbox"
    >
      <div class="p-3 border-b border-edge-faint/80 bg-surface-raised/40">
        <span class="text-xs font-semibold text-fg-muted uppercase tracking-wider font-inter">Namespace</span>
      </div>
      <div class="py-2 max-h-60 overflow-y-auto w-full">
        {#each $namespacesStore as namespace}
          <button
            type="button"
            onclick={() => selectNamespace(namespace)}
            class="w-full px-4 py-2.5 flex items-center space-x-3 hover:bg-surface-raised transition-colors text-left font-inter"
            class:bg-surface-raised={$activeNamespaceId === namespace.id}
            role="option"
            aria-selected={$activeNamespaceId === namespace.id}
          >
            {#if isGlobalNamespace(namespace)}
              <i class="fa-solid fa-earth-americas text-fg-muted text-xs w-4"></i>
            {:else}
              <i class="fa-solid fa-layer-group text-fg-muted text-xs w-4"></i>
            {/if}
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-1.5">
                <span class="text-sm text-fg block truncate">{namespace.name}</span>
                {#if namespace.isDefault}
                  <span class="px-1 py-0.5 text-[10px] bg-surface-overlay text-fg-muted flex-shrink-0">Default</span>
                {/if}
              </div>
              {#if namespace.description}
                <span class="text-xs text-fg-muted block truncate">{namespace.description}</span>
              {/if}
            </div>
            {#if $activeNamespaceId === namespace.id}
              <i class="fa-solid fa-check text-xs {themeAccentText}"></i>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

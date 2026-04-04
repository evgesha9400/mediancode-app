<!--
  DrawerHeader - Header section for drawer component

  Provides a drawer title and close button. The close button triggers the onClose callback.
  This component is typically the first child of a Drawer component.

  @component
  @example
  ```svelte
  <DrawerHeader title="Edit Field" onClose={() => drawerOpen = false} />
  <DrawerHeader title="Create API" headerNamespace="My Space" onClose={() => {}} />
  <DrawerHeader title="Type Details" headerSystem onClose={() => {}} />
  ```
-->
<script module lang="ts">
  export interface DrawerHeaderProps {
    /**
     * The title text to display in the drawer header
     */
    title: string;

    /**
     * When set, shows the same namespace meta row as the API detail page (dot + layer icon + name).
     */
    headerNamespace?: string;

    /**
     * When true, shows system-entity meta after the title (dot + lock icon + "System"), same layout as namespace meta.
     */
    headerSystem?: boolean;

    /**
     * Callback function triggered when the close button is clicked
     */
    onClose: () => void;
  }
</script>

<script lang="ts">
  import { headerMetaSeparator, headerNamespaceCluster, headerSystemCluster } from '$lib/ui/classes';

  interface Props extends DrawerHeaderProps {}

  let { title, headerNamespace = '', headerSystem = false, onClose }: Props = $props();

  let trimmedNs = $derived(headerNamespace?.trim() ?? '');
</script>

<div class="p-6 shrink-0">
  <div class="flex justify-between items-center gap-3">
    <!-- Same packing as API detail title band: meta flows left-to-right after title (no flex-grow on title). -->
    <div
      class="flex items-center justify-start gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden"
    >
      <h2
        class="text-xl text-white font-inter font-bold tracking-tight leading-tight truncate min-w-0 shrink"
        title={title}
      >
        {title}
      </h2>
      {#if trimmedNs}
        <span class={headerMetaSeparator} aria-hidden="true">·</span>
        <span class={headerNamespaceCluster} title={trimmedNs}>
          <i class="fa-solid fa-layer-group text-xs shrink-0"></i>
          <span class="truncate">{trimmedNs}</span>
        </span>
      {/if}
      {#if headerSystem}
        <span class={headerMetaSeparator} aria-hidden="true">·</span>
        <span class={headerSystemCluster} title="System entity — read-only">
          <i class="fa-solid fa-lock text-xs shrink-0"></i>
          <span class="truncate">System</span>
        </span>
      {/if}
    </div>
    <button
      onclick={onClose}
      class="text-mono-400 hover:text-mono-200 transition-colors"
      aria-label="Close drawer"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
</div>

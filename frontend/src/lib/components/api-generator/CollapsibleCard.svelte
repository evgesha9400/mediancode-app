<script lang="ts">
  import type { Snippet } from 'svelte';

  export interface CollapsibleCardProps {
    title: string;
    icon: string;
    defaultExpanded?: boolean;
  }

  interface Props extends CollapsibleCardProps {
    actions?: Snippet;
    children: Snippet;
  }

  let { title, icon, defaultExpanded = true, actions, children }: Props = $props();
  let isExpanded = $state(defaultExpanded);

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
</script>

<div class="bg-white rounded-lg border border-mono-200">
  <div class="flex items-center justify-between px-4 py-3">
    <button
      type="button"
      onclick={toggleExpanded}
      class="flex items-center flex-1 text-left hover:opacity-80 transition-opacity"
    >
      <h2 class="text-base text-mono-800 flex items-center">
        <i class="fa-solid {icon} mr-2"></i>
        {title}
      </h2>
      <i class="fa-solid fa-chevron-down text-mono-500 transition-transform ml-3 {isExpanded ? 'rotate-180' : ''}"></i>
    </button>
    {#if actions}
      <div class="ml-4">
        {@render actions()}
      </div>
    {/if}
  </div>
  {#if isExpanded}
    <div class="px-4 pb-4">
      {@render children()}
    </div>
  {/if}
</div>

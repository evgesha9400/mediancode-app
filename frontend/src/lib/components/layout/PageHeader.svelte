<!--
  PageHeader - Header component for application pages

  Provides a consistent header layout with title and optional action buttons.
  Used at the top of main content areas to display page title and controls.

  @component
  @example
  <PageHeader title="Fields" description="Optional subtitle">
    {#snippet prepend()}
      <a href="/settings">Back</a>
    {/snippet}
    {#snippet actions()}
      <button>Add Field</button>
    {/snippet}
  </PageHeader>
-->
<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface PageHeaderProps {
    /**
     * The title text to display in the header
     */
    title: string;

    /**
     * Optional muted label on the same row as the title (truncates; full text in `title` tooltip)
     */
    description?: string;

    /**
     * Optional content before the title (e.g. back control)
     */
    prepend?: Snippet;

    /**
     * Optional snippet for action buttons in the header
     */
    actions?: Snippet;
  }
</script>

<script lang="ts">
  import {
    dashboardPageHeaderGradient,
    dashboardPageHeaderShell,
    dashboardPageHeaderTitleBand,
  } from '$lib/ui/classes';

  interface Props extends PageHeaderProps {}

  let { title, description, prepend, actions }: Props = $props();
</script>

<div class={dashboardPageHeaderShell}>
  <div class={dashboardPageHeaderGradient}></div>
  <div
    class="relative z-20 flex justify-between gap-3 {dashboardPageHeaderTitleBand} flex-nowrap"
  >
    <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
      {@render prepend?.()}
      <h1
        class="text-2xl text-white font-inter font-bold tracking-tight shadow-sm leading-tight truncate min-w-0 shrink"
        title={title}
      >
        {title}
      </h1>
      {#if description?.trim()}
        <span class="text-mono-600 shrink-0" aria-hidden="true">·</span>
        <span
          class="text-sm text-mono-400 truncate min-w-0 flex-1 basis-0 font-inter"
          title={description.trim()}
        >{description.trim()}</span>
      {/if}
    </div>
    <div class="flex items-center space-x-4 shrink-0">
      {@render actions?.()}
    </div>
  </div>
</div>

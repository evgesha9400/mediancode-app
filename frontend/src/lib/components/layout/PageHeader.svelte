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

  /** Optional back control; same contract as {@link BackNavButton}. */
  export type PageHeaderBack =
    | { href: string; ariaLabel: string }
    | { ariaLabel: string; onclick: (e: MouseEvent) => void };

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
     * Optional back control before `prepend` (icon button).
     */
    back?: PageHeaderBack;

    /**
     * Optional content before the title (e.g. extra chrome)
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
    dashboardPageHeaderShell,
    dashboardPageHeaderTitleBand,
    dashboardPageTitleText
  } from '$lib/ui/classes';
  import BackNavButton from './BackNavButton.svelte';

  interface Props extends PageHeaderProps {}

  let { title, description, back, prepend, actions }: Props = $props();
</script>

<div class={dashboardPageHeaderShell}>
  <div
    class="relative z-20 flex justify-between gap-3 {dashboardPageHeaderTitleBand} flex-nowrap"
  >
    <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
      {#if back}
        {#if 'href' in back}
          <BackNavButton href={back.href} ariaLabel={back.ariaLabel} />
        {:else}
          <BackNavButton ariaLabel={back.ariaLabel} onclick={back.onclick} />
        {/if}
      {/if}
      {@render prepend?.()}
      <h1 class={dashboardPageTitleText} title={title}>
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

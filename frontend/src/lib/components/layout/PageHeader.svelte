<!--
  PageHeader - Header component for application pages

  Provides a consistent header layout with title and optional action buttons.
  Used at the top of main content areas to display page title and controls.

  @component
  @example
  <PageHeader title="Fields">
    {#snippet actions()}
      <button>Add Field</button>
    {/snippet}
  </PageHeader>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  export interface PageHeaderProps {
    /**
     * The title text to display in the header
     */
    title: string;

    /**
     * Optional snippet for action buttons in the header
     */
    actions?: Snippet;
  }

  interface Props extends PageHeaderProps {}

  let { title, actions }: Props = $props();
</script>

<div class="bg-white border-b border-mono-200 py-4 px-6">
  <div class="flex justify-between items-center">
    <h1 class="text-xl text-mono-800 font-semibold">{title}</h1>
    <div class="flex items-center space-x-4">
      {@render actions?.()}
    </div>
  </div>
</div>

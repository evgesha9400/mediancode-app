<!--
  DrawerContent - Content section for drawer component

  Provides a scrollable content area for the drawer body.
  This is the main area where drawer content (forms, details, etc.) is displayed.

  @component
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * Content to render inside the drawer content area
     */
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="flex-1 overflow-auto p-6">
  {@render children?.()}
</div>

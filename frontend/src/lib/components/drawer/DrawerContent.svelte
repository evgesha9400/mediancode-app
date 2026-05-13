<!--
  DrawerContent - Content section for drawer component

  Provides a scrollable content area for the drawer body.
  This is the main area where drawer content (forms, details, etc.) is displayed.

  @component
-->
<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface DrawerContentProps {
    /**
     * Content to render inside the drawer content area
     */
    children?: Snippet;
  }
</script>

<script lang="ts">
  import { drawerBodyScrollArea } from '$lib/ui/classes';

  interface Props extends DrawerContentProps {}

  let { children }: Props = $props();
</script>

<div class={drawerBodyScrollArea}>
  {@render children?.()}
</div>

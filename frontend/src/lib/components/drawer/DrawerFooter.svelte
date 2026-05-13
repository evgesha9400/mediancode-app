<!--
  DrawerFooter - Footer section for drawer component

  Provides a styled footer area with configurable spacing for drawer actions.
  Typically contains buttons like "Save", "Cancel", etc.

  @component
  @example
  <DrawerFooter padding="edge" spacing="space-y-3">
    <button>Save</button>
    <button>Cancel</button>
  </DrawerFooter>
-->
<script module lang="ts">
  import type { Snippet } from 'svelte';

  import { drawerFooterShellInset, drawerFooterShellEdge } from '$lib/ui/classes';

  export interface DrawerFooterProps {
    /**
     * Tailwind spacing class for vertical spacing between footer elements
     * @default 'space-y-2'
     */
    spacing?: string;

    /**
     * `inset` keeps p-6 gutters (modals / custom layouts). `edge` is flush to the drawer
     * panel for full-width toolbars (DrawerStack).
     * @default 'inset'
     */
    padding?: 'inset' | 'edge';

    /**
     * Content to render inside the drawer footer
     */
    children?: Snippet;
  }
</script>

<script lang="ts">
  interface Props extends DrawerFooterProps {}

  let { spacing = 'space-y-2', padding = 'inset', children }: Props = $props();

  let shellClass = $derived(padding === 'edge' ? drawerFooterShellEdge : drawerFooterShellInset);
</script>

<div class="{shellClass} {spacing}">
  {@render children?.()}
</div>

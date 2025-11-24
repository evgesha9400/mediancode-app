<!--
  DrawerFooter - Footer section for drawer component

  Provides a styled footer area with configurable spacing for drawer actions.
  Typically contains buttons like "Save", "Cancel", etc.

  @component
  @example
  <DrawerFooter spacing="space-y-3">
    <button>Save</button>
    <button>Cancel</button>
  </DrawerFooter>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /**
     * Tailwind spacing class for vertical spacing between footer elements
     * @default 'space-y-2'
     */
    spacing?: string;

    /**
     * Content to render inside the drawer footer
     */
    children?: Snippet;
  }

  let { spacing = 'space-y-2', children }: Props = $props();
</script>

<div class="p-6 border-t border-mono-200 {spacing}">
  {@render children?.()}
</div>

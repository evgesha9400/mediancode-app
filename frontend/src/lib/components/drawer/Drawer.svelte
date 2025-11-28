<!--
  Drawer - Slide-in panel component

  Provides a fixed-position drawer that slides in from the right side of the screen.
  Uses Svelte's slide transition for smooth animation. Typically contains DrawerHeader,
  DrawerContent, and DrawerFooter components.

  Responsive behavior:
  - Drawer width is capped by maxWidth (default 384px)
  - Shrinks to fit when viewport - sidebar (256px) is less than maxWidth
  - Minimum width: 320px
  - Below 576px viewport: full width

  @component
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { slide } from 'svelte/transition';

  export interface DrawerProps {
    /**
     * Whether the drawer is currently open/visible
     */
    open: boolean;

    /**
     * Maximum width of the drawer in pixels
     * @default 384
     */
    maxWidth?: number;

    /**
     * Content to render inside the drawer
     */
    children?: Snippet;
  }

  interface Props extends DrawerProps {}

  let { open, maxWidth = 384, children }: Props = $props();

  const SIDEBAR_WIDTH = 256;
  const MIN_WIDTH = 320;
</script>

{#if open}
  <div
    transition:slide={{ duration: 300, axis: 'x' }}
    class="drawer fixed right-0 top-0 h-screen bg-white border-l border-mono-200 flex flex-col overflow-hidden z-50"
    style="--max-width: {maxWidth}px; --sidebar-width: {SIDEBAR_WIDTH}px; --min-width: {MIN_WIDTH}px;"
  >
    {@render children?.()}
  </div>
{/if}

<style>
  .drawer {
    /* Full width on very small screens */
    width: 100%;
  }

  /* Above 576px: responsive width that respects sidebar */
  @media (min-width: 576px) {
    .drawer {
      /* Use maxWidth but shrink if needed to leave room for sidebar */
      width: min(var(--max-width), calc(100vw - var(--sidebar-width)));
      /* Enforce minimum width */
      min-width: var(--min-width);
    }
  }
</style>

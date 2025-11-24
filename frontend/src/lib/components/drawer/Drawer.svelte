<!--
  Drawer - Slide-in panel component

  Provides a fixed-position drawer that slides in from the right side of the screen.
  Uses Svelte's slide transition for smooth animation. Typically contains DrawerHeader,
  DrawerContent, and DrawerFooter components.

  @component
-->
<script lang="ts">
  import { slide } from 'svelte/transition';

  interface Props {
    /**
     * Whether the drawer is currently open/visible
     */
    open: boolean;

    /**
     * Tailwind width class for the drawer
     * @default 'w-96'
     */
    width?: string;
  }

  let { open, width = 'w-96' }: Props = $props();
</script>

{#if open}
  <div
    transition:slide={{ duration: 300, axis: 'x' }}
    class="fixed right-0 top-0 h-screen {width} bg-white border-l border-mono-200 flex flex-col overflow-hidden z-50"
  >
    <slot />
  </div>
{/if}

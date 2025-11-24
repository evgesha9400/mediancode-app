<!--
  DrawerHeader - Header section for drawer component

  Provides a drawer title and close button. The close button triggers the onClose callback.
  This component is typically the first child of a Drawer component.

  @component
  @example
  ```svelte
  <DrawerHeader title="Edit Field" onClose={() => drawerOpen = false} />
  ```
-->
<script lang="ts">
  export interface DrawerHeaderProps {
    /**
     * The title text to display in the drawer header
     */
    title: string;

    /**
     * Callback function triggered when the close button is clicked
     */
    onClose: () => void;
  }

  interface Props extends DrawerHeaderProps {}

  let { title, onClose }: Props = $props();
</script>

<div class="p-6 border-b border-mono-200">
  <div class="flex justify-between items-center">
    <h2 class="text-lg text-mono-800 font-semibold">{title}</h2>
    <button
      onclick={onClose}
      class="text-mono-500 hover:text-mono-700 transition-colors"
      aria-label="Close drawer"
    >
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>
</div>

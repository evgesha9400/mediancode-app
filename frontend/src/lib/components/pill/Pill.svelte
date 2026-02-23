<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface PillProps {
    variant?: 'default' | 'light';
    children?: Snippet;
  }
</script>

<script lang="ts">
  interface Props extends PillProps {}

  let { variant = 'default', children }: Props = $props();

  const classes = {
    default: 'bg-mono-200 text-mono-700',
    light: 'bg-mono-100 text-mono-600'
  };
</script>

<span class="px-2 py-0.5 text-xs rounded-full {classes[variant]}">
  {#if children}
    {@render children()}
  {/if}
</span>

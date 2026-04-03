<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface PillProps {
    size?: 'default' | 'sm';
    class?: string;
    children?: Snippet;
  }
</script>

<script lang="ts">
  interface Props extends PillProps {}

  let { size = 'default', class: extraClass = '', children }: Props = $props();

  const sizeClasses = {
    default: 'px-2 py-0.5 text-xs',
    sm: 'px-1.5 py-0.5 text-[10px]'
  };
</script>

<span class="{sizeClasses[size]} rounded-full border border-mono-700/60 bg-mono-800/40 font-mono tracking-wide {extraClass}">
  {#if children}
    {@render children()}
  {/if}
</span>

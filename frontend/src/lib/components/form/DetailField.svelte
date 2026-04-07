<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface DetailFieldProps {
    label: string;
    value?: string;
    children?: Snippet;
  }
</script>

<script lang="ts">
  import { getDetailFieldTestId } from '$lib/utils/testIds';

  interface Props extends DetailFieldProps {}

  let { label, value, children }: Props = $props();
</script>

<div data-testid={getDetailFieldTestId(label)}>
  <h3 class="text-sm text-mono-400 mb-1 font-medium">{label}</h3>
  {#if children}
    {@render children()}
  {:else if value !== undefined}
    <p class="text-mono-100">{value}</p>
  {/if}
</div>

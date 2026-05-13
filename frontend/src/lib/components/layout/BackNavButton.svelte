<!--
  BackNavButton — square icon control for “back” in dashboard title rows.

  @component
-->
<script module lang="ts">
  export interface BackNavButtonProps {
    ariaLabel: string;
    /** When set, renders an anchor (e.g. `/settings`). */
    href?: string;
    /** When `href` is omitted, use for programmatic navigation (e.g. `goto`). */
    onclick?: (e: MouseEvent) => void;
  }
</script>

<script lang="ts">
  import { backNavButton } from '$lib/ui/classes';

  let { ariaLabel, href = undefined, onclick = undefined }: BackNavButtonProps = $props();
</script>

{#if href}
  <a {href} class={backNavButton} aria-label={ariaLabel}>
    <i class="fa-solid fa-arrow-left text-sm"></i>
  </a>
{:else}
  <button type="button" class={backNavButton} aria-label={ariaLabel} {onclick}>
    <i class="fa-solid fa-arrow-left text-sm"></i>
  </button>
{/if}

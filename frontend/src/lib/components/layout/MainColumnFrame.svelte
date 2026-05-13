<!--
  MainColumnFrame — main content column next to the sidebar.

  Provides a non-scrolling header region and a scrolling body so headers stay
  aligned consistently and overflow stays on the body.
-->
<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface MainColumnFrameProps {
    header: Snippet;
    children: Snippet;
    /** Classes for the scrollable body (e.g. p-6 space-y-6). */
    bodyClass?: string;
  }
</script>

<script lang="ts">
  import { dashboardMainColumn, dashboardTextPrimary } from '$lib/ui/classes';

  interface Props extends MainColumnFrameProps {}

  let { header, children, bodyClass = '' }: Props = $props();
</script>

<div class="{dashboardMainColumn} {dashboardTextPrimary}">
  <div class="shrink-0 w-full">
    {@render header()}
  </div>
  <div class="flex-1 min-h-0 overflow-auto {bodyClass}">
    {@render children()}
  </div>
</div>

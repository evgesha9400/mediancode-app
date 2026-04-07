<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface DrawerStackPanel {
    id: string;
    title: string;
    /** Same namespace meta as API detail header (dot + icon + name). */
    headerNamespace?: string;
    /** Dot + lock + "System" after title for built-in / read-only entities. */
    headerSystem?: boolean;
    width: number;
    minWidth?: number;
    content: Snippet<[{ close: () => void }]>;
    footer?: Snippet<[{ close: () => void }]>;
    onClose?: () => void;
  }

  export interface DrawerStackProps {
    panels: DrawerStackPanel[];
    onPopPanel: () => void;
  }
</script>

<script lang="ts">
  import { onDestroy } from 'svelte';
  import { flip } from 'svelte/animate';
  import { fade, fly } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import { DrawerHeader, DrawerContent, DrawerFooter } from '$lib/components/drawer';
  import { sidebarState } from '$lib/stores/sidebar.svelte';
  import {
    drawerPanelFlexibleOuter,
    drawerPanelFlexibleInner,
    drawerPanelStackedOuter,
    drawerPanelStackedInner,
    drawerScrim,
    drawerStackRoot,
    drawerStackDimmer,
  } from '$lib/ui/classes';
  import { getDrawerPanelTestId } from '$lib/utils/testIds';

  // ─── Animation config ────────────────────────────────────────────────────────
  const DRAWER_DURATION = 350; // ms — shared by backdrop, outer fly, nested panel motion
  const DRAWER_EASING = cubicInOut; // symmetric so open === close feel
  // ─────────────────────────────────────────────────────────────────────────────

  let { panels, onPopPanel }: DrawerStackProps = $props();

  let previousPanelSignature = '';
  let motionInitialized = false;
  let motionTimeout: number | null = null;

  function buildPanelSignature(items: DrawerStackPanel[]): string {
    return items.map((panel) => `${panel.id}:${panel.width}:${panel.minWidth ?? ''}`).join('|');
  }

  function clearMotionTimeout(): void {
    if (motionTimeout !== null) {
      clearTimeout(motionTimeout);
      motionTimeout = null;
    }
  }

  function scheduleDrawerMotionEnd(): void {
    clearMotionTimeout();
    motionTimeout = window.setTimeout(() => {
      sidebarState.endDrawerMotion();
      motionTimeout = null;
    }, DRAWER_DURATION);
  }

  // Freeze the sidebar's rendered width while the drawer stack changes shape.
  $effect(() => {
    const signature = buildPanelSignature(panels);

    if (!motionInitialized) {
      previousPanelSignature = signature;
      motionInitialized = true;
      return;
    }

    if (signature === previousPanelSignature) {
      return;
    }

    previousPanelSignature = signature;
    sidebarState.startDrawerMotion();
    scheduleDrawerMotionEnd();
  });

  // Tell sidebar how much width the drawer panels need
  $effect(() => {
    const total = panels.reduce((sum, p) => sum + p.width, 0);
    sidebarState.setDrawerPanelWidth(total);
  });

  onDestroy(() => {
    clearMotionTimeout();
    sidebarState.endDrawerMotion();
    sidebarState.setDrawerPanelWidth(0);
  });

  // Compute first visible panel index using left-to-right shrink-then-hide.
  // Leftmost visible panel is flexible (shrinks to minWidth before hiding).
  // Rightmost panel is always fixed. Single remaining panel never hides.
  const firstVisibleIndex = $derived.by(() => {
    const available = sidebarState.availableDrawerWidth;
    if (panels.length === 0) return 0;

    for (let start = 0; start < panels.length; start++) {
      // Single panel remaining: always visible (shrinks but never hides)
      if (panels.length - start === 1) return start;

      // Sum declared widths of all panels AFTER the leftmost candidate
      let fixedSum = 0;
      for (let j = start + 1; j < panels.length; j++) {
        fixedSum += panels[j].width;
      }

      // Check if flexible panel fits at its minimum
      const minW = panels[start].minWidth ?? panels[start].width;
      if (available - fixedSum >= minW) return start;
    }

    return panels.length - 1;
  });

  const visiblePanels = $derived(panels.slice(firstVisibleIndex));
</script>

{#if panels.length > 0}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class={drawerScrim}
    style="width: calc(100vw - {sidebarState.width}px);"
    data-drawer-motion={sidebarState.drawerMotionActive ? 'active' : undefined}
    onclick={onPopPanel}
    onkeydown={(e) => { if (e.key === 'Escape') onPopPanel(); }}
    transition:fade={{ duration: DRAWER_DURATION, easing: DRAWER_EASING }}
  ></div>

  <div
    class={drawerStackRoot}
    style="width: calc(100vw - {sidebarState.width}px);"
    data-drawer-motion={sidebarState.drawerMotionActive ? 'active' : undefined}
    transition:fly={{ duration: DRAWER_DURATION, x: '100%', opacity: 1, easing: DRAWER_EASING }}
  >
    {#each visiblePanels as panel, i (panel.id)}
      <div
        class={i === 0 ? drawerPanelFlexibleOuter : drawerPanelStackedOuter}
        data-testid={panel.id ? getDrawerPanelTestId(panel.id) : undefined}
        class:border-r={i === 0 && i < visiblePanels.length - 1}
        style={i === 0
          ? `flex: 1 1 0; max-width: ${panel.width}px;${visiblePanels.length > 1 && panel.minWidth ? ` min-width: ${panel.minWidth}px;` : ''}`
          : `width: ${panel.width}px;`}
        animate:flip={{ duration: DRAWER_DURATION, easing: DRAWER_EASING }}
        transition:fly|global={{
          duration: i === 0 ? 0 : DRAWER_DURATION,
          x: i === 0 ? 0 : panel.width,
          opacity: i === 0 ? 0 : 1,
          easing: DRAWER_EASING
        }}
      >
        <div class={i === 0 ? drawerPanelFlexibleInner : drawerPanelStackedInner}>
          <DrawerHeader
            title={panel.title}
            headerSystem={panel.headerSystem}
            headerNamespace={panel.headerNamespace}
            onClose={onPopPanel}
          />
          <DrawerContent>
            {@render panel.content({ close: onPopPanel })}
          </DrawerContent>
          {#if panel.footer}
            <DrawerFooter padding="edge">
              {@render panel.footer({ close: onPopPanel })}
            </DrawerFooter>
          {/if}
        </div>
        {#if i < visiblePanels.length - 1}
          <div class={drawerStackDimmer}></div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

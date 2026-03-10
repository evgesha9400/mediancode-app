<!--
  Tooltip - Displays a tooltip on hover

  Provides a customizable tooltip that appears on mouse enter and disappears on mouse leave.
  Supports top and bottom positioning with optional disabled state.

  @component
  @example
  <Tooltip text="This is a helpful tip" position="top">
    <button>Hover me</button>
  </Tooltip>
-->
<script module lang="ts">
  import type { Snippet } from 'svelte';

  export interface TooltipProps {
    /**
     * The text content to display in the tooltip
     * @default ''
     */
    text?: string;

    /**
     * Whether the tooltip should be disabled (won't show on hover)
     * @default false
     */
    disabled?: boolean;

    /**
     * Position of the tooltip relative to the element
     * @default 'top'
     */
    position?: 'top' | 'bottom' | 'left' | 'right';

    /**
     * Content to wrap with the tooltip
     */
    children?: Snippet;
  }
</script>

<script lang="ts">
  interface Props extends TooltipProps {}

  let { text = '', disabled = false, position = 'top', children }: Props = $props();

  let showTooltip = $state(false);
  let tooltipStyle = $state('');
  let arrowStyle = $state('');
  let wrapperEl: HTMLDivElement | undefined = $state();

  const GAP = 8;

  function computePosition(rect: DOMRect) {
    switch (position) {
      case 'top':
        tooltipStyle = `left: ${rect.left + rect.width / 2}px; top: ${rect.top - GAP}px; transform: translate(-50%, -100%);`;
        arrowStyle = `bottom: -4px; left: 50%; transform: translateX(-50%) rotate(45deg);`;
        break;
      case 'bottom':
        tooltipStyle = `left: ${rect.left + rect.width / 2}px; top: ${rect.bottom + GAP}px; transform: translateX(-50%);`;
        arrowStyle = `top: -4px; left: 50%; transform: translateX(-50%) rotate(45deg);`;
        break;
      case 'left':
        tooltipStyle = `left: ${rect.left - GAP}px; top: ${rect.top + rect.height / 2}px; transform: translate(-100%, -50%);`;
        arrowStyle = `right: -4px; top: 50%; transform: translateY(-50%) rotate(45deg);`;
        break;
      case 'right':
        tooltipStyle = `left: ${rect.right + GAP}px; top: ${rect.top + rect.height / 2}px; transform: translateY(-50%);`;
        arrowStyle = `left: -4px; top: 50%; transform: translateY(-50%) rotate(45deg);`;
        break;
    }
  }

  function handleMouseEnter() {
    if (text && !disabled && wrapperEl) {
      computePosition(wrapperEl.getBoundingClientRect());
      showTooltip = true;
    }
  }

  function handleMouseLeave() {
    showTooltip = false;
  }
</script>

<div
  class="relative block"
  bind:this={wrapperEl}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  role="presentation"
>
  {@render children?.()}

  {#if showTooltip && text}
    <div
      role="tooltip"
      class="fixed z-[100] px-3 py-2 text-sm text-mono-100 bg-mono-800 shadow-lg whitespace-pre-line max-w-md min-w-max transition-opacity duration-200 pointer-events-none"
      class:opacity-0={!showTooltip}
      class:opacity-100={showTooltip}
      style={tooltipStyle}
    >
      {text}
      <!-- Arrow -->
      <div
        class="absolute w-2 h-2 bg-mono-800 transform rotate-45"
        style={arrowStyle}
      ></div>
    </div>
  {/if}
</div>

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
<script lang="ts">
  interface Props {
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
    position?: 'top' | 'bottom';
  }

  let { text = '', disabled = false, position = 'top' }: Props = $props();

  let showTooltip = $state(false);

  function handleMouseEnter() {
    if (text && !disabled) {
      showTooltip = true;
    }
  }

  function handleMouseLeave() {
    showTooltip = false;
  }
</script>

<div
  class="relative block"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  role="presentation"
>
  <slot />

  {#if showTooltip && text}
    <div
      role="tooltip"
      class="absolute z-50 px-3 py-2 text-sm text-mono-100 bg-mono-800 rounded-md shadow-lg whitespace-pre-line max-w-md min-w-max transition-opacity duration-200 pointer-events-none"
      class:opacity-0={!showTooltip}
      class:opacity-100={showTooltip}
      style="
        {position === 'top' ? 'bottom: calc(100% + 8px);' : 'top: calc(100% + 8px);'}
        left: 50%;
        transform: translateX(-50%);
      "
    >
      {text}
      <!-- Arrow -->
      <div
        class="absolute w-2 h-2 bg-mono-800 transform rotate-45"
        style="
          {position === 'top' ? 'bottom: -4px;' : 'top: -4px;'}
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
        "
      ></div>
    </div>
  {/if}
</div>

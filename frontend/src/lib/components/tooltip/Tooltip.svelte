<script lang="ts">
  export let text: string = '';
  export let disabled: boolean = false;
  export let position: 'top' | 'bottom' = 'top';

  let showTooltip = false;

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
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
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

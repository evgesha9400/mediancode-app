<!--
  FilterPanel - Dropdown filter panel with checkbox groups and toggles

  Provides a configurable filter interface with support for checkbox groups and toggle switches.
  Appears as a dropdown panel below the filter button. Uses callback props for close and clear actions.
  State is managed externally via the bindable state prop.

  @component
  @example
  <FilterPanel
    visible={isVisible}
    config={filterConfig}
    bind:state={filterState}
    onClose={() => isVisible = false}
    onClear={() => handleClear()}
  />
-->
<script lang="ts">
  import type { FilterConfig } from '$lib/types';

  interface Props {
    /**
     * Whether the filter panel is currently visible
     * @default false
     */
    visible?: boolean;

    /**
     * Filter configuration array defining the available filters
     * @default []
     */
    config?: FilterConfig;

    /**
     * Current filter state object (bindable)
     * Keys correspond to filter section keys, values depend on filter type
     * @default {}
     */
    state?: Record<string, unknown>;

    /**
     * Callback triggered when the backdrop is clicked (to close the panel)
     */
    onClose?: () => void;

    /**
     * Callback triggered when the "Clear all" button is clicked
     */
    onClear?: () => void;
  }

  let {
    visible = false,
    config = [],
    state = $bindable({}),
    onClose,
    onClear
  }: Props = $props();

  function ensureArray(value: unknown): string[] {
    return Array.isArray(value) ? value : [];
  }

  function updateState(key: string, value: unknown) {
    state = { ...state, [key]: value };
  }

  function toggleCheckbox(key: string, value: string) {
    const current = ensureArray(state[key]);
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateState(key, next);
  }

  function setToggle(key: string, checked: boolean) {
    updateState(key, checked);
  }

  function buildClearedState(): Record<string, unknown> {
    const next = { ...state };
    config.forEach(section => {
      if (section.type === 'checkbox-group') {
        next[section.key] = [];
      } else if (section.type === 'toggle') {
        next[section.key] = false;
      }
    });
    return next;
  }

  function clearFilters() {
    state = buildClearedState();
    onClear?.();
  }
</script>

{#if visible}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-10"
    onclick={() => onClose?.()}
    role="presentation"
  ></div>

  <!-- Panel -->
  <div class="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-mono-200 z-20 overflow-hidden">
    <div class="p-4 border-b border-mono-100 flex justify-between items-center bg-mono-50">
      <h3 class="font-medium text-mono-900">Filters</h3>
      <button
        type="button"
        onclick={clearFilters}
        class="text-xs text-mono-500 hover:text-mono-800 hover:underline"
      >
        Clear all
      </button>
    </div>

    <div class="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
      {#each config as section, i}
        {#if i > 0}
          <div class="h-px bg-mono-100"></div>
        {/if}

        <div>
          <h4 class="text-xs font-semibold text-mono-500 uppercase tracking-wider mb-3">{section.label}</h4>

          {#if section.type === 'checkbox-group' && section.options}
            <div class="space-y-2">
              {#each section.options as option}
                <label class="flex items-center space-x-2 cursor-pointer group">
                  <div class="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={ensureArray(state[section.key]).includes(option.value)}
                      onchange={() => toggleCheckbox(section.key, option.value)}
                      class="peer h-4 w-4 rounded border-mono-300 text-mono-900 focus:ring-mono-500"
                    />
                  </div>
                  <span class="text-sm text-mono-700 group-hover:text-mono-900">{option.label}</span>
                </label>
              {/each}
            </div>
          {:else if section.type === 'toggle'}
            <label class="flex items-center space-x-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={Boolean(state[section.key])}
                onchange={(event) => setToggle(section.key, (event.currentTarget as HTMLInputElement).checked)}
                class="h-4 w-4 rounded border-mono-300 text-mono-900 focus:ring-mono-500"
              />
              <span class="text-sm text-mono-700 group-hover:text-mono-900">{section.toggleLabel ?? section.label}</span>
            </label>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

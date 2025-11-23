<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FilterConfig } from '$lib/types';

  export let visible = false;
  export let config: FilterConfig = [];
  export let state: Record<string, unknown> = {};

  const dispatch = createEventDispatcher<{
    close: void;
    clear: void;
  }>();

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
    dispatch('clear');
  }
</script>

{#if visible}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-10"
    onclick={() => dispatch('close')}
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

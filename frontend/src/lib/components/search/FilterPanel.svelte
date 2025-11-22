<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FieldType } from '$lib/stores/types';

  export let visible = false;
  export let types: FieldType[] = [];
  export let selectedTypes: string[] = [];
  export let showUsedInApisOnly = false;
  export let showHasValidatorsOnly = false;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  function toggleType(typeName: string) {
    if (selectedTypes.includes(typeName)) {
      selectedTypes = selectedTypes.filter(t => t !== typeName);
    } else {
      selectedTypes = [...selectedTypes, typeName];
    }
  }

  function toggleUsedInApis() {
    showUsedInApisOnly = !showUsedInApisOnly;
  }

  function toggleHasValidators() {
    showHasValidatorsOnly = !showHasValidatorsOnly;
  }

  function clearFilters() {
    selectedTypes = [];
    showUsedInApisOnly = false;
    showHasValidatorsOnly = false;
  }
</script>

{#if visible}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 z-10" 
    on:click={() => dispatch('close')}
    role="presentation"
  ></div>

  <!-- Panel -->
  <div class="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-mono-200 z-20 overflow-hidden">
    <div class="p-4 border-b border-mono-100 flex justify-between items-center bg-mono-50">
      <h3 class="font-medium text-mono-900">Filters</h3>
      <button 
        type="button"
        on:click={clearFilters}
        class="text-xs text-mono-500 hover:text-mono-800 hover:underline"
      >
        Clear all
      </button>
    </div>

    <div class="p-4 space-y-6 max-h-[60vh] overflow-y-auto">
      <!-- Field Type Section -->
      <div>
        <h4 class="text-xs font-semibold text-mono-500 uppercase tracking-wider mb-3">Field Type</h4>
        <div class="space-y-2">
          {#each types as type}
            <label class="flex items-center space-x-2 cursor-pointer group">
              <div class="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={selectedTypes.includes(type.name)}
                  on:change={() => toggleType(type.name)}
                  class="peer h-4 w-4 rounded border-mono-300 text-mono-900 focus:ring-mono-500"
                />
              </div>
              <span class="text-sm text-mono-700 group-hover:text-mono-900">{type.name}</span>
            </label>
          {/each}
        </div>
      </div>

      <div class="h-px bg-mono-100"></div>

      <!-- Usage Section -->
      <div>
        <h4 class="text-xs font-semibold text-mono-500 uppercase tracking-wider mb-3">Usage</h4>
        <label class="flex items-center space-x-2 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={showUsedInApisOnly}
            on:change={toggleUsedInApis}
            class="h-4 w-4 rounded border-mono-300 text-mono-900 focus:ring-mono-500"
          />
          <span class="text-sm text-mono-700 group-hover:text-mono-900">Used in APIs only</span>
        </label>
      </div>

      <div class="h-px bg-mono-100"></div>

      <!-- Validation Section -->
      <div>
        <h4 class="text-xs font-semibold text-mono-500 uppercase tracking-wider mb-3">Validation</h4>
        <label class="flex items-center space-x-2 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={showHasValidatorsOnly}
            on:change={toggleHasValidators}
            class="h-4 w-4 rounded border-mono-300 text-mono-900 focus:ring-mono-500"
          />
          <span class="text-sm text-mono-700 group-hover:text-mono-900">Has validators only</span>
        </label>
      </div>
    </div>
  </div>
{/if}

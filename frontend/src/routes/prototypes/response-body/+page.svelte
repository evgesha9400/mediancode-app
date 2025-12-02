<script lang="ts">
  import { fieldsStore, getFieldById } from '$lib/stores/fields';
  import { objectsStore, getObjectById } from '$lib/stores/objects';
  import type { ObjectDefinition } from '$lib/types';
  import { DashboardLayout, PageHeader } from '$lib/components';

  // ============================================================================
  // STATE
  // ============================================================================

  let useEnvelope = $state(true);
  let isList = $state(false);
  let selectedObjectId = $state<string | undefined>();
  let searchQuery = $state('');
  let showSearch = $state(false);

  let objects = $derived($objectsStore);

  // ============================================================================
  // HELPERS
  // ============================================================================

  function getExampleValue(type: string): any {
    switch (type) {
      case 'str': return 'example_string';
      case 'int': return 42;
      case 'float': return 3.14;
      case 'bool': return true;
      case 'uuid': return '550e8400-e29b-41d4-a716-446655440000';
      case 'datetime': return '2024-01-15T10:30:00Z';
      default: return null;
    }
  }

  let searchResults = $derived.by(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    if (!lowerQuery) return [];
    return objects
      .filter(o => o.name.toLowerCase().includes(lowerQuery))
      .slice(0, 8);
  });

  function selectObject(obj: ObjectDefinition) {
    selectedObjectId = obj.id;
    searchQuery = '';
    showSearch = false;
  }

  function clearObject() {
    selectedObjectId = undefined;
  }

  function buildPreview(): any {
    let content: Record<string, any> = {};

    if (selectedObjectId) {
      const obj = getObjectById(selectedObjectId);
      if (obj) {
        for (const ref of obj.fields) {
          const field = getFieldById(ref.fieldId);
          if (field) content[field.name] = getExampleValue(field.type);
        }
      }
    }

    const wrapped = isList ? [content, content] : content;
    return useEnvelope ? { data: wrapped } : wrapped;
  }

  let previewJson = $derived(JSON.stringify(buildPreview(), null, 2));
  let selectedObject = $derived(selectedObjectId ? getObjectById(selectedObjectId) : undefined);
</script>

<DashboardLayout>
  <PageHeader title="Response Body Prototype">
    {#snippet actions()}
      <div class="flex items-center gap-2">
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            bind:checked={useEnvelope}
            class="w-4 h-4 rounded border-mono-300"
          />
          <span class="text-mono-600">Envelope</span>
        </label>
      </div>
    {/snippet}
  </PageHeader>

  <div class="bg-white rounded-lg border border-mono-200 p-4">
    <div class="space-y-4">
      <!-- Response Type -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-mono-700 font-medium">Response:</span>
        <div class="flex gap-1">
          <button
            type="button"
            onclick={() => isList = false}
            class="px-3 py-1.5 text-sm border rounded-md transition-all {!isList
              ? 'bg-mono-900 text-white border-mono-900'
              : 'bg-white text-mono-600 border-mono-200 hover:border-mono-300'}"
          >
            Object
          </button>
          <button
            type="button"
            onclick={() => isList = true}
            class="px-3 py-1.5 text-sm border rounded-md transition-all {isList
              ? 'bg-mono-900 text-white border-mono-900'
              : 'bg-white text-mono-600 border-mono-200 hover:border-mono-300'}"
          >
            Object[]
          </button>
        </div>
      </div>

      <!-- Object Selector -->
      <div class="p-3 bg-mono-50 rounded-lg border border-mono-200 min-h-[50px]">
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-mono-400 font-mono text-sm">{isList ? '[{' : '{'}</span>

          {#if selectedObject}
            <div class="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded">
              <i class="fa-solid fa-cube text-amber-500 text-xs"></i>
              <span class="font-mono text-sm text-mono-700">{selectedObject.name}</span>
              <span class="text-xs text-mono-400">({selectedObject.fields.length} fields)</span>
              <button
                type="button"
                onclick={clearObject}
                class="text-mono-300 hover:text-red-500 ml-1"
                title="Remove"
              >
                <i class="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          {:else if showSearch}
            <div class="relative inline-block">
              <input
                type="text"
                bind:value={searchQuery}
                onblur={() => setTimeout(() => showSearch = false, 200)}
                placeholder="Search objects..."
                class="w-40 px-2 py-1 text-xs border border-mono-300 rounded focus:ring-1 focus:ring-mono-400"
              />
              {#if searchResults.length > 0}
                <div class="absolute z-10 w-52 mt-1 bg-white border border-mono-300 rounded-md shadow-lg max-h-40 overflow-auto">
                  {#each searchResults as obj}
                    <button
                      type="button"
                      onclick={() => selectObject(obj)}
                      class="w-full px-2 py-1.5 text-left hover:bg-mono-50 flex items-center gap-2 text-xs"
                    >
                      <i class="fa-solid fa-cube text-amber-500"></i>
                      <span class="font-mono">{obj.name}</span>
                      <span class="text-mono-400 ml-auto">{obj.fields.length} fields</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <button
              type="button"
              onclick={() => showSearch = true}
              class="px-2 py-1 text-mono-400 hover:text-mono-600 border border-dashed border-mono-300 rounded hover:border-mono-400 text-xs"
            >
              + select object
            </button>
          {/if}

          <span class="text-mono-400 font-mono text-sm">{isList ? '}]' : '}'}</span>
        </div>
      </div>

      <!-- Preview -->
      <div class="p-3 bg-mono-900 rounded-lg text-white font-mono overflow-x-auto">
        <pre class="text-xs">{previewJson}</pre>
      </div>
    </div>
  </div>
</DashboardLayout>

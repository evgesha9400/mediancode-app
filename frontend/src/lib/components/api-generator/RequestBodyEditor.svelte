<script lang="ts">
  import type { EndpointParameter, BodyMode, BodyValidationError } from '$lib/types';
  import ParameterEditor from './ParameterEditor.svelte';

  export interface RequestBodyEditorProps {
    mode: BodyMode;
    fields: EndpointParameter[];
    jsonBody: string;
    errors: BodyValidationError[];
    onModeChange: (mode: BodyMode) => void;
    onFieldUpdate: (fieldId: string, updates: Partial<EndpointParameter>) => void;
    onFieldDelete: (fieldId: string) => void;
    onAddField: () => void;
    onJsonChange: (json: string) => void;
  }

  interface Props extends RequestBodyEditorProps {}

  let {
    mode,
    fields,
    jsonBody,
    errors,
    onModeChange,
    onFieldUpdate,
    onFieldDelete,
    onAddField,
    onJsonChange
  }: Props = $props();

  // Mode labels for display
  const modeLabels = {
    none: 'None',
    fields: 'Fields',
    json: 'Paste JSON'
  };
</script>

<div>
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-sm text-mono-700 flex items-center font-medium">
      <i class="fa-solid fa-arrow-up mr-2"></i>
      Request Body
    </h3>
    <div class="flex items-center space-x-2">
      {#each ['none', 'fields', 'json'] as modeOption}
        <button
          type="button"
          onclick={() => onModeChange(modeOption as BodyMode)}
          class="px-3 py-1 text-xs rounded-md transition-colors {mode === modeOption ? 'bg-mono-900 text-white' : 'bg-mono-100 text-mono-600 hover:bg-mono-200'}"
        >
          {modeLabels[modeOption as BodyMode]}
        </button>
      {/each}
    </div>
  </div>

  {#if mode === 'none'}
    <div class="p-3 bg-mono-50 rounded border border-mono-200">
      <p class="text-xs text-mono-500">No request body required</p>
    </div>
  {:else if mode === 'fields'}
    <div class="space-y-2">
      {#if fields.length === 0}
        <div class="p-3 bg-mono-50 rounded border border-mono-200">
          <p class="text-xs text-mono-500">No fields defined</p>
        </div>
      {:else}
        {#each fields as field (field.id)}
          <ParameterEditor
            parameter={field}
            onUpdate={(updates) => onFieldUpdate(field.id, updates)}
            onDelete={() => onFieldDelete(field.id)}
          />
        {/each}
      {/if}
      <button
        type="button"
        onclick={onAddField}
        class="w-full px-3 py-2 bg-mono-900 text-white text-sm rounded-md flex items-center justify-center space-x-2 hover:bg-mono-800"
      >
        <i class="fa-solid fa-plus"></i>
        <span>Add Field</span>
      </button>
    </div>
  {:else if mode === 'json'}
    <div class="space-y-2">
      <textarea
        value={jsonBody}
        oninput={(e) => onJsonChange(e.currentTarget.value)}
        placeholder="Paste JSON here..."
        rows={8}
        class="w-full px-3 py-2 font-mono text-xs border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {errors.length > 0 ? 'border-red-500' : ''}"
      ></textarea>
      {#if errors.length > 0}
        <div class="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          {#each errors as error}
            <div>{error.message}</div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

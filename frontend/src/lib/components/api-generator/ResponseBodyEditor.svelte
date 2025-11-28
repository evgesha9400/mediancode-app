<script lang="ts">
  import type { EndpointParameter, BodyMode, BodyValidationError } from '$lib/types';
  import ParameterEditor from './ParameterEditor.svelte';

  export interface ResponseBodyEditorProps {
    mode: BodyMode;
    fields: EndpointParameter[];
    jsonBody: string;
    errors: BodyValidationError[];
    useEnvelope: boolean;
    onModeChange: (mode: BodyMode) => void;
    onFieldUpdate: (fieldId: string, updates: Partial<EndpointParameter>) => void;
    onFieldDelete: (fieldId: string) => void;
    onAddField: () => void;
    onJsonChange: (json: string) => void;
    onCopyFromRequest: () => void;
    onEnvelopeToggle: (enabled: boolean) => void;
  }

  interface Props extends ResponseBodyEditorProps {}

  let {
    mode,
    fields,
    jsonBody,
    errors,
    useEnvelope,
    onModeChange,
    onFieldUpdate,
    onFieldDelete,
    onAddField,
    onJsonChange,
    onCopyFromRequest,
    onEnvelopeToggle
  }: Props = $props();

  // Mode labels for display
  const modeLabels = {
    none: 'None',
    fields: 'Fields',
    json: 'Paste JSON'
  };

  // Build preview JSON from fields or raw JSON
  const previewJson = $derived.by(() => {
    let bodyContent: any;

    if (mode === 'none') {
      return '';
    } else if (mode === 'fields') {
      // Build object from fields
      if (fields.length === 0) {
        bodyContent = {};
      } else {
        bodyContent = {};
        fields.forEach(field => {
          // Use field type to determine example value
          // Normalize type names (handle both 'int'/'integer', 'bool'/'boolean', etc.)
          let exampleValue: any;
          const normalizedType = field.type.toLowerCase();

          if (normalizedType === 'string') {
            exampleValue = 'string';
          } else if (normalizedType === 'int' || normalizedType === 'integer') {
            exampleValue = 0;
          } else if (normalizedType === 'float' || normalizedType === 'number' || normalizedType === 'double') {
            exampleValue = 0.0;
          } else if (normalizedType === 'bool' || normalizedType === 'boolean') {
            exampleValue = true;
          } else if (normalizedType === 'uuid') {
            exampleValue = '00000000-0000-0000-0000-000000000000';
          } else if (normalizedType === 'datetime') {
            exampleValue = '2024-01-01T00:00:00Z';
          } else if (normalizedType === 'date') {
            exampleValue = '2024-01-01';
          } else if (normalizedType === 'time') {
            exampleValue = '00:00:00';
          } else {
            exampleValue = null;
          }
          bodyContent[field.name] = exampleValue;
        });
      }
    } else if (mode === 'json') {
      // Use raw JSON
      try {
        bodyContent = JSON.parse(jsonBody);
      } catch {
        return jsonBody; // Return as-is if invalid
      }
    }

    // Wrap in envelope if enabled
    if (useEnvelope) {
      const envelope = {
        success: true,
        data: bodyContent,
        error: null
      };
      return JSON.stringify(envelope, null, 2);
    }

    return JSON.stringify(bodyContent, null, 2);
  });
</script>

<div class="space-y-4">
  <!-- Editor Section -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm text-mono-700 flex items-center font-medium">
        <i class="fa-solid fa-arrow-down mr-2"></i>
        Response Body
      </h3>
      <div class="flex items-center space-x-2">
        <button
          type="button"
          onclick={onCopyFromRequest}
          class="px-3 py-1 text-xs bg-mono-100 text-mono-600 rounded-md hover:bg-mono-200 flex items-center space-x-1"
          title="Copy request body structure to response"
        >
          <i class="fa-solid fa-copy text-xs"></i>
          <span>Copy from request</span>
        </button>
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
        <p class="text-xs text-mono-500">No response body</p>
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

  <!-- Preview Section -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm text-mono-700 flex items-center font-medium">
        <i class="fa-solid fa-eye mr-2"></i>
        Response Preview (200)
      </h3>
      <label class="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={useEnvelope}
          onchange={(e) => onEnvelopeToggle(e.currentTarget.checked)}
          class="w-4 h-4 text-mono-900 border-mono-300 rounded focus:ring-2 focus:ring-mono-400"
        />
        <span class="text-xs text-mono-700">Use envelope wrapper</span>
      </label>
    </div>
    <div class="p-3 bg-mono-900 rounded text-white text-xs overflow-x-auto">
      <pre>{previewJson}</pre>
    </div>
  </div>
</div>

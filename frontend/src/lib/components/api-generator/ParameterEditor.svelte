<script lang="ts">
  import type { EndpointParameter } from '$lib/types';

  export interface ParameterEditorProps {
    parameter: EndpointParameter;
    onUpdate?: (updates: Partial<EndpointParameter>) => void;
    onDelete?: () => void;
    showRequired?: boolean;
    nameEditable?: boolean;
    readOnly?: boolean;
    compact?: boolean;
  }

  interface Props extends ParameterEditorProps {}

  let { parameter, onUpdate, onDelete, showRequired = true, nameEditable = true, readOnly = false, compact = false }: Props = $props();

  // Common parameter types for FastAPI/OpenAPI
  const parameterTypes = [
    { value: '', label: 'Select type...' },
    { value: 'string', label: 'String' },
    { value: 'int', label: 'Integer' },
    { value: 'float', label: 'Float' },
    { value: 'bool', label: 'Boolean' },
    { value: 'uuid', label: 'UUID' },
    { value: 'datetime', label: 'DateTime' },
    { value: 'date', label: 'Date' },
    { value: 'time', label: 'Time' }
  ];
</script>

<div class="flex items-center space-x-2 {compact ? 'py-1.5' : 'p-2 bg-mono-50 rounded border border-mono-200'}">
  {#if !readOnly}
    <!-- Editable Mode -->
    <!-- Parameter Name -->
    {#if nameEditable}
      <input
        type="text"
        value={parameter.name}
        oninput={(e) => onUpdate?.({ name: e.currentTarget.value })}
        placeholder="param_name"
        class="w-40 px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
      />
    {:else}
      <div class="w-40 px-2 py-1 text-sm bg-mono-100 border border-mono-200 rounded-md text-mono-700 font-mono">
        {parameter.name}
      </div>
    {/if}

    <!-- Type Dropdown -->
    <select
      value={parameter.type}
      onchange={(e) => onUpdate?.({ type: e.currentTarget.value })}
      class="px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent {parameter.type === '' ? 'text-mono-400' : 'text-mono-700'}"
    >
      {#each parameterTypes as type (type.value)}
        <option value={type.value}>{type.label}</option>
      {/each}
    </select>

    <!-- Description -->
    <input
      type="text"
      value={parameter.description}
      oninput={(e) => onUpdate?.({ description: e.currentTarget.value })}
      placeholder="Description"
      class="flex-1 px-2 py-1 text-sm border border-mono-300 rounded-md focus:ring-2 focus:ring-mono-400 focus:border-transparent"
    />

    <!-- Required Toggle (only for query params, path params are always required) -->
    {#if showRequired}
      <label class="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={parameter.required}
          onchange={(e) => onUpdate?.({ required: e.currentTarget.checked })}
          class="h-4 w-4 text-mono-900 border-mono-300 rounded"
        />
        <span class="text-sm text-mono-600 whitespace-nowrap">Required</span>
      </label>
    {/if}
  {:else}
    <!-- Read-Only Mode -->
    <div class="flex-1 px-2 py-1 text-sm bg-mono-100 border border-mono-200 rounded-md text-mono-700 font-mono">
      {parameter.name}
    </div>
    <div class="px-2 py-1 text-sm bg-mono-100 border border-mono-200 rounded-md text-mono-700">
      {parameterTypes.find(t => t.value === parameter.type)?.label || parameter.type}
    </div>
    {#if showRequired}
      <div class="px-2 py-1 text-sm text-mono-600">
        {parameter.required ? 'Required' : 'Optional'}
      </div>
    {/if}
  {/if}

  <!-- Delete Button (if onDelete is provided) -->
  {#if onDelete}
    <button
      type="button"
      onclick={onDelete}
      class="text-red-700 hover:text-red-600 transition-colors"
      aria-label="Delete parameter"
    >
      <i class="fa-solid fa-xmark text-sm"></i>
    </button>
  {/if}
</div>

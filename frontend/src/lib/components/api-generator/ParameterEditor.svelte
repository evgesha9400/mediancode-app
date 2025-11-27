<script lang="ts">
  import type { EndpointParameter } from '$lib/types';

  export interface ParameterEditorProps {
    parameter: EndpointParameter;
    onUpdate: (updates: Partial<EndpointParameter>) => void;
    onDelete?: () => void;
  }

  interface Props extends ParameterEditorProps {}

  let { parameter, onUpdate, onDelete }: Props = $props();

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

<div class="flex items-center space-x-2 p-2 bg-mono-50 rounded border border-mono-200">
  <!-- Parameter Name -->
  <input
    type="text"
    value={parameter.name}
    oninput={(e) => onUpdate({ name: e.currentTarget.value })}
    placeholder="param_name"
    class="w-32 px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent"
  />

  <!-- Type Dropdown -->
  <select
    value={parameter.type}
    onchange={(e) => onUpdate({ type: e.currentTarget.value })}
    class="px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent {parameter.type === '' ? 'text-mono-400' : 'text-mono-700'}"
  >
    {#each parameterTypes as type (type.value)}
      <option value={type.value}>{type.label}</option>
    {/each}
  </select>

  <!-- Description -->
  <input
    type="text"
    value={parameter.description}
    oninput={(e) => onUpdate({ description: e.currentTarget.value })}
    placeholder="Description"
    class="flex-1 px-2 py-1 text-xs border border-mono-300 rounded focus:ring-2 focus:ring-mono-400 focus:border-transparent"
  />

  <!-- Required Toggle -->
  <label class="flex items-center space-x-1 cursor-pointer">
    <input
      type="checkbox"
      checked={parameter.required}
      onchange={(e) => onUpdate({ required: e.currentTarget.checked })}
      class="h-3 w-3 text-mono-900 border-mono-300 rounded"
    />
    <span class="text-xs text-mono-600 whitespace-nowrap">Required</span>
  </label>

  <!-- Delete Button (if onDelete is provided) -->
  {#if onDelete}
    <button
      type="button"
      onclick={onDelete}
      class="text-mono-400 hover:text-mono-600 transition-colors"
      aria-label="Delete parameter"
    >
      <i class="fa-solid fa-trash text-xs"></i>
    </button>
  {/if}
</div>

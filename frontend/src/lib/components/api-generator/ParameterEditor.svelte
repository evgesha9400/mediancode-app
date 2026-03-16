<script module lang="ts">
  import type { TargetField } from '$lib/domain/paramInference';

  export interface ParameterEditorProps {
    paramName: string;
    fieldName: string;
    targetFields: TargetField[];
    onFieldSelect: (fieldName: string) => void;
  }
</script>

<script lang="ts">
  interface Props extends ParameterEditorProps {}

  let { paramName, fieldName, targetFields, onFieldSelect }: Props = $props();

  // Find the currently selected field
  const selectedField = $derived(targetFields.find(f => f.name === fieldName));

  // Derived type (read-only display)
  const derivedType = $derived(selectedField?.type ?? '');
</script>

<div class="flex items-center space-x-2 py-1.5">
  <!-- Param name (read-only, extracted from path) -->
  <div class="w-32 px-2 py-1 text-xs bg-mono-800 border border-mono-700 text-mono-300 font-mono shrink-0">
    {paramName}
  </div>

  <!-- Field selector (dropdown from target object fields) -->
  <div class="flex-1">
    <select
      value={fieldName}
      onchange={(e) => onFieldSelect((e.target as HTMLSelectElement).value)}
      class="w-full px-2 py-1 text-xs border border-mono-600 bg-mono-900 text-mono-100 focus:ring-2 focus:ring-green-400 focus:border-transparent"
    >
      <option value="">Select field...</option>
      {#each targetFields as f (f.name)}
        <option value={f.name}>
          {f.name} ({f.type}){f.isPk ? ' [PK]' : ''}
        </option>
      {/each}
    </select>
  </div>

  <!-- Derived type (read-only) -->
  {#if derivedType}
    <div class="shrink-0">
      <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded">{derivedType}</span>
    </div>
  {/if}

  <!-- Operator (always eq for path params, shown as read-only label) -->
  <div class="shrink-0">
    <span class="text-xs text-mono-400 bg-mono-800 px-1.5 py-0.5 rounded">eq</span>
  </div>
</div>

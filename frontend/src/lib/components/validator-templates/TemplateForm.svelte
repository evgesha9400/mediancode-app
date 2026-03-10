<script module lang="ts">
  import type { FieldValidatorTemplate, ModelValidatorTemplate } from '$lib/types';
  import type { Field } from '$lib/types';

  export interface TemplateFormProps {
    /** 'field' or 'model' */
    kind: 'field' | 'model';
    /** The selected field validator template (when kind='field') */
    fieldTemplate?: FieldValidatorTemplate;
    /** The selected model validator template (when kind='model') */
    modelTemplate?: ModelValidatorTemplate;
    /** Available fields for role mapping (model validators only) */
    availableFields?: Field[];
    /** Called when form is submitted with template reference data */
    onAdd: (validator: { templateId: string; parameters?: Record<string, string>; fieldMappings?: Record<string, string> }) => void;
    /** Called to go back to the gallery */
    onBack: () => void;
  }
</script>

<script lang="ts">
  import { previewBody } from '$lib/utils/templatePreview';

  interface Props extends TemplateFormProps {}

  let {
    kind,
    fieldTemplate,
    modelTemplate,
    availableFields = [],
    onAdd,
    onBack
  }: Props = $props();

  // Parameter values (for templates with parameters)
  let params = $state<Record<string, string>>({});

  // Role mappings (for model validators)
  let mappings = $state<Record<string, string>>({});

  let template = $derived(kind === 'field' ? fieldTemplate : modelTemplate);
  let templateName = $derived(template?.name ?? '');
  let templateDescription = $derived(template?.description ?? '');

  // For model templates, check if all required fieldMappings are mapped
  let isValid = $derived.by(() => {
    if (kind === 'field') {
      const ft = fieldTemplate;
      if (!ft) return false;
      // Check required params
      for (const p of ft.parameters ?? []) {
        if (p.required && !params[p.key]?.trim()) return false;
      }
      return true;
    } else {
      const mt = modelTemplate;
      if (!mt) return false;
      // Check required fieldMappings
      for (const fm of mt.fieldMappings) {
        if (fm.required && !mappings[fm.key]?.trim()) return false;
      }
      // Check required params
      for (const p of mt.parameters ?? []) {
        if (p.required && !params[p.key]?.trim()) return false;
      }
      return true;
    }
  });

  function handleSubmit() {
    if (!isValid) return;

    if (kind === 'field' && fieldTemplate) {
      const nonEmptyParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '')
      );
      onAdd({
        templateId: fieldTemplate.id,
        parameters: Object.keys(nonEmptyParams).length > 0 ? nonEmptyParams : undefined
      });
    } else if (kind === 'model' && modelTemplate) {
      const nonEmptyParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '')
      );
      onAdd({
        templateId: modelTemplate.id,
        parameters: Object.keys(nonEmptyParams).length > 0 ? nonEmptyParams : undefined,
        fieldMappings: mappings
      });
    }
  }

  /** Filter available fields by role's compatible types */
  function fieldsForRole(compatibleTypes: string[]): Field[] {
    if (compatibleTypes.length === 0) return availableFields;
    return availableFields.filter(f => compatibleTypes.includes(f.type));
  }
</script>

<div class="space-y-3">
  <div class="flex items-center space-x-2">
    <button
      type="button"
      onclick={onBack}
      class="text-mono-400 hover:text-mono-300 transition-colors"
      title="Back to templates"
    >
      <i class="fa-solid fa-arrow-left"></i>
    </button>
    <h3 class="text-sm text-mono-300 font-medium">{templateName}</h3>
  </div>

  <p class="text-xs text-mono-400">{templateDescription}</p>

  <!-- Parameters (field validators) -->
  {#if kind === 'field' && fieldTemplate?.parameters}
    {#each fieldTemplate.parameters as param}
      <div>
        <label for="param-{param.key}" class="block text-xs text-mono-300 mb-1 font-medium">
          {param.label} {#if param.required}<span class="text-red-500">*</span>{/if}
        </label>
        {#if param.type === 'select' && param.options}
          <select
            id="param-{param.key}"
            bind:value={params[param.key]}
            class="w-full px-3 py-1.5 border border-mono-600 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent bg-mono-900 text-mono-100"
          >
            <option value="">Select...</option>
            {#each param.options as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        {:else}
          <input
            id="param-{param.key}"
            type={param.type}
            step={param.type === 'number' ? 'any' : undefined}
            bind:value={params[param.key]}
            placeholder={param.placeholder}
            class="w-full px-3 py-1.5 border border-mono-600 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent bg-mono-900 text-mono-100"
          />
        {/if}
      </div>
    {/each}
  {/if}

  <!-- Field mappings (model validators) -->
  {#if kind === 'model' && modelTemplate?.fieldMappings}
    {#each modelTemplate.fieldMappings as fm}
      {@const candidates = fieldsForRole(fm.compatibleTypes)}
      <div>
        <label for="role-{fm.key}" class="block text-xs text-mono-300 mb-1 font-medium">
          {fm.label} {#if fm.required}<span class="text-red-500">*</span>{/if}
        </label>
        <select
          id="role-{fm.key}"
          bind:value={mappings[fm.key]}
          class="w-full px-3 py-1.5 border border-mono-600 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent bg-mono-900 text-mono-100"
        >
          <option value="">Select a field...</option>
          {#each candidates as field}
            <option value={field.name}>{field.name} ({field.type})</option>
          {/each}
        </select>
      </div>
    {/each}
  {/if}

  <!-- Parameters for model templates -->
  {#if kind === 'model' && modelTemplate?.parameters}
    {#each modelTemplate.parameters as param}
      <div>
        <label for="mparam-{param.key}" class="block text-xs text-mono-300 mb-1 font-medium">
          {param.label} {#if param.required}<span class="text-red-500">*</span>{/if}
        </label>
        {#if param.type === 'select' && param.options}
          <select
            id="mparam-{param.key}"
            bind:value={params[param.key]}
            class="w-full px-3 py-1.5 border border-mono-600 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent bg-mono-900 text-mono-100"
          >
            <option value="">Select...</option>
            {#each param.options as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        {:else}
          <input
            id="mparam-{param.key}"
            type={param.type}
            step={param.type === 'number' ? 'any' : undefined}
            bind:value={params[param.key]}
            placeholder={param.placeholder}
            class="w-full px-3 py-1.5 border border-mono-600 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent bg-mono-900 text-mono-100"
          />
        {/if}
      </div>
    {/each}
  {/if}

  <!-- Code Preview -->
  {#if template?.bodyTemplate}
    {@const allMappings = { ...mappings, ...params }}
    <div>
      <span class="block text-xs text-mono-300 mb-1 font-medium">Code Preview</span>
      <pre class="p-3 bg-mono-900 text-mono-100 text-xs overflow-x-auto whitespace-pre font-mono">{previewBody(template.bodyTemplate, allMappings)}</pre>
    </div>
  {/if}

  <!-- Add button -->
  <button
    type="button"
    onclick={handleSubmit}
    disabled={!isValid}
    class="w-full px-4 py-2 bg-green-400 text-mono-950 font-bold text-sm tracking-wide hover:bg-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
  >
    Add Validator
  </button>
</div>

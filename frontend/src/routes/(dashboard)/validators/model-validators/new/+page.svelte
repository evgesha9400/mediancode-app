<script lang="ts">
  import { goto } from '$app/navigation';
  import { Tooltip, ValidatorMultiSelect, ValidatorCodeEditor } from '$lib/components';
  import { fieldsStore } from '$lib/stores/fields';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import { showToast } from '$lib/stores/toasts';
  import { createModelValidatorAction } from '$lib/domain/mutations';
  import {
    type ModelValidatorTemplate,
    blankModelValidatorTemplate,
    modelValidatorTemplates,
  } from '$lib/utils/validatorTemplates';

  // ============================================================================
  // STATE
  // ============================================================================

  let currentView = $state<'gallery' | 'editor'>('gallery');
  let copySuccess = $state(false);
  let isSaving = $state(false);

  // Editor state
  let validatorName = $state('');
  let validatorDescription = $state('');
  let validatorRequiredFields = $state<string[]>([]);
  let validatorMode = $state<'before' | 'after'>('after');
  let validatorCode = $state('');

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  // Dynamic field options from store (namespace-filtered, deduplicated, sorted)
  let fieldOptions = $derived.by(() => {
    const names = $fieldsStore
      .filter(f => f.namespaceId === $activeNamespaceId)
      .map(f => f.name);
    return [...new Set(names)].sort();
  });

  let functionName = $derived.by(() => {
    if (!validatorName.trim()) return 'validate_model';
    const slug = validatorName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    return `validate_${slug}`;
  });

  let needsReImport = $derived(
    /\bre\.(match|search|sub|findall|finditer|fullmatch|split|compile)\b/.test(validatorCode)
  );

  const TYPE_TO_PYTHON: Record<string, string> = {
    str: 'str', int: 'int', float: 'float', bool: 'bool',
    datetime: 'datetime', uuid: 'UUID', Any: 'Any',
  };

  // Build the example class fields from required fields
  let exampleClassLines = $derived.by(() => {
    if (validatorRequiredFields.length === 0) return [];
    const lines: string[] = [];
    for (const fieldName of validatorRequiredFields) {
      const field = $fieldsStore.find(f => f.name === fieldName && f.namespaceId === $activeNamespaceId);
      const pyType = field ? (TYPE_TO_PYTHON[field.type] ?? field.type) : 'Any';
      lines.push(`    ${fieldName}: ${pyType}`);
    }
    return lines;
  });

  // Collect extra imports needed for the example class
  let classImports = $derived.by(() => {
    const imports = new Set<string>();
    for (const fieldName of validatorRequiredFields) {
      const field = $fieldsStore.find(f => f.name === fieldName && f.namespaceId === $activeNamespaceId);
      if (field) {
        if (field.type === 'datetime') imports.add('from datetime import datetime');
        if (field.type === 'uuid') imports.add('from uuid import UUID');
        if (field.type === 'Any') imports.add('from typing import Any');
      } else {
        imports.add('from typing import Any');
      }
    }
    return imports;
  });

  let wrapperCode = $derived.by(() => {
    const lines: string[] = [];

    lines.push('from pydantic import model_validator, BaseModel');
    if (validatorMode === 'after') {
      lines.push('from typing import Self');
    } else {
      lines.push('from typing import Any');
    }
    if (needsReImport) lines.push('import re');

    for (const imp of classImports) {
      if (!lines.includes(imp)) lines.push(imp);
    }

    lines.push('');
    lines.push('class ExampleModel(BaseModel):');
    if (exampleClassLines.length > 0) {
      for (const cl of exampleClassLines) {
        lines.push(cl);
      }
    } else {
      lines.push('    pass');
    }
    lines.push('');

    lines.push(`    @model_validator(mode='${validatorMode}')`);
    if (validatorMode === 'after') {
      lines.push(`    def ${functionName}(self) -> Self:`);
    } else {
      lines.push('    @classmethod');
      lines.push(`    def ${functionName}(cls, data: dict[str, Any]) -> dict[str, Any]:`);
    }

    return lines.join('\n');
  });

  let fullCode = $derived(wrapperCode + '\n' + validatorCode);
  let canSave = $derived(validatorName.trim() !== '' && validatorCode.trim() !== '');

  // Mode-aware info display
  let modeInfoLabel = $derived(validatorMode === 'after' ? 'self' : 'data: dict');
  let modeInfoTooltip = $derived(
    validatorMode === 'after'
      ? 'Receives the fully constructed model instance'
      : 'Receives raw input data as a dictionary'
  );

  // ============================================================================
  // HELPERS
  // ============================================================================

  function selectTemplate(template: ModelValidatorTemplate) {
    validatorName = template.name;
    validatorDescription = template.description;
    validatorRequiredFields = [...template.requiredFields];
    validatorMode = template.mode;
    validatorCode = template.code;
    copySuccess = false;
    currentView = 'editor';
  }

  async function copyFullCode() {
    try {
      await navigator.clipboard.writeText(fullCode);
      copySuccess = true;
      setTimeout(() => { copySuccess = false; }, 2000);
    } catch {
      // Fallback: user can manually copy
    }
  }

  async function handleSave() {
    if (!canSave || isSaving) return;

    isSaving = true;
    const result = await createModelValidatorAction({
      namespaceId: $activeNamespaceId,
      name: validatorName.trim(),
      description: validatorDescription.trim(),
      requiredFields: validatorRequiredFields,
      mode: validatorMode,
      code: validatorCode
    });

    isSaving = false;

    if (result.success) {
      showToast(`Model validator "${validatorName}" created successfully`, 'success', 3000);
      goto('/validators/model-validators');
    } else {
      showToast(result.error || 'Failed to create model validator', 'error', 5000);
    }
  }
</script>

<!-- ======================================================================== -->
<!-- GALLERY VIEW                                                             -->
<!-- ======================================================================== -->

{#if currentView === 'gallery'}
  <div class="bg-white border-b border-mono-200 py-4 px-6">
    <div class="flex justify-between items-center">
      <div>
        <button
          type="button"
          onclick={() => goto('/validators/model-validators')}
          class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-2"
        >
          <i class="fa-solid fa-arrow-left text-xs"></i>
          <span>Back to Model Validators</span>
        </button>
        <h1 class="text-xl font-semibold text-mono-900">Model Validator Templates</h1>
      </div>
      <div class="flex items-center space-x-4">
        <button
          type="button"
          onclick={() => selectTemplate(blankModelValidatorTemplate)}
          class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
        >
          <i class="fa-solid fa-plus"></i>
          <span>Start from Scratch</span>
        </button>
      </div>
    </div>
  </div>

  <div class="p-6">
    <p class="text-sm text-mono-500 mb-6 max-w-2xl">
      Choose a validator pattern to start from, then customize the Python code directly.
      Each template generates a Pydantic
      <code class="px-1.5 py-0.5 bg-mono-100 rounded text-mono-700 text-xs font-mono">@model_validator</code>
      that validates cross-field logic on the entire model.
    </p>

    <div class="bg-white border border-mono-200 rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-mono-200">
        <thead class="bg-mono-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">Template</th>
            <th class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">Default Mode</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-mono-200">
          {#each modelValidatorTemplates as template (template.id)}
            <tr
              onclick={() => selectTemplate(template)}
              class="group cursor-pointer transition-colors hover:bg-mono-50"
            >
              <td class="px-6 py-4">
                <div class="flex items-center space-x-4">
                  <div class="w-9 h-9 rounded-full bg-mono-100 flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid {template.icon} text-mono-500 text-sm"></i>
                  </div>
                  <div>
                    <div class="text-sm text-mono-900 font-medium">{template.name}</div>
                    <div class="text-xs text-mono-500 mt-0.5">{template.description}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-0.5 text-xs rounded-full {template.mode === 'before' ? 'bg-mono-800 text-white' : 'bg-mono-200 text-mono-700'}">
                  {template.mode}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <span class="text-xs text-mono-400 group-hover:text-mono-600 transition-colors">
                  Use template <i class="fa-solid fa-arrow-right ml-1"></i>
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

<!-- ======================================================================== -->
<!-- EDITOR VIEW                                                              -->
<!-- ======================================================================== -->

{:else}
  <div class="flex flex-col flex-1 overflow-hidden">
    <!-- HEADER -->
    <div class="bg-white border-b border-mono-200 py-4 px-6 flex-shrink-0">
      <div class="flex justify-between items-start">
        <div>
          <button
            onclick={() => { currentView = 'gallery'; }}
            class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-2"
          >
            <i class="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Templates</span>
          </button>
          <h1 class="text-xl font-semibold text-mono-900">Model Validator Editor</h1>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={copyFullCode}
            class="px-4 py-2 border rounded-md flex items-center space-x-2 transition-colors
                   {copySuccess
                     ? 'bg-mono-900 text-white border-mono-900'
                     : 'border-mono-300 text-mono-700 hover:bg-mono-50'}"
          >
            {#if copySuccess}
              <i class="fa-solid fa-check text-xs"></i>
              <span>Copied!</span>
            {:else}
              <i class="fa-solid fa-copy text-xs"></i>
              <span>Copy Code</span>
            {/if}
          </button>
          <Tooltip text="Coming soon" position="bottom">
            <button
              type="button"
              disabled
              class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2
                     opacity-50 cursor-not-allowed"
            >
              <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
              <span>Build with AI</span>
            </button>
          </Tooltip>
          <button
            type="button"
            onclick={handleSave}
            disabled={!canSave || isSaving}
            class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 transition-colors
                   {canSave && !isSaving ? 'hover:bg-mono-800 cursor-pointer' : 'opacity-50 cursor-not-allowed'}"
          >
            {#if isSaving}
              <i class="fa-solid fa-spinner fa-spin text-xs"></i>
              <span>Saving...</span>
            {:else}
              <i class="fa-solid fa-floppy-disk text-xs"></i>
              <span>Save</span>
            {/if}
          </button>
        </div>
      </div>
    </div>

    <!-- METADATA BAR -->
    <div class="bg-white border-b border-mono-200 px-6 py-4 flex-shrink-0">
      <div class="grid grid-cols-12 gap-4 items-start">
        <div class="col-span-3">
          <label for="validator-name" class="block text-xs font-medium text-mono-500 mb-1">Name <span class="text-red-500">*</span></label>
          <input
            id="validator-name"
            type="text"
            bind:value={validatorName}
            placeholder="e.g. Date Range Check"
            class="w-full px-2.5 py-1.5 text-sm border border-mono-200 rounded-md
                   focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                   placeholder:text-mono-300"
          />
        </div>

        <ValidatorMultiSelect
          label="Required Fields"
          bind:selectedItems={validatorRequiredFields}
          options={fieldOptions}
          placeholder="Select fields..."
          inputId="field-search"
        />

        <div class="col-span-2">
          <label for="validator-mode" class="block text-xs font-medium text-mono-500 mb-1">Mode</label>
          <select
            id="validator-mode"
            bind:value={validatorMode}
            class="w-full px-2.5 py-1.5 text-sm border border-mono-200 rounded-md bg-white
                   focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                   font-mono"
          >
            <option value="before">before</option>
            <option value="after">after</option>
          </select>
        </div>

        <div class="col-span-3">
          <label for="validator-description" class="block text-xs font-medium text-mono-500 mb-1">Description</label>
          <input
            id="validator-description"
            type="text"
            bind:value={validatorDescription}
            placeholder="What does this validator do?"
            class="w-full px-2.5 py-1.5 text-sm border border-mono-200 rounded-md
                   focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                   placeholder:text-mono-300"
          />
        </div>
      </div>
    </div>

    <!-- CODE EDITOR -->
    <ValidatorCodeEditor
      {wrapperCode}
      bind:validatorCode
      {functionName}
      {needsReImport}
      infoLabel={modeInfoLabel}
      infoTooltip={modeInfoTooltip}
      isReady={currentView === 'editor'}
    />
  </div>
{/if}

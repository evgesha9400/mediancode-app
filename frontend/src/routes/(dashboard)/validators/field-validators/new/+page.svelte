<script lang="ts">
  import { goto } from '$app/navigation';
  import { Tooltip, ValidatorMultiSelect, ValidatorCodeEditor } from '$lib/components';
  import { typesStore } from '$lib/stores/types';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import { showToast } from '$lib/stores/toasts';
  import { createFieldValidatorAction } from '$lib/domain/mutations';
  import {
    type FieldValidatorTemplate,
    blankFieldValidatorTemplate,
    fieldValidatorTemplates,
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
  let validatorCompatibleTypes = $state<string[]>([]);
  let validatorMode = $state<'before' | 'after'>('after');
  let validatorCode = $state('');

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  // Dynamic type options from store (root types plus 'Any')
  let typeOptions = $derived.by(() => {
    const rootTypes = $typesStore
      .filter(t => t.parentTypeId === null)
      .map(t => t.name);
    return [...rootTypes, 'Any'];
  });

  let functionName = $derived.by(() => {
    if (!validatorName.trim()) return 'validate_field';
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

  let typeAnnotation = $derived.by(() => {
    if (validatorCompatibleTypes.length === 0) return '';
    const pyTypes = validatorCompatibleTypes
      .map(t => TYPE_TO_PYTHON[t] ?? t)
      .filter(Boolean);
    if (pyTypes.length === 0) return '';
    return ': ' + pyTypes.join(' | ');
  });

  let wrapperCode = $derived.by(() => {
    const lines: string[] = [];
    lines.push('from pydantic import field_validator');
    if (needsReImport) lines.push('import re');
    if (validatorCompatibleTypes.includes('Any')) lines.push('from typing import Any');
    if (validatorCompatibleTypes.includes('datetime')) lines.push('from datetime import datetime');
    if (validatorCompatibleTypes.includes('uuid')) lines.push('from uuid import UUID');
    lines.push('');
    lines.push(`@field_validator('{field}', mode='${validatorMode}')`);
    lines.push('@classmethod');
    lines.push(`def ${functionName}(cls, v${typeAnnotation}):`);
    return lines.join('\n');
  });

  let fullCode = $derived(wrapperCode + '\n' + validatorCode);
  let canSave = $derived(validatorName.trim() !== '' && validatorCode.trim() !== '');

  // ============================================================================
  // HELPERS
  // ============================================================================

  function selectTemplate(template: FieldValidatorTemplate) {
    validatorName = template.name;
    validatorDescription = template.description;
    validatorCompatibleTypes = [...template.compatibleTypes];
    validatorMode = template.mode;
    validatorCode = template.code;
    copySuccess = false;
    currentView = 'editor';
  }

  function toggleType(type: string) {
    if (type === 'Any') {
      validatorCompatibleTypes = validatorCompatibleTypes.includes('Any') ? [] : ['Any'];
    } else {
      let current = validatorCompatibleTypes.filter(t => t !== 'Any');
      if (current.includes(type)) {
        current = current.filter(t => t !== type);
      } else {
        current = [...current, type];
      }
      validatorCompatibleTypes = current;
    }
  }

  function isTypeDimmed(type: string): boolean {
    return validatorCompatibleTypes.includes('Any') && type !== 'Any';
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
    const result = await createFieldValidatorAction({
      namespaceId: $activeNamespaceId,
      name: validatorName.trim(),
      description: validatorDescription.trim(),
      compatibleTypes: validatorCompatibleTypes,
      mode: validatorMode,
      code: validatorCode
    });

    isSaving = false;

    if (result.success) {
      showToast(`Field validator "${validatorName}" created successfully`, 'success', 3000);
      goto('/validators/field-validators');
    } else {
      showToast(result.error || 'Failed to create field validator', 'error', 5000);
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
          onclick={() => goto('/validators/field-validators')}
          class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-2"
        >
          <i class="fa-solid fa-arrow-left text-xs"></i>
          <span>Back to Field Validators</span>
        </button>
        <h1 class="text-xl font-semibold text-mono-900">Field Validator Templates</h1>
      </div>
      <div class="flex items-center space-x-4">
        <button
          type="button"
          onclick={() => selectTemplate(blankFieldValidatorTemplate)}
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
      <code class="px-1.5 py-0.5 bg-mono-100 rounded text-mono-700 text-xs font-mono">@field_validator</code>
      with a reusable
      <code class="px-1.5 py-0.5 bg-mono-100 rounded text-mono-700 text-xs font-mono">{'{field}'}</code>
      placeholder.
    </p>

    <div class="bg-white border border-mono-200 rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-mono-200">
        <thead class="bg-mono-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">Template</th>
            <th class="px-6 py-3 text-left text-xs text-mono-500 tracking-wider font-medium">Compatible Types</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-mono-200">
          {#each fieldValidatorTemplates as template (template.id)}
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
                <div class="flex flex-wrap gap-1">
                  {#each template.compatibleTypes as type}
                    <span class="px-2 py-0.5 text-xs rounded-full bg-mono-200 text-mono-700">{type}</span>
                  {/each}
                </div>
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
          <h1 class="text-xl font-semibold text-mono-900">Field Validator Editor</h1>
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
            placeholder="e.g. String Cleanup"
            class="w-full px-2.5 py-1.5 text-sm border border-mono-200 rounded-md
                   focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                   placeholder:text-mono-300"
          />
        </div>

        <ValidatorMultiSelect
          label="Compatible Types"
          bind:selectedItems={validatorCompatibleTypes}
          options={typeOptions}
          placeholder="Select types..."
          inputId="type-search"
          isDimmed={isTypeDimmed}
          onToggle={toggleType}
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
      infoLabel="{'{field}'}"
      infoTooltip="Field name is injected when this validator is attached to a field"
      isReady={currentView === 'editor'}
    />
  </div>
{/if}

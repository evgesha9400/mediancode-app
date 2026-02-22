<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Tooltip, ValidatorMultiSelect, ValidatorCodeEditor } from '$lib/components';
  import { fieldsStore } from '$lib/stores/fields';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import { modelValidatorsStore, getModelValidatorById } from '$lib/stores/modelValidators';
  import { showToast } from '$lib/stores/toasts';
  import { updateModelValidatorAction, deleteModelValidatorAction } from '$lib/domain/mutations';
  import { getModelValidator } from '$lib/api/modelValidators';

  // ============================================================================
  // STATE
  // ============================================================================

  let isLoading = $state(true);
  let loadError = $state('');
  let copySuccess = $state(false);
  let isSaving = $state(false);
  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);

  // Editor state
  let validatorName = $state('');
  let validatorDescription = $state('');
  let validatorRequiredFields = $state<string[]>([]);
  let validatorMode = $state<'before' | 'after'>('after');
  let validatorCode = $state('');
  let validatorUsedInObjects = $state(0);

  // Original values for change tracking
  let originalName = $state('');
  let originalDescription = $state('');
  let originalRequiredFields = $state<string[]>([]);
  let originalMode = $state<'before' | 'after'>('after');
  let originalCode = $state('');

  // ============================================================================
  // LOAD VALIDATOR
  // ============================================================================

  const validatorId = page.params.id as string;

  $effect(() => {
    const fromStore = getModelValidatorById(validatorId);
    if (fromStore) {
      populateFields(fromStore);
      isLoading = false;
    } else {
      getModelValidator(validatorId)
        .then((mv) => {
          modelValidatorsStore.update(mvs => [...mvs, mv]);
          populateFields(mv);
          isLoading = false;
        })
        .catch(() => {
          loadError = 'Model validator not found';
          isLoading = false;
        });
    }
  });

  function populateFields(mv: { name: string; description: string; requiredFields: string[]; mode: 'before' | 'after'; code: string; usedInObjects: number }) {
    validatorName = mv.name;
    validatorDescription = mv.description;
    validatorRequiredFields = [...mv.requiredFields];
    validatorMode = mv.mode;
    validatorCode = mv.code;
    validatorUsedInObjects = mv.usedInObjects;

    originalName = mv.name;
    originalDescription = mv.description;
    originalRequiredFields = [...mv.requiredFields];
    originalMode = mv.mode;
    originalCode = mv.code;
  }

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

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

  let hasChanges = $derived(
    validatorName !== originalName ||
    validatorDescription !== originalDescription ||
    JSON.stringify(validatorRequiredFields) !== JSON.stringify(originalRequiredFields) ||
    validatorMode !== originalMode ||
    validatorCode !== originalCode
  );

  let canSave = $derived(validatorName.trim() !== '' && validatorCode.trim() !== '' && hasChanges);
  let canDelete = $derived(validatorUsedInObjects === 0);

  let modeInfoLabel = $derived(validatorMode === 'after' ? 'self' : 'data: dict');
  let modeInfoTooltip = $derived(
    validatorMode === 'after'
      ? 'Receives the fully constructed model instance'
      : 'Receives raw input data as a dictionary'
  );

  // ============================================================================
  // HELPERS
  // ============================================================================

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
    const result = await updateModelValidatorAction(validatorId, {
      name: validatorName.trim(),
      description: validatorDescription.trim(),
      requiredFields: validatorRequiredFields,
      mode: validatorMode,
      code: validatorCode
    });

    isSaving = false;

    if (result.success) {
      showToast(`Model validator "${validatorName}" updated successfully`, 'success', 3000);
      goto('/validators/model-validators');
    } else {
      showToast(result.error || 'Failed to update model validator', 'error', 5000);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;

    isDeleting = true;
    const result = await deleteModelValidatorAction(validatorId);
    isDeleting = false;

    if (result.success) {
      showToast(`Model validator "${validatorName}" deleted successfully`, 'success', 3000);
      goto('/validators/model-validators');
    } else {
      showToast(result.error || 'Failed to delete model validator', 'error', 5000);
      showDeleteConfirm = false;
    }
  }
</script>

<!-- ======================================================================== -->
<!-- LOADING / ERROR STATE                                                     -->
<!-- ======================================================================== -->

{#if isLoading}
  <div class="flex items-center justify-center flex-1">
    <div class="text-mono-400">
      <i class="fa-solid fa-spinner fa-spin mr-2"></i>
      Loading model validator...
    </div>
  </div>
{:else if loadError}
  <div class="flex-1 flex items-center justify-center">
    <div class="text-center">
      <i class="fa-solid fa-circle-exclamation text-4xl text-mono-400 mb-4"></i>
      <h2 class="text-xl text-mono-800 mb-2">Model Validator Not Found</h2>
      <p class="text-mono-500 mb-4">The model validator you're looking for doesn't exist or has been deleted.</p>
      <button
        type="button"
        onclick={() => goto('/validators/model-validators')}
        class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800"
      >
        Back to Model Validators
      </button>
    </div>
  </div>
{:else}

<!-- ======================================================================== -->
<!-- EDITOR VIEW                                                              -->
<!-- ======================================================================== -->

  <div class="flex flex-col flex-1 overflow-hidden">
    <!-- HEADER -->
    <div class="bg-white border-b border-mono-200 py-4 px-6 flex-shrink-0">
      <div class="flex justify-between items-start">
        <div>
          <button
            onclick={() => goto('/validators/model-validators')}
            class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-2"
          >
            <i class="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Model Validators</span>
          </button>
          <h1 class="text-xl font-semibold text-mono-900">Edit Model Validator</h1>
        </div>

        <div class="flex items-center gap-2">
          {#if !showDeleteConfirm}
            <Tooltip text={canDelete ? '' : `Used in ${validatorUsedInObjects} object${validatorUsedInObjects > 1 ? 's' : ''}`} position="bottom">
              <button
                type="button"
                onclick={() => { showDeleteConfirm = true; }}
                disabled={!canDelete}
                class="px-4 py-2 border rounded-md flex items-center space-x-2 transition-colors
                       {canDelete ? 'border-red-300 text-red-700 hover:bg-red-50 cursor-pointer' : 'border-mono-200 text-mono-400 cursor-not-allowed'}"
              >
                <i class="fa-solid fa-trash text-xs"></i>
                <span>Delete</span>
              </button>
            </Tooltip>
          {:else}
            <div class="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md">
              <span class="text-sm text-red-800">Delete this validator?</span>
              <button
                type="button"
                onclick={handleDelete}
                disabled={isDeleting}
                class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                onclick={() => { showDeleteConfirm = false; }}
                class="px-3 py-1 border border-mono-300 text-mono-700 rounded text-sm hover:bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          {/if}

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
          inputId="field-search-edit"
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
      isReady={!isLoading}
    />
  </div>
{/if}

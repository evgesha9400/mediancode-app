<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Tooltip, ValidatorMultiSelect, ValidatorCodeEditor } from '$lib/components';
  import { typesStore } from '$lib/stores/types';
  import { fieldValidatorsStore, getFieldValidatorById } from '$lib/stores/fieldValidators';
  import { showToast } from '$lib/stores/toasts';
  import { updateFieldValidatorAction, deleteFieldValidatorAction } from '$lib/domain/mutations';
  import { getFieldValidator } from '$lib/api/fieldValidators';

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
  let validatorCompatibleTypes = $state<string[]>([]);
  let validatorMode = $state<'before' | 'after'>('after');
  let validatorCode = $state('');
  let validatorUsedInFields = $state(0);

  // Original values for change tracking
  let originalName = $state('');
  let originalDescription = $state('');
  let originalCompatibleTypes = $state<string[]>([]);
  let originalMode = $state<'before' | 'after'>('after');
  let originalCode = $state('');

  // ============================================================================
  // LOAD VALIDATOR
  // ============================================================================

  const validatorId = page.params.id as string;

  $effect(() => {
    const fromStore = getFieldValidatorById(validatorId);
    if (fromStore) {
      populateFields(fromStore);
      isLoading = false;
    } else {
      getFieldValidator(validatorId)
        .then((fv) => {
          fieldValidatorsStore.update(fvs => [...fvs, fv]);
          populateFields(fv);
          isLoading = false;
        })
        .catch(() => {
          loadError = 'Field validator not found';
          isLoading = false;
        });
    }
  });

  function populateFields(fv: { name: string; description: string; compatibleTypes: string[]; mode: 'before' | 'after'; code: string; usedInFields: number }) {
    validatorName = fv.name;
    validatorDescription = fv.description;
    validatorCompatibleTypes = [...fv.compatibleTypes];
    validatorMode = fv.mode;
    validatorCode = fv.code;
    validatorUsedInFields = fv.usedInFields;

    originalName = fv.name;
    originalDescription = fv.description;
    originalCompatibleTypes = [...fv.compatibleTypes];
    originalMode = fv.mode;
    originalCode = fv.code;
  }

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

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

  let hasChanges = $derived(
    validatorName !== originalName ||
    validatorDescription !== originalDescription ||
    JSON.stringify(validatorCompatibleTypes) !== JSON.stringify(originalCompatibleTypes) ||
    validatorMode !== originalMode ||
    validatorCode !== originalCode
  );

  let canSave = $derived(validatorName.trim() !== '' && validatorCode.trim() !== '' && hasChanges);
  let canDelete = $derived(validatorUsedInFields === 0);

  // ============================================================================
  // HELPERS
  // ============================================================================

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
    const result = await updateFieldValidatorAction(validatorId, {
      name: validatorName.trim(),
      description: validatorDescription.trim(),
      compatibleTypes: validatorCompatibleTypes,
      mode: validatorMode,
      code: validatorCode
    });

    isSaving = false;

    if (result.success) {
      showToast(`Field validator "${validatorName}" updated successfully`, 'success', 3000);
      goto('/validators/field-validators');
    } else {
      showToast(result.error || 'Failed to update field validator', 'error', 5000);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;

    isDeleting = true;
    const result = await deleteFieldValidatorAction(validatorId);
    isDeleting = false;

    if (result.success) {
      showToast(`Field validator "${validatorName}" deleted successfully`, 'success', 3000);
      goto('/validators/field-validators');
    } else {
      showToast(result.error || 'Failed to delete field validator', 'error', 5000);
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
      Loading field validator...
    </div>
  </div>
{:else if loadError}
  <div class="flex-1 flex items-center justify-center">
    <div class="text-center">
      <i class="fa-solid fa-circle-exclamation text-4xl text-mono-400 mb-4"></i>
      <h2 class="text-xl text-mono-800 mb-2">Field Validator Not Found</h2>
      <p class="text-mono-500 mb-4">The field validator you're looking for doesn't exist or has been deleted.</p>
      <button
        type="button"
        onclick={() => goto('/validators/field-validators')}
        class="px-4 py-2 bg-mono-900 text-white rounded-md hover:bg-mono-800"
      >
        Back to Field Validators
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
            onclick={() => goto('/validators/field-validators')}
            class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-2"
          >
            <i class="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Field Validators</span>
          </button>
          <h1 class="text-xl font-semibold text-mono-900">Edit Field Validator</h1>
        </div>

        <div class="flex items-center gap-2">
          {#if !showDeleteConfirm}
            <Tooltip text={canDelete ? '' : `Used in ${validatorUsedInFields} field${validatorUsedInFields > 1 ? 's' : ''}`} position="bottom">
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
          inputId="type-search-edit"
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
      isReady={!isLoading}
    />
  </div>
{/if}

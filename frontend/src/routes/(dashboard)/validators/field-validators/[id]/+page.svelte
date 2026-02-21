<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { PageHeader, Tooltip } from '$lib/components';
  import { typesStore } from '$lib/stores/types';
  import { fieldValidatorsStore, getFieldValidatorById } from '$lib/stores/fieldValidators';
  import { showToast } from '$lib/stores/toasts';
  import { updateFieldValidatorAction, deleteFieldValidatorAction } from '$lib/domain/mutations';
  import { getFieldValidator } from '$lib/api/fieldValidators';

  // CodeMirror
  import {
    type EditorView,
    type Compartment,
    createSplitEditor,
    updateWrapperContent,
    updateBodyLineNumbers,
  } from '$lib/utils/codemirror';

  // ============================================================================
  // STATE
  // ============================================================================

  let isLoading = $state(true);
  let loadError = $state('');
  let copySuccess = $state(false);
  let isSaving = $state(false);
  let showDeleteConfirm = $state(false);
  let isDeleting = $state(false);

  // Editor state — these are populated from the loaded validator
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

  // Type dropdown state
  let typeDropdownOpen = $state(false);
  let typeSearchQuery = $state('');
  let typeHighlightIndex = $state(0);
  let typeBlurTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // CodeMirror DOM mount points
  let wrapperEditorEl = $state<HTMLDivElement | null>(null);
  let bodyEditorEl = $state<HTMLDivElement | null>(null);

  // CodeMirror instances (managed imperatively, not reactive)
  let wrapperView: EditorView | null = null;
  let bodyView: EditorView | null = null;
  let bodyLineNumCompartment: Compartment | null = null;

  // ============================================================================
  // LOAD VALIDATOR
  // ============================================================================

  const validatorId = page.params.id as string;

  $effect(() => {
    // Try to load from store first, then fall back to API
    const fromStore = getFieldValidatorById(validatorId);
    if (fromStore) {
      populateFields(fromStore);
      isLoading = false;
    } else {
      // Fetch from API
      getFieldValidator(validatorId)
        .then((fv) => {
          // Add to store for future lookups
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

    // Store originals for change tracking
    originalName = fv.name;
    originalDescription = fv.description;
    originalCompatibleTypes = [...fv.compatibleTypes];
    originalMode = fv.mode;
    originalCode = fv.code;
  }

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

  let filteredTypeOptions = $derived.by(() => {
    const q = typeSearchQuery.toLowerCase().trim();
    if (!q) return typeOptions;
    return typeOptions.filter(t => t.toLowerCase().includes(q));
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

  let wrapperLineCount = $derived(wrapperCode.split('\n').length);
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
  // CODEMIRROR LIFECYCLE
  // ============================================================================

  // Create split editor when loaded
  $effect(() => {
    if (isLoading || !wrapperEditorEl || !bodyEditorEl) return;

    const result = createSplitEditor(
      {
        wrapperDoc: untrack(() => wrapperCode),
        bodyDoc: untrack(() => validatorCode),
        onBodyChange: (content) => { validatorCode = content; },
      },
      wrapperEditorEl,
      bodyEditorEl,
    );
    wrapperView = result.wrapperView;
    bodyView = result.bodyView;
    bodyLineNumCompartment = result.bodyLineNumCompartment;

    return () => {
      result.destroy();
      wrapperView = null;
      bodyView = null;
    };
  });

  // Update wrapper content when name/mode/imports change
  $effect(() => {
    if (wrapperView) updateWrapperContent(wrapperView, wrapperCode);
  });

  // Update body line number offset when wrapper line count changes
  $effect(() => {
    if (bodyView && bodyLineNumCompartment) {
      updateBodyLineNumbers(bodyView, bodyLineNumCompartment, wrapperLineCount);
    }
  });

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

  function openTypeDropdown() {
    if (typeBlurTimeoutId) {
      clearTimeout(typeBlurTimeoutId);
      typeBlurTimeoutId = null;
    }
    typeDropdownOpen = true;
    typeHighlightIndex = 0;
  }

  function closeTypeDropdown() {
    typeDropdownOpen = false;
    typeSearchQuery = '';
    typeHighlightIndex = 0;
  }

  function handleTypeBlur() {
    typeBlurTimeoutId = setTimeout(() => {
      closeTypeDropdown();
      typeBlurTimeoutId = null;
    }, 150);
  }

  function handleTypeKeydown(e: KeyboardEvent) {
    if (!typeDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openTypeDropdown();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        typeHighlightIndex = Math.min(typeHighlightIndex + 1, filteredTypeOptions.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        typeHighlightIndex = Math.max(typeHighlightIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredTypeOptions[typeHighlightIndex]) {
          toggleType(filteredTypeOptions[typeHighlightIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeTypeDropdown();
        break;
    }
  }

  function removeType(type: string) {
    validatorCompatibleTypes = validatorCompatibleTypes.filter(t => t !== type);
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
    <!-- ================================================================ -->
    <!-- HEADER                                                            -->
    <!-- ================================================================ -->
    <div class="bg-white border-b border-mono-200 py-4 px-6 flex-shrink-0">
      <div class="flex justify-between items-start">
        <!-- Left side: back button + title -->
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

        <!-- Right side: action buttons -->
        <div class="flex items-center gap-2">
          <!-- Delete -->
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

    <!-- ================================================================ -->
    <!-- METADATA BAR                                                     -->
    <!-- ================================================================ -->
    <div class="bg-white border-b border-mono-200 px-6 py-4 flex-shrink-0">
      <div class="grid grid-cols-12 gap-4 items-start">
        <!-- Name -->
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

        <!-- Compatible Types -->
        <div class="col-span-4 relative">
          <label for="type-search-edit" class="block text-xs font-medium text-mono-500 mb-1">Compatible Types</label>
          <div
            class="flex flex-wrap items-center gap-1 min-h-[34px] px-2 py-1 border border-mono-200 rounded-md
                   bg-white cursor-text
                   {typeDropdownOpen ? 'ring-1 ring-mono-400 border-mono-400' : ''}"
            onclick={() => { openTypeDropdown(); document.getElementById('type-search-edit')?.focus(); }}
            role="presentation"
          >
            {#each validatorCompatibleTypes as type}
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono rounded bg-mono-800 text-white">
                {type}
                <button
                  type="button"
                  onclick={(e) => { e.stopPropagation(); removeType(type); }}
                  class="hover:text-mono-300 transition-colors leading-none"
                  aria-label="Remove {type}"
                >
                  <i class="fa-solid fa-xmark text-[9px]"></i>
                </button>
              </span>
            {/each}
            <input
              id="type-search-edit"
              type="text"
              bind:value={typeSearchQuery}
              onfocus={openTypeDropdown}
              onblur={handleTypeBlur}
              onkeydown={handleTypeKeydown}
              placeholder={validatorCompatibleTypes.length === 0 ? 'Select types...' : ''}
              class="flex-1 min-w-[60px] text-xs font-mono bg-transparent border-none outline-none
                     placeholder:text-mono-300 py-0.5"
            />
          </div>
          {#if typeDropdownOpen}
            <div class="absolute z-20 w-full mt-1 bg-white border border-mono-200 rounded-md shadow-lg max-h-48 overflow-auto">
              {#if filteredTypeOptions.length === 0}
                <div class="px-3 py-2 text-xs text-mono-400">No types match "{typeSearchQuery}"</div>
              {:else}
                {#each filteredTypeOptions as type, i (type)}
                  <button
                    type="button"
                    onmousedown={(e) => { e.preventDefault(); toggleType(type); }}
                    class="w-full px-3 py-1.5 text-left text-xs font-mono flex items-center justify-between
                           transition-colors border-b border-mono-100 last:border-b-0
                           {i === typeHighlightIndex ? 'bg-mono-50' : 'hover:bg-mono-50'}
                           {isTypeDimmed(type) ? 'text-mono-300' : 'text-mono-700'}"
                  >
                    <span>{type}</span>
                    {#if validatorCompatibleTypes.includes(type)}
                      <i class="fa-solid fa-check text-[10px] text-mono-500"></i>
                    {/if}
                  </button>
                {/each}
              {/if}
            </div>
          {/if}
        </div>

        <!-- Mode -->
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

        <!-- Description -->
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

    <!-- ================================================================ -->
    <!-- CODE EDITOR                                                      -->
    <!-- ================================================================ -->
    <div class="flex-1 bg-mono-900 flex flex-col overflow-hidden min-h-0">
      <!-- Editor header bar -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-mono-800 border-b border-mono-700 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-code text-xs text-mono-400"></i>
            <span class="text-xs text-mono-400 font-mono">{functionName}.py</span>
          </div>
          <!-- {field} placeholder info -->
          <div class="relative group/info">
            <div class="flex items-center gap-1 px-2 py-0.5 rounded bg-mono-700/50 cursor-help">
              <i class="fa-solid fa-circle-info text-[10px] text-mono-500"></i>
              <span class="text-[10px] text-mono-500 font-mono">{'{field}'}</span>
            </div>
            <div class="absolute bottom-full left-0 mb-2 px-3 py-2 bg-mono-800 border border-mono-600 rounded-md
                        text-xs text-mono-300 whitespace-nowrap opacity-0 group-hover/info:opacity-100
                        transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
              Field name is injected when this validator is attached to a field
              <div class="absolute top-full left-4 w-2 h-2 bg-mono-800 border-r border-b border-mono-600 transform rotate-45 -mt-1"></div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-[10px] text-mono-500 font-mono">
          {#if needsReImport}
            <span class="px-1.5 py-0.5 rounded bg-mono-700/50 text-mono-400">
              <i class="fa-solid fa-cube text-[9px] mr-1"></i>re
            </span>
          {/if}
        </div>
      </div>

      <!-- CodeMirror editors -->
      <div class="flex-1 flex flex-col overflow-hidden min-h-0">
        <!-- Read-only wrapper (imports + decorator + signature) -->
        <div bind:this={wrapperEditorEl} class="flex-shrink-0"></div>
        <!-- Editable body (function body) -->
        <div bind:this={bodyEditorEl} class="flex-1 min-h-0"></div>
      </div>
    </div>
  </div>
{/if}

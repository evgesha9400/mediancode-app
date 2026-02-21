<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { PageHeader, Tooltip } from '$lib/components';
  import { fieldsStore } from '$lib/stores/fields';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import { modelValidatorsStore, getModelValidatorById } from '$lib/stores/modelValidators';
  import { showToast } from '$lib/stores/toasts';
  import { updateModelValidatorAction, deleteModelValidatorAction } from '$lib/domain/mutations';
  import { getModelValidator } from '$lib/api/modelValidators';

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

  // Field dropdown state
  let fieldDropdownOpen = $state(false);
  let fieldSearchQuery = $state('');
  let fieldHighlightIndex = $state(0);
  let fieldBlurTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
    const fromStore = getModelValidatorById(validatorId);
    if (fromStore) {
      populateFields(fromStore);
      isLoading = false;
    } else {
      // Fetch from API
      getModelValidator(validatorId)
        .then((mv) => {
          // Add to store for future lookups
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

    // Store originals for change tracking
    originalName = mv.name;
    originalDescription = mv.description;
    originalRequiredFields = [...mv.requiredFields];
    originalMode = mv.mode;
    originalCode = mv.code;
  }

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

  let filteredFieldOptions = $derived.by(() => {
    const q = fieldSearchQuery.toLowerCase().trim();
    if (!q) return fieldOptions;
    return fieldOptions.filter(f => f.toLowerCase().includes(q));
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

    // Imports
    lines.push('from pydantic import model_validator, BaseModel');
    if (validatorMode === 'after') {
      lines.push('from typing import Self');
    } else {
      lines.push('from typing import Any');
    }
    if (needsReImport) lines.push('import re');

    // Extra imports from class fields
    for (const imp of classImports) {
      if (!lines.includes(imp)) lines.push(imp);
    }

    lines.push('');

    // Example class
    lines.push('class ExampleModel(BaseModel):');
    if (exampleClassLines.length > 0) {
      for (const cl of exampleClassLines) {
        lines.push(cl);
      }
    } else {
      lines.push('    pass');
    }
    lines.push('');

    // Decorator + signature
    lines.push(`    @model_validator(mode='${validatorMode}')`);
    if (validatorMode === 'after') {
      lines.push(`    def ${functionName}(self) -> Self:`);
    } else {
      lines.push('    @classmethod');
      lines.push(`    def ${functionName}(cls, data: dict[str, Any]) -> dict[str, Any]:`);
    }

    return lines.join('\n');
  });

  let wrapperLineCount = $derived(wrapperCode.split('\n').length);
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

  // Mode-aware info display
  let modeInfoLabel = $derived(validatorMode === 'after' ? 'self' : 'data: dict');
  let modeInfoTooltip = $derived(
    validatorMode === 'after'
      ? 'Receives the fully constructed model instance'
      : 'Receives raw input data as a dictionary'
  );

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

  function toggleField(fieldName: string) {
    if (validatorRequiredFields.includes(fieldName)) {
      validatorRequiredFields = validatorRequiredFields.filter(f => f !== fieldName);
    } else {
      validatorRequiredFields = [...validatorRequiredFields, fieldName];
    }
  }

  function openFieldDropdown() {
    if (fieldBlurTimeoutId) {
      clearTimeout(fieldBlurTimeoutId);
      fieldBlurTimeoutId = null;
    }
    fieldDropdownOpen = true;
    fieldHighlightIndex = 0;
  }

  function closeFieldDropdown() {
    fieldDropdownOpen = false;
    fieldSearchQuery = '';
    fieldHighlightIndex = 0;
  }

  function handleFieldBlur() {
    fieldBlurTimeoutId = setTimeout(() => {
      closeFieldDropdown();
      fieldBlurTimeoutId = null;
    }, 150);
  }

  function handleFieldKeydown(e: KeyboardEvent) {
    if (!fieldDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openFieldDropdown();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        fieldHighlightIndex = Math.min(fieldHighlightIndex + 1, filteredFieldOptions.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        fieldHighlightIndex = Math.max(fieldHighlightIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredFieldOptions[fieldHighlightIndex]) {
          toggleField(filteredFieldOptions[fieldHighlightIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeFieldDropdown();
        break;
    }
  }

  function removeField(fieldName: string) {
    validatorRequiredFields = validatorRequiredFields.filter(f => f !== fieldName);
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
    <!-- ================================================================ -->
    <!-- HEADER                                                            -->
    <!-- ================================================================ -->
    <div class="bg-white border-b border-mono-200 py-4 px-6 flex-shrink-0">
      <div class="flex justify-between items-start">
        <!-- Left side: back button + title -->
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

        <!-- Right side: action buttons -->
        <div class="flex items-center gap-2">
          <!-- Delete -->
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
            placeholder="e.g. Date Range Check"
            class="w-full px-2.5 py-1.5 text-sm border border-mono-200 rounded-md
                   focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                   placeholder:text-mono-300"
          />
        </div>

        <!-- Required Fields -->
        <div class="col-span-4 relative">
          <label for="field-search-edit" class="block text-xs font-medium text-mono-500 mb-1">Required Fields</label>
          <div
            class="flex flex-wrap items-center gap-1 min-h-[34px] px-2 py-1 border border-mono-200 rounded-md
                   bg-white cursor-text
                   {fieldDropdownOpen ? 'ring-1 ring-mono-400 border-mono-400' : ''}"
            onclick={() => { openFieldDropdown(); document.getElementById('field-search-edit')?.focus(); }}
            role="presentation"
          >
            {#each validatorRequiredFields as field}
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono rounded bg-mono-800 text-white">
                {field}
                <button
                  type="button"
                  onclick={(e) => { e.stopPropagation(); removeField(field); }}
                  class="hover:text-mono-300 transition-colors leading-none"
                  aria-label="Remove {field}"
                >
                  <i class="fa-solid fa-xmark text-[9px]"></i>
                </button>
              </span>
            {/each}
            <input
              id="field-search-edit"
              type="text"
              bind:value={fieldSearchQuery}
              onfocus={openFieldDropdown}
              onblur={handleFieldBlur}
              onkeydown={handleFieldKeydown}
              placeholder={validatorRequiredFields.length === 0 ? 'Select fields...' : ''}
              class="flex-1 min-w-[60px] text-xs font-mono bg-transparent border-none outline-none
                     placeholder:text-mono-300 py-0.5"
            />
          </div>
          {#if fieldDropdownOpen}
            <div class="absolute z-20 w-full mt-1 bg-white border border-mono-200 rounded-md shadow-lg max-h-48 overflow-auto">
              {#if filteredFieldOptions.length === 0}
                <div class="px-3 py-2 text-xs text-mono-400">No fields match "{fieldSearchQuery}"</div>
              {:else}
                {#each filteredFieldOptions as field, i (field)}
                  <button
                    type="button"
                    onmousedown={(e) => { e.preventDefault(); toggleField(field); }}
                    class="w-full px-3 py-1.5 text-left text-xs font-mono flex items-center justify-between
                           transition-colors border-b border-mono-100 last:border-b-0
                           {i === fieldHighlightIndex ? 'bg-mono-50' : 'hover:bg-mono-50'}
                           text-mono-700"
                  >
                    <span>{field}</span>
                    {#if validatorRequiredFields.includes(field)}
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
          <!-- Mode-aware info -->
          <div class="relative group/info">
            <div class="flex items-center gap-1 px-2 py-0.5 rounded bg-mono-700/50 cursor-help">
              <i class="fa-solid fa-circle-info text-[10px] text-mono-500"></i>
              <span class="text-[10px] text-mono-500 font-mono">{modeInfoLabel}</span>
            </div>
            <div class="absolute bottom-full left-0 mb-2 px-3 py-2 bg-mono-800 border border-mono-600 rounded-md
                        text-xs text-mono-300 whitespace-nowrap opacity-0 group-hover/info:opacity-100
                        transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
              {modeInfoTooltip}
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
        <!-- Read-only wrapper (imports + class + decorator + signature) -->
        <div bind:this={wrapperEditorEl} class="flex-shrink-0"></div>
        <!-- Editable body (function body) -->
        <div bind:this={bodyEditorEl} class="flex-1 min-h-0"></div>
      </div>
    </div>
  </div>
{/if}

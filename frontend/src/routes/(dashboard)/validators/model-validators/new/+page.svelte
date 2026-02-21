<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { Tooltip } from '$lib/components';
  import { fieldsStore } from '$lib/stores/fields';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import { showToast } from '$lib/stores/toasts';
  import { createModelValidatorAction } from '$lib/domain/mutations';

  // CodeMirror
  import {
    type EditorView,
    type Compartment,
    createSplitEditor,
    updateWrapperContent,
    updateBodyLineNumbers,
  } from '$lib/utils/codemirror';

  // ============================================================================
  // TYPES
  // ============================================================================

  type TemplateDefinition = {
    id: string;
    name: string;
    icon: string;
    description: string;
    requiredFields: string[];
    mode: 'before' | 'after';
    code: string;
  };

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const blankTemplate: TemplateDefinition = {
    id: 'blank',
    name: 'Blank Validator',
    icon: 'fa-file-circle-plus',
    description: 'Start from scratch with an empty model validator',
    requiredFields: [],
    mode: 'after',
    code: '    # Write your cross-field validation logic here\n    return self'
  };

  const templates: TemplateDefinition[] = [
    {
      id: 'cross-field-comparison',
      name: 'Cross-Field Comparison',
      icon: 'fa-not-equal',
      description: 'Ensure one field is greater than another',
      requiredFields: ['start_date', 'end_date'],
      mode: 'after',
      code: '    if self.end_date <= self.start_date:\n        raise ValueError(\'end_date must be after start_date\')\n    return self'
    },
    {
      id: 'mutual-exclusion',
      name: 'Mutual Exclusion',
      icon: 'fa-code-branch',
      description: 'Exactly one of two fields must be set',
      requiredFields: ['phone', 'email'],
      mode: 'after',
      code: '    if self.phone and self.email:\n        raise ValueError(\'Only one of phone or email can be provided\')\n    if not self.phone and not self.email:\n        raise ValueError(\'Either phone or email is required\')\n    return self'
    },
    {
      id: 'conditional-required',
      name: 'Conditional Required',
      icon: 'fa-code-merge',
      description: 'If one field is set, another becomes required',
      requiredFields: ['discount_code', 'discount_amount'],
      mode: 'after',
      code: '    if self.discount_code and not self.discount_amount:\n        raise ValueError(\'discount_amount is required when discount_code is provided\')\n    return self'
    },
    {
      id: 'at-least-one-required',
      name: 'At Least One Required',
      icon: 'fa-list-check',
      description: 'At least one of several optional fields must be set',
      requiredFields: ['phone', 'email', 'address'],
      mode: 'after',
      code: '    if not any([self.phone, self.email, self.address]):\n        raise ValueError(\'At least one contact method is required\')\n    return self'
    },
    {
      id: 'password-confirmation',
      name: 'Password Confirmation',
      icon: 'fa-key',
      description: 'Ensure password matches confirmation field',
      requiredFields: ['password', 'confirm_password'],
      mode: 'after',
      code: '    if self.password != self.confirm_password:\n        raise ValueError(\'Passwords do not match\')\n    return self'
    },
    {
      id: 'date-range-validation',
      name: 'Date Range Validation',
      icon: 'fa-calendar-check',
      description: 'Validate date range bounds and maximum span',
      requiredFields: ['start_date', 'end_date'],
      mode: 'after',
      code: '    from datetime import timedelta\n    if self.end_date <= self.start_date:\n        raise ValueError(\'end_date must be after start_date\')\n    if (self.end_date - self.start_date) > timedelta(days=365):\n        raise ValueError(\'Date range cannot exceed 365 days\')\n    return self'
    },
    {
      id: 'sum-constraint',
      name: 'Sum Constraint',
      icon: 'fa-calculator',
      description: 'Ensure parts sum to a total',
      requiredFields: ['part_a', 'part_b', 'total'],
      mode: 'after',
      code: '    if self.part_a + self.part_b != self.total:\n        raise ValueError(f\'Parts ({self.part_a} + {self.part_b}) must sum to total ({self.total})\')\n    return self'
    },
    {
      id: 'enum-dependent-fields',
      name: 'Enum-Dependent Fields',
      icon: 'fa-link',
      description: 'Require different fields based on a status enum',
      requiredFields: ['status', 'reason'],
      mode: 'after',
      code: '    if self.status == \'rejected\' and not self.reason:\n        raise ValueError(\'reason is required when status is rejected\')\n    return self'
    },
    {
      id: 'json-schema-validation',
      name: 'JSON Schema Validation',
      icon: 'fa-brackets-curly',
      description: 'Validate required keys exist in a dictionary field',
      requiredFields: ['metadata'],
      mode: 'before',
      code: '    metadata = data.get(\'metadata\', {})\n    required_keys = [\'version\', \'source\']\n    missing = [k for k in required_keys if k not in metadata]\n    if missing:\n        raise ValueError(f\'metadata missing required keys: {", ".join(missing)}\')\n    return data'
    }
  ];

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

  // Map domain type names to Python type annotation names
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

  let canSave = $derived(validatorName.trim() !== '' && validatorCode.trim() !== '');

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

  // Create split editor when entering editor view
  $effect(() => {
    if (currentView !== 'editor' || !wrapperEditorEl || !bodyEditorEl) return;

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

  function selectTemplate(template: TemplateDefinition) {
    validatorName = template.name;
    validatorDescription = template.description;
    validatorRequiredFields = [...template.requiredFields];
    validatorMode = template.mode;
    validatorCode = template.code;
    copySuccess = false;
    currentView = 'editor';
  }

  function backToGallery() {
    currentView = 'gallery';
  }

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
          onclick={() => selectTemplate(blankTemplate)}
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
          {#each templates as template (template.id)}
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
    <!-- ================================================================ -->
    <!-- HEADER                                                            -->
    <!-- ================================================================ -->
    <div class="bg-white border-b border-mono-200 py-4 px-6 flex-shrink-0">
      <div class="flex justify-between items-start">
        <!-- Left side: back button + title -->
        <div>
          <button
            onclick={backToGallery}
            class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-2"
          >
            <i class="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to Templates</span>
          </button>
          <h1 class="text-xl font-semibold text-mono-900">Model Validator Editor</h1>
        </div>

        <!-- Right side: action buttons -->
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
          <label for="field-search" class="block text-xs font-medium text-mono-500 mb-1">Required Fields</label>
          <!-- Trigger area: chips + search input -->
          <div
            class="flex flex-wrap items-center gap-1 min-h-[34px] px-2 py-1 border border-mono-200 rounded-md
                   bg-white cursor-text
                   {fieldDropdownOpen ? 'ring-1 ring-mono-400 border-mono-400' : ''}"
            onclick={() => { openFieldDropdown(); document.getElementById('field-search')?.focus(); }}
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
              id="field-search"
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
          <!-- Dropdown panel -->
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

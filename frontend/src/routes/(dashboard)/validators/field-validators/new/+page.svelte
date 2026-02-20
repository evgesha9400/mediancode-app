<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { Tooltip } from '$lib/components';
  import { typesStore } from '$lib/stores/types';
  import { activeNamespaceId } from '$lib/stores/namespaces';
  import { showToast } from '$lib/stores/toasts';
  import { createFieldValidatorAction } from '$lib/domain/mutations';

  // CodeMirror
  import { EditorView, minimalSetup } from 'codemirror';
  import { EditorState, Compartment } from '@codemirror/state';
  import {
    lineNumbers,
    highlightActiveLine,
    highlightActiveLineGutter,
    keymap
  } from '@codemirror/view';
  import { bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language';
  import { closeBrackets } from '@codemirror/autocomplete';
  import { indentWithTab } from '@codemirror/commands';
  import { python } from '@codemirror/lang-python';
  import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';

  // ============================================================================
  // TYPES
  // ============================================================================

  type TemplateDefinition = {
    id: string;
    name: string;
    icon: string;
    description: string;
    compatibleTypes: string[];
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
    description: 'Start from scratch with an empty validator',
    compatibleTypes: ['Any'],
    mode: 'after',
    code: '    # Write your validation logic here\n    return v'
  };

  const templates: TemplateDefinition[] = [
    {
      id: 'string-cleanup',
      name: 'String Cleanup',
      icon: 'fa-broom',
      description: 'Strip whitespace, lowercase, and optional length bounds',
      compatibleTypes: ['str'],
      mode: 'before',
      code: '    v = v.strip()\n    v = v.lower()\n    if len(v) > 255:\n        raise ValueError(\'Must be 255 characters or less\')\n    return v'
    },
    {
      id: 'email-format',
      name: 'Email Format',
      icon: 'fa-envelope',
      description: 'Validate email format with regex and normalize',
      compatibleTypes: ['str'],
      mode: 'after',
      code: '    if not re.match(r\'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$\', v):\n        raise ValueError(\'Invalid email format\')\n    v = v.lower().strip()\n    return v'
    },
    {
      id: 'number-range',
      name: 'Number Range',
      icon: 'fa-arrow-up-1-9',
      description: 'Ensure a number falls within min/max bounds',
      compatibleTypes: ['int', 'float'],
      mode: 'after',
      code: '    if v < 0:\n        raise ValueError(\'Must be greater than or equal to 0\')\n    if v > 1000:\n        raise ValueError(\'Must be less than or equal to 1000\')\n    return v'
    },
    {
      id: 'length-bounds',
      name: 'Length Bounds',
      icon: 'fa-ruler-horizontal',
      description: 'Enforce minimum and maximum string length',
      compatibleTypes: ['str'],
      mode: 'after',
      code: '    if len(v) < 1:\n        raise ValueError(\'Cannot be empty\')\n    if len(v) > 255:\n        raise ValueError(\'Must be 255 characters or less\')\n    return v'
    },
    {
      id: 'regex-pattern',
      name: 'Regex Pattern',
      icon: 'fa-code',
      description: 'Validate value matches a custom regex pattern',
      compatibleTypes: ['str'],
      mode: 'after',
      code: '    if not re.match(r\'^[a-zA-Z0-9_-]+$\', v):\n        raise ValueError(\'Contains invalid characters\')\n    return v'
    },
    {
      id: 'allowed-values',
      name: 'Allowed Values',
      icon: 'fa-list-check',
      description: 'Ensure value is one of the allowed options',
      compatibleTypes: ['str', 'int'],
      mode: 'after',
      code: '    allowed = [\'active\', \'inactive\', \'pending\']\n    if v not in allowed:\n        raise ValueError(f\'Must be one of: {", ".join(allowed)}\')\n    return v'
    },
    {
      id: 'not-empty',
      name: 'Not Empty',
      icon: 'fa-ban',
      description: 'Reject null, empty, or whitespace-only values',
      compatibleTypes: ['Any'],
      mode: 'before',
      code: '    if v is None:\n        raise ValueError(\'Value is required\')\n    if isinstance(v, str) and not v.strip():\n        raise ValueError(\'Value cannot be blank\')\n    return v'
    },
    {
      id: 'url-format',
      name: 'URL Format',
      icon: 'fa-link',
      description: 'Validate URL format with protocol requirement',
      compatibleTypes: ['str'],
      mode: 'before',
      code: '    if not re.match(r\'^https?://[^\\s/$.?#].[^\\s]*$\', v):\n        raise ValueError(\'Invalid URL format\')\n    v = v.strip()\n    return v'
    },
    {
      id: 'datetime-range',
      name: 'Datetime Range',
      icon: 'fa-calendar-check',
      description: 'Validate datetime falls within an acceptable range',
      compatibleTypes: ['datetime'],
      mode: 'after',
      code: '    from datetime import datetime, timezone\n    now = datetime.now(timezone.utc)\n    if v > now:\n        raise ValueError(\'Datetime cannot be in the future\')\n    return v'
    },
    {
      id: 'uuid-format',
      name: 'UUID Format',
      icon: 'fa-fingerprint',
      description: 'Validate UUID version and format',
      compatibleTypes: ['uuid'],
      mode: 'after',
      code: '    if v.version != 4:\n        raise ValueError(\'Must be a UUID v4\')\n    return v'
    }
  ];

  // ============================================================================
  // CODEMIRROR THEME
  // ============================================================================

  const monoTheme = EditorView.theme({
    '&': {
      backgroundColor: '#171717',
      color: '#f5f5f5',
      fontSize: '14px',
    },
    '.cm-gutters': {
      backgroundColor: '#171717',
      color: '#737373',
      border: 'none',
      paddingRight: '8px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#262626',
    },
    '.cm-activeLine': {
      backgroundColor: '#262626',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'white',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#404040 !important',
    },
    '.cm-content': {
      caretColor: 'white',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    '.cm-line': {
      padding: '0 0 0 4px',
    },
  });

  const wrapperDimTheme = EditorView.theme({
    '&': { opacity: '0.875' },
    '.cm-scroller': { overflow: 'hidden !important' },
  });

  const bodyFillTheme = EditorView.theme({
    '&': { height: '100%' },
    '.cm-scroller': { overflow: 'auto' },
  });

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

  // Compartment for dynamic line number offset on body editor
  const bodyLineNumCompartment = new Compartment();

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  // Dynamic type options from store (root types minus abstract 'numeric', plus 'Any')
  let typeOptions = $derived.by(() => {
    const rootTypes = $typesStore
      .filter(t => t.parentTypeId === null && t.name !== 'numeric')
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

  // Map domain type names to Python type annotation names
  const TYPE_TO_PYTHON: Record<string, string> = {
    str: 'str', int: 'int', float: 'float', bool: 'bool',
    datetime: 'datetime', uuid: 'UUID', Any: 'Any',
  };

  // Build the type annotation for v (e.g. "str", "str | int", "Any")
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

  let canSave = $derived(validatorName.trim() !== '' && validatorCode.trim() !== '');

  // ============================================================================
  // CODEMIRROR LIFECYCLE
  // ============================================================================

  // Create wrapper editor when entering editor view
  $effect(() => {
    if (currentView !== 'editor' || !wrapperEditorEl) return;

    const initialDoc = untrack(() => wrapperCode);
    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        minimalSetup,
        lineNumbers(),
        python(),
        syntaxHighlighting(oneDarkHighlightStyle),
        monoTheme,
        wrapperDimTheme,
        EditorView.editable.of(false),
        EditorState.readOnly.of(true),
      ],
    });
    wrapperView = new EditorView({ state, parent: wrapperEditorEl });

    return () => {
      wrapperView?.destroy();
      wrapperView = null;
    };
  });

  // Update wrapper content when name/mode/imports change
  $effect(() => {
    const newDoc = wrapperCode;
    if (!wrapperView) return;
    const currentDoc = wrapperView.state.doc.toString();
    if (currentDoc !== newDoc) {
      wrapperView.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newDoc },
      });
    }
  });

  // Create body editor when entering editor view
  $effect(() => {
    if (currentView !== 'editor' || !bodyEditorEl) return;

    const initialDoc = untrack(() => validatorCode);
    const initialOffset = untrack(() => wrapperLineCount);

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        minimalSetup,
        bodyLineNumCompartment.of(
          lineNumbers({ formatNumber: (n: number) => String(n + initialOffset) })
        ),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        keymap.of([indentWithTab]),
        python(),
        syntaxHighlighting(oneDarkHighlightStyle),
        monoTheme,
        bodyFillTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            validatorCode = update.state.doc.toString();
          }
        }),
      ],
    });
    bodyView = new EditorView({ state, parent: bodyEditorEl });
    bodyView.focus();

    return () => {
      bodyView?.destroy();
      bodyView = null;
    };
  });

  // Update body line number offset when wrapper line count changes
  $effect(() => {
    const offset = wrapperLineCount;
    if (!bodyView) return;
    bodyView.dispatch({
      effects: bodyLineNumCompartment.reconfigure(
        lineNumbers({ formatNumber: (n: number) => String(n + offset) })
      ),
    });
  });

  // ============================================================================
  // HELPERS
  // ============================================================================

  function selectTemplate(template: TemplateDefinition) {
    validatorName = template.name;
    validatorDescription = template.description;
    validatorCompatibleTypes = [...template.compatibleTypes];
    validatorMode = template.mode;
    validatorCode = template.code;
    copySuccess = false;
    currentView = 'editor';
  }

  function backToGallery() {
    currentView = 'gallery';
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
          <h1 class="text-xl font-semibold text-mono-900">Field Validator Editor</h1>
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
            placeholder="e.g. String Cleanup"
            class="w-full px-2.5 py-1.5 text-sm border border-mono-200 rounded-md
                   focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                   placeholder:text-mono-300"
          />
        </div>

        <!-- Compatible Types -->
        <div class="col-span-4 relative">
          <label for="type-search" class="block text-xs font-medium text-mono-500 mb-1">Compatible Types</label>
          <!-- Trigger area: chips + search input -->
          <div
            class="flex flex-wrap items-center gap-1 min-h-[34px] px-2 py-1 border border-mono-200 rounded-md
                   bg-white cursor-text
                   {typeDropdownOpen ? 'ring-1 ring-mono-400 border-mono-400' : ''}"
            onclick={() => { openTypeDropdown(); document.getElementById('type-search')?.focus(); }}
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
              id="type-search"
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
          <!-- Dropdown panel -->
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

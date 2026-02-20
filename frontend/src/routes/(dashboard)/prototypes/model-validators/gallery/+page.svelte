<script lang="ts">
  import { untrack } from 'svelte';
  import { PageHeader } from '$lib/components';

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

  type MockField = {
    name: string;
    type: string;
  };

  type MockObject = {
    id: string;
    name: string;
    description: string;
    fields: MockField[];
  };

  type TemplateDefinition = {
    id: string;
    name: string;
    icon: string;
    description: string;
    /** Which mock object IDs this template is most relevant for (empty = all) */
    preferredObjects: string[];
    mode: 'before' | 'after';
    /** Function that generates template code using actual field names from the selected object */
    codeFactory: (obj: MockObject) => string;
  };

  // ============================================================================
  // MOCK DATA
  // ============================================================================

  const mockObjects: MockObject[] = [
    {
      id: 'user',
      name: 'User',
      description: 'User account with contact information and company details',
      fields: [
        { name: 'name', type: 'str' },
        { name: 'email', type: 'str' },
        { name: 'phone', type: 'str' },
        { name: 'is_company', type: 'bool' },
        { name: 'company_name', type: 'str' },
        { name: 'created_at', type: 'datetime' }
      ]
    },
    {
      id: 'order',
      name: 'Order',
      description: 'Purchase order with status tracking and shipment dates',
      fields: [
        { name: 'created_at', type: 'datetime' },
        { name: 'shipped_at', type: 'datetime' },
        { name: 'delivered_at', type: 'datetime' },
        { name: 'status', type: 'str' },
        { name: 'tracking_number', type: 'str' },
        { name: 'total_amount', type: 'float' }
      ]
    },
    {
      id: 'product',
      name: 'Product',
      description: 'Product listing with pricing and inventory data',
      fields: [
        { name: 'name', type: 'str' },
        { name: 'price', type: 'float' },
        { name: 'discount_price', type: 'float' },
        { name: 'stock_count', type: 'int' },
        { name: 'is_active', type: 'bool' },
        { name: 'activated_at', type: 'datetime' }
      ]
    },
    {
      id: 'time-range',
      name: 'TimeRange',
      description: 'Date range specification for scheduling and filtering',
      fields: [
        { name: 'start_date', type: 'datetime' },
        { name: 'end_date', type: 'datetime' },
        { name: 'label', type: 'str' },
        { name: 'is_recurring', type: 'bool' }
      ]
    }
  ];

  // ============================================================================
  // TEMPLATE FIELD RESOLUTION HELPERS
  // ============================================================================

  /** Find first field of a given type, or fall back to a default name */
  function findField(obj: MockObject, type: string, fallback: string): string {
    return obj.fields.find(f => f.type === type)?.name ?? fallback;
  }

  /** Find two datetime fields for date range comparisons */
  function findDatePair(obj: MockObject): [string, string] {
    const dates = obj.fields.filter(f => f.type === 'datetime');
    if (dates.length >= 2) return [dates[0].name, dates[1].name];
    if (dates.length === 1) return [dates[0].name, 'end_date'];
    return ['start_date', 'end_date'];
  }

  /** Find two str fields for mutual exclusion */
  function findStrPair(obj: MockObject): [string, string] {
    const strs = obj.fields.filter(f => f.type === 'str');
    if (strs.length >= 2) return [strs[0].name, strs[1].name];
    if (strs.length === 1) return [strs[0].name, 'alt_field'];
    return ['email', 'phone'];
  }

  /** Find a bool field and a str field for conditional required */
  function findBoolStrPair(obj: MockObject): [string, string] {
    const boolField = obj.fields.find(f => f.type === 'bool');
    const strFields = obj.fields.filter(f => f.type === 'str');
    const boolName = boolField?.name ?? 'is_enabled';
    // Heuristic: if bool is "is_X", prefer a str field containing "X" (e.g. is_company -> company_name)
    const stem = boolName.replace(/^is_/, '');
    const related = strFields.find(f => f.name.includes(stem));
    const strName = related?.name
      ?? (strFields.length > 0 ? strFields[strFields.length - 1].name : 'detail');
    return [boolName, strName];
  }

  /** Find a str field and a datetime field for value dependency */
  function findStatusDatePair(obj: MockObject): [string, string] {
    const strField = obj.fields.find(f => f.type === 'str');
    const dateField = obj.fields.find(f => f.type === 'datetime');
    return [strField?.name ?? 'status', dateField?.name ?? 'activated_at'];
  }

  /** Find two float/int fields for arithmetic comparison */
  function findNumericPair(obj: MockObject): [string, string] {
    const nums = obj.fields.filter(f => f.type === 'float' || f.type === 'int');
    if (nums.length >= 2) return [nums[0].name, nums[1].name];
    if (nums.length === 1) return [nums[0].name, 'max_value'];
    return ['price', 'discount_price'];
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  const templates: TemplateDefinition[] = [
    {
      id: 'date-range',
      name: 'Date Range Comparison',
      icon: 'fa-calendar-days',
      description: 'Ensure one date field comes after another (e.g. end_date must be after start_date)',
      preferredObjects: ['order', 'time-range'],
      mode: 'after',
      codeFactory: (obj) => {
        const [start, end] = findDatePair(obj);
        return [
          `    if self.${end} is not None and self.${start} is not None:`,
          `        if self.${end} <= self.${start}:`,
          `            raise ValueError('${end} must be after ${start}')`,
          `    return self`
        ].join('\n');
      }
    },
    {
      id: 'mutual-exclusion',
      name: 'Mutual Exclusion',
      icon: 'fa-code-branch',
      description: 'Require exactly one of two fields, but not both (e.g. provide email or phone)',
      preferredObjects: ['user'],
      mode: 'after',
      codeFactory: (obj) => {
        const [fieldA, fieldB] = findStrPair(obj);
        return [
          `    has_${fieldA} = self.${fieldA} is not None and self.${fieldA} != ''`,
          `    has_${fieldB} = self.${fieldB} is not None and self.${fieldB} != ''`,
          `    if not has_${fieldA} and not has_${fieldB}:`,
          `        raise ValueError('Must provide either ${fieldA} or ${fieldB}')`,
          `    if has_${fieldA} and has_${fieldB}:`,
          `        raise ValueError('Provide ${fieldA} or ${fieldB}, not both')`,
          `    return self`
        ].join('\n');
      }
    },
    {
      id: 'conditional-required',
      name: 'Conditional Required',
      icon: 'fa-code-merge',
      description: 'When a boolean flag is set, require a dependent field (e.g. if is_company then company_name)',
      preferredObjects: ['user'],
      mode: 'after',
      codeFactory: (obj) => {
        const [boolField, strField] = findBoolStrPair(obj);
        return [
          `    if self.${boolField}:`,
          `        if not self.${strField} or self.${strField}.strip() == '':`,
          `            raise ValueError(`,
          `                '${strField} is required when ${boolField} is True'`,
          `            )`,
          `    return self`
        ].join('\n');
      }
    },
    {
      id: 'value-dependency',
      name: 'Value Dependency',
      icon: 'fa-link',
      description: 'When a field has a specific value, require another field to be set (e.g. status="active" requires activated_at)',
      preferredObjects: ['product', 'order'],
      mode: 'after',
      codeFactory: (obj) => {
        const [strField, dateField] = findStatusDatePair(obj);
        return [
          `    if self.${strField} == 'active':`,
          `        if self.${dateField} is None:`,
          `            raise ValueError(`,
          `                '${dateField} is required when ${strField} is "active"'`,
          `            )`,
          `    return self`
        ].join('\n');
      }
    },
    {
      id: 'cross-field-arithmetic',
      name: 'Cross-Field Arithmetic',
      icon: 'fa-calculator',
      description: 'Compare numeric fields (e.g. discount_price must be less than price)',
      preferredObjects: ['product'],
      mode: 'after',
      codeFactory: (obj) => {
        const [fieldA, fieldB] = findNumericPair(obj);
        return [
          `    if self.${fieldA} is not None and self.${fieldB} is not None:`,
          `        if self.${fieldB} >= self.${fieldA}:`,
          `            raise ValueError(`,
          `                '${fieldB} must be less than ${fieldA}'`,
          `            )`,
          `    return self`
        ].join('\n');
      }
    },
    {
      id: 'blank',
      name: 'Blank Validator',
      icon: 'fa-file-circle-plus',
      description: 'Start from scratch with an empty model validator body',
      preferredObjects: [],
      mode: 'after',
      codeFactory: () => {
        return [
          `    # Write your cross-field validation logic here`,
          `    return self`
        ].join('\n');
      }
    }
  ];

  // ============================================================================
  // CODEMIRROR THEME (matches field-validators gallery)
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
    '&': { opacity: '0.75' },
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
  let showBuildAiTooltip = $state(false);

  // Object selection
  let selectedObjectId = $state<string>(mockObjects[0].id);

  // Editor state
  let validatorName = $state('');
  let validatorDescription = $state('');
  let validatorMode = $state<'before' | 'after'>('after');
  let validatorCode = $state('');

  // Field reference panel collapse state
  let fieldPanelCollapsed = $state(false);

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

  let selectedObject = $derived(
    mockObjects.find(o => o.id === selectedObjectId) ?? mockObjects[0]
  );

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

  let wrapperCode = $derived.by(() => {
    const lines: string[] = [];
    lines.push('from pydantic import model_validator');
    if (needsReImport) lines.push('import re');
    if (validatorMode === 'after') {
      lines.push('from typing import Self');
    } else {
      lines.push('from typing import Any');
    }
    lines.push('');
    lines.push(`@model_validator(mode='${validatorMode}')`);
    if (validatorMode === 'after') {
      lines.push(`def ${functionName}(self) -> Self:`);
    } else {
      lines.push('@classmethod');
      lines.push(`def ${functionName}(cls, data: dict[str, Any]) -> dict[str, Any]:`);
    }
    return lines.join('\n');
  });

  let wrapperLineCount = $derived(wrapperCode.split('\n').length);
  let fullCode = $derived(wrapperCode + '\n' + validatorCode);

  // Sort templates: preferred for selected object first, blank always last
  let sortedTemplates = $derived.by(() => {
    const nonBlank = templates.filter(t => t.id !== 'blank');
    const blank = templates.find(t => t.id === 'blank')!;
    const sorted = nonBlank.sort((a, b) => {
      const aPreferred = a.preferredObjects.length === 0 || a.preferredObjects.includes(selectedObjectId);
      const bPreferred = b.preferredObjects.length === 0 || b.preferredObjects.includes(selectedObjectId);
      if (aPreferred && !bPreferred) return -1;
      if (!aPreferred && bPreferred) return 1;
      return 0;
    });
    return [...sorted, blank];
  });

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
    if (!wrapperView) return;
    const newDoc = wrapperCode;
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
    if (!bodyView) return;
    const offset = wrapperLineCount;
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
    validatorMode = template.mode;
    validatorCode = template.codeFactory(selectedObject);
    copySuccess = false;
    showBuildAiTooltip = false;
    currentView = 'editor';
  }

  function backToGallery() {
    currentView = 'gallery';
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

  function handleBuildAi() {
    showBuildAiTooltip = true;
    setTimeout(() => { showBuildAiTooltip = false; }, 2000);
  }

  /** Map Python type names to shorter display labels */
  const TYPE_BADGE_LABEL: Record<string, string> = {
    str: 'str',
    int: 'int',
    float: 'float',
    bool: 'bool',
    datetime: 'datetime',
    uuid: 'UUID',
  };
</script>

<!-- ======================================================================== -->
<!-- GALLERY VIEW                                                             -->
<!-- ======================================================================== -->

{#if currentView === 'gallery'}
  <PageHeader title="Model Validator Gallery" />

  <div class="p-6">
    <!-- Intro text -->
    <p class="text-sm text-mono-500 mb-6 max-w-2xl">
      Choose an object, then pick a cross-field validation pattern.
      Each template generates a Pydantic
      <code class="px-1.5 py-0.5 bg-mono-100 rounded text-mono-700 text-xs font-mono">@model_validator</code>
      pre-populated with your object's actual field names.
    </p>

    <!-- Object selector -->
    <div class="mb-6">
      <label for="object-select" class="block text-xs font-medium text-mono-500 mb-2">
        Target Object
      </label>
      <div class="flex items-start gap-4">
        <select
          id="object-select"
          bind:value={selectedObjectId}
          class="px-3 py-2 text-sm border border-mono-200 rounded-md bg-white
                 focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                 w-64"
        >
          {#each mockObjects as obj (obj.id)}
            <option value={obj.id}>{obj.name}</option>
          {/each}
        </select>
        <div class="flex-1">
          <p class="text-sm text-mono-600">{selectedObject.description}</p>
          <div class="flex flex-wrap gap-1.5 mt-2">
            {#each selectedObject.fields as field (field.name)}
              <span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md
                           bg-mono-100 text-mono-600 border border-mono-200">
                <span class="font-mono">{field.name}</span>
                <span class="text-mono-400 font-mono text-[10px]">{TYPE_BADGE_LABEL[field.type] ?? field.type}</span>
              </span>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Template grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each sortedTemplates as template (template.id)}
        <button
          type="button"
          onclick={() => selectTemplate(template)}
          class="group text-left bg-white border border-mono-200 rounded-lg p-5
                 hover:shadow-md hover:-translate-y-0.5
                 transition-all duration-200 ease-out
                 focus:outline-none focus:ring-2 focus:ring-mono-400 focus:ring-offset-2"
        >
          <!-- Top row: icon + mode badge -->
          <div class="flex items-start justify-between mb-3">
            <div class="w-10 h-10 rounded-full bg-mono-100 flex items-center justify-center
                        group-hover:bg-mono-900 transition-colors duration-200">
              <i class="fa-solid {template.icon} text-sm text-mono-500
                         group-hover:text-white transition-colors duration-200"></i>
            </div>
            <span class="px-1.5 py-0.5 text-[10px] font-mono rounded bg-mono-100 text-mono-500
                         border border-mono-200">
              {template.mode}
            </span>
          </div>

          <!-- Name -->
          <h3 class="text-sm font-semibold text-mono-800 mb-1">
            {template.name}
          </h3>

          <!-- Description -->
          <p class="text-xs text-mono-500 leading-relaxed">
            {template.description}
          </p>

          <!-- Arrow indicator -->
          <div class="mt-3 flex items-center text-xs text-mono-300 group-hover:text-mono-500 transition-colors duration-200">
            <span>Use template</span>
            <i class="fa-solid fa-arrow-right ml-1.5 text-[10px]
                       group-hover:translate-x-1 transition-transform duration-200"></i>
          </div>
        </button>
      {/each}
    </div>
  </div>

<!-- ======================================================================== -->
<!-- EDITOR VIEW                                                              -->
<!-- ======================================================================== -->

{:else}
  <div class="flex flex-col flex-1 overflow-hidden">
    <!-- ================================================================ -->
    <!-- HEADER (matches field-validators gallery back-button pattern)     -->
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
            <span>Back to Gallery</span>
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
          <div class="relative">
            <button
              type="button"
              onclick={handleBuildAi}
              class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 transition-colors"
            >
              <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
              <span>Build with AI</span>
            </button>
            {#if showBuildAiTooltip}
              <div class="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-mono-800 text-mono-200
                          text-xs rounded-md whitespace-nowrap shadow-lg pointer-events-none z-10">
                Coming soon
                <div class="absolute top-full right-4 w-2 h-2 bg-mono-800 transform rotate-45 -mt-1"></div>
              </div>
            {/if}
          </div>
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
          <label for="validator-name" class="block text-xs font-medium text-mono-500 mb-1">Name</label>
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

        <!-- Target Object (read-only display) -->
        <div class="col-span-2">
          <span class="block text-xs font-medium text-mono-500 mb-1">Target Object</span>
          <div class="px-2.5 py-1.5 text-sm bg-mono-50 border border-mono-200 rounded-md text-mono-700 font-medium">
            {selectedObject.name}
          </div>
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
        <div class="col-span-5">
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
    <!-- CODE EDITOR + FIELD REFERENCE PANEL                              -->
    <!-- ================================================================ -->
    <div class="flex-1 flex overflow-hidden min-h-0">
      <!-- Code editor region -->
      <div class="flex-1 bg-mono-900 flex flex-col overflow-hidden min-h-0">
        <!-- Editor header bar -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-mono-800 border-b border-mono-700 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-code text-xs text-mono-400"></i>
              <span class="text-xs text-mono-400 font-mono">{functionName}.py</span>
            </div>
            <!-- model_validator info -->
            <div class="relative group/info">
              <div class="flex items-center gap-1 px-2 py-0.5 rounded bg-mono-700/50 cursor-help">
                <i class="fa-solid fa-circle-info text-[10px] text-mono-500"></i>
                <span class="text-[10px] text-mono-500 font-mono">
                  {validatorMode === 'after' ? 'self' : 'data: dict'}
                </span>
              </div>
              <div class="absolute bottom-full left-0 mb-2 px-3 py-2 bg-mono-800 border border-mono-600 rounded-md
                          text-xs text-mono-300 whitespace-nowrap opacity-0 group-hover/info:opacity-100
                          transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
                {#if validatorMode === 'after'}
                  Receives the fully constructed model instance (self)
                {:else}
                  Receives raw input data as a dictionary (data)
                {/if}
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

      <!-- Field reference panel -->
      <div class="bg-white border-l border-mono-200 flex flex-col overflow-hidden
                  {fieldPanelCollapsed ? 'w-10' : 'w-72'} transition-all duration-200">
        {#if fieldPanelCollapsed}
          <!-- Collapsed: vertical label + expand button -->
          <button
            type="button"
            onclick={() => fieldPanelCollapsed = false}
            class="flex-1 flex flex-col items-center justify-center gap-2 text-mono-400
                   hover:text-mono-600 hover:bg-mono-50 transition-colors"
            title="Expand field reference"
          >
            <i class="fa-solid fa-chevron-left text-xs"></i>
            <span class="text-xs font-medium writing-mode-vertical" style="writing-mode: vertical-rl; text-orientation: mixed;">
              Fields
            </span>
          </button>
        {:else}
          <!-- Panel header -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-mono-200 flex-shrink-0">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-table-list text-xs text-mono-400"></i>
              <span class="text-sm font-medium text-mono-700">{selectedObject.name} Fields</span>
            </div>
            <button
              type="button"
              onclick={() => fieldPanelCollapsed = true}
              class="text-mono-400 hover:text-mono-600 transition-colors"
              title="Collapse panel"
            >
              <i class="fa-solid fa-chevron-right text-xs"></i>
            </button>
          </div>

          <!-- Field list -->
          <div class="flex-1 overflow-y-auto p-4">
            <p class="text-xs text-mono-400 mb-3">
              Reference these fields in your validator code
              via <code class="font-mono text-mono-500">{validatorMode === 'after' ? 'self.' : "data['"}<span class="text-mono-700">field</span>{validatorMode === 'after' ? '' : "']"}</code>
            </p>
            <ul class="space-y-1.5">
              {#each selectedObject.fields as field (field.name)}
                <li class="flex items-center justify-between px-3 py-2 rounded-md bg-mono-50 border border-mono-100">
                  <span class="text-sm font-mono text-mono-800">{field.name}</span>
                  <span class="text-xs font-mono text-mono-400 px-1.5 py-0.5 rounded bg-white border border-mono-200">
                    {TYPE_BADGE_LABEL[field.type] ?? field.type}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

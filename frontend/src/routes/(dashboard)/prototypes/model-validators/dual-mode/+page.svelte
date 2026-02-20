<script lang="ts">
  import { PageHeader } from '$lib/components';

  // ============================================================================
  // TYPES
  // ============================================================================

  type ObjectField = {
    name: string;
    type: string;
    required: boolean;
  };

  type MockObject = {
    id: string;
    name: string;
    fields: ObjectField[];
  };

  type ClauseType = 'comparison' | 'conditional-required' | 'mutual-exclusion' | 'custom';

  type Clause = {
    id: number;
    type: ClauseType;
    // Field Comparison
    fieldA: string;
    operator: string;
    fieldB: string;
    // Conditional Required
    conditionField: string;
    conditionType: string;
    conditionValue: string;
    requiredField: string;
    // Mutual Exclusion
    exclusionFieldA: string;
    exclusionFieldB: string;
    // Custom Expression
    expression: string;
    // Shared
    errorMessage: string;
  };

  type MockValidator = {
    id: string;
    name: string;
    description: string;
    objectId: string;
    objectName: string;
    mode: 'before' | 'after';
    clauses: Clause[];
  };

  type EditorTab = 'clauses' | 'code';

  type ViewState = 'list' | 'select-object' | 'editor';

  // ============================================================================
  // SYNTAX HIGHLIGHTING (matches existing prototype pattern)
  // ============================================================================

  const HIGHLIGHT_COLORS = {
    keyword: '#60a5fa',
    decorator: '#fbbf24',
    string: '#4ade80',
    comment: '#9ca3af',
    number: '#fb923c',
    funcName: '#c4b5fd',
    typeHint: '#67e8f9',
    builtin: '#f472b6',
    operator: '#d4d4d4',
    default: '#f5f5f5'
  };

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function highlightPython(code: string): string {
    return code.split('\n').map(highlightLine).join('\n');
  }

  function highlightLine(line: string): string {
    const leadingSpaces = line.match(/^(\s*)/)?.[1] || '';
    const trimmed = line.slice(leadingSpaces.length);

    if (trimmed.startsWith('#')) {
      return leadingSpaces + colorSpan(escapeHtml(trimmed), HIGHLIGHT_COLORS.comment);
    }
    if (trimmed.startsWith('@')) {
      return leadingSpaces + highlightDecorator(trimmed);
    }
    if (trimmed.startsWith('def ')) {
      return leadingSpaces + highlightDef(trimmed);
    }
    return leadingSpaces + highlightTokens(trimmed);
  }

  function colorSpan(text: string, color: string): string {
    return `<span style="color:${color}">${text}</span>`;
  }

  function highlightDecorator(line: string): string {
    const match = line.match(/^(@\w+)(\(.*\))?$/);
    if (match) {
      let result = colorSpan(escapeHtml(match[1]), HIGHLIGHT_COLORS.decorator);
      if (match[2]) {
        result += highlightParenContent(match[2]);
      }
      return result;
    }
    return colorSpan(escapeHtml(line), HIGHLIGHT_COLORS.decorator);
  }

  function highlightParenContent(content: string): string {
    let result = '';
    let i = 0;
    while (i < content.length) {
      if (content[i] === "'") {
        const end = content.indexOf("'", i + 1);
        if (end !== -1) {
          result += colorSpan(escapeHtml(content.slice(i, end + 1)), HIGHLIGHT_COLORS.string);
          i = end + 1;
          continue;
        }
      }
      result += escapeHtml(content[i]);
      i++;
    }
    return result;
  }

  function highlightDef(line: string): string {
    const match = line.match(/^(def )(\w+)(\(.*?\))(\s*->\s*)?(.+)?(:)$/);
    if (match) {
      let result = colorSpan('def', HIGHLIGHT_COLORS.keyword) + ' ';
      result += colorSpan(escapeHtml(match[2]), HIGHLIGHT_COLORS.funcName);
      result += highlightParams(match[3]);
      if (match[4]) {
        result += colorSpan(escapeHtml(' ->'), HIGHLIGHT_COLORS.operator) + ' ';
      }
      if (match[5]) {
        result += colorSpan(escapeHtml(match[5].trim()), HIGHLIGHT_COLORS.typeHint);
      }
      result += ':';
      return result;
    }
    return colorSpan('def', HIGHLIGHT_COLORS.keyword) + ' ' + escapeHtml(line.slice(4));
  }

  function highlightParams(params: string): string {
    let result = '(';
    const inner = params.slice(1, -1);
    const parts = inner.split(',');
    result += parts.map(part => {
      const trimmed = part.trim();
      if (trimmed.includes(':')) {
        const [name, type] = trimmed.split(':').map(s => s.trim());
        return escapeHtml(name) + ': ' + colorSpan(escapeHtml(type), HIGHLIGHT_COLORS.typeHint);
      }
      return escapeHtml(trimmed);
    }).join(', ');
    result += ')';
    return result;
  }

  const PYTHON_KEYWORDS = new Set([
    'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from',
    'raise', 'try', 'except', 'not', 'and', 'or', 'in', 'is', 'as',
    'with', 'pass', 'break', 'continue', 'class', 'True', 'False', 'None'
  ]);

  const PYTHON_BUILTINS = new Set([
    'len', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set',
    'any', 'all', 'ValueError', 'TypeError', 'Exception', 're',
    'model_validator', 'classmethod', 'self', 'cls', 'data'
  ]);

  function highlightTokens(line: string): string {
    let result = '';
    let i = 0;

    while (i < line.length) {
      if (line[i] === "'" || line[i] === '"') {
        const quote = line[i];
        const isRaw = i > 0 && line[i - 1] === 'r';
        let j = i + 1;
        while (j < line.length && line[j] !== quote) {
          if (line[j] === '\\') j++;
          j++;
        }
        const strContent = line.slice(i, j + 1);
        if (isRaw) {
          result = result.slice(0, -1);
          result += colorSpan('r' + escapeHtml(strContent), HIGHLIGHT_COLORS.string);
        } else {
          result += colorSpan(escapeHtml(strContent), HIGHLIGHT_COLORS.string);
        }
        i = j + 1;
        continue;
      }

      if (line[i] === 'f' && i + 1 < line.length && (line[i + 1] === "'" || line[i + 1] === '"')) {
        const quote = line[i + 1];
        let j = i + 2;
        while (j < line.length && line[j] !== quote) {
          if (line[j] === '\\') j++;
          j++;
        }
        result += colorSpan(escapeHtml(line.slice(i, j + 1)), HIGHLIGHT_COLORS.string);
        i = j + 1;
        continue;
      }

      if (line[i] === '#') {
        result += colorSpan(escapeHtml(line.slice(i)), HIGHLIGHT_COLORS.comment);
        break;
      }

      if (/\d/.test(line[i]) && (i === 0 || /[\s(,=<>!+\-*/%[\]]/.test(line[i - 1]))) {
        let j = i;
        while (j < line.length && /[\d.]/.test(line[j])) j++;
        result += colorSpan(escapeHtml(line.slice(i, j)), HIGHLIGHT_COLORS.number);
        i = j;
        continue;
      }

      if (/[a-zA-Z_]/.test(line[i])) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const word = line.slice(i, j);

        if (PYTHON_KEYWORDS.has(word)) {
          result += colorSpan(escapeHtml(word), HIGHLIGHT_COLORS.keyword);
        } else if (PYTHON_BUILTINS.has(word)) {
          result += colorSpan(escapeHtml(word), HIGHLIGHT_COLORS.builtin);
        } else {
          result += escapeHtml(word);
        }
        i = j;
        continue;
      }

      result += escapeHtml(line[i]);
      i++;
    }

    return result;
  }

  // ============================================================================
  // MOCK DATA
  // ============================================================================

  const mockObjects: MockObject[] = [
    {
      id: 'obj-user',
      name: 'User',
      fields: [
        { name: 'name', type: 'str', required: true },
        { name: 'email', type: 'str', required: true },
        { name: 'phone', type: 'str', required: false },
        { name: 'is_company', type: 'bool', required: true },
        { name: 'company_name', type: 'str', required: false },
        { name: 'created_at', type: 'datetime', required: true }
      ]
    },
    {
      id: 'obj-order',
      name: 'Order',
      fields: [
        { name: 'order_number', type: 'str', required: true },
        { name: 'created_at', type: 'datetime', required: true },
        { name: 'shipped_at', type: 'datetime', required: false },
        { name: 'delivered_at', type: 'datetime', required: false },
        { name: 'status', type: 'str', required: true },
        { name: 'total_amount', type: 'float', required: true }
      ]
    },
    {
      id: 'obj-product',
      name: 'Product',
      fields: [
        { name: 'name', type: 'str', required: true },
        { name: 'price', type: 'float', required: true },
        { name: 'discount_price', type: 'float', required: false },
        { name: 'stock_count', type: 'int', required: true },
        { name: 'is_active', type: 'bool', required: true },
        { name: 'category', type: 'str', required: true }
      ]
    }
  ];

  function createDefaultClause(): Clause {
    return {
      id: clauseIdCounter++,
      type: 'comparison',
      fieldA: '',
      operator: '>',
      fieldB: '',
      conditionField: '',
      conditionType: 'is_truthy',
      conditionValue: '',
      requiredField: '',
      exclusionFieldA: '',
      exclusionFieldB: '',
      expression: '',
      errorMessage: ''
    };
  }

  // Pre-built validators for the list view
  const initialValidators: MockValidator[] = [
    {
      id: 'mv-1',
      name: 'validate_date_order',
      description: 'Ensures shipped_at is after created_at when both are present',
      objectId: 'obj-order',
      objectName: 'Order',
      mode: 'after',
      clauses: [
        {
          id: 1,
          type: 'comparison',
          fieldA: 'shipped_at',
          operator: '>',
          fieldB: 'created_at',
          conditionField: '',
          conditionType: 'is_truthy',
          conditionValue: '',
          requiredField: '',
          exclusionFieldA: '',
          exclusionFieldB: '',
          expression: '',
          errorMessage: 'shipped_at must be after created_at'
        }
      ]
    },
    {
      id: 'mv-2',
      name: 'validate_company_fields',
      description: 'When is_company is True, company_name must be provided',
      objectId: 'obj-user',
      objectName: 'User',
      mode: 'after',
      clauses: [
        {
          id: 2,
          type: 'conditional-required',
          fieldA: '',
          operator: '>',
          fieldB: '',
          conditionField: 'is_company',
          conditionType: 'is_truthy',
          conditionValue: '',
          requiredField: 'company_name',
          exclusionFieldA: '',
          exclusionFieldB: '',
          expression: '',
          errorMessage: 'company_name is required when is_company is True'
        }
      ]
    },
    {
      id: 'mv-3',
      name: 'validate_discount_price',
      description: 'Discount price must be less than the regular price',
      objectId: 'obj-product',
      objectName: 'Product',
      mode: 'after',
      clauses: [
        {
          id: 3,
          type: 'comparison',
          fieldA: 'discount_price',
          operator: '<',
          fieldB: 'price',
          conditionField: '',
          conditionType: 'is_truthy',
          conditionValue: '',
          requiredField: '',
          exclusionFieldA: '',
          exclusionFieldB: '',
          expression: '',
          errorMessage: 'discount_price must be less than price'
        }
      ]
    }
  ];

  // ============================================================================
  // STATE
  // ============================================================================

  let currentView = $state<ViewState>('list');
  let activeTab = $state<EditorTab>('clauses');
  let clauseIdCounter = $state(100);

  // List state
  let validators = $state<MockValidator[]>([...initialValidators]);

  // Editor state
  let editingValidatorId = $state<string | null>(null);
  let selectedObjectId = $state<string>('');
  let validatorName = $state('');
  let validatorDescription = $state('');
  let validatorMode = $state<'before' | 'after'>('after');
  let clauses = $state<Clause[]>([]);
  let codeContent = $state('');
  let codeManuallyEdited = $state(false);

  // Clause type dropdown for adding
  let showAddClauseMenu = $state(false);

  // Copy state
  let copySuccess = $state(false);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  let selectedObject = $derived(
    mockObjects.find(o => o.id === selectedObjectId)
  );

  let selectedObjectFields = $derived(
    selectedObject?.fields ?? []
  );

  let fieldNames = $derived(
    selectedObjectFields.map(f => f.name)
  );

  // Generate the function name from the validator name
  let functionName = $derived.by(() => {
    if (!validatorName.trim()) return 'validate_model';
    const slug = validatorName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    return slug;
  });

  // Generate Python code from clauses
  let generatedCode = $derived.by(() => {
    const lines: string[] = [];

    lines.push('from pydantic import model_validator');
    lines.push('');

    if (validatorMode === 'before') {
      lines.push(`@model_validator(mode='before')`);
      lines.push('@classmethod');
      lines.push(`def ${functionName}(cls, data: dict) -> dict:`);

      if (clauses.length === 0) {
        lines.push('    # Add validation clauses');
        lines.push('    return data');
      } else {
        for (const clause of clauses) {
          const clauseCode = generateClauseCode(clause, 'before');
          lines.push(clauseCode);
        }
        lines.push('    return data');
      }
    } else {
      lines.push(`@model_validator(mode='after')`);
      lines.push(`def ${functionName}(self) -> '${selectedObject?.name ?? 'Model'}':`);

      if (clauses.length === 0) {
        lines.push('    # Add validation clauses');
        lines.push('    return self');
      } else {
        for (const clause of clauses) {
          const clauseCode = generateClauseCode(clause, 'after');
          lines.push(clauseCode);
        }
        lines.push('    return self');
      }
    }

    return lines.join('\n');
  });

  // The displayed code: either the generated code or the manually edited code
  let displayedCode = $derived(
    codeManuallyEdited ? codeContent : generatedCode
  );

  let highlightedCode = $derived(highlightPython(displayedCode));

  // ============================================================================
  // CODE GENERATION PER CLAUSE
  // ============================================================================

  function generateClauseCode(clause: Clause, mode: 'before' | 'after'): string {
    const accessor = mode === 'before' ? 'data' : 'self';
    const fieldAccess = mode === 'before'
      ? (field: string) => `${accessor}.get('${field}')`
      : (field: string) => `${accessor}.${field}`;
    const errorMsg = clause.errorMessage || 'Validation error';

    switch (clause.type) {
      case 'comparison': {
        if (!clause.fieldA || !clause.fieldB) {
          return '    # Incomplete comparison clause';
        }
        const a = fieldAccess(clause.fieldA);
        const b = fieldAccess(clause.fieldB);
        // For optional fields, guard with None check
        const lines = [
          `    if ${a} is not None and ${b} is not None:`,
          `        if not (${a} ${clause.operator} ${b}):`,
          `            raise ValueError('${errorMsg}')`
        ];
        return lines.join('\n');
      }

      case 'conditional-required': {
        if (!clause.conditionField || !clause.requiredField) {
          return '    # Incomplete conditional required clause';
        }
        const condField = fieldAccess(clause.conditionField);
        const reqField = fieldAccess(clause.requiredField);
        let condition: string;
        if (clause.conditionType === 'is_truthy') {
          condition = condField;
        } else if (clause.conditionType === 'is_falsy') {
          condition = `not ${condField}`;
        } else {
          condition = `${condField} == '${clause.conditionValue}'`;
        }

        if (mode === 'before') {
          return [
            `    if ${condition}:`,
            `        if not ${accessor}.get('${clause.requiredField}'):`,
            `            raise ValueError('${errorMsg}')`
          ].join('\n');
        }
        return [
          `    if ${condition}:`,
          `        if not ${reqField}:`,
          `            raise ValueError('${errorMsg}')`
        ].join('\n');
      }

      case 'mutual-exclusion': {
        if (!clause.exclusionFieldA || !clause.exclusionFieldB) {
          return '    # Incomplete mutual exclusion clause';
        }
        const a = fieldAccess(clause.exclusionFieldA);
        const b = fieldAccess(clause.exclusionFieldB);
        return [
          `    if ${a} and ${b}:`,
          `        raise ValueError('${errorMsg}')`
        ].join('\n');
      }

      case 'custom': {
        if (!clause.expression.trim()) {
          return '    # Empty custom expression';
        }
        // Indent each line of the custom expression
        const exprLines = clause.expression.split('\n');
        return exprLines.map(l => `    ${l}`).join('\n');
      }

      default:
        return '    # Unknown clause type';
    }
  }

  // Generate snippet for a single clause (shown below the clause form row)
  function generateClauseSnippet(clause: Clause): string {
    const mode = validatorMode;
    return generateClauseCode(clause, mode);
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  function openNewValidator() {
    currentView = 'select-object';
    editingValidatorId = null;
    selectedObjectId = '';
    validatorName = '';
    validatorDescription = '';
    validatorMode = 'after';
    clauses = [];
    codeContent = '';
    codeManuallyEdited = false;
    activeTab = 'clauses';
  }

  function selectObjectAndProceed(objectId: string) {
    selectedObjectId = objectId;
    currentView = 'editor';
  }

  function openExistingValidator(validator: MockValidator) {
    editingValidatorId = validator.id;
    selectedObjectId = validator.objectId;
    validatorName = validator.name;
    validatorDescription = validator.description;
    validatorMode = validator.mode;
    clauses = validator.clauses.map(c => ({ ...c, id: clauseIdCounter++ }));
    codeContent = '';
    codeManuallyEdited = false;
    activeTab = 'clauses';
    currentView = 'editor';
  }

  function backToList() {
    currentView = 'list';
    editingValidatorId = null;
  }

  function backToObjectSelection() {
    currentView = 'select-object';
  }

  function addClause(type: ClauseType) {
    const newClause = createDefaultClause();
    newClause.type = type;
    clauses = [...clauses, newClause];
    showAddClauseMenu = false;
  }

  function removeClause(id: number) {
    clauses = clauses.filter(c => c.id !== id);
  }

  function moveClauseUp(index: number) {
    if (index === 0) return;
    const newClauses = [...clauses];
    [newClauses[index - 1], newClauses[index]] = [newClauses[index], newClauses[index - 1]];
    clauses = newClauses;
  }

  function moveClauseDown(index: number) {
    if (index === clauses.length - 1) return;
    const newClauses = [...clauses];
    [newClauses[index], newClauses[index + 1]] = [newClauses[index + 1], newClauses[index]];
    clauses = newClauses;
  }

  function switchToCodeTab() {
    if (!codeManuallyEdited) {
      codeContent = generatedCode;
    }
    activeTab = 'code';
  }

  function switchToClausesTab() {
    activeTab = 'clauses';
    codeManuallyEdited = false;
  }

  function handleCodeInput(e: Event) {
    codeContent = (e.target as HTMLTextAreaElement).value;
    codeManuallyEdited = true;
  }

  function saveValidator() {
    const obj = mockObjects.find(o => o.id === selectedObjectId);
    const saved: MockValidator = {
      id: editingValidatorId ?? `mv-${Date.now()}`,
      name: validatorName || 'validate_model',
      description: validatorDescription,
      objectId: selectedObjectId,
      objectName: obj?.name ?? '',
      mode: validatorMode,
      clauses: clauses.map(c => ({ ...c }))
    };

    if (editingValidatorId) {
      validators = validators.map(v => v.id === editingValidatorId ? saved : v);
    } else {
      validators = [...validators, saved];
    }

    currentView = 'list';
    editingValidatorId = null;
  }

  function deleteValidator(id: string) {
    validators = validators.filter(v => v.id !== id);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(displayedCode);
      copySuccess = true;
      setTimeout(() => { copySuccess = false; }, 2000);
    } catch {
      // Fallback: silent fail
    }
  }

  function clauseTypeLabel(type: ClauseType): string {
    switch (type) {
      case 'comparison': return 'Field Comparison';
      case 'conditional-required': return 'Conditional Required';
      case 'mutual-exclusion': return 'Mutual Exclusion';
      case 'custom': return 'Custom Expression';
    }
  }

  function clauseTypeIcon(type: ClauseType): string {
    switch (type) {
      case 'comparison': return 'fa-not-equal';
      case 'conditional-required': return 'fa-code-branch';
      case 'mutual-exclusion': return 'fa-ban';
      case 'custom': return 'fa-terminal';
    }
  }

  const COMPARISON_OPERATORS = ['>', '<', '>=', '<=', '==', '!='];

  const CONDITION_TYPES = [
    { value: 'is_truthy', label: 'is truthy' },
    { value: 'is_falsy', label: 'is falsy' },
    { value: 'equals', label: 'equals' }
  ];

  const CLAUSE_TYPE_OPTIONS: { type: ClauseType; label: string; icon: string; description: string }[] = [
    { type: 'comparison', label: 'Field Comparison', icon: 'fa-not-equal', description: 'Compare two fields (e.g. end_date > start_date)' },
    { type: 'conditional-required', label: 'Conditional Required', icon: 'fa-code-branch', description: 'If field_a meets condition, then field_b is required' },
    { type: 'mutual-exclusion', label: 'Mutual Exclusion', icon: 'fa-ban', description: 'Two fields cannot both have values' },
    { type: 'custom', label: 'Custom Expression', icon: 'fa-terminal', description: 'Free-form Python validation code' }
  ];
</script>

<!-- ======================================================================== -->
<!-- LIST VIEW                                                                 -->
<!-- ======================================================================== -->

{#if currentView === 'list'}
  <PageHeader title="Dual-Mode Editor">
    {#snippet actions()}
      <button
        type="button"
        onclick={openNewValidator}
        class="px-4 py-2 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors"
      >
        <i class="fa-solid fa-plus"></i>
        <span>New Validator</span>
      </button>
    {/snippet}
  </PageHeader>

  <div class="p-6">
    <p class="text-sm text-mono-500 mb-6 max-w-3xl">
      Model validators validate the entire model, accessing all fields simultaneously.
      They enable cross-field validation: "end_date must be after start_date",
      "provide email or phone but not both", "if is_company then company_name is required".
    </p>

    {#if validators.length === 0}
      <div class="bg-white rounded-lg border border-mono-200">
        <div class="text-center py-12 text-mono-500">
          <i class="fa-solid fa-diagram-project text-3xl mb-3 text-mono-300"></i>
          <p class="text-sm">No model validators yet. Create your first one.</p>
        </div>
      </div>
    {:else}
      <div class="bg-white rounded-lg border border-mono-200 overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-mono-50 border-b border-mono-200">
              <th class="text-left px-4 py-3 text-xs font-medium text-mono-500 uppercase tracking-wide">Name</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-mono-500 uppercase tracking-wide">Object</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-mono-500 uppercase tracking-wide">Mode</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-mono-500 uppercase tracking-wide">Clauses</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-mono-500 uppercase tracking-wide">Description</th>
              <th class="w-16 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {#each validators as validator (validator.id)}
              <tr
                class="border-b border-mono-100 last:border-b-0 hover:bg-mono-50 cursor-pointer transition-colors"
                onclick={() => openExistingValidator(validator)}
              >
                <td class="px-4 py-3 text-sm text-mono-900 font-medium">{validator.name}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 text-xs rounded-full bg-mono-100 text-mono-600">
                    {validator.objectName}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 text-xs font-mono rounded bg-mono-100 text-mono-600">
                    {validator.mode}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-mono-500">{validator.clauses.length}</td>
                <td class="px-4 py-3 text-sm text-mono-500 max-w-xs truncate">{validator.description}</td>
                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    onclick={(e) => { e.stopPropagation(); deleteValidator(validator.id); }}
                    class="text-mono-300 hover:text-red-600 transition-colors"
                    title="Delete validator"
                  >
                    <i class="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

<!-- ======================================================================== -->
<!-- OBJECT SELECTION VIEW                                                     -->
<!-- ======================================================================== -->

{:else if currentView === 'select-object'}
  <div class="bg-white border-b border-mono-200 py-4 px-6">
    <button
      onclick={backToList}
      class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-2"
    >
      <i class="fa-solid fa-arrow-left text-xs"></i>
      <span>Back to List</span>
    </button>
    <h1 class="text-xl font-semibold text-mono-900">Select Object</h1>
    <p class="text-sm text-mono-500 mt-1">Choose the object this model validator will apply to.</p>
  </div>

  <div class="p-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
      {#each mockObjects as obj (obj.id)}
        <button
          type="button"
          onclick={() => selectObjectAndProceed(obj.id)}
          class="group text-left bg-white border border-mono-200 rounded-lg p-5
                 hover:shadow-md hover:-translate-y-0.5
                 transition-all duration-200 ease-out
                 focus:outline-none focus:ring-2 focus:ring-mono-400 focus:ring-offset-2"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="w-10 h-10 rounded-full bg-mono-100 flex items-center justify-center
                        group-hover:bg-mono-900 transition-colors duration-200">
              <i class="fa-solid fa-cubes text-sm text-mono-500
                         group-hover:text-white transition-colors duration-200"></i>
            </div>
            <span class="text-xs text-mono-400">{obj.fields.length} fields</span>
          </div>

          <h3 class="text-sm font-semibold text-mono-800 mb-2">{obj.name}</h3>

          <div class="flex flex-wrap gap-1">
            {#each obj.fields.slice(0, 4) as field}
              <span class="px-1.5 py-0.5 text-[10px] font-mono rounded bg-mono-100 text-mono-500 border border-mono-200">
                {field.name}
              </span>
            {/each}
            {#if obj.fields.length > 4}
              <span class="px-1.5 py-0.5 text-[10px] font-mono rounded bg-mono-50 text-mono-400">
                +{obj.fields.length - 4} more
              </span>
            {/if}
          </div>

          <div class="mt-3 flex items-center text-xs text-mono-300 group-hover:text-mono-500 transition-colors duration-200">
            <span>Select</span>
            <i class="fa-solid fa-arrow-right ml-1.5 text-[10px]
                       group-hover:translate-x-1 transition-transform duration-200"></i>
          </div>
        </button>
      {/each}
    </div>
  </div>

<!-- ======================================================================== -->
<!-- EDITOR VIEW (Three-panel layout)                                          -->
<!-- ======================================================================== -->

{:else if currentView === 'editor'}
  <div class="flex flex-col flex-1 overflow-hidden">

    <!-- ================================================================ -->
    <!-- HEADER                                                            -->
    <!-- ================================================================ -->

    <div class="bg-white border-b border-mono-200 py-3 px-6 flex-shrink-0">
      <div class="flex justify-between items-start">
        <div>
          <button
            onclick={backToList}
            class="text-sm text-mono-500 hover:text-mono-700 transition-colors flex items-center space-x-1 mb-1"
          >
            <i class="fa-solid fa-arrow-left text-xs"></i>
            <span>Back to List</span>
          </button>
          <h1 class="text-lg font-semibold text-mono-900">
            {editingValidatorId ? 'Edit Model Validator' : 'New Model Validator'}
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={copyCode}
            class="px-3 py-1.5 border rounded-md flex items-center space-x-2 text-sm transition-colors
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
          <button
            type="button"
            onclick={saveValidator}
            class="px-4 py-1.5 bg-mono-900 text-white rounded-md flex items-center space-x-2 hover:bg-mono-800 cursor-pointer transition-colors text-sm"
          >
            <i class="fa-solid fa-save text-xs"></i>
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- METADATA BAR                                                      -->
    <!-- ================================================================ -->

    <div class="bg-white border-b border-mono-200 px-6 py-3 flex-shrink-0">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <label for="mv-name" class="text-xs font-medium text-mono-500 whitespace-nowrap">Name</label>
          <input
            id="mv-name"
            type="text"
            bind:value={validatorName}
            placeholder="e.g. validate_date_order"
            class="px-2.5 py-1.5 text-sm border border-mono-200 rounded-md font-mono
                   focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                   placeholder:text-mono-300 w-52"
          />
        </div>

        <div class="flex items-center gap-2">
          <label for="mv-mode" class="text-xs font-medium text-mono-500 whitespace-nowrap">Mode</label>
          <select
            id="mv-mode"
            bind:value={validatorMode}
            class="px-2.5 py-1.5 text-sm border border-mono-200 rounded-md bg-white font-mono
                   focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400"
          >
            <option value="before">before</option>
            <option value="after">after</option>
          </select>
        </div>

        <div class="flex items-center gap-2">
          <label for="mv-object" class="text-xs font-medium text-mono-500 whitespace-nowrap">Object</label>
          <span class="px-2.5 py-1.5 text-sm bg-mono-100 text-mono-700 rounded-md font-mono border border-mono-200">
            {selectedObject?.name ?? 'None'}
          </span>
        </div>

        <div class="flex-1 flex items-center gap-2">
          <label for="mv-description" class="text-xs font-medium text-mono-500 whitespace-nowrap">Description</label>
          <input
            id="mv-description"
            type="text"
            bind:value={validatorDescription}
            placeholder="What does this validator check?"
            class="flex-1 px-2.5 py-1.5 text-sm border border-mono-200 rounded-md
                   focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                   placeholder:text-mono-300"
          />
        </div>
      </div>
    </div>

    <!-- ================================================================ -->
    <!-- THREE-PANEL LAYOUT                                                -->
    <!-- ================================================================ -->

    <div class="flex flex-1 overflow-hidden min-h-0">

      <!-- LEFT PANEL: Object Context -->
      <div class="w-[250px] flex-shrink-0 bg-white border-r border-mono-200 flex flex-col overflow-hidden">
        <div class="px-4 py-3 border-b border-mono-200 flex-shrink-0">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-cubes text-xs text-mono-400"></i>
            <span class="text-xs font-medium text-mono-700">{selectedObject?.name ?? 'Object'} Fields</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-3">
          {#if selectedObjectFields.length === 0}
            <p class="text-xs text-mono-400 text-center py-4">No fields</p>
          {:else}
            <div class="space-y-1.5">
              {#each selectedObjectFields as field}
                <div class="flex items-center justify-between px-2.5 py-2 rounded-md bg-mono-50 border border-mono-100">
                  <div class="min-w-0">
                    <div class="text-sm text-mono-800 font-medium truncate">{field.name}</div>
                    <div class="text-[10px] text-mono-400 font-mono mt-0.5">{field.type}</div>
                  </div>
                  <div class="flex-shrink-0 ml-2">
                    {#if field.required}
                      <span class="px-1.5 py-0.5 text-[9px] rounded bg-mono-200 text-mono-600 uppercase tracking-wide">req</span>
                    {:else}
                      <span class="px-1.5 py-0.5 text-[9px] rounded bg-mono-100 text-mono-400 uppercase tracking-wide">opt</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Mode info at the bottom of the left panel -->
        <div class="px-4 py-3 border-t border-mono-200 flex-shrink-0 bg-mono-50">
          <div class="text-[10px] text-mono-400 uppercase tracking-wide mb-1">Accessor</div>
          {#if validatorMode === 'before'}
            <code class="text-xs font-mono text-mono-600">data.get('field')</code>
          {:else}
            <code class="text-xs font-mono text-mono-600">self.field</code>
          {/if}
        </div>
      </div>

      <!-- CENTER PANEL: Dual Mode (Clauses / Code) -->
      <div class="flex-1 flex flex-col overflow-hidden min-w-0">

        <!-- Tab switcher -->
        <div class="flex items-center border-b border-mono-200 bg-white flex-shrink-0">
          <button
            type="button"
            onclick={switchToClausesTab}
            class="px-5 py-2.5 text-sm font-medium transition-colors relative
                   {activeTab === 'clauses'
                     ? 'text-mono-900'
                     : 'text-mono-400 hover:text-mono-600'}"
          >
            <i class="fa-solid fa-list-check mr-1.5 text-xs"></i>
            Clauses
            {#if activeTab === 'clauses'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-mono-900"></div>
            {/if}
          </button>
          <button
            type="button"
            onclick={switchToCodeTab}
            class="px-5 py-2.5 text-sm font-medium transition-colors relative
                   {activeTab === 'code'
                     ? 'text-mono-900'
                     : 'text-mono-400 hover:text-mono-600'}"
          >
            <i class="fa-solid fa-code mr-1.5 text-xs"></i>
            Code
            {#if activeTab === 'code'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-mono-900"></div>
            {/if}
          </button>

          {#if activeTab === 'clauses'}
            <div class="ml-auto mr-3 relative">
              <button
                type="button"
                onclick={() => showAddClauseMenu = !showAddClauseMenu}
                class="px-3 py-1.5 text-xs bg-mono-900 text-white rounded-md flex items-center space-x-1.5 hover:bg-mono-800 transition-colors"
              >
                <i class="fa-solid fa-plus text-[10px]"></i>
                <span>Add Clause</span>
              </button>

              {#if showAddClauseMenu}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                  class="fixed inset-0 z-40"
                  onclick={() => showAddClauseMenu = false}
                ></div>
                <div class="absolute right-0 top-full mt-1 z-50 w-72 bg-white border border-mono-200 rounded-lg shadow-lg overflow-hidden">
                  {#each CLAUSE_TYPE_OPTIONS as option}
                    <button
                      type="button"
                      onclick={() => addClause(option.type)}
                      class="w-full text-left px-4 py-3 hover:bg-mono-50 transition-colors border-b border-mono-100 last:border-b-0"
                    >
                      <div class="flex items-center gap-2 mb-0.5">
                        <i class="fa-solid {option.icon} text-xs text-mono-400"></i>
                        <span class="text-sm font-medium text-mono-800">{option.label}</span>
                      </div>
                      <p class="text-xs text-mono-400 ml-5">{option.description}</p>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Tab content -->
        <div class="flex-1 overflow-y-auto bg-mono-50">

          <!-- CLAUSES TAB -->
          {#if activeTab === 'clauses'}
            {#if clauses.length === 0}
              <div class="flex flex-col items-center justify-center h-full text-mono-400">
                <i class="fa-solid fa-list-check text-3xl mb-3 text-mono-300"></i>
                <p class="text-sm mb-1">No validation clauses yet</p>
                <p class="text-xs text-mono-300">Click "Add Clause" to define cross-field validation rules</p>
              </div>
            {:else}
              <div class="p-4 space-y-3">
                {#each clauses as clause, index (clause.id)}
                  <div class="bg-white border border-mono-200 rounded-lg overflow-hidden">
                    <!-- Clause header -->
                    <div class="flex items-center justify-between px-4 py-2.5 bg-mono-50 border-b border-mono-200">
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-mono-400 font-mono">#{index + 1}</span>
                        <i class="fa-solid {clauseTypeIcon(clause.type)} text-xs text-mono-400"></i>
                        <span class="text-xs font-medium text-mono-700">{clauseTypeLabel(clause.type)}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <button
                          type="button"
                          onclick={() => moveClauseUp(index)}
                          disabled={index === 0}
                          class="w-6 h-6 flex items-center justify-center rounded text-mono-400 transition-colors
                                 {index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-mono-200 hover:text-mono-600'}"
                          title="Move up"
                        >
                          <i class="fa-solid fa-chevron-up text-[10px]"></i>
                        </button>
                        <button
                          type="button"
                          onclick={() => moveClauseDown(index)}
                          disabled={index === clauses.length - 1}
                          class="w-6 h-6 flex items-center justify-center rounded text-mono-400 transition-colors
                                 {index === clauses.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-mono-200 hover:text-mono-600'}"
                          title="Move down"
                        >
                          <i class="fa-solid fa-chevron-down text-[10px]"></i>
                        </button>
                        <button
                          type="button"
                          onclick={() => removeClause(clause.id)}
                          class="w-6 h-6 flex items-center justify-center rounded text-mono-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remove clause"
                        >
                          <i class="fa-solid fa-xmark text-xs"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Clause form -->
                    <div class="px-4 py-3">

                      <!-- FIELD COMPARISON -->
                      {#if clause.type === 'comparison'}
                        <div class="flex items-center gap-2 flex-wrap">
                          <select
                            bind:value={clause.fieldA}
                            class="px-2 py-1.5 text-sm border border-mono-200 rounded-md bg-white font-mono
                                   focus:outline-none focus:ring-1 focus:ring-mono-400"
                          >
                            <option value="">field_a</option>
                            {#each fieldNames as name}
                              <option value={name}>{name}</option>
                            {/each}
                          </select>

                          <select
                            bind:value={clause.operator}
                            class="px-2 py-1.5 text-sm border border-mono-200 rounded-md bg-white font-mono
                                   focus:outline-none focus:ring-1 focus:ring-mono-400 w-16"
                          >
                            {#each COMPARISON_OPERATORS as op}
                              <option value={op}>{op}</option>
                            {/each}
                          </select>

                          <select
                            bind:value={clause.fieldB}
                            class="px-2 py-1.5 text-sm border border-mono-200 rounded-md bg-white font-mono
                                   focus:outline-none focus:ring-1 focus:ring-mono-400"
                          >
                            <option value="">field_b</option>
                            {#each fieldNames as name}
                              <option value={name}>{name}</option>
                            {/each}
                          </select>

                          <input
                            type="text"
                            bind:value={clause.errorMessage}
                            placeholder="Error message..."
                            class="flex-1 px-2 py-1.5 text-sm border border-mono-200 rounded-md
                                   focus:outline-none focus:ring-1 focus:ring-mono-400 placeholder:text-mono-300 min-w-[200px]"
                          />
                        </div>

                      <!-- CONDITIONAL REQUIRED -->
                      {:else if clause.type === 'conditional-required'}
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-xs text-mono-500">If</span>

                          <select
                            bind:value={clause.conditionField}
                            class="px-2 py-1.5 text-sm border border-mono-200 rounded-md bg-white font-mono
                                   focus:outline-none focus:ring-1 focus:ring-mono-400"
                          >
                            <option value="">field</option>
                            {#each fieldNames as name}
                              <option value={name}>{name}</option>
                            {/each}
                          </select>

                          <select
                            bind:value={clause.conditionType}
                            class="px-2 py-1.5 text-sm border border-mono-200 rounded-md bg-white
                                   focus:outline-none focus:ring-1 focus:ring-mono-400"
                          >
                            {#each CONDITION_TYPES as ct}
                              <option value={ct.value}>{ct.label}</option>
                            {/each}
                          </select>

                          {#if clause.conditionType === 'equals'}
                            <input
                              type="text"
                              bind:value={clause.conditionValue}
                              placeholder="value"
                              class="px-2 py-1.5 text-sm border border-mono-200 rounded-md font-mono w-24
                                     focus:outline-none focus:ring-1 focus:ring-mono-400 placeholder:text-mono-300"
                            />
                          {/if}

                          <span class="text-xs text-mono-500">then</span>

                          <select
                            bind:value={clause.requiredField}
                            class="px-2 py-1.5 text-sm border border-mono-200 rounded-md bg-white font-mono
                                   focus:outline-none focus:ring-1 focus:ring-mono-400"
                          >
                            <option value="">field</option>
                            {#each fieldNames as name}
                              <option value={name}>{name}</option>
                            {/each}
                          </select>

                          <span class="text-xs text-mono-500">is required</span>

                          <input
                            type="text"
                            bind:value={clause.errorMessage}
                            placeholder="Error message..."
                            class="flex-1 px-2 py-1.5 text-sm border border-mono-200 rounded-md
                                   focus:outline-none focus:ring-1 focus:ring-mono-400 placeholder:text-mono-300 min-w-[180px]"
                          />
                        </div>

                      <!-- MUTUAL EXCLUSION -->
                      {:else if clause.type === 'mutual-exclusion'}
                        <div class="flex items-center gap-2 flex-wrap">
                          <select
                            bind:value={clause.exclusionFieldA}
                            class="px-2 py-1.5 text-sm border border-mono-200 rounded-md bg-white font-mono
                                   focus:outline-none focus:ring-1 focus:ring-mono-400"
                          >
                            <option value="">field_a</option>
                            {#each fieldNames as name}
                              <option value={name}>{name}</option>
                            {/each}
                          </select>

                          <span class="text-xs text-mono-500">and</span>

                          <select
                            bind:value={clause.exclusionFieldB}
                            class="px-2 py-1.5 text-sm border border-mono-200 rounded-md bg-white font-mono
                                   focus:outline-none focus:ring-1 focus:ring-mono-400"
                          >
                            <option value="">field_b</option>
                            {#each fieldNames as name}
                              <option value={name}>{name}</option>
                            {/each}
                          </select>

                          <span class="text-xs text-mono-500">cannot both be set</span>

                          <input
                            type="text"
                            bind:value={clause.errorMessage}
                            placeholder="Error message..."
                            class="flex-1 px-2 py-1.5 text-sm border border-mono-200 rounded-md
                                   focus:outline-none focus:ring-1 focus:ring-mono-400 placeholder:text-mono-300 min-w-[200px]"
                          />
                        </div>

                      <!-- CUSTOM EXPRESSION -->
                      {:else if clause.type === 'custom'}
                        <div class="space-y-2">
                          <textarea
                            bind:value={clause.expression}
                            placeholder="# Write custom Python validation code&#10;if self.field_a and self.field_b:&#10;    raise ValueError('Custom validation error')"
                            rows="4"
                            class="w-full px-3 py-2 text-sm font-mono border border-mono-200 rounded-md bg-mono-50
                                   focus:outline-none focus:ring-1 focus:ring-mono-400 placeholder:text-mono-300
                                   resize-y"
                          ></textarea>
                        </div>
                      {/if}
                    </div>

                    <!-- Clause code snippet -->
                    <div class="px-4 py-2 bg-mono-900 border-t border-mono-200">
                      <pre class="font-mono text-[11px] leading-relaxed whitespace-pre text-mono-400">{@html highlightPython(generateClauseSnippet(clause))}</pre>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

          <!-- CODE TAB -->
          {:else}
            <div class="flex flex-col h-full">
              <div class="flex items-center justify-between px-4 py-2 bg-mono-800 flex-shrink-0">
                <div class="flex items-center gap-2">
                  <i class="fa-solid fa-code text-xs text-mono-400"></i>
                  <span class="text-xs text-mono-400 font-mono">{functionName}.py</span>
                </div>
                {#if codeManuallyEdited}
                  <span class="text-[10px] text-yellow-400 flex items-center gap-1">
                    <i class="fa-solid fa-pen text-[8px]"></i>
                    manually edited
                  </span>
                {/if}
              </div>
              <textarea
                value={codeManuallyEdited ? codeContent : generatedCode}
                oninput={handleCodeInput}
                class="flex-1 w-full bg-mono-900 text-mono-100 font-mono text-sm p-4
                       resize-none border-none outline-none leading-relaxed"
                spellcheck="false"
              ></textarea>
            </div>
          {/if}
        </div>
      </div>

      <!-- RIGHT PANEL: Preview -->
      <div class="w-[350px] flex-shrink-0 bg-mono-900 flex flex-col overflow-hidden border-l border-mono-700">
        <div class="flex items-center justify-between px-4 py-2.5 bg-mono-800 border-b border-mono-700 flex-shrink-0">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-eye text-xs text-mono-400"></i>
            <span class="text-xs text-mono-400 font-mono">preview</span>
          </div>
          <button
            type="button"
            onclick={copyCode}
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors
                   {copySuccess
                     ? 'bg-mono-600 text-white'
                     : 'text-mono-400 hover:text-mono-200 hover:bg-mono-700'}"
          >
            {#if copySuccess}
              <i class="fa-solid fa-check text-[10px]"></i>
              <span>Copied</span>
            {:else}
              <i class="fa-regular fa-copy text-[10px]"></i>
              <span>Copy</span>
            {/if}
          </button>
        </div>

        <div class="flex-1 overflow-auto p-4">
          <pre class="font-mono text-sm leading-relaxed whitespace-pre" style="color: #f5f5f5">{@html highlightedCode}</pre>
        </div>
      </div>

    </div>
  </div>
{/if}

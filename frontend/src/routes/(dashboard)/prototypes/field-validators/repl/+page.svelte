<script lang="ts">
  import { PageHeader } from '$lib/components';

  // ============================================================================
  // TYPES
  // ============================================================================

  type LineType = 'statement' | 'continuation';

  type ReplLine = {
    id: number;
    code: string;
    type: LineType;
  };

  type TraceStep = {
    lineIndex: number;
    lineCode: string;
    valueAfter: string;
    conditionResult?: string;
    isError: boolean;
    errorMessage?: string;
  };

  type TestInput = {
    id: number;
    value: string;
  };

  type TestResult = {
    inputId: number;
    success: boolean;
    finalValue: string;
    errorMessage?: string;
    trace: TraceStep[];
  };

  // ============================================================================
  // AUTOCOMPLETE SUGGESTIONS
  // ============================================================================

  const AUTOCOMPLETE_SUGGESTIONS: string[] = [
    'v = v.strip()',
    'v = v.lower()',
    'v = v.upper()',
    'v = v.title()',
    'v = int(v)',
    'v = float(v)',
    'if len(v) < :',
    'if len(v) > :',
    'if not v:',
    "if not re.match(r'', v):",
    'if v not in []:',
    "raise ValueError('')",
    '# comment'
  ];

  // ============================================================================
  // SYNTAX HIGHLIGHTING
  // ============================================================================

  const HIGHLIGHT_COLORS = {
    keyword: '#60a5fa',
    decorator: '#fbbf24',
    string: '#4ade80',
    comment: '#9ca3af',
    number: '#fb923c',
    builtin: '#f472b6',
    default: '#f5f5f5'
  };

  const PYTHON_KEYWORDS = new Set([
    'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from',
    'raise', 'try', 'except', 'not', 'and', 'or', 'in', 'is', 'as',
    'with', 'pass', 'break', 'continue', 'class', 'True', 'False', 'None',
    'def'
  ]);

  const PYTHON_BUILTINS = new Set([
    'len', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set',
    'any', 'all', 'ValueError', 'TypeError', 'Exception', 're',
    'field_validator', 'classmethod', 'print'
  ]);

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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
    const match = line.match(/^(def )(\w+)(\(.*?\))(:)$/);
    if (match) {
      let result = colorSpan('def', HIGHLIGHT_COLORS.keyword) + ' ';
      result += colorSpan(escapeHtml(match[2]), '#c4b5fd');
      result += escapeHtml(match[3]);
      result += ':';
      return result;
    }
    return colorSpan('def', HIGHLIGHT_COLORS.keyword) + ' ' + escapeHtml(line.slice(4));
  }

  function highlightTokens(line: string): string {
    let result = '';
    let i = 0;

    while (i < line.length) {
      // String literals
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

      // Inline comment
      if (line[i] === '#') {
        result += colorSpan(escapeHtml(line.slice(i)), HIGHLIGHT_COLORS.comment);
        break;
      }

      // Numbers
      if (/\d/.test(line[i]) && (i === 0 || /[\s(,=<>!+\-*/%[\]]/.test(line[i - 1]))) {
        let j = i;
        while (j < line.length && /[\d.]/.test(line[j])) j++;
        result += colorSpan(escapeHtml(line.slice(i, j)), HIGHLIGHT_COLORS.number);
        i = j;
        continue;
      }

      // Words
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

  function highlightPython(code: string): string {
    return code.split('\n').map(highlightLine).join('\n');
  }

  // ============================================================================
  // REPL EXECUTION ENGINE
  // ============================================================================

  /**
   * Simulates Python REPL line execution using JavaScript equivalents.
   * This is a simplified interpreter that handles common validator patterns.
   */
  function executeReplLines(lines: ReplLine[], inputValue: string): TestResult {
    const trace: TraceStep[] = [];
    let v = inputValue;
    const locals: Record<string, string> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const code = line.code.trim();

      // Skip empty lines and comments
      if (!code || code.startsWith('#')) continue;

      // Skip continuation lines that are handled by the preceding if-block
      if (line.type === 'continuation') continue;

      try {
        // Check if this is an if-block: find its continuation lines (raise/body)
        if (code.startsWith('if ')) {
          const conditionCode = code.slice(3, -1).trim(); // remove "if " and trailing ":"
          const conditionResult = evaluateCondition(conditionCode, v, locals);

          if (conditionResult) {
            // Find the next continuation line(s) for the body
            const bodyLines = collectContinuationBody(lines, i);
            for (const bodyLine of bodyLines) {
              const bodyCode = bodyLine.trim();
              if (bodyCode.startsWith('raise ValueError(')) {
                const msgMatch = bodyCode.match(/raise ValueError\(['"](.+?)['"]\)/);
                const errorMsg = msgMatch ? msgMatch[1] : 'Validation error';
                trace.push({
                  lineIndex: i,
                  lineCode: code,
                  valueAfter: v,
                  conditionResult: 'True',
                  isError: true,
                  errorMessage: errorMsg
                });
                return {
                  inputId: 0,
                  success: false,
                  finalValue: '',
                  errorMessage: errorMsg,
                  trace
                };
              }
            }

            trace.push({
              lineIndex: i,
              lineCode: code,
              valueAfter: v,
              conditionResult: 'True',
              isError: false
            });
          } else {
            trace.push({
              lineIndex: i,
              lineCode: code,
              valueAfter: v,
              conditionResult: 'False (continue)',
              isError: false
            });
          }
          continue;
        }

        // Transform: v = v.something() or v = func(v)
        if (code.startsWith('v = ')) {
          const expr = code.slice(4).trim();
          v = evaluateTransform(expr, v, locals);
          trace.push({
            lineIndex: i,
            lineCode: code,
            valueAfter: v,
            isError: false
          });
          continue;
        }

        // Assignment to local variable: name = expr
        const assignMatch = code.match(/^(\w+)\s*=\s*(.+)$/);
        if (assignMatch) {
          const varName = assignMatch[1];
          const expr = assignMatch[2].trim();
          locals[varName] = evaluateTransform(expr, v, locals);
          trace.push({
            lineIndex: i,
            lineCode: code,
            valueAfter: v,
            isError: false
          });
          continue;
        }

        // Standalone raise
        if (code.startsWith('raise ValueError(')) {
          const msgMatch = code.match(/raise ValueError\(['"](.+?)['"]\)/);
          const errorMsg = msgMatch ? msgMatch[1] : 'Validation error';
          trace.push({
            lineIndex: i,
            lineCode: code,
            valueAfter: v,
            isError: true,
            errorMessage: errorMsg
          });
          return {
            inputId: 0,
            success: false,
            finalValue: '',
            errorMessage: errorMsg,
            trace
          };
        }

        // Unknown line -- just record in trace
        trace.push({
          lineIndex: i,
          lineCode: code,
          valueAfter: v,
          isError: false
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Execution error';
        trace.push({
          lineIndex: i,
          lineCode: code,
          valueAfter: v,
          isError: true,
          errorMessage: errorMsg
        });
        return {
          inputId: 0,
          success: false,
          finalValue: '',
          errorMessage: errorMsg,
          trace
        };
      }
    }

    return {
      inputId: 0,
      success: true,
      finalValue: v,
      trace
    };
  }

  /** Collect indented body lines following an if-statement */
  function collectContinuationBody(lines: ReplLine[], ifIndex: number): string[] {
    const body: string[] = [];
    for (let j = ifIndex + 1; j < lines.length; j++) {
      if (lines[j].type === 'continuation') {
        body.push(lines[j].code.trim());
      } else {
        break;
      }
    }
    return body;
  }

  /** Evaluate a Python condition expression using JS equivalents */
  function evaluateCondition(condition: string, v: string, locals: Record<string, string>): boolean {
    // not v  -->  !v || v.length === 0
    if (condition === 'not v') {
      return !v || v.length === 0;
    }

    // len(v) < N
    const lenLt = condition.match(/^len\(v\)\s*<\s*(\d+)$/);
    if (lenLt) return v.length < parseInt(lenLt[1]);

    // len(v) > N
    const lenGt = condition.match(/^len\(v\)\s*>\s*(\d+)$/);
    if (lenGt) return v.length > parseInt(lenGt[1]);

    // len(v) <= N
    const lenLte = condition.match(/^len\(v\)\s*<=\s*(\d+)$/);
    if (lenLte) return v.length <= parseInt(lenLte[1]);

    // len(v) >= N
    const lenGte = condition.match(/^len\(v\)\s*>=\s*(\d+)$/);
    if (lenGte) return v.length >= parseInt(lenGte[1]);

    // not re.match(r'pattern', v)
    const reNotMatch = condition.match(/^not re\.match\(r['"](.*?)['"],\s*v\)$/);
    if (reNotMatch) {
      try {
        return !new RegExp(reNotMatch[1]).test(v);
      } catch {
        return false;
      }
    }

    // re.match(r'pattern', v)
    const reMatch = condition.match(/^re\.match\(r['"](.*?)['"],\s*v\)$/);
    if (reMatch) {
      try {
        return new RegExp(reMatch[1]).test(v);
      } catch {
        return false;
      }
    }

    // v not in [list]
    const notIn = condition.match(/^v\s+not\s+in\s+\[(.+)\]$/);
    if (notIn) {
      const items = notIn[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
      return !items.includes(v);
    }

    // v in [list]
    const inList = condition.match(/^v\s+in\s+\[(.+)\]$/);
    if (inList) {
      const items = inList[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
      return items.includes(v);
    }

    // v == 'something'
    const eq = condition.match(/^v\s*==\s*['"](.+?)['"]$/);
    if (eq) return v === eq[1];

    // v != 'something'
    const neq = condition.match(/^v\s*!=\s*['"](.+?)['"]$/);
    if (neq) return v !== neq[1];

    return false;
  }

  /** Evaluate a Python transform expression using JS equivalents */
  function evaluateTransform(expr: string, v: string, locals: Record<string, string>): string {
    // v.strip()
    if (expr === 'v.strip()') return v.trim();

    // v.lower()
    if (expr === 'v.lower()') return v.toLowerCase();

    // v.upper()
    if (expr === 'v.upper()') return v.toUpperCase();

    // v.title()
    if (expr === 'v.title()') {
      return v.replace(/\w\S*/g, txt =>
        txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
      );
    }

    // v.replace('a', 'b')
    const replaceMatch = expr.match(/^v\.replace\(['"](.+?)['"]\s*,\s*['"](.+?)['"]\)$/);
    if (replaceMatch) return v.replaceAll(replaceMatch[1], replaceMatch[2]);

    // int(v)
    if (expr === 'int(v)') {
      const n = parseInt(v);
      if (isNaN(n)) throw new Error('Cannot convert to int');
      return String(n);
    }

    // float(v)
    if (expr === 'float(v)') {
      const n = parseFloat(v);
      if (isNaN(n)) throw new Error('Cannot convert to float');
      return String(n);
    }

    // v.lstrip() / v.rstrip()
    if (expr === 'v.lstrip()') return v.replace(/^\s+/, '');
    if (expr === 'v.rstrip()') return v.replace(/\s+$/, '');

    // v[:N] (slice)
    const sliceMatch = expr.match(/^v\[:(\d+)\]$/);
    if (sliceMatch) return v.slice(0, parseInt(sliceMatch[1]));

    // Reference to local variable
    if (locals[expr] !== undefined) return locals[expr];

    // Fallback: return v unchanged
    return v;
  }

  // ============================================================================
  // STATE
  // ============================================================================

  let lineIdCounter = $state(100);

  function nextId(): number {
    lineIdCounter++;
    return lineIdCounter;
  }

  let validatorName = $state('validate_username');
  let targetField = $state('username');
  let validatorMode = $state<'before' | 'after'>('before');

  let replLines = $state<ReplLine[]>([
    { id: 1, code: '# Validate username field', type: 'statement' },
    { id: 2, code: 'v = v.strip()', type: 'statement' },
    { id: 3, code: 'v = v.lower()', type: 'statement' },
    { id: 4, code: 'if not v:', type: 'statement' },
    { id: 5, code: "raise ValueError('Cannot be empty')", type: 'continuation' },
    { id: 6, code: 'if len(v) < 3:', type: 'statement' },
    { id: 7, code: "raise ValueError('Must be at least 3 characters')", type: 'continuation' },
    { id: 8, code: "if not re.match(r'^[a-zA-Z0-9_]+$', v):", type: 'statement' },
    { id: 9, code: "raise ValueError('Only alphanumeric and underscores')", type: 'continuation' }
  ]);

  let testInputs = $state<TestInput[]>([
    { id: 1, value: '  Alice  ' },
    { id: 2, value: 'ab' },
    { id: 3, value: '' },
    { id: 4, value: 'valid_user' }
  ]);

  let testInputIdCounter = $state(10);

  let selectedTestId = $state<number | null>(null);
  let newLineCode = $state('');
  let copySuccess = $state(false);
  let showAutocomplete = $state(false);
  let focusedLineId = $state<number | null>(null);
  let focusedLineAutocomplete = $state<string[]>([]);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  let testResults = $derived.by((): TestResult[] => {
    return testInputs.map(input => {
      const result = executeReplLines(replLines, input.value);
      result.inputId = input.id;
      return result;
    });
  });

  /** Build the generated Python code from the REPL lines */
  let generatedCode = $derived.by((): string => {
    const needsRe = replLines.some(l => l.code.includes('re.match'));
    const lines: string[] = [];

    lines.push('from pydantic import field_validator');
    if (needsRe) lines.push('import re');
    lines.push('');
    lines.push(`@field_validator('${targetField}', mode='${validatorMode}')`);
    lines.push('@classmethod');
    lines.push(`def ${validatorName}(cls, v):`);

    for (const line of replLines) {
      const code = line.code;
      if (line.type === 'continuation') {
        lines.push(`        ${code}`);
      } else {
        lines.push(`    ${code}`);
      }
    }

    lines.push('    return v');
    return lines.join('\n');
  });

  let highlightedGeneratedCode = $derived(highlightPython(generatedCode));

  /** Filter autocomplete suggestions based on current new line input */
  let filteredSuggestions = $derived.by((): string[] => {
    if (!newLineCode.trim()) return AUTOCOMPLETE_SUGGESTIONS;
    const lower = newLineCode.toLowerCase();
    return AUTOCOMPLETE_SUGGESTIONS.filter(s => s.toLowerCase().includes(lower));
  });

  // ============================================================================
  // LINE EDITING HELPERS
  // ============================================================================

  function getFilteredSuggestionsFor(code: string): string[] {
    if (!code.trim()) return AUTOCOMPLETE_SUGGESTIONS;
    const lower = code.toLowerCase();
    return AUTOCOMPLETE_SUGGESTIONS.filter(s => s.toLowerCase().includes(lower));
  }

  function updateLineCode(lineId: number, newCode: string) {
    replLines = replLines.map(l =>
      l.id === lineId ? { ...l, code: newCode } : l
    );
  }

  function handleLineFocus(lineId: number) {
    const line = replLines.find(l => l.id === lineId);
    if (line) {
      focusedLineId = lineId;
      focusedLineAutocomplete = getFilteredSuggestionsFor(line.code);
    }
  }

  function handleLineInput(lineId: number, newCode: string) {
    updateLineCode(lineId, newCode);
    focusedLineAutocomplete = getFilteredSuggestionsFor(newCode);
  }

  function handleLineBlur() {
    // Delay to allow click on autocomplete item
    setTimeout(() => {
      focusedLineId = null;
      focusedLineAutocomplete = [];
    }, 200);
  }

  function selectSuggestionForLine(lineId: number, suggestion: string) {
    updateLineCode(lineId, suggestion);
    focusedLineId = null;
    focusedLineAutocomplete = [];
  }

  function removeLine(lineId: number) {
    replLines = replLines.filter(l => l.id !== lineId);
  }

  /** Determine the line type based on surrounding context */
  function inferLineType(code: string, insertIndex: number): LineType {
    if (insertIndex > 0) {
      const prevLine = replLines[insertIndex - 1];
      if (prevLine && (prevLine.code.trim().endsWith(':') || prevLine.type === 'continuation')) {
        // If the new line looks like a raise or is indented body, it's a continuation
        if (code.trim().startsWith('raise ') || code.trim().startsWith('return ')) {
          return 'continuation';
        }
      }
    }
    return 'statement';
  }

  function addNewLine() {
    const code = newLineCode.trim();
    if (!code) return;

    const type = inferLineType(code, replLines.length);
    replLines = [...replLines, { id: nextId(), code, type }];
    newLineCode = '';
    showAutocomplete = false;

    // If the new line ends with ':', auto-focus next line
    // (handled by the perpetual new line input)
  }

  function handleNewLineKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewLine();
    }
    if (e.key === 'Escape') {
      showAutocomplete = false;
    }
  }

  function selectSuggestion(suggestion: string) {
    newLineCode = suggestion;
    showAutocomplete = false;
  }

  function addTestInput() {
    testInputIdCounter++;
    testInputs = [...testInputs, { id: testInputIdCounter, value: '' }];
  }

  function removeTestInput(id: number) {
    testInputs = testInputs.filter(t => t.id !== id);
    if (selectedTestId === id) selectedTestId = null;
  }

  function updateTestValue(id: number, value: string) {
    testInputs = testInputs.map(t =>
      t.id === id ? { ...t, value } : t
    );
  }

  function getResultForInput(inputId: number): TestResult | undefined {
    return testResults.find(r => r.inputId === inputId);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      copySuccess = true;
      setTimeout(() => { copySuccess = false; }, 2000);
    } catch {
      // Fallback: silent fail
    }
  }

  function getPromptMarker(line: ReplLine): string {
    return line.type === 'continuation' ? '...' : '>>>';
  }

  /** Compute the display line number (1-indexed, skipping comments for visual density) */
  function getDisplayLineNumber(index: number): number {
    return index + 1;
  }

  /** Format a value for display: wrap strings in quotes, show empty as "" */
  function formatValue(val: string): string {
    return `"${val}"`;
  }
</script>

<!-- ======================================================================== -->
<!-- PAGE HEADER                                                               -->
<!-- ======================================================================== -->

<PageHeader title="Interactive REPL">
  {#snippet actions()}
    <div class="flex items-center gap-2">
      <span class="text-xs text-mono-400 mr-2 hidden sm:inline">
        Prototype 5
      </span>
    </div>
  {/snippet}
</PageHeader>

<!-- ======================================================================== -->
<!-- MAIN LAYOUT: Two-panel horizontal split                                   -->
<!-- ======================================================================== -->

<div class="flex flex-1 overflow-hidden" style="height: calc(100vh - 120px);">

  <!-- ====================================================================== -->
  <!-- LEFT PANEL: REPL Console (~55%)                                         -->
  <!-- ====================================================================== -->

  <div class="w-[55%] bg-mono-900 flex flex-col overflow-hidden">

    <!-- Config bar -->
    <div class="flex items-center gap-4 px-4 py-2.5 bg-mono-800 border-b border-mono-700 flex-shrink-0">
      <div class="flex items-center gap-2">
        <label for="config-name" class="text-xs text-mono-400 whitespace-nowrap">Name:</label>
        <input
          id="config-name"
          type="text"
          bind:value={validatorName}
          class="bg-mono-700 border border-mono-600 text-mono-100 text-xs font-mono
                 px-2 py-1 rounded focus:outline-none focus:border-mono-400 w-40"
        />
      </div>
      <div class="flex items-center gap-2">
        <label for="config-field" class="text-xs text-mono-400 whitespace-nowrap">Field:</label>
        <input
          id="config-field"
          type="text"
          bind:value={targetField}
          class="bg-mono-700 border border-mono-600 text-mono-100 text-xs font-mono
                 px-2 py-1 rounded focus:outline-none focus:border-mono-400 w-28"
        />
      </div>
      <div class="flex items-center gap-2">
        <label for="config-mode" class="text-xs text-mono-400 whitespace-nowrap">Mode:</label>
        <select
          id="config-mode"
          bind:value={validatorMode}
          class="bg-mono-700 border border-mono-600 text-mono-100 text-xs font-mono
                 px-2 py-1 rounded focus:outline-none focus:border-mono-400"
        >
          <option value="before">before</option>
          <option value="after">after</option>
        </select>
      </div>
    </div>

    <!-- Console header -->
    <div class="flex items-center justify-between px-4 py-2 bg-mono-800/50 border-b border-mono-700/50 flex-shrink-0">
      <div class="flex items-center gap-2">
        <div class="flex gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full bg-red-600/80"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
        </div>
        <span class="text-xs text-mono-500 font-mono ml-2">python3 &mdash; validator repl</span>
      </div>
      <span class="text-xs text-mono-600">
        {replLines.length} line{replLines.length !== 1 ? 's' : ''}
      </span>
    </div>

    <!-- REPL lines scrollable area -->
    <div class="flex-1 overflow-y-auto px-2 py-3">

      {#each replLines as line, index (line.id)}
        <div class="group flex items-start gap-0 hover:bg-white/[0.03] rounded relative">
          <!-- Line number -->
          <span class="w-8 text-right text-xs text-mono-600 font-mono py-1.5 flex-shrink-0 select-none">
            {getDisplayLineNumber(index)}
          </span>

          <!-- Prompt marker -->
          <span class="w-10 text-xs font-mono py-1.5 flex-shrink-0 select-none"
                style="color: {line.type === 'continuation' ? '#fbbf24' : '#4ade80'}">
            {getPromptMarker(line)}
          </span>

          <!-- Editable code input -->
          <div class="flex-1 relative">
            <input
              type="text"
              value={line.code}
              onfocus={() => handleLineFocus(line.id)}
              oninput={(e) => handleLineInput(line.id, (e.target as HTMLInputElement).value)}
              onblur={handleLineBlur}
              class="w-full bg-transparent text-mono-100 text-sm font-mono py-1.5 pr-8
                     border-none outline-none focus:bg-white/[0.04] rounded px-1
                     placeholder:text-mono-600"
              placeholder={line.type === 'continuation' ? '    indented code...' : 'type code...'}
            />

            <!-- Inline autocomplete for existing lines -->
            {#if focusedLineId === line.id && focusedLineAutocomplete.length > 0}
              <div class="absolute left-0 top-full z-30 w-80 max-h-48 overflow-y-auto
                          bg-mono-800 border border-mono-600 rounded-md shadow-xl mt-0.5">
                {#each focusedLineAutocomplete as suggestion}
                  <button
                    type="button"
                    class="w-full text-left px-3 py-1.5 text-xs font-mono text-mono-200
                           hover:bg-mono-700 transition-colors"
                    onmousedown={() => selectSuggestionForLine(line.id, suggestion)}
                  >
                    {suggestion}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Delete button (visible on hover) -->
          <button
            type="button"
            onclick={() => removeLine(line.id)}
            class="opacity-0 group-hover:opacity-100 transition-opacity
                   w-6 h-6 flex items-center justify-center text-mono-500
                   hover:text-red-600 flex-shrink-0 mt-1"
            title="Remove line"
          >
            <i class="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      {/each}

      <!-- New line input (always visible at bottom) -->
      <div class="flex items-start gap-0 mt-1 relative">
        <span class="w-8 text-right text-xs text-mono-600 font-mono py-1.5 flex-shrink-0 select-none">
          {replLines.length + 1}
        </span>
        <span class="w-10 text-xs font-mono py-1.5 flex-shrink-0 select-none" style="color: #4ade80">
          &gt;&gt;&gt;
        </span>
        <div class="flex-1 relative">
          <input
            type="text"
            bind:value={newLineCode}
            onkeydown={handleNewLineKeydown}
            onfocus={() => showAutocomplete = true}
            onblur={() => setTimeout(() => showAutocomplete = false, 200)}
            class="w-full bg-transparent text-mono-100 text-sm font-mono py-1.5
                   border-none outline-none focus:bg-white/[0.04] rounded px-1
                   placeholder:text-mono-600"
            placeholder="type a line and press Enter..."
          />

          <!-- Autocomplete dropdown -->
          {#if showAutocomplete && filteredSuggestions.length > 0}
            <div class="absolute left-0 top-full z-30 w-80 max-h-48 overflow-y-auto
                        bg-mono-800 border border-mono-600 rounded-md shadow-xl mt-0.5">
              {#each filteredSuggestions as suggestion}
                <button
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-xs font-mono text-mono-200
                         hover:bg-mono-700 transition-colors"
                  onmousedown={() => selectSuggestion(suggestion)}
                >
                  {suggestion}
                </button>
              {/each}
            </div>
          {/if}
        </div>
        <div class="w-6 flex-shrink-0"></div>
      </div>

      <!-- Blinking cursor indicator -->
      <div class="flex items-center gap-0 mt-0.5 opacity-50">
        <span class="w-8"></span>
        <span class="w-10"></span>
        <span class="w-2 h-4 bg-mono-400 animate-pulse rounded-sm"></span>
      </div>
    </div>
  </div>

  <!-- ====================================================================== -->
  <!-- RIGHT PANEL: Test inputs (top) + Generated code (bottom) (~45%)         -->
  <!-- ====================================================================== -->

  <div class="w-[45%] border-l border-mono-200 flex flex-col overflow-hidden">

    <!-- ================================================================== -->
    <!-- RIGHT TOP: Test Inputs Panel                                        -->
    <!-- ================================================================== -->

    <div class="h-[55%] flex flex-col overflow-hidden border-b border-mono-200">

      <!-- Panel header -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-white border-b border-mono-200 flex-shrink-0">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-flask text-xs text-mono-400"></i>
          <span class="text-xs font-medium text-mono-700">Test Inputs</span>
          <span class="text-xs text-mono-400">({testInputs.length})</span>
        </div>
        <button
          type="button"
          onclick={addTestInput}
          class="flex items-center gap-1 px-2 py-1 text-xs text-mono-500
                 hover:text-mono-700 hover:bg-mono-50 rounded transition-colors"
        >
          <i class="fa-solid fa-plus text-[10px]"></i>
          Add
        </button>
      </div>

      <!-- Test inputs list -->
      <div class="flex-1 overflow-y-auto bg-mono-50/50">
        {#each testInputs as input (input.id)}
          {@const result = getResultForInput(input.id)}
          {@const isSelected = selectedTestId === input.id}

          <div class="border-b border-mono-100 last:border-b-0">
            <!-- Input row -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              onclick={() => selectedTestId = isSelected ? null : input.id}
              class="w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer
                     hover:bg-white transition-colors
                     {isSelected ? 'bg-white' : ''}"
            >
              <!-- Input value (editable) -->
              <div class="flex-1 min-w-0">
                <input
                  type="text"
                  value={input.value}
                  oninput={(e) => updateTestValue(input.id, (e.target as HTMLInputElement).value)}
                  onclick={(e) => e.stopPropagation()}
                  class="w-full bg-white border border-mono-200 text-sm font-mono text-mono-800
                         px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-mono-400
                         focus:border-mono-400"
                  placeholder='enter test value...'
                />
              </div>

              <!-- Result badge -->
              {#if result}
                {#if result.success}
                  <span class="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5
                               text-xs font-mono rounded-full bg-green-50 text-green-700 border border-green-200">
                    <i class="fa-solid fa-check text-[9px]"></i>
                    {formatValue(result.finalValue)}
                  </span>
                {:else}
                  <span class="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5
                               text-xs font-mono rounded-full bg-red-50 text-red-700 border border-red-200
                               max-w-[180px] truncate">
                    <i class="fa-solid fa-xmark text-[9px]"></i>
                    {result.errorMessage}
                  </span>
                {/if}
              {/if}

              <!-- Expand indicator -->
              <i class="fa-solid fa-chevron-{isSelected ? 'up' : 'down'} text-[10px] text-mono-300 flex-shrink-0"></i>

              <!-- Remove button -->
              <button
                type="button"
                onclick={(e) => { e.stopPropagation(); removeTestInput(input.id); }}
                class="text-mono-300 hover:text-red-600 transition-colors flex-shrink-0"
                title="Remove test input"
              >
                <i class="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>

            <!-- Expanded trace view -->
            {#if isSelected && result}
              <div class="px-4 pb-3 bg-white">
                <div class="bg-mono-900 rounded-md p-3 font-mono text-xs">
                  <!-- Input header -->
                  <div class="text-mono-400 mb-2">
                    Input: <span class="text-mono-200">{formatValue(input.value)}</span>
                  </div>

                  <!-- Trace steps -->
                  {#each result.trace as step}
                    <div class="flex items-start gap-2 py-0.5 {step.isError ? 'text-red-400' : 'text-mono-300'}">
                      <span class="text-mono-500 w-14 text-right flex-shrink-0">
                        Line {step.lineIndex + 1}:
                      </span>
                      <span class="text-mono-400 flex-1 truncate" title={step.lineCode}>
                        {step.lineCode}
                      </span>
                      <span class="flex-shrink-0" style="color: {step.isError ? '#f87171' : step.conditionResult ? '#a3a3a3' : '#4ade80'}">
                        {#if step.isError}
                          Error: {step.errorMessage}
                        {:else if step.conditionResult}
                          {step.conditionResult}
                        {:else}
                          &rarr; {formatValue(step.valueAfter)}
                        {/if}
                      </span>
                    </div>
                  {/each}

                  <!-- Final result -->
                  <div class="mt-2 pt-2 border-t border-mono-700">
                    {#if result.success}
                      <span class="text-green-400">
                        Result: {formatValue(result.finalValue)}
                        <i class="fa-solid fa-check ml-1 text-[10px]"></i>
                      </span>
                    {:else}
                      <span class="text-red-400">
                        Error: {result.errorMessage}
                        <i class="fa-solid fa-xmark ml-1 text-[10px]"></i>
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- RIGHT BOTTOM: Generated Code Preview                                -->
    <!-- ================================================================== -->

    <div class="h-[45%] flex flex-col overflow-hidden">

      <!-- Panel header -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-mono-800 border-b border-mono-700 flex-shrink-0">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-code text-xs text-mono-400"></i>
          <span class="text-xs text-mono-400 font-mono">generated validator</span>
        </div>
        <button
          type="button"
          onclick={copyCode}
          class="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors
                 {copySuccess
                   ? 'text-green-400 bg-green-900/30'
                   : 'text-mono-400 hover:text-mono-200 hover:bg-mono-700'}"
        >
          {#if copySuccess}
            <i class="fa-solid fa-check text-[10px]"></i>
            Copied
          {:else}
            <i class="fa-regular fa-copy text-[10px]"></i>
            Copy
          {/if}
        </button>
      </div>

      <!-- Code content -->
      <div class="flex-1 overflow-auto bg-mono-900 p-4">
        <pre class="font-mono text-xs leading-relaxed whitespace-pre" style="color: #f5f5f5">{@html highlightedGeneratedCode}</pre>
      </div>
    </div>
  </div>
</div>

<script lang="ts">
  import { PageHeader } from '$lib/components';

  // ============================================================================
  // TYPES
  // ============================================================================

  type ExpectedResult = 'pass' | 'transform' | 'reject';

  type TestCase = {
    id: number;
    input: string;
    expectedResult: ExpectedResult;
    expectedOutput: string;
    status: 'pass' | 'fail' | 'unknown';
  };

  type InferredRule = {
    id: number;
    description: string;
    confidence: 'High' | 'Medium' | 'Low';
    state: 'accepted' | 'rejected' | 'pending';
    supportedBy: number[];
  };

  // ============================================================================
  // SYNTAX HIGHLIGHTING (matches gallery prototype pattern)
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
    'any', 'all', 'ValueError', 'TypeError', 'Exception', 're'
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

      if (/\d/.test(line[i]) && (i === 0 || /[\s(,=<>!+\-*/%[]/.test(line[i - 1]))) {
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
  // VALIDATION ENGINE
  // ============================================================================

  // Simulates the accepted rules against a single input value.
  // Returns { passed: boolean, output: string } where output is the transformed
  // value on success or the error message on rejection.
  function evaluateInput(input: string, acceptedRules: InferredRule[]): { passed: boolean; output: string; rejected: boolean; error: string } {
    let v = input;

    const hasStrip = acceptedRules.some(r => r.id === 1);
    const hasLowercase = acceptedRules.some(r => r.id === 2);
    const hasRejectEmpty = acceptedRules.some(r => r.id === 3);
    const hasMinLength = acceptedRules.some(r => r.id === 4);
    const hasAlphanumericOnly = acceptedRules.some(r => r.id === 5);

    // Apply transformations in the same order as the generated Python code
    if (hasStrip) {
      v = v.trim();
    }

    if (hasRejectEmpty && v === '') {
      return { passed: false, output: v, rejected: true, error: 'Cannot be empty' };
    }

    if (hasMinLength && v.length < 3) {
      return { passed: false, output: v, rejected: true, error: 'Must be at least 3 characters' };
    }

    if (hasAlphanumericOnly && !/^[a-zA-Z0-9_]+$/.test(v)) {
      return { passed: false, output: v, rejected: true, error: 'Only alphanumeric and underscores' };
    }

    if (hasLowercase) {
      v = v.toLowerCase();
    }

    return { passed: true, output: v, rejected: false, error: '' };
  }

  // Determine if a single test case passes against the current rules
  function evaluateTestCase(tc: TestCase, acceptedRules: InferredRule[]): 'pass' | 'fail' {
    if (acceptedRules.length === 0) return 'unknown' as 'pass' | 'fail';

    const result = evaluateInput(tc.input, acceptedRules);

    if (tc.expectedResult === 'pass') {
      // Expect: no rejection, output equals input
      return result.passed && result.output === tc.input ? 'pass' : 'fail';
    }

    if (tc.expectedResult === 'transform') {
      // Expect: no rejection, output equals expected transform value
      return result.passed && result.output === tc.expectedOutput ? 'pass' : 'fail';
    }

    if (tc.expectedResult === 'reject') {
      // Expect: rejection with matching error message
      return result.rejected && result.error === tc.expectedOutput ? 'pass' : 'fail';
    }

    return 'fail';
  }

  // ============================================================================
  // CODE GENERATION
  // ============================================================================

  function generateCode(
    validatorName: string,
    fieldName: string,
    mode: string,
    acceptedRules: InferredRule[]
  ): string {
    const hasStrip = acceptedRules.some(r => r.id === 1);
    const hasLowercase = acceptedRules.some(r => r.id === 2);
    const hasRejectEmpty = acceptedRules.some(r => r.id === 3);
    const hasMinLength = acceptedRules.some(r => r.id === 4);
    const hasAlphanumericOnly = acceptedRules.some(r => r.id === 5);

    const needsRe = hasAlphanumericOnly;

    const lines: string[] = [];

    if (needsRe) {
      lines.push('from pydantic import field_validator');
      lines.push('import re');
    } else {
      lines.push('from pydantic import field_validator');
    }

    lines.push('');
    lines.push(`@field_validator('${fieldName}', mode='${mode}')`);
    lines.push('@classmethod');
    lines.push(`def ${validatorName}(cls, v):`);

    if (hasStrip) {
      lines.push('    v = v.strip()');
    }

    if (hasRejectEmpty) {
      lines.push("    if not v:");
      lines.push("        raise ValueError('Cannot be empty')");
    }

    if (hasMinLength) {
      lines.push('    if len(v) < 3:');
      lines.push("        raise ValueError('Must be at least 3 characters')");
    }

    if (hasAlphanumericOnly) {
      lines.push("    if not re.match(r'^[a-zA-Z0-9_]+$', v):");
      lines.push("        raise ValueError('Only alphanumeric and underscores')");
    }

    if (hasLowercase) {
      lines.push('    v = v.lower()');
    }

    lines.push('    return v');

    return lines.join('\n');
  }

  // ============================================================================
  // STATE
  // ============================================================================

  let validatorName = $state('validate_username');
  let fieldName = $state('username');
  let mode = $state('before');

  let testCaseCounter = $state(7);

  let testCases = $state<TestCase[]>([
    { id: 1, input: '  Alice  ', expectedResult: 'transform', expectedOutput: 'alice', status: 'pass' },
    { id: 2, input: 'ab', expectedResult: 'reject', expectedOutput: 'Must be at least 3 characters', status: 'pass' },
    { id: 3, input: '', expectedResult: 'reject', expectedOutput: 'Cannot be empty', status: 'pass' },
    { id: 4, input: 'valid_user_123', expectedResult: 'transform', expectedOutput: 'valid_user_123', status: 'pass' },
    { id: 5, input: 'Hello World!', expectedResult: 'reject', expectedOutput: 'Only alphanumeric and underscores', status: 'pass' },
    { id: 6, input: '  BOB  ', expectedResult: 'transform', expectedOutput: 'bob', status: 'pass' }
  ]);

  let rules = $state<InferredRule[]>([
    { id: 1, description: 'Strip whitespace', confidence: 'High', state: 'accepted', supportedBy: [1, 6] },
    { id: 2, description: 'Convert to lowercase', confidence: 'High', state: 'accepted', supportedBy: [1, 4, 6] },
    { id: 3, description: 'Reject empty values', confidence: 'High', state: 'accepted', supportedBy: [3] },
    { id: 4, description: 'Minimum length: 3 characters', confidence: 'High', state: 'accepted', supportedBy: [2] },
    { id: 5, description: 'Allow only alphanumeric and underscores', confidence: 'High', state: 'accepted', supportedBy: [5] }
  ]);

  let copySuccess = $state(false);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  let acceptedRules = $derived(rules.filter(r => r.state === 'accepted'));

  let generatedCode = $derived(generateCode(validatorName, fieldName, mode, acceptedRules));

  let highlightedCode = $derived(highlightPython(generatedCode));

  // Re-evaluate all test cases when rules change
  let evaluatedTestCases = $derived.by(() => {
    return testCases.map(tc => {
      const accepted = rules.filter(r => r.state === 'accepted');
      if (accepted.length === 0) {
        return { ...tc, status: 'unknown' as const };
      }
      return { ...tc, status: evaluateTestCase(tc, accepted) };
    });
  });

  let passingCount = $derived(evaluatedTestCases.filter(tc => tc.status === 'pass').length);
  let totalCount = $derived(evaluatedTestCases.length);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const MODE_OPTIONS = [
    { label: 'before', value: 'before' },
    { label: 'after', value: 'after' },
    { label: 'wrap', value: 'wrap' },
    { label: 'plain', value: 'plain' }
  ];

  const EXPECTED_RESULT_OPTIONS: { label: string; value: ExpectedResult }[] = [
    { label: 'Pass (return as-is)', value: 'pass' },
    { label: 'Transform to...', value: 'transform' },
    { label: 'Reject with error', value: 'reject' }
  ];

  function addTestCase() {
    const newId = testCaseCounter++;
    testCases = [...testCases, {
      id: newId,
      input: '',
      expectedResult: 'pass',
      expectedOutput: '',
      status: 'unknown'
    }];
  }

  function removeTestCase(id: number) {
    testCases = testCases.filter(tc => tc.id !== id);
  }

  function updateTestCaseInput(id: number, value: string) {
    testCases = testCases.map(tc =>
      tc.id === id ? { ...tc, input: value } : tc
    );
  }

  function updateTestCaseResult(id: number, value: ExpectedResult) {
    testCases = testCases.map(tc => {
      if (tc.id !== id) return tc;
      // Reset output when switching result type
      let output = tc.expectedOutput;
      if (value === 'pass') {
        output = tc.input;
      } else if (value !== tc.expectedResult) {
        output = '';
      }
      return { ...tc, expectedResult: value, expectedOutput: output };
    });
  }

  function updateTestCaseOutput(id: number, value: string) {
    testCases = testCases.map(tc =>
      tc.id === id ? { ...tc, expectedOutput: value } : tc
    );
  }

  function toggleRule(id: number) {
    rules = rules.map(r => {
      if (r.id !== id) return r;
      if (r.state === 'accepted') return { ...r, state: 'rejected' as const };
      return { ...r, state: 'accepted' as const };
    });
  }

  function acceptRule(id: number) {
    rules = rules.map(r =>
      r.id === id ? { ...r, state: 'accepted' as const } : r
    );
  }

  function rejectRule(id: number) {
    rules = rules.map(r =>
      r.id === id ? { ...r, state: 'rejected' as const } : r
    );
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

  function confidenceBadgeClass(confidence: 'High' | 'Medium' | 'Low'): string {
    switch (confidence) {
      case 'High': return 'bg-mono-100 text-mono-700';
      case 'Medium': return 'bg-mono-100 text-mono-500';
      case 'Low': return 'bg-mono-50 text-mono-400';
    }
  }
</script>

<!-- ======================================================================== -->
<!-- HEADER                                                                    -->
<!-- ======================================================================== -->

<PageHeader title="Test-Driven Builder">
  {#snippet actions()}
    <div class="flex items-center gap-3">
      <!-- Test status summary -->
      <span class="text-sm {passingCount === totalCount ? 'text-green-600' : 'text-mono-500'}">
        {passingCount}/{totalCount} test cases passing
      </span>
    </div>
  {/snippet}
</PageHeader>

<!-- All content below the header fills the remaining viewport height -->
<div class="flex flex-col flex-1 overflow-hidden">
  <!-- ======================================================================== -->
  <!-- VALIDATOR CONFIG BAR                                                      -->
  <!-- ======================================================================== -->

  <div class="bg-white border-b border-mono-200 px-6 py-3 flex-shrink-0">
    <div class="flex items-center gap-6">
      <!-- Validator name -->
      <div class="flex items-center gap-2">
        <label for="validator-name" class="text-xs font-medium text-mono-500 whitespace-nowrap">Validator</label>
        <input
          id="validator-name"
          type="text"
          bind:value={validatorName}
          class="px-2.5 py-1.5 text-sm border border-mono-200 rounded-md font-mono
                 focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                 placeholder:text-mono-300 w-48"
          placeholder="e.g. validate_username"
        />
      </div>

      <!-- Field name -->
      <div class="flex items-center gap-2">
        <label for="field-name" class="text-xs font-medium text-mono-500 whitespace-nowrap">Field</label>
        <input
          id="field-name"
          type="text"
          bind:value={fieldName}
          class="px-2.5 py-1.5 text-sm border border-mono-200 rounded-md font-mono
                 focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                 placeholder:text-mono-300 w-36"
          placeholder="e.g. username"
        />
      </div>

      <!-- Mode -->
      <div class="flex items-center gap-2">
        <label for="mode-select" class="text-xs font-medium text-mono-500 whitespace-nowrap">Mode</label>
        <select
          id="mode-select"
          bind:value={mode}
          class="px-2.5 py-1.5 text-sm border border-mono-200 rounded-md bg-white font-mono
                 focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400"
        >
          {#each MODE_OPTIONS as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <!-- ======================================================================== -->
  <!-- TEST CASES TABLE                                                          -->
  <!-- ======================================================================== -->

  <div class="px-6 py-5 bg-mono-50 border-b border-mono-200 flex-shrink-0">
    <div class="bg-white border border-mono-200 rounded-lg overflow-hidden">
      <!-- Table header -->
      <div class="grid grid-cols-[48px_1fr_180px_1fr_64px_48px] gap-0 bg-mono-50 border-b border-mono-200">
        <div class="px-3 py-2.5 text-xs font-medium text-mono-500 uppercase tracking-wide">#</div>
        <div class="px-3 py-2.5 text-xs font-medium text-mono-500 uppercase tracking-wide">Input Value</div>
        <div class="px-3 py-2.5 text-xs font-medium text-mono-500 uppercase tracking-wide">Expected Result</div>
        <div class="px-3 py-2.5 text-xs font-medium text-mono-500 uppercase tracking-wide">Expected Output</div>
        <div class="px-3 py-2.5 text-xs font-medium text-mono-500 uppercase tracking-wide text-center">Status</div>
        <div class="px-3 py-2.5"></div>
      </div>

      <!-- Table rows -->
      {#each evaluatedTestCases as tc, index (tc.id)}
        <div class="grid grid-cols-[48px_1fr_180px_1fr_64px_48px] gap-0 border-b border-mono-100 last:border-b-0 items-center
                    hover:bg-mono-50/50 transition-colors">
          <!-- Row number -->
          <div class="px-3 py-2 text-xs text-mono-400 font-mono">{index + 1}</div>

          <!-- Input value -->
          <div class="px-3 py-1.5">
            <input
              type="text"
              value={tc.input}
              oninput={(e) => updateTestCaseInput(tc.id, (e.target as HTMLInputElement).value)}
              placeholder="Enter input value..."
              class="w-full px-2 py-1.5 text-sm font-mono border border-mono-200 rounded
                     focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                     placeholder:text-mono-300"
            />
          </div>

          <!-- Expected result dropdown -->
          <div class="px-3 py-1.5">
            <select
              value={tc.expectedResult}
              onchange={(e) => updateTestCaseResult(tc.id, (e.target as HTMLSelectElement).value as ExpectedResult)}
              class="w-full px-2 py-1.5 text-sm border border-mono-200 rounded bg-white
                     focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400"
            >
              {#each EXPECTED_RESULT_OPTIONS as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>

          <!-- Expected output -->
          <div class="px-3 py-1.5">
            {#if tc.expectedResult === 'pass'}
              <div class="px-2 py-1.5 text-sm font-mono text-mono-400 bg-mono-50 rounded border border-mono-100">
                {tc.input || '\u00A0'}
              </div>
            {:else if tc.expectedResult === 'transform'}
              <input
                type="text"
                value={tc.expectedOutput}
                oninput={(e) => updateTestCaseOutput(tc.id, (e.target as HTMLInputElement).value)}
                placeholder="Transformed value..."
                class="w-full px-2 py-1.5 text-sm font-mono border border-mono-200 rounded
                       focus:outline-none focus:ring-1 focus:ring-mono-400 focus:border-mono-400
                       placeholder:text-mono-300"
              />
            {:else}
              <input
                type="text"
                value={tc.expectedOutput}
                oninput={(e) => updateTestCaseOutput(tc.id, (e.target as HTMLInputElement).value)}
                placeholder="Error message..."
                class="w-full px-2 py-1.5 text-sm font-mono border border-red-200 rounded
                       text-red-700 bg-red-50/50
                       focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-300
                       placeholder:text-red-300"
              />
            {/if}
          </div>

          <!-- Status icon -->
          <div class="px-3 py-2 text-center">
            {#if tc.status === 'pass'}
              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50">
                <i class="fa-solid fa-check text-xs text-green-600"></i>
              </span>
            {:else if tc.status === 'fail'}
              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50">
                <i class="fa-solid fa-xmark text-xs text-red-600"></i>
              </span>
            {:else}
              <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-mono-100">
                <i class="fa-solid fa-question text-xs text-mono-400"></i>
              </span>
            {/if}
          </div>

          <!-- Delete button -->
          <div class="px-3 py-2 text-center">
            <button
              type="button"
              onclick={() => removeTestCase(tc.id)}
              class="text-mono-300 hover:text-red-600 transition-colors"
              title="Remove test case"
            >
              <i class="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>
      {/each}
    </div>

    <!-- Add test case button -->
    <button
      type="button"
      onclick={addTestCase}
      class="mt-3 flex items-center gap-1.5 px-3 py-2 text-sm text-mono-500
             hover:text-mono-700 hover:bg-white border border-transparent
             hover:border-mono-200 rounded-md transition-all"
    >
      <i class="fa-solid fa-plus text-xs"></i>
      <span>Add Test Case</span>
    </button>
  </div>

  <!-- ======================================================================== -->
  <!-- BOTTOM SPLIT PANEL                                                        -->
  <!-- ======================================================================== -->

  <div class="flex flex-1 min-h-[320px] overflow-hidden">
    <!-- LEFT: Inferred Rules -->
    <div class="w-1/2 border-r border-mono-200 bg-white flex flex-col overflow-hidden">
      <!-- Panel header -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-mono-200 flex-shrink-0">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-wand-magic-sparkles text-xs text-mono-400"></i>
          <span class="text-sm font-medium text-mono-700">Inferred Rules</span>
        </div>
        <span class="text-xs text-mono-400">{acceptedRules.length} active</span>
      </div>

      <!-- Rules list -->
      <div class="flex-1 overflow-y-auto p-4 space-y-2.5">
        {#each rules as rule (rule.id)}
          <div
            class="flex items-center gap-3 p-3 rounded-lg border transition-all
                   {rule.state === 'accepted'
                     ? 'border-l-[3px] border-l-green-500 border-t-mono-200 border-r-mono-200 border-b-mono-200 bg-green-50/30'
                     : rule.state === 'rejected'
                       ? 'border-mono-100 bg-mono-50/50'
                       : 'border-mono-200 bg-white'}"
          >
            <!-- Rule description -->
            <div class="flex-1 min-w-0">
              <p class="text-sm {rule.state === 'rejected' ? 'text-mono-400 line-through' : 'text-mono-800'}">
                {rule.description}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs px-1.5 py-0.5 rounded {confidenceBadgeClass(rule.confidence)}">
                  {rule.confidence}
                </span>
                <span class="text-xs text-mono-400">
                  {rule.supportedBy.length} case{rule.supportedBy.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <!-- Accept / Reject buttons -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onclick={() => acceptRule(rule.id)}
                title="Accept rule"
                class="w-7 h-7 flex items-center justify-center rounded-md transition-colors
                       {rule.state === 'accepted'
                         ? 'bg-green-100 text-green-700'
                         : 'bg-mono-50 text-mono-400 hover:bg-green-50 hover:text-green-600'}"
              >
                <i class="fa-solid fa-check text-xs"></i>
              </button>
              <button
                type="button"
                onclick={() => rejectRule(rule.id)}
                title="Reject rule"
                class="w-7 h-7 flex items-center justify-center rounded-md transition-colors
                       {rule.state === 'rejected'
                         ? 'bg-red-100 text-red-700'
                         : 'bg-mono-50 text-mono-400 hover:bg-red-50 hover:text-red-600'}"
              >
                <i class="fa-solid fa-xmark text-xs"></i>
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- RIGHT: Code Preview -->
    <div class="w-1/2 bg-mono-900 flex flex-col overflow-hidden">
      <!-- Panel header -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-mono-800 border-b border-mono-700 flex-shrink-0">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-code text-xs text-mono-400"></i>
          <span class="text-xs text-mono-400 font-mono">validator.py</span>
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

      <!-- Code content -->
      <div class="flex-1 overflow-auto p-5">
        <pre class="font-mono text-sm leading-relaxed whitespace-pre" style="color: #f5f5f5">{@html highlightedCode}</pre>
      </div>
    </div>
  </div>
</div>

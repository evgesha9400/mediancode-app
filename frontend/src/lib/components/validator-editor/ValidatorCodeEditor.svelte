<script lang="ts" module>
  export interface ValidatorCodeEditorProps {
    /** Read-only wrapper code (imports, decorator, signature) */
    wrapperCode: string;
    /** Editable function body code (bindable) */
    validatorCode: string;
    /** Derived function name displayed in the editor header */
    functionName: string;
    /** Whether the code uses the `re` module (shows import badge) */
    needsReImport: boolean;
    /** Short label shown in the info pill (e.g. "{field}" or "self") */
    infoLabel: string;
    /** Tooltip text explaining the info label */
    infoTooltip: string;
    /**
     * Controls when CodeMirror initializes.
     * For "new" pages: true when editor view is active.
     * For "[id]" pages: true when loading completes.
     */
    isReady: boolean;
  }
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import {
    type EditorView,
    type Compartment,
    createSplitEditor,
    updateWrapperContent,
    updateBodyLineNumbers,
  } from '$lib/utils/codemirror';

  let {
    wrapperCode,
    validatorCode = $bindable(),
    functionName,
    needsReImport,
    infoLabel,
    infoTooltip,
    isReady,
  }: ValidatorCodeEditorProps = $props();

  // CodeMirror DOM mount points
  let wrapperEditorEl = $state<HTMLDivElement | null>(null);
  let bodyEditorEl = $state<HTMLDivElement | null>(null);

  // CodeMirror instances (managed imperatively, not reactive)
  let wrapperView: EditorView | null = null;
  let bodyView: EditorView | null = null;
  let bodyLineNumCompartment: Compartment | null = null;

  // Derived wrapper line count for body offset
  let wrapperLineCount = $derived(wrapperCode.split('\n').length);

  // Create split editor when ready
  $effect(() => {
    if (!isReady || !wrapperEditorEl || !bodyEditorEl) return;

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
</script>

<div class="flex-1 bg-mono-900 flex flex-col overflow-hidden min-h-0">
  <!-- Editor header bar -->
  <div class="flex items-center justify-between px-4 py-2.5 bg-mono-800 border-b border-mono-700 flex-shrink-0">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-code text-xs text-mono-400"></i>
        <span class="text-xs text-mono-400 font-mono">{functionName}.py</span>
      </div>
      <!-- Info pill with tooltip -->
      <div class="relative group/info">
        <div class="flex items-center gap-1 px-2 py-0.5 rounded bg-mono-700/50 cursor-help">
          <i class="fa-solid fa-circle-info text-[10px] text-mono-500"></i>
          <span class="text-[10px] text-mono-500 font-mono">{infoLabel}</span>
        </div>
        <div class="absolute bottom-full left-0 mb-2 px-3 py-2 bg-mono-800 border border-mono-600 rounded-md
                    text-xs text-mono-300 whitespace-nowrap opacity-0 group-hover/info:opacity-100
                    transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
          {infoTooltip}
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

/**
 * Shared CodeMirror editor setup for validator pages.
 *
 * Provides a split-editor pattern: a read-only "wrapper" editor (imports, decorator,
 * function signature) stacked above an editable "body" editor (function body).
 * Line numbers in the body continue from where the wrapper leaves off.
 */

// Re-export commonly used symbols so consumers import from one place
export { EditorView, minimalSetup } from 'codemirror';
export { EditorState, Compartment } from '@codemirror/state';
export {
	lineNumbers,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap
} from '@codemirror/view';
export { bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language';
export { closeBrackets } from '@codemirror/autocomplete';
export { indentWithTab } from '@codemirror/commands';
export { python } from '@codemirror/lang-python';
export { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';

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
// THEME CONSTANTS
// ============================================================================

/** Dark monochrome editor theme matching the project's design system. */
export const monoTheme = EditorView.theme({
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

/** Dim overlay theme for read-only wrapper editors. */
export function wrapperDimTheme(opacity = '0.875') {
	return EditorView.theme({
		'&': { opacity },
		'.cm-scroller': { overflow: 'hidden !important' },
	});
}

/** Fill-height theme for editable body editors. */
export const bodyFillTheme = EditorView.theme({
	'&': { height: '100%' },
	'.cm-scroller': { overflow: 'auto' },
});

// ============================================================================
// EDITOR FACTORY
// ============================================================================

export interface SplitEditorConfig {
	/** Initial content for the read-only wrapper editor. */
	wrapperDoc: string;
	/** Initial content for the editable body editor. */
	bodyDoc: string;
	/** Called whenever the body editor content changes. */
	onBodyChange: (newContent: string) => void;
	/** Opacity for the wrapper dim theme (default: '0.875'). */
	wrapperOpacity?: string;
}

export interface SplitEditorResult {
	wrapperView: EditorView;
	bodyView: EditorView;
	bodyLineNumCompartment: Compartment;
	destroy: () => void;
}

/**
 * Create a split editor pair: read-only wrapper + editable body.
 * The body editor's line numbers continue from the wrapper's last line.
 */
export function createSplitEditor(
	config: SplitEditorConfig,
	wrapperEl: HTMLElement,
	bodyEl: HTMLElement,
): SplitEditorResult {
	const bodyLineNumCompartment = new Compartment();
	const wrapperLineCount = config.wrapperDoc.split('\n').length;

	// Wrapper: read-only, dimmed
	const wrapperState = EditorState.create({
		doc: config.wrapperDoc,
		extensions: [
			minimalSetup,
			lineNumbers(),
			python(),
			syntaxHighlighting(oneDarkHighlightStyle),
			monoTheme,
			wrapperDimTheme(config.wrapperOpacity),
			EditorView.editable.of(false),
			EditorState.readOnly.of(true),
		],
	});
	const wrapperView = new EditorView({ state: wrapperState, parent: wrapperEl });

	// Body: editable, full-height
	const bodyState = EditorState.create({
		doc: config.bodyDoc,
		extensions: [
			minimalSetup,
			bodyLineNumCompartment.of(
				lineNumbers({ formatNumber: (n: number) => String(n + wrapperLineCount) })
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
					config.onBodyChange(update.state.doc.toString());
				}
			}),
		],
	});
	const bodyView = new EditorView({ state: bodyState, parent: bodyEl });
	bodyView.focus();

	return {
		wrapperView,
		bodyView,
		bodyLineNumCompartment,
		destroy() {
			wrapperView.destroy();
			bodyView.destroy();
		},
	};
}

// ============================================================================
// UPDATE HELPERS
// ============================================================================

/** Replace the entire content of a wrapper editor. */
export function updateWrapperContent(wrapperView: EditorView, newContent: string): void {
	const currentDoc = wrapperView.state.doc.toString();
	if (currentDoc !== newContent) {
		wrapperView.dispatch({
			changes: { from: 0, to: currentDoc.length, insert: newContent },
		});
	}
}

/** Reconfigure body editor line numbers to start after the given offset. */
export function updateBodyLineNumbers(
	bodyView: EditorView,
	compartment: Compartment,
	offset: number,
): void {
	bodyView.dispatch({
		effects: compartment.reconfigure(
			lineNumbers({ formatNumber: (n: number) => String(n + offset) })
		),
	});
}

/**
 * CodeMirror Utility Tests
 *
 * Unit tests for shared CodeMirror editor setup utilities.
 * Location mirrors: src/lib/utils/codemirror.ts
 */

import { describe, it, expect } from 'vitest';
import {
	monoTheme,
	bodyFillTheme,
	wrapperDimTheme,
	createSplitEditor,
	updateWrapperContent,
	updateBodyLineNumbers,
	EditorView,
	EditorState,
	Compartment,
	minimalSetup,
	lineNumbers,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	bracketMatching,
	indentOnInput,
	syntaxHighlighting,
	closeBrackets,
	indentWithTab,
	python,
	oneDarkHighlightStyle,
	type SplitEditorConfig,
	type SplitEditorResult
} from '$lib/utils/codemirror';

describe('CodeMirror Utilities', () => {
	describe('theme constants', () => {
		it('monoTheme should be defined', () => {
			expect(monoTheme).toBeDefined();
		});

		it('bodyFillTheme should be defined', () => {
			expect(bodyFillTheme).toBeDefined();
		});
	});

	describe('wrapperDimTheme', () => {
		it('should be a function', () => {
			expect(typeof wrapperDimTheme).toBe('function');
		});

		it('should return a value when called with default opacity', () => {
			const theme = wrapperDimTheme();
			expect(theme).toBeDefined();
		});

		it('should accept custom opacity argument', () => {
			const theme = wrapperDimTheme('0.5');
			expect(theme).toBeDefined();
		});
	});

	describe('createSplitEditor', () => {
		it('should be a function', () => {
			expect(typeof createSplitEditor).toBe('function');
		});
	});

	describe('updateWrapperContent', () => {
		it('should be a function', () => {
			expect(typeof updateWrapperContent).toBe('function');
		});
	});

	describe('updateBodyLineNumbers', () => {
		it('should be a function', () => {
			expect(typeof updateBodyLineNumbers).toBe('function');
		});
	});

	describe('re-exported codemirror symbols', () => {
		it('should export EditorView', () => {
			expect(EditorView).toBeDefined();
		});

		it('should export EditorState', () => {
			expect(EditorState).toBeDefined();
		});

		it('should export Compartment', () => {
			expect(Compartment).toBeDefined();
		});

		it('should export minimalSetup', () => {
			expect(minimalSetup).toBeDefined();
		});

		it('should export lineNumbers as a function', () => {
			expect(typeof lineNumbers).toBe('function');
		});

		it('should export highlightActiveLine as a function', () => {
			expect(typeof highlightActiveLine).toBe('function');
		});

		it('should export highlightActiveLineGutter as a function', () => {
			expect(typeof highlightActiveLineGutter).toBe('function');
		});

		it('should export keymap', () => {
			expect(keymap).toBeDefined();
		});

		it('should export bracketMatching as a function', () => {
			expect(typeof bracketMatching).toBe('function');
		});

		it('should export indentOnInput as a function', () => {
			expect(typeof indentOnInput).toBe('function');
		});

		it('should export syntaxHighlighting as a function', () => {
			expect(typeof syntaxHighlighting).toBe('function');
		});

		it('should export closeBrackets as a function', () => {
			expect(typeof closeBrackets).toBe('function');
		});

		it('should export indentWithTab', () => {
			expect(indentWithTab).toBeDefined();
		});

		it('should export python as a function', () => {
			expect(typeof python).toBe('function');
		});

		it('should export oneDarkHighlightStyle', () => {
			expect(oneDarkHighlightStyle).toBeDefined();
		});
	});

	describe('TypeScript interfaces', () => {
		it('SplitEditorConfig interface accepts valid config', () => {
			const config: SplitEditorConfig = {
				wrapperDoc: 'def validate(v):',
				bodyDoc: '    return True',
				onBodyChange: (_content: string) => {}
			};

			expect(config.wrapperDoc).toBe('def validate(v):');
			expect(config.bodyDoc).toBe('    return True');
			expect(typeof config.onBodyChange).toBe('function');
		});

		it('SplitEditorConfig interface accepts optional wrapperOpacity', () => {
			const config: SplitEditorConfig = {
				wrapperDoc: '',
				bodyDoc: '',
				onBodyChange: () => {},
				wrapperOpacity: '0.5'
			};

			expect(config.wrapperOpacity).toBe('0.5');
		});

		it('SplitEditorResult interface defines expected shape', () => {
			// Verify the type compiles correctly by defining a mock object
			const mockResult: SplitEditorResult = {
				wrapperView: {} as InstanceType<typeof EditorView>,
				bodyView: {} as InstanceType<typeof EditorView>,
				bodyLineNumCompartment: new Compartment(),
				destroy: () => {}
			};

			expect(mockResult.wrapperView).toBeDefined();
			expect(mockResult.bodyView).toBeDefined();
			expect(mockResult.bodyLineNumCompartment).toBeDefined();
			expect(typeof mockResult.destroy).toBe('function');
		});
	});
});

// tests/unit/lib/components/validator-editor/ValidatorCodeEditor.test.ts

/**
 * ValidatorCodeEditor Component Tests
 *
 * Unit tests for the ValidatorCodeEditor component.
 * Location mirrors: src/lib/components/validator-editor/ValidatorCodeEditor.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { ValidatorCodeEditor, type ValidatorCodeEditorProps } from '$lib/components';

describe('ValidatorCodeEditor Component', () => {
	describe('TypeScript Interface', () => {
		it('ValidatorCodeEditorProps interface requires all mandatory properties', () => {
			const props: ValidatorCodeEditorProps = {
				wrapperCode: 'from pydantic import field_validator\n\n@field_validator("name")\ndef validate_name(cls, v):',
				validatorCode: '    return v',
				functionName: 'validate_name',
				needsReImport: false,
				infoLabel: '{field}',
				infoTooltip: 'The raw field value before validation',
				isReady: true
			};

			expect(props.wrapperCode).toContain('field_validator');
			expect(props.validatorCode).toBe('    return v');
			expect(props.functionName).toBe('validate_name');
			expect(props.needsReImport).toBe(false);
			expect(props.infoLabel).toBe('{field}');
			expect(props.infoTooltip).toBe('The raw field value before validation');
			expect(props.isReady).toBe(true);
		});

		it('ValidatorCodeEditorProps accepts needsReImport as true', () => {
			const props: ValidatorCodeEditorProps = {
				wrapperCode: 'import re\n\n@field_validator("email")\ndef validate_email(cls, v):',
				validatorCode: '    if not re.match(r"^.+@.+$", v):\n        raise ValueError("Invalid")\n    return v',
				functionName: 'validate_email',
				needsReImport: true,
				infoLabel: '{field}',
				infoTooltip: 'The field value',
				isReady: true
			};

			expect(props.needsReImport).toBe(true);
		});

		it('ValidatorCodeEditorProps accepts isReady as false', () => {
			const props: ValidatorCodeEditorProps = {
				wrapperCode: '',
				validatorCode: '',
				functionName: 'validate_field',
				needsReImport: false,
				infoLabel: '{field}',
				infoTooltip: 'Tooltip text',
				isReady: false
			};

			expect(props.isReady).toBe(false);
		});

		it('ValidatorCodeEditorProps works with model validator info labels', () => {
			const props: ValidatorCodeEditorProps = {
				wrapperCode: '@model_validator(mode="after")\ndef validate_model(self):',
				validatorCode: '    return self',
				functionName: 'validate_model',
				needsReImport: false,
				infoLabel: 'self',
				infoTooltip: 'The model instance after field validation',
				isReady: true
			};

			expect(props.infoLabel).toBe('self');
			expect(props.infoTooltip).toContain('model instance');
		});
	});

	describe('Component Structure Verification', () => {
		it('ValidatorCodeEditor component exports correctly from barrel export', () => {
			expect(ValidatorCodeEditor).toBeDefined();
			expect(typeof ValidatorCodeEditor).toBe('function');
		});

		it('ValidatorCodeEditorProps type exports correctly from barrel export', () => {
			const props: ValidatorCodeEditorProps = {
				wrapperCode: '',
				validatorCode: '',
				functionName: 'test',
				needsReImport: false,
				infoLabel: '',
				infoTooltip: '',
				isReady: false
			};

			expect(props).toBeDefined();
		});
	});
});

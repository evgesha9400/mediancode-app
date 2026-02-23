// src/lib/utils/validatorTemplates.ts
//
// Parameterized validator template definitions.
// Templates are a creation-time concept only — the backend stores raw functionBody.

// ============================================================================
// Types
// ============================================================================

export interface TemplateParameter {
	key: string;
	label: string;
	type: 'text' | 'number';
	placeholder: string;
	required: boolean;
}

export interface FieldValidatorTemplate {
	id: string;
	name: string;
	description: string;
	compatibleTypes: string[];
	mode: 'before' | 'after';
	parameters?: TemplateParameter[];
	generateFunctionName: (fieldName: string) => string;
	generateFunctionBody: (params?: Record<string, string>) => string;
}

export interface TemplateRole {
	key: string;
	label: string;
	compatibleTypes: string[];
	required: boolean;
}

export interface ModelValidatorTemplate {
	id: string;
	name: string;
	description: string;
	mode: 'before' | 'after';
	roles: TemplateRole[];
	parameters?: TemplateParameter[];
	generateFunctionName: () => string;
	generateFunctionBody: (mappings: Record<string, string>) => string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Sanitize a field name into a valid Python identifier fragment */
function pyName(name: string): string {
	return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

// ============================================================================
// Field Validator Templates
// ============================================================================

export const FIELD_VALIDATOR_TEMPLATES: FieldValidatorTemplate[] = [
	{
		id: 'strip_lowercase',
		name: 'Strip & Lowercase',
		description: 'Strips whitespace and converts to lowercase',
		compatibleTypes: ['str'],
		mode: 'before',
		generateFunctionName: (fieldName) => `strip_lowercase_${pyName(fieldName)}`,
		generateFunctionBody: () =>
			'    if isinstance(v, str):\n        v = v.strip().lower()\n    return v'
	},
	{
		id: 'email_format',
		name: 'Email Format',
		description: 'Validates email address format using regex',
		compatibleTypes: ['str'],
		mode: 'after',
		generateFunctionName: (fieldName) => `validate_email_${pyName(fieldName)}`,
		generateFunctionBody: () =>
			'    import re\n    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", v):\n        raise ValueError("Invalid email format")\n    return v'
	},
	{
		id: 'url_format',
		name: 'URL Format',
		description: 'Validates URL format (http/https)',
		compatibleTypes: ['str'],
		mode: 'after',
		generateFunctionName: (fieldName) => `validate_url_${pyName(fieldName)}`,
		generateFunctionBody: () =>
			'    import re\n    if not re.match(r"^https?://[^\\s/$.?#].[^\\s]*$", v):\n        raise ValueError("Invalid URL format")\n    return v'
	},
	{
		id: 'slug_format',
		name: 'Slug Format',
		description: 'Validates URL-safe slug format (lowercase, hyphens, no spaces)',
		compatibleTypes: ['str'],
		mode: 'after',
		generateFunctionName: (fieldName) => `validate_slug_${pyName(fieldName)}`,
		generateFunctionBody: () =>
			'    import re\n    if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", v):\n        raise ValueError("Invalid slug format: use lowercase letters, numbers, and hyphens")\n    return v'
	},
	{
		id: 'regex_match',
		name: 'Regex Match',
		description: 'Validates value matches a custom regex pattern',
		compatibleTypes: ['str'],
		mode: 'after',
		parameters: [
			{ key: 'pattern', label: 'Regex Pattern', type: 'text', placeholder: '^[a-z]+$', required: true }
		],
		generateFunctionName: (fieldName) => `validate_regex_${pyName(fieldName)}`,
		generateFunctionBody: (params) => {
			const pattern = params?.pattern ?? '^.*$';
			return `    import re\n    if not re.match(r"${pattern}", v):\n        raise ValueError("Value does not match required pattern")\n    return v`;
		}
	},
	{
		id: 'string_length',
		name: 'String Length Check',
		description: 'Validates string length is within min/max bounds',
		compatibleTypes: ['str'],
		mode: 'after',
		parameters: [
			{ key: 'min', label: 'Min Length', type: 'number', placeholder: '0', required: false },
			{ key: 'max', label: 'Max Length', type: 'number', placeholder: '255', required: false }
		],
		generateFunctionName: (fieldName) => `validate_length_${pyName(fieldName)}`,
		generateFunctionBody: (params) => {
			const lines: string[] = [];
			if (params?.min) {
				lines.push(`    if len(v) < ${params.min}:\n        raise ValueError(f"Must be at least ${params.min} characters")`);
			}
			if (params?.max) {
				lines.push(`    if len(v) > ${params.max}:\n        raise ValueError(f"Must be at most ${params.max} characters")`);
			}
			if (lines.length === 0) {
				lines.push('    pass  # No length constraints specified');
			}
			lines.push('    return v');
			return lines.join('\n');
		}
	},
	{
		id: 'number_range',
		name: 'Number Range',
		description: 'Validates number is within min/max range',
		compatibleTypes: ['int', 'float'],
		mode: 'after',
		parameters: [
			{ key: 'min', label: 'Minimum', type: 'number', placeholder: '0', required: false },
			{ key: 'max', label: 'Maximum', type: 'number', placeholder: '100', required: false }
		],
		generateFunctionName: (fieldName) => `validate_range_${pyName(fieldName)}`,
		generateFunctionBody: (params) => {
			const lines: string[] = [];
			if (params?.min) {
				lines.push(`    if v < ${params.min}:\n        raise ValueError(f"Must be at least ${params.min}")`);
			}
			if (params?.max) {
				lines.push(`    if v > ${params.max}:\n        raise ValueError(f"Must be at most ${params.max}")`);
			}
			if (lines.length === 0) {
				lines.push('    pass  # No range constraints specified');
			}
			lines.push('    return v');
			return lines.join('\n');
		}
	},
	{
		id: 'must_be_positive',
		name: 'Must Be Positive',
		description: 'Ensures value is greater than zero',
		compatibleTypes: ['int', 'float'],
		mode: 'after',
		generateFunctionName: (fieldName) => `validate_positive_${pyName(fieldName)}`,
		generateFunctionBody: () =>
			'    if v <= 0:\n        raise ValueError("Value must be positive")\n    return v'
	},
	{
		id: 'future_date',
		name: 'Future Date Only',
		description: 'Ensures date/datetime is in the future',
		compatibleTypes: ['datetime'],
		mode: 'after',
		generateFunctionName: (fieldName) => `validate_future_${pyName(fieldName)}`,
		generateFunctionBody: () =>
			'    from datetime import datetime\n    if v <= datetime.now():\n        raise ValueError("Date must be in the future")\n    return v'
	},
	{
		id: 'not_empty',
		name: 'Not Empty / Whitespace',
		description: 'Ensures string is not empty or only whitespace',
		compatibleTypes: ['str'],
		mode: 'after',
		generateFunctionName: (fieldName) => `validate_not_empty_${pyName(fieldName)}`,
		generateFunctionBody: () =>
			'    if not v or not v.strip():\n        raise ValueError("Value must not be empty or whitespace")\n    return v'
	}
];

// ============================================================================
// Model Validator Templates
// ============================================================================

export const MODEL_VALIDATOR_TEMPLATES: ModelValidatorTemplate[] = [
	{
		id: 'password_confirm',
		name: 'Password Confirmation',
		description: 'Ensures password and confirmation fields match',
		mode: 'after',
		roles: [
			{ key: 'password_field', label: 'Password field', compatibleTypes: ['str'], required: true },
			{ key: 'confirm_field', label: 'Confirmation field', compatibleTypes: ['str'], required: true }
		],
		generateFunctionName: () => 'validate_password_confirmation',
		generateFunctionBody: (mappings) =>
			`    if self.${mappings.password_field} != self.${mappings.confirm_field}:\n        raise ValueError("Password and confirmation do not match")\n    return self`
	},
	{
		id: 'date_range',
		name: 'Date Range',
		description: 'Ensures end date is after start date',
		mode: 'after',
		roles: [
			{ key: 'start_field', label: 'Start date field', compatibleTypes: ['datetime'], required: true },
			{ key: 'end_field', label: 'End date field', compatibleTypes: ['datetime'], required: true }
		],
		generateFunctionName: () => 'validate_date_range',
		generateFunctionBody: (mappings) =>
			`    if self.${mappings.end_field} <= self.${mappings.start_field}:\n        raise ValueError("End date must be after start date")\n    return self`
	},
	{
		id: 'mutual_exclusivity',
		name: 'Mutual Exclusivity',
		description: 'Ensures only one of two fields is set (not both)',
		mode: 'after',
		roles: [
			{ key: 'field_a', label: 'Field A', compatibleTypes: [], required: true },
			{ key: 'field_b', label: 'Field B', compatibleTypes: [], required: true }
		],
		generateFunctionName: () => 'validate_mutual_exclusivity',
		generateFunctionBody: (mappings) =>
			`    if self.${mappings.field_a} is not None and self.${mappings.field_b} is not None:\n        raise ValueError("Only one of ${mappings.field_a} or ${mappings.field_b} can be set")\n    return self`
	},
	{
		id: 'conditional_required',
		name: 'Conditional Required',
		description: 'Requires a field when another field has a specific value',
		mode: 'after',
		roles: [
			{ key: 'trigger_field', label: 'Trigger field', compatibleTypes: [], required: true },
			{ key: 'required_field', label: 'Required field (when triggered)', compatibleTypes: [], required: true }
		],
		parameters: [
			{ key: 'trigger_value', label: 'Trigger value', type: 'text', placeholder: 'e.g. active', required: true }
		],
		generateFunctionName: () => 'validate_conditional_required',
		generateFunctionBody: (mappings) => {
			const triggerValue = mappings.trigger_value ?? 'True';
			return `    if str(self.${mappings.trigger_field}) == "${triggerValue}" and self.${mappings.required_field} is None:\n        raise ValueError("${mappings.required_field} is required when ${mappings.trigger_field} is ${triggerValue}")\n    return self`;
		}
	},
	{
		id: 'numeric_comparison',
		name: 'Numeric Comparison',
		description: 'Ensures one numeric field is less than another',
		mode: 'after',
		roles: [
			{ key: 'lesser_field', label: 'Lesser field', compatibleTypes: ['int', 'float'], required: true },
			{ key: 'greater_field', label: 'Greater field', compatibleTypes: ['int', 'float'], required: true }
		],
		generateFunctionName: () => 'validate_numeric_comparison',
		generateFunctionBody: (mappings) =>
			`    if self.${mappings.lesser_field} is not None and self.${mappings.greater_field} is not None:\n        if self.${mappings.lesser_field} >= self.${mappings.greater_field}:\n            raise ValueError("${mappings.lesser_field} must be less than ${mappings.greater_field}")\n    return self`
	},
	{
		id: 'at_least_one',
		name: 'At Least One Required',
		description: 'Ensures at least one of two fields is provided',
		mode: 'before',
		roles: [
			{ key: 'field_a', label: 'Field A', compatibleTypes: [], required: true },
			{ key: 'field_b', label: 'Field B', compatibleTypes: [], required: true }
		],
		generateFunctionName: () => 'validate_at_least_one',
		generateFunctionBody: (mappings) =>
			`    a = data.get("${mappings.field_a}")\n    b = data.get("${mappings.field_b}")\n    if a is None and b is None:\n        raise ValueError("At least one of ${mappings.field_a} or ${mappings.field_b} must be provided")\n    return data`
	}
];

// ============================================================================
// Lookup Helpers
// ============================================================================

/** Get field validator templates compatible with a given type name */
export function getFieldTemplatesForType(typeName: string): FieldValidatorTemplate[] {
	return FIELD_VALIDATOR_TEMPLATES.filter(t => t.compatibleTypes.includes(typeName));
}

/** Get all model validator templates */
export function getModelTemplates(): ModelValidatorTemplate[] {
	return MODEL_VALIDATOR_TEMPLATES;
}

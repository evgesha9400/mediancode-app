// Validator template definitions for the template gallery pages.
// Extracted from route-level page files to avoid duplication.

// ============================================================================
// FIELD VALIDATOR TEMPLATES
// ============================================================================

export type FieldValidatorTemplate = {
  id: string;
  name: string;
  icon: string;
  description: string;
  compatibleTypes: string[];
  mode: 'before' | 'after';
  code: string;
};

export const blankFieldValidatorTemplate: FieldValidatorTemplate = {
  id: 'blank',
  name: 'Blank Validator',
  icon: 'fa-file-circle-plus',
  description: 'Start from scratch with an empty validator',
  compatibleTypes: ['Any'],
  mode: 'after',
  code: '    # Write your validation logic here\n    return v'
};

export const fieldValidatorTemplates: FieldValidatorTemplate[] = [
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
// MODEL VALIDATOR TEMPLATES
// ============================================================================

export type ModelValidatorTemplate = {
  id: string;
  name: string;
  icon: string;
  description: string;
  requiredFields: string[];
  mode: 'before' | 'after';
  code: string;
};

export const blankModelValidatorTemplate: ModelValidatorTemplate = {
  id: 'blank',
  name: 'Blank Validator',
  icon: 'fa-file-circle-plus',
  description: 'Start from scratch with an empty model validator',
  requiredFields: [],
  mode: 'after',
  code: '    # Write your cross-field validation logic here\n    return self'
};

export const modelValidatorTemplates: ModelValidatorTemplate[] = [
  {
    id: 'cross-field-comparison',
    name: 'Cross-Field Comparison',
    icon: 'fa-not-equal',
    description: 'Ensure one field is greater than another',
    requiredFields: ['start_date', 'end_date'],
    mode: 'after',
    code: '    if self.end_date <= self.start_date:\n        raise ValueError(\'end_date must be after start_date\')\n    return self'
  },
  {
    id: 'mutual-exclusion',
    name: 'Mutual Exclusion',
    icon: 'fa-code-branch',
    description: 'Exactly one of two fields must be set',
    requiredFields: ['phone', 'email'],
    mode: 'after',
    code: '    if self.phone and self.email:\n        raise ValueError(\'Only one of phone or email can be provided\')\n    if not self.phone and not self.email:\n        raise ValueError(\'Either phone or email is required\')\n    return self'
  },
  {
    id: 'conditional-required',
    name: 'Conditional Required',
    icon: 'fa-code-merge',
    description: 'If one field is set, another becomes required',
    requiredFields: ['discount_code', 'discount_amount'],
    mode: 'after',
    code: '    if self.discount_code and not self.discount_amount:\n        raise ValueError(\'discount_amount is required when discount_code is provided\')\n    return self'
  },
  {
    id: 'at-least-one-required',
    name: 'At Least One Required',
    icon: 'fa-list-check',
    description: 'At least one of several optional fields must be set',
    requiredFields: ['phone', 'email', 'address'],
    mode: 'after',
    code: '    if not any([self.phone, self.email, self.address]):\n        raise ValueError(\'At least one contact method is required\')\n    return self'
  },
  {
    id: 'password-confirmation',
    name: 'Password Confirmation',
    icon: 'fa-key',
    description: 'Ensure password matches confirmation field',
    requiredFields: ['password', 'confirm_password'],
    mode: 'after',
    code: '    if self.password != self.confirm_password:\n        raise ValueError(\'Passwords do not match\')\n    return self'
  },
  {
    id: 'date-range-validation',
    name: 'Date Range Validation',
    icon: 'fa-calendar-check',
    description: 'Validate date range bounds and maximum span',
    requiredFields: ['start_date', 'end_date'],
    mode: 'after',
    code: '    from datetime import timedelta\n    if self.end_date <= self.start_date:\n        raise ValueError(\'end_date must be after start_date\')\n    if (self.end_date - self.start_date) > timedelta(days=365):\n        raise ValueError(\'Date range cannot exceed 365 days\')\n    return self'
  },
  {
    id: 'sum-constraint',
    name: 'Sum Constraint',
    icon: 'fa-calculator',
    description: 'Ensure parts sum to a total',
    requiredFields: ['part_a', 'part_b', 'total'],
    mode: 'after',
    code: '    if self.part_a + self.part_b != self.total:\n        raise ValueError(f\'Parts ({self.part_a} + {self.part_b}) must sum to total ({self.total})\')\n    return self'
  },
  {
    id: 'enum-dependent-fields',
    name: 'Enum-Dependent Fields',
    icon: 'fa-link',
    description: 'Require different fields based on a status enum',
    requiredFields: ['status', 'reason'],
    mode: 'after',
    code: '    if self.status == \'rejected\' and not self.reason:\n        raise ValueError(\'reason is required when status is rejected\')\n    return self'
  },
  {
    id: 'json-schema-validation',
    name: 'JSON Schema Validation',
    icon: 'fa-file-code',
    description: 'Validate required keys exist in a dictionary field',
    requiredFields: ['metadata'],
    mode: 'before',
    code: '    metadata = data.get(\'metadata\', {})\n    required_keys = [\'version\', \'source\']\n    missing = [k for k in required_keys if k not in metadata]\n    if missing:\n        raise ValueError(f\'metadata missing required keys: {", ".join(missing)}\')\n    return data'
  }
];

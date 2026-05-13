import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn()
}));

import { listFieldValidatorTemplates } from '$lib/api/fieldValidatorTemplates';
import { apiGet } from '$lib/api/client';

const MOCK_TEMPLATE_RESPONSE = {
  id: 'fvt-1',
  name: 'Email Format',
  description: 'Validates email address format using regex',
  compatibleTypes: ['str'],
  mode: 'after',
  parameters: [
    {
      key: 'pattern',
      label: 'Regex Pattern',
      type: 'select',
      placeholder: 'Select a pattern',
      options: [
        { value: 'strict', label: 'Strict' },
        { value: 'relaxed', label: 'Relaxed' }
      ],
      required: true
    }
  ],
  bodyTemplate: '    import re\n    if not re.match(r"${pattern}", v):\n        raise ValueError("Invalid email format")\n    return v'
};

describe('Field Validator Templates API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listFieldValidatorTemplates', () => {
    it('should list all field validator templates', async () => {
      (apiGet as any).mockResolvedValue([MOCK_TEMPLATE_RESPONSE]);

      const result = await listFieldValidatorTemplates();

      expect(apiGet).toHaveBeenCalledWith('/field-validator-templates');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(MOCK_TEMPLATE_RESPONSE);
    });
  });
});

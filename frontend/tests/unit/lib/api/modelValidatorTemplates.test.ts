import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/client', () => ({
  apiGet: vi.fn()
}));

import { listModelValidatorTemplates } from '$lib/api/modelValidatorTemplates';
import { apiGet } from '$lib/api/client';

const MOCK_TEMPLATE_RESPONSE = {
  id: 'password_confirm',
  name: 'Password Confirmation',
  description: 'Ensures password and confirmation fields match',
  mode: 'after',
  parameters: [
    {
      key: 'error_message',
      label: 'Error Message',
      type: 'text',
      placeholder: 'Passwords do not match',
      required: false
    }
  ],
  fieldMappings: [
    {
      key: 'password_field',
      label: 'Password field',
      compatibleTypes: ['str'],
      required: true
    },
    {
      key: 'confirm_field',
      label: 'Confirmation field',
      compatibleTypes: ['str'],
      required: true
    }
  ],
  bodyTemplate: '    if self.{{ password_field }} != self.{{ confirm_field }}:\n        raise ValueError("{{ error_message }}")\n    return self'
};

describe('Model Validator Templates API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listModelValidatorTemplates', () => {
    it('should list all model validator templates', async () => {
      (apiGet as any).mockResolvedValue([MOCK_TEMPLATE_RESPONSE]);

      const result = await listModelValidatorTemplates();

      expect(apiGet).toHaveBeenCalledWith('/model-validator-templates');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(MOCK_TEMPLATE_RESPONSE);
    });

    it('should transform response with fieldMappings and parameters', async () => {
      (apiGet as any).mockResolvedValue([MOCK_TEMPLATE_RESPONSE]);

      const result = await listModelValidatorTemplates();

      expect(result[0].id).toBe('password_confirm');
      expect(result[0].name).toBe('Password Confirmation');
      expect(result[0].mode).toBe('after');
      expect(result[0].parameters).toHaveLength(1);
      expect(result[0].parameters[0].key).toBe('error_message');
      expect(result[0].fieldMappings).toHaveLength(2);
      expect(result[0].fieldMappings[0].key).toBe('password_field');
      expect(result[0].fieldMappings[1].key).toBe('confirm_field');
      expect(result[0].bodyTemplate).toContain('password_field');
    });

    it('should return empty array when no templates exist', async () => {
      (apiGet as any).mockResolvedValue([]);

      const result = await listModelValidatorTemplates();

      expect(apiGet).toHaveBeenCalledWith('/model-validator-templates');
      expect(result).toEqual([]);
    });
  });
});

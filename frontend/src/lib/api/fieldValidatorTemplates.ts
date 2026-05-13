/**
 * Field Validator Templates API Service
 *
 * GET methods for field validator template catalogue operations.
 */

import { apiGet } from './client';
import type { FieldValidatorTemplate } from '$lib/types';

/**
 * Backend API response for FieldValidatorTemplate entity
 */
interface FieldValidatorTemplateResponse {
	id: string;
	name: string;
	description: string;
	compatibleTypes: string[];
	mode: 'before' | 'after';
	parameters: {
		key: string;
		label: string;
		type: 'text' | 'number' | 'select';
		placeholder: string;
		options?: { value: string; label: string }[];
		required: boolean;
	}[];
	bodyTemplate: string;
}

/**
 * Transform backend response to frontend FieldValidatorTemplate type
 */
function transformFieldValidatorTemplate(response: FieldValidatorTemplateResponse): FieldValidatorTemplate {
	return {
		id: response.id,
		name: response.name,
		description: response.description,
		compatibleTypes: response.compatibleTypes,
		mode: response.mode,
		parameters: response.parameters,
		bodyTemplate: response.bodyTemplate
	};
}

/**
 * List all field validator templates
 */
export async function listFieldValidatorTemplates(): Promise<FieldValidatorTemplate[]> {
	const response = await apiGet<FieldValidatorTemplateResponse[]>('/field-validator-templates');
	return response.map(transformFieldValidatorTemplate);
}

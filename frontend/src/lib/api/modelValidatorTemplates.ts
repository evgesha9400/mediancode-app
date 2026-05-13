/**
 * Model Validator Templates API Service
 *
 * GET methods for model validator template catalogue operations.
 */

import { apiGet } from './client';
import type { ModelValidatorTemplate } from '$lib/types';

/**
 * Backend API response for ModelValidatorTemplate entity
 */
interface ModelValidatorTemplateResponse {
	id: string;
	name: string;
	description: string;
	mode: 'before' | 'after';
	parameters: {
		key: string;
		label: string;
		type: 'text' | 'number' | 'select';
		placeholder: string;
		options?: { value: string; label: string }[];
		required: boolean;
	}[];
	fieldMappings: {
		key: string;
		label: string;
		compatibleTypes: string[];
		required: boolean;
	}[];
	bodyTemplate: string;
}

/**
 * Transform backend response to frontend ModelValidatorTemplate type
 */
function transformModelValidatorTemplate(response: ModelValidatorTemplateResponse): ModelValidatorTemplate {
	return {
		id: response.id,
		name: response.name,
		description: response.description,
		mode: response.mode,
		parameters: response.parameters,
		fieldMappings: response.fieldMappings,
		bodyTemplate: response.bodyTemplate
	};
}

/**
 * List all model validator templates
 */
export async function listModelValidatorTemplates(): Promise<ModelValidatorTemplate[]> {
	const response = await apiGet<ModelValidatorTemplateResponse[]>('/model-validator-templates');
	return response.map(transformModelValidatorTemplate);
}

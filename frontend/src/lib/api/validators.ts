/**
 * Validators API Service
 *
 * GET methods for validator operations.
 */

import { apiGet } from './client';
import type { Validator } from '$lib/stores/validators';

/**
 * Backend field reference for validator usage
 */
interface FieldReferenceResponse {
	name: string;
	fieldId: string;
}

/**
 * Backend API response for Validator entity
 */
interface ValidatorResponse {
	name: string;
	namespaceId: string;
	type: 'string' | 'numeric' | 'collection';
	description: string;
	category: 'inline' | 'custom';
	parameterType: string;
	exampleUsage: string;
	pydanticDocsUrl: string;
	usedInFields: number;
	fieldsUsingValidator: FieldReferenceResponse[];
}

/**
 * Transform backend response to frontend Validator type
 */
function transformValidator(response: ValidatorResponse): Validator {
	return {
		name: response.name,
		namespaceId: response.namespaceId,
		type: response.type,
		description: response.description,
		category: response.category,
		parameterType: response.parameterType,
		exampleUsage: response.exampleUsage,
		pydanticDocsUrl: response.pydanticDocsUrl,
		usedInFields: response.usedInFields,
		fieldsUsingValidator: response.fieldsUsingValidator
	};
}

/**
 * List all validators, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listValidators(namespaceId?: string): Promise<Validator[]> {
	const params = namespaceId ? `?namespaceId=${encodeURIComponent(namespaceId)}` : '';
	const response = await apiGet<ValidatorResponse[]>(`/validators${params}`);
	return response.map(transformValidator);
}

/**
 * Types API Service
 *
 * GET methods for type operations.
 */

import { apiGet } from './client';
import type { FieldType, TypeName } from '$lib/stores/types';

/**
 * Backend API response for Type entity
 */
interface TypeResponse {
	id: string;
	namespaceId: string;
	name: string;
	category: 'primitive' | 'abstract';
	pythonType: string;
	description: string;
	compatibleTypes: string[];
	usedInFields: number;
}

/**
 * Transform backend response to frontend FieldType type
 */
function transformType(response: TypeResponse): FieldType {
	return {
		id: response.id,
		name: response.name as TypeName,
		category: response.category,
		pythonType: response.pythonType,
		description: response.description,
		compatibleTypes: response.compatibleTypes,
		usedInFields: response.usedInFields
	};
}

/**
 * List all available types
 */
export async function listTypes(): Promise<FieldType[]> {
	const response = await apiGet<TypeResponse[]>('/types');
	return response.map(transformType);
}

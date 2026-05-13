/**
 * Types API Service
 *
 * GET methods for type operations.
 */

import { apiGet } from './client';
import type { FieldType } from '$lib/stores/stores';

/**
 * Backend API response for Type entity
 */
interface TypeResponse {
	id: string;
	namespaceId: string;
	name: string;
	pythonType: string;
	description: string;
	importPath: string | null;
	parentTypeId: string | null;
	usedInFields: number;
}

/**
 * Transform backend response to frontend FieldType type
 */
function transformType(response: TypeResponse): FieldType {
	return {
		id: response.id,
		namespaceId: response.namespaceId,
		name: response.name,
		pythonType: response.pythonType,
		description: response.description,
		importPath: response.importPath,
		parentTypeId: response.parentTypeId,
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

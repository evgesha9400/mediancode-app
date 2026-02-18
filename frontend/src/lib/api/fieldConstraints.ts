/**
 * Field Constraints API Service
 *
 * GET methods for field constraint operations.
 */

import { apiGet } from './client';
import type { FieldConstraint } from '$lib/stores/fieldConstraints';

/**
 * Backend API response for FieldConstraint entity
 */
interface FieldConstraintResponse {
	id: string;
	namespaceId: string;
	name: string;
	description: string;
	parameterTypes: string[];
	docsUrl: string | null;
	compatibleTypes: string[];
	usedInFields: number;
}

/**
 * Transform backend response to frontend FieldConstraint type
 */
function transformFieldConstraint(response: FieldConstraintResponse): FieldConstraint {
	return {
		id: response.id,
		namespaceId: response.namespaceId,
		name: response.name,
		description: response.description,
		parameterTypes: response.parameterTypes,
		docsUrl: response.docsUrl,
		compatibleTypes: response.compatibleTypes,
		usedInFields: response.usedInFields
	};
}

/**
 * List all field constraints, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listFieldConstraints(namespaceId?: string): Promise<FieldConstraint[]> {
	const params = namespaceId ? `?namespaceId=${encodeURIComponent(namespaceId)}` : '';
	const response = await apiGet<FieldConstraintResponse[]>(`/field-constraints${params}`);
	return response.map(transformFieldConstraint);
}

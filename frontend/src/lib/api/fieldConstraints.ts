/**
 * Field Constraints API Service
 *
 * GET methods for field constraint operations.
 */

import { apiGet } from './client';
import type { FieldConstraint } from '$lib/stores/fieldConstraints';

/**
 * Backend field reference for field constraint usage
 */
interface FieldReferenceResponse {
	name: string;
	fieldId: string;
}

/**
 * Backend API response for FieldConstraint entity
 */
interface FieldConstraintResponse {
	id: string;
	namespaceId: string;
	name: string;
	description: string;
	parameterType: string;
	docsUrl: string | null;
	compatibleTypes: string[];
	usedInFields: number;
	fieldsUsingConstraint: FieldReferenceResponse[];
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
		parameterType: response.parameterType,
		docsUrl: response.docsUrl,
		compatibleTypes: response.compatibleTypes,
		usedInFields: response.usedInFields,
		fieldsUsingConstraint: response.fieldsUsingConstraint
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

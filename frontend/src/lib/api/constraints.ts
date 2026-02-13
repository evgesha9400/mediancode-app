/**
 * Constraints API Service
 *
 * GET methods for constraint operations.
 */

import { apiGet } from './client';
import type { Constraint } from '$lib/stores/constraints';

/**
 * Backend field reference for constraint usage
 */
interface FieldReferenceResponse {
	name: string;
	fieldId: string;
}

/**
 * Backend API response for Constraint entity
 */
interface ConstraintResponse {
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
 * Transform backend response to frontend Constraint type
 */
function transformConstraint(response: ConstraintResponse): Constraint {
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
 * List all constraints, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listConstraints(namespaceId?: string): Promise<Constraint[]> {
	const params = namespaceId ? `?namespaceId=${encodeURIComponent(namespaceId)}` : '';
	const response = await apiGet<ConstraintResponse[]>(`/constraints${params}`);
	return response.map(transformConstraint);
}

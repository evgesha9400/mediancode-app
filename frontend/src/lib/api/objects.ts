/**
 * Objects API Service
 *
 * GET methods for object operations.
 */

import { apiGet } from './client';
import type { ObjectDefinition, ObjectFieldReference } from '$lib/types';

/**
 * Backend object field reference response
 */
interface ObjectFieldReferenceResponse {
	fieldId: string;
	required: boolean;
}

/**
 * Backend API response for Object entity
 */
interface ObjectResponse {
	id: string;
	namespaceId: string;
	name: string;
	description: string | null;
	fields: ObjectFieldReferenceResponse[];
	usedInApis: string[];
}

/**
 * Transform backend field reference to frontend type
 */
function transformFieldReference(response: ObjectFieldReferenceResponse): ObjectFieldReference {
	return {
		fieldId: response.fieldId,
		required: response.required
	};
}

/**
 * Transform backend response to frontend ObjectDefinition type
 */
function transformObject(response: ObjectResponse): ObjectDefinition {
	return {
		id: response.id,
		namespaceId: response.namespaceId,
		name: response.name,
		description: response.description ?? undefined,
		fields: response.fields.map(transformFieldReference),
		usedInApis: response.usedInApis
	};
}

/**
 * List all objects, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listObjects(namespaceId?: string): Promise<ObjectDefinition[]> {
	const params = namespaceId ? `?namespaceId=${encodeURIComponent(namespaceId)}` : '';
	const response = await apiGet<ObjectResponse[]>(`/objects${params}`);
	return response.map(transformObject);
}

/**
 * Get a single object by ID
 */
export async function getObject(id: string): Promise<ObjectDefinition> {
	const response = await apiGet<ObjectResponse>(`/objects/${id}`);
	return transformObject(response);
}

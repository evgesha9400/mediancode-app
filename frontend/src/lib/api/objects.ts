/**
 * Objects API Service
 *
 * CRUD methods for object operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
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
	const params = namespaceId ? `?namespace_id=${encodeURIComponent(namespaceId)}` : '';
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

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Request payload for creating an object
 */
export interface CreateObjectRequest {
	namespaceId: string;
	name: string;
	description?: string;
	fields: ObjectFieldReference[];
}

/**
 * Request payload for updating an object
 */
export interface UpdateObjectRequest {
	name?: string;
	description?: string;
	fields?: ObjectFieldReference[];
}

// ============================================================================
// Mutation Methods
// ============================================================================

/**
 * Create a new object
 *
 * @param data - Object creation data
 * @returns The created object
 */
export async function createObjectApi(data: CreateObjectRequest): Promise<ObjectDefinition> {
	const response = await apiPost<ObjectResponse>('/objects', data);
	return transformObject(response);
}

/**
 * Update an existing object
 *
 * @param id - Object ID to update
 * @param data - Partial object data to update
 * @returns The updated object
 */
export async function updateObjectApi(id: string, data: UpdateObjectRequest): Promise<ObjectDefinition> {
	const response = await apiPut<ObjectResponse>(`/objects/${id}`, data);
	return transformObject(response);
}

/**
 * Delete an object
 *
 * @param id - Object ID to delete
 */
export async function deleteObjectApi(id: string): Promise<void> {
	await apiDelete<void>(`/objects/${id}`);
}

/**
 * Fields API Service
 *
 * CRUD methods for field operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Field, FieldValidator } from '$lib/stores/initialData';

/**
 * Backend field validator response
 */
interface FieldValidatorResponse {
	name: string;
	params: Record<string, unknown> | null;
}

/**
 * Backend API response for Field entity
 */
interface FieldResponse {
	id: string;
	namespaceId: string;
	name: string;
	type: string;
	description: string | null;
	defaultValue: string | null;
	validators: FieldValidatorResponse[];
	usedInApis: string[];
}

/**
 * Transform backend field validator to frontend type
 */
function transformFieldValidator(response: FieldValidatorResponse): FieldValidator {
	return {
		name: response.name,
		params: response.params ?? undefined
	};
}

/**
 * Transform backend response to frontend Field type
 */
function transformField(response: FieldResponse): Field {
	return {
		id: response.id,
		namespaceId: response.namespaceId,
		name: response.name,
		type: response.type as Field['type'],
		description: response.description ?? undefined,
		defaultValue: response.defaultValue ?? undefined,
		validators: response.validators.map(transformFieldValidator),
		usedInApis: response.usedInApis
	};
}

/**
 * List all fields, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listFields(namespaceId?: string): Promise<Field[]> {
	const params = namespaceId ? `?namespaceId=${encodeURIComponent(namespaceId)}` : '';
	const response = await apiGet<FieldResponse[]>(`/fields${params}`);
	return response.map(transformField);
}

/**
 * Get a single field by ID
 */
export async function getField(id: string): Promise<Field> {
	const response = await apiGet<FieldResponse>(`/fields/${id}`);
	return transformField(response);
}

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Request payload for creating a field
 */
export interface CreateFieldRequest {
	namespaceId: string;
	name: string;
	type: string;
	description?: string;
	defaultValue?: string;
	validators: { name: string; params?: Record<string, unknown> }[];
}

/**
 * Request payload for updating a field
 */
export interface UpdateFieldRequest {
	name?: string;
	type?: string;
	description?: string;
	defaultValue?: string;
	validators?: { name: string; params?: Record<string, unknown> }[];
}

// ============================================================================
// Mutation Methods
// ============================================================================

/**
 * Create a new field
 *
 * @param data - Field creation data
 * @returns The created field
 */
export async function createFieldApi(data: CreateFieldRequest): Promise<Field> {
	const response = await apiPost<FieldResponse>('/fields', data);
	return transformField(response);
}

/**
 * Update an existing field
 *
 * @param id - Field ID to update
 * @param data - Partial field data to update
 * @returns The updated field
 */
export async function updateFieldApi(id: string, data: UpdateFieldRequest): Promise<Field> {
	const response = await apiPut<FieldResponse>(`/fields/${id}`, data);
	return transformField(response);
}

/**
 * Delete a field
 *
 * @param id - Field ID to delete
 */
export async function deleteFieldApi(id: string): Promise<void> {
	await apiDelete<void>(`/fields/${id}`);
}

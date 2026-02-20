/**
 * Field Validators API Service
 *
 * CRUD methods for field validator operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { FieldValidator } from '$lib/types';

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Request payload for creating a field validator
 */
export interface CreateFieldValidatorRequest {
	namespaceId: string;
	name: string;
	description: string;
	compatibleTypes: string[];
	mode: 'before' | 'after';
	code: string;
}

/**
 * Request payload for updating a field validator
 */
export interface UpdateFieldValidatorRequest {
	name?: string;
	description?: string;
	compatibleTypes?: string[];
	mode?: 'before' | 'after';
	code?: string;
}

// ============================================================================
// Read Methods
// ============================================================================

/**
 * List all field validators, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listFieldValidators(namespaceId?: string): Promise<FieldValidator[]> {
	const params = namespaceId ? `?namespaceId=${encodeURIComponent(namespaceId)}` : '';
	return apiGet<FieldValidator[]>(`/field-validators${params}`);
}

/**
 * Get a single field validator by ID
 */
export async function getFieldValidator(id: string): Promise<FieldValidator> {
	return apiGet<FieldValidator>(`/field-validators/${id}`);
}

// ============================================================================
// Mutation Methods
// ============================================================================

/**
 * Create a new field validator
 *
 * @param data - Field validator creation data
 * @returns The created field validator
 */
export async function createFieldValidatorApi(data: CreateFieldValidatorRequest): Promise<FieldValidator> {
	return apiPost<FieldValidator>('/field-validators', data);
}

/**
 * Update an existing field validator
 *
 * @param id - Field validator ID to update
 * @param data - Partial field validator data to update
 * @returns The updated field validator
 */
export async function updateFieldValidatorApi(id: string, data: UpdateFieldValidatorRequest): Promise<FieldValidator> {
	return apiPut<FieldValidator>(`/field-validators/${id}`, data);
}

/**
 * Delete a field validator
 *
 * @param id - Field validator ID to delete
 */
export async function deleteFieldValidatorApi(id: string): Promise<void> {
	await apiDelete<void>(`/field-validators/${id}`);
}

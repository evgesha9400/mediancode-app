/**
 * Model Validators API Service
 *
 * CRUD methods for model validator operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { ModelValidator } from '$lib/types';

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Request payload for creating a model validator
 */
export interface CreateModelValidatorRequest {
	namespaceId: string;
	name: string;
	description: string;
	requiredFields: string[];
	mode: 'before' | 'after';
	code: string;
}

/**
 * Request payload for updating a model validator
 */
export interface UpdateModelValidatorRequest {
	name?: string;
	description?: string;
	requiredFields?: string[];
	mode?: 'before' | 'after';
	code?: string;
}

// ============================================================================
// Read Methods
// ============================================================================

/**
 * List all model validators, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listModelValidators(namespaceId?: string): Promise<ModelValidator[]> {
	const params = namespaceId ? `?namespaceId=${encodeURIComponent(namespaceId)}` : '';
	return apiGet<ModelValidator[]>(`/model-validators${params}`);
}

/**
 * Get a single model validator by ID
 */
export async function getModelValidator(id: string): Promise<ModelValidator> {
	return apiGet<ModelValidator>(`/model-validators/${id}`);
}

// ============================================================================
// Mutation Methods
// ============================================================================

/**
 * Create a new model validator
 *
 * @param data - Model validator creation data
 * @returns The created model validator
 */
export async function createModelValidatorApi(data: CreateModelValidatorRequest): Promise<ModelValidator> {
	return apiPost<ModelValidator>('/model-validators', data);
}

/**
 * Update an existing model validator
 *
 * @param id - Model validator ID to update
 * @param data - Partial model validator data to update
 * @returns The updated model validator
 */
export async function updateModelValidatorApi(id: string, data: UpdateModelValidatorRequest): Promise<ModelValidator> {
	return apiPut<ModelValidator>(`/model-validators/${id}`, data);
}

/**
 * Delete a model validator
 *
 * @param id - Model validator ID to delete
 */
export async function deleteModelValidatorApi(id: string): Promise<void> {
	await apiDelete<void>(`/model-validators/${id}`);
}

/**
 * Fields API Service
 *
 * CRUD methods for field operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Field, FieldConstraintValue, InlineFieldValidator } from '$lib/types';
import { get } from 'svelte/store';
import { typesBaseStore } from '$lib/stores/types';

/**
 * Backend API response for field constraint value
 */
interface FieldConstraintValueResponse {
	name: string;
	constraintId: string;
	value: string | null;
}

/**
 * Build a type UUID -> type name lookup map from the types store.
 * Called at runtime when transforming field responses.
 * Maps type UUIDs to type name strings (primitive or constrained).
 */
function buildTypeIdToNameMap(): Record<string, string> {
	const types = get(typesBaseStore);
	return Object.fromEntries(
		types.map(t => [t.id, t.name])
	);
}

/**
 * Backend API response for field validator
 */
interface FieldValidatorResponse {
	id: string;
	templateId: string;
	parameters: Record<string, string> | null;
}

/**
 * Backend API response for Field entity
 */
interface FieldResponse {
	id: string;
	namespaceId: string;
	name: string;
	typeId: string;
	description: string | null;
	defaultValue: string | null;
	constraints: FieldConstraintValueResponse[];
	validators: FieldValidatorResponse[];
	usedInApis: string[];
}

/**
 * Transform backend field constraint value to frontend type.
 */
function transformFieldConstraintValue(response: FieldConstraintValueResponse): FieldConstraintValue {
	return {
		name: response.name,
		constraintId: response.constraintId,
		value: response.value
	};
}

/**
 * Transform backend field validator response to frontend type.
 */
function transformFieldValidator(response: FieldValidatorResponse): InlineFieldValidator {
	return {
		id: response.id,
		templateId: response.templateId,
		parameters: response.parameters
	};
}

/**
 * Transform backend response to frontend Field type.
 * Resolves typeId (UUID) to a type name string using the types store.
 */
function transformField(response: FieldResponse, typeMap: Record<string, string>): Field {
	const typeName = typeMap[response.typeId];
	if (!typeName) {
		console.warn(`Unknown type_id "${response.typeId}" for field "${response.name}", defaulting to "str"`);
	}

	return {
		id: response.id,
		namespaceId: response.namespaceId,
		name: response.name,
		type: typeName ?? 'str',
		description: response.description ?? undefined,
		defaultValue: response.defaultValue ?? undefined,
		constraints: response.constraints.map(transformFieldConstraintValue),
		validators: (response.validators ?? []).map(transformFieldValidator),
		usedInApis: response.usedInApis
	};
}

/**
 * List all fields, optionally filtered by namespace
 *
 * @param namespaceId - Optional namespace ID to filter by
 */
export async function listFields(namespaceId?: string): Promise<Field[]> {
	const params = namespaceId ? `?namespace_id=${encodeURIComponent(namespaceId)}` : '';
	const response = await apiGet<FieldResponse[]>(`/fields${params}`);
	const typeMap = buildTypeIdToNameMap();
	return response.map(r => transformField(r, typeMap));
}

/**
 * Get a single field by ID
 */
export async function getField(id: string): Promise<Field> {
	const response = await apiGet<FieldResponse>(`/fields/${id}`);
	const typeMap = buildTypeIdToNameMap();
	return transformField(response, typeMap);
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
	typeId: string;
	description?: string;
	defaultValue?: string;
	constraints: { constraintId: string; value: string | null }[];
	validators?: { templateId: string; parameters?: Record<string, string> }[];
}

/**
 * Request payload for updating a field
 */
export interface UpdateFieldRequest {
	name?: string;
	typeId?: string;
	description?: string;
	defaultValue?: string;
	constraints?: { constraintId: string; value: string | null }[];
	validators?: { templateId: string; parameters?: Record<string, string> }[];
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
	const typeMap = buildTypeIdToNameMap();
	return transformField(response, typeMap);
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
	const typeMap = buildTypeIdToNameMap();
	return transformField(response, typeMap);
}

/**
 * Delete a field
 *
 * @param id - Field ID to delete
 */
export async function deleteFieldApi(id: string): Promise<void> {
	await apiDelete<void>(`/fields/${id}`);
}

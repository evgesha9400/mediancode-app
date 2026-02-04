/**
 * Fields API Service
 *
 * GET methods for field operations.
 */

import { apiGet } from './client';
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

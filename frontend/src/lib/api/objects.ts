/**
 * Objects API Service
 *
 * CRUD methods for object operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { ObjectDefinition, ObjectFieldReference, ObjectRelationship, InlineModelValidator } from '$lib/types';
import type { FieldAppearance, Cardinality } from '$lib/types';

/**
 * Backend object field reference response
 */
interface ObjectFieldReferenceResponse {
	fieldId: string;
	optional: boolean;
	isPk: boolean;
	appears: string;
}

/**
 * Backend API response for object relationship
 */
interface ObjectRelationshipResponse {
	id: string;
	sourceObjectId: string;
	targetObjectId: string;
	name: string;
	cardinality: string;
	isInferred: boolean;
	inverseId: string | null;
}

/**
 * Backend API response for model validator
 */
interface ModelValidatorResponse {
	id: string;
	templateId: string;
	parameters: Record<string, string> | null;
	fieldMappings: Record<string, string>;
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
	relationships: ObjectRelationshipResponse[];
	validators: ModelValidatorResponse[];
	usedInApis: string[];
}

/**
 * Transform backend field reference to frontend type
 */
function transformFieldReference(response: ObjectFieldReferenceResponse): ObjectFieldReference {
	return {
		fieldId: response.fieldId,
		optional: response.optional,
		isPk: response.isPk ?? false,
		appears: (response.appears as FieldAppearance) ?? 'both'
	};
}

/**
 * Transform backend relationship response to frontend type
 */
function transformRelationship(response: ObjectRelationshipResponse): ObjectRelationship {
	return {
		id: response.id,
		sourceObjectId: response.sourceObjectId,
		targetObjectId: response.targetObjectId,
		name: response.name,
		cardinality: response.cardinality as Cardinality,
		isInferred: response.isInferred,
		inverseId: response.inverseId ?? undefined
	};
}

/**
 * Transform backend model validator response to frontend type.
 */
function transformModelValidator(response: ModelValidatorResponse): InlineModelValidator {
	return {
		id: response.id,
		templateId: response.templateId,
		parameters: response.parameters,
		fieldMappings: response.fieldMappings
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
		relationships: (response.relationships ?? []).map(transformRelationship),
		validators: (response.validators ?? []).map(transformModelValidator),
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
	validators?: { templateId: string; parameters?: Record<string, string>; fieldMappings: Record<string, string> }[];
}

/**
 * Request payload for updating an object
 */
export interface UpdateObjectRequest {
	name?: string;
	description?: string;
	fields?: ObjectFieldReference[];
	validators?: { templateId: string; parameters?: Record<string, string>; fieldMappings: Record<string, string> }[];
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

// ============================================================================
// Relationship Methods
// ============================================================================

/**
 * Create a relationship on an object (auto-creates bidirectional inverse on backend)
 */
export async function createRelationshipApi(
	objectId: string,
	data: { targetObjectId: string; name: string; cardinality: string }
): Promise<ObjectDefinition> {
	const response = await apiPost<ObjectResponse>(`/objects/${objectId}/relationships`, data);
	return transformObject(response);
}

/**
 * Delete a relationship (auto-deletes bidirectional inverse on backend)
 */
export async function deleteRelationshipApi(
	objectId: string,
	relationshipId: string
): Promise<void> {
	await apiDelete<void>(`/objects/${objectId}/relationships/${relationshipId}`);
}

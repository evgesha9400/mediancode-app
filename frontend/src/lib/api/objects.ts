/**
 * Objects API Service
 *
 * CRUD methods for object operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { ObjectDefinition, ObjectMember, FieldMember, RelationshipMember, DerivedRelationship, InlineModelValidator, FieldRole, RelationshipKind } from '$lib/types';

// ============================================================================
// Response Types
// ============================================================================

interface FieldMemberResponse {
	memberType: 'field';
	id: string;
	name: string;
	fieldId: string;
	role: string;
	isNullable: boolean;
	defaultValue?: string | null;
}

interface RelationshipMemberResponse {
	memberType: 'relationship';
	id: string;
	name: string;
	targetObjectId: string;
	kind: string;
	inverseName: string;
	required: boolean;
}

type MemberResponse = FieldMemberResponse | RelationshipMemberResponse;

interface DerivedRelationshipResponse {
	name: string;
	sourceObjectId: string;
	sourceObject: string;
	sourceField: string;
	kind: string;
	side: string;
	impliesFk: string | null;
	junctionTable?: string;
	required: boolean;
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
	members: MemberResponse[];
	derivedRelationships: DerivedRelationshipResponse[];
	validators: ModelValidatorResponse[];
	usedInApis: string[];
}

// ============================================================================
// Transformers
// ============================================================================

/**
 * Transform backend member response to frontend ObjectMember type
 */
function transformMember(response: MemberResponse): ObjectMember {
	if (response.memberType === 'field') {
		return {
			memberType: 'field',
			id: response.id,
			name: response.name,
			fieldId: response.fieldId,
			role: response.role as FieldRole,
			isNullable: response.isNullable ?? false,
			defaultValue: response.defaultValue ?? null,
		};
	}
	return {
		memberType: 'relationship',
		id: response.id,
		name: response.name,
		targetObjectId: response.targetObjectId,
		kind: response.kind as RelationshipKind,
		inverseName: response.inverseName,
		required: response.required,
	};
}

/**
 * Transform backend derived relationship response to frontend type
 */
function transformDerivedRelationship(response: DerivedRelationshipResponse): DerivedRelationship {
	return {
		name: response.name,
		sourceObjectId: response.sourceObjectId,
		sourceObject: response.sourceObject,
		sourceField: response.sourceField,
		kind: response.kind as RelationshipKind,
		side: response.side as 'one' | 'many' | 'target',
		impliesFk: response.impliesFk,
		junctionTable: response.junctionTable,
		required: response.required,
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
		members: response.members.map(transformMember),
		derivedRelationships: (response.derivedRelationships ?? []).map(transformDerivedRelationship),
		validators: (response.validators ?? []).map(transformModelValidator),
		usedInApis: response.usedInApis
	};
}

// ============================================================================
// Query Methods
// ============================================================================

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
	members: (Omit<FieldMember, 'id'> | Omit<RelationshipMember, 'id'>)[];
	validators?: { templateId: string; parameters?: Record<string, string>; fieldMappings: Record<string, string> }[];
}

/**
 * Request payload for updating an object
 */
export interface UpdateObjectRequest {
	name?: string;
	description?: string;
	members?: ObjectMember[];
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

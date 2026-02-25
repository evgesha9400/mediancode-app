/**
 * Namespaces API Service
 *
 * CRUD methods for namespace operations.
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { Namespace } from '$lib/types';

/**
 * Backend API response for namespace
 */
interface NamespaceResponse {
	id: string;
	name: string;
	description: string | null;
	isDefault: boolean;
	locked?: boolean;
}

/**
 * Transform backend response to frontend Namespace type
 */
function transformNamespace(response: NamespaceResponse): Namespace {
	return {
		id: response.id,
		name: response.name,
		description: response.description ?? undefined,
		isDefault: response.isDefault,
		locked: response.locked ?? false
	};
}

/**
 * List all namespaces for the current user
 */
export async function listNamespaces(): Promise<Namespace[]> {
	const response = await apiGet<NamespaceResponse[]>('/namespaces');
	return response.map(transformNamespace);
}

/**
 * Get a single namespace by ID
 */
export async function getNamespace(id: string): Promise<Namespace> {
	const response = await apiGet<NamespaceResponse>(`/namespaces/${id}`);
	return transformNamespace(response);
}

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Request payload for creating a namespace
 */
export interface CreateNamespaceRequest {
	name: string;
	description?: string;
}

/**
 * Request payload for updating a namespace
 */
export interface UpdateNamespaceRequest {
	name?: string;
	description?: string;
	isDefault?: boolean;
}

// ============================================================================
// Mutation Methods
// ============================================================================

/**
 * Create a new namespace
 *
 * @param data - Namespace creation data
 * @returns The created namespace
 */
export async function createNamespaceApi(data: CreateNamespaceRequest): Promise<Namespace> {
	const response = await apiPost<NamespaceResponse>('/namespaces', data);
	return transformNamespace(response);
}

/**
 * Update an existing namespace
 *
 * @param id - Namespace ID to update
 * @param data - Partial namespace data to update
 * @returns The updated namespace
 */
export async function updateNamespaceApi(id: string, data: UpdateNamespaceRequest): Promise<Namespace> {
	const response = await apiPut<NamespaceResponse>(`/namespaces/${id}`, data);
	return transformNamespace(response);
}

/**
 * Delete a namespace
 *
 * @param id - Namespace ID to delete
 */
export async function deleteNamespaceApi(id: string): Promise<void> {
	await apiDelete<void>(`/namespaces/${id}`);
}

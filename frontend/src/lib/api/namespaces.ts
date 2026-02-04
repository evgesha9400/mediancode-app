/**
 * Namespaces API Service
 *
 * GET methods for namespace operations.
 */

import { apiGet } from './client';
import type { Namespace } from '$lib/types';

/**
 * Backend API response for namespace
 */
interface NamespaceResponse {
	id: string;
	name: string;
	description: string | null;
	locked: boolean;
}

/**
 * Transform backend response to frontend Namespace type
 */
function transformNamespace(response: NamespaceResponse): Namespace {
	return {
		id: response.id,
		name: response.name,
		description: response.description ?? undefined,
		locked: response.locked
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

/**
 * Async Actions Layer
 *
 * Wraps API calls with store updates, providing:
 * - Optimistic updates with rollback on failure
 * - Consistent error handling
 * - Action result interface for UI feedback
 */

import { get } from 'svelte/store';
import { ApiError } from '$lib/api/client';
import {
	createFieldApi,
	updateFieldApi,
	deleteFieldApi,
	type CreateFieldRequest,
	type UpdateFieldRequest
} from '$lib/api/fields';
import {
	createObjectApi,
	updateObjectApi,
	deleteObjectApi,
	type CreateObjectRequest,
	type UpdateObjectRequest
} from '$lib/api/objects';
import {
	createApiApi,
	updateApiApi,
	deleteApiApi,
	type CreateApiRequest,
	type UpdateApiRequest
} from '$lib/api/apis';
import {
	createEndpointApi,
	updateEndpointApi,
	deleteEndpointApi,
	type CreateEndpointRequest,
	type UpdateEndpointRequest
} from '$lib/api/endpoints';
import {
	createNamespaceApi,
	updateNamespaceApi,
	deleteNamespaceApi,
	type CreateNamespaceRequest,
	type UpdateNamespaceRequest
} from '$lib/api/namespaces';
import { fieldsStore, type Field } from './fields';
import { objectsStore, type ObjectDefinition } from './objects';
import { apisStore, endpointsStore } from './apis';
import { namespacesStore, activeNamespaceId, GLOBAL_NAMESPACE_ID } from './namespaces';
import type { Api, ApiEndpoint, Namespace } from '$lib/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of an async action
 */
export interface ActionResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Extract a user-friendly error message from various error types
 */
function handleApiError(error: unknown, context: string): string {
	if (error instanceof ApiError) {
		if (error.status === 401) {
			return 'Session expired. Please sign in again.';
		}
		if (error.status === 403) {
			return 'Permission denied';
		}
		if (error.status === 404) {
			return 'Resource not found';
		}
		if (error.status === 409) {
			return error.detail || 'A resource with this name already exists';
		}
		if (error.status >= 500) {
			return 'Server error - please try again';
		}
		return error.detail || error.message;
	}
	if (error instanceof TypeError && error.message.includes('fetch')) {
		return 'Network error - check your connection';
	}
	return `Failed to ${context}`;
}

// ============================================================================
// Field Actions
// ============================================================================

/**
 * Create a new field via API
 */
export async function createFieldAction(data: CreateFieldRequest): Promise<ActionResult<Field>> {
	try {
		const field = await createFieldApi(data);
		fieldsStore.update(fields => [...fields, field]);
		return { success: true, data: field };
	} catch (err) {
		const message = handleApiError(err, 'create field');
		return { success: false, error: message };
	}
}

/**
 * Update an existing field via API with optimistic update
 */
export async function updateFieldAction(
	id: string,
	updates: UpdateFieldRequest
): Promise<ActionResult<Field>> {
	const previousFields = get(fieldsStore);

	// Optimistic update - cast to Field since we know the structure is valid
	fieldsStore.update(fields =>
		fields.map(f => (f.id === id ? { ...f, ...updates } as Field : f))
	);

	try {
		const field = await updateFieldApi(id, updates);
		// Replace with server response to ensure consistency
		fieldsStore.update(fields => fields.map(f => (f.id === id ? field : f)));
		return { success: true, data: field };
	} catch (err) {
		// Rollback on failure
		fieldsStore.set(previousFields);
		const message = handleApiError(err, 'update field');
		return { success: false, error: message };
	}
}

/**
 * Delete a field via API with optimistic update
 */
export async function deleteFieldAction(id: string): Promise<ActionResult<void>> {
	const previousFields = get(fieldsStore);

	// Optimistic delete
	fieldsStore.update(fields => fields.filter(f => f.id !== id));

	try {
		await deleteFieldApi(id);
		return { success: true };
	} catch (err) {
		// Rollback on failure
		fieldsStore.set(previousFields);
		const message = handleApiError(err, 'delete field');
		return { success: false, error: message };
	}
}

// ============================================================================
// Object Actions
// ============================================================================

/**
 * Create a new object via API
 */
export async function createObjectAction(
	data: CreateObjectRequest
): Promise<ActionResult<ObjectDefinition>> {
	try {
		const object = await createObjectApi(data);
		objectsStore.update(objects => [...objects, object]);
		return { success: true, data: object };
	} catch (err) {
		const message = handleApiError(err, 'create object');
		return { success: false, error: message };
	}
}

/**
 * Update an existing object via API with optimistic update
 */
export async function updateObjectAction(
	id: string,
	updates: UpdateObjectRequest
): Promise<ActionResult<ObjectDefinition>> {
	const previousObjects = get(objectsStore);

	// Optimistic update
	objectsStore.update(objects =>
		objects.map(o => (o.id === id ? { ...o, ...updates } : o))
	);

	try {
		const object = await updateObjectApi(id, updates);
		objectsStore.update(objects => objects.map(o => (o.id === id ? object : o)));
		return { success: true, data: object };
	} catch (err) {
		objectsStore.set(previousObjects);
		const message = handleApiError(err, 'update object');
		return { success: false, error: message };
	}
}

/**
 * Delete an object via API with optimistic update
 */
export async function deleteObjectAction(id: string): Promise<ActionResult<void>> {
	const previousObjects = get(objectsStore);

	// Optimistic delete
	objectsStore.update(objects => objects.filter(o => o.id !== id));

	try {
		await deleteObjectApi(id);
		return { success: true };
	} catch (err) {
		objectsStore.set(previousObjects);
		const message = handleApiError(err, 'delete object');
		return { success: false, error: message };
	}
}

// ============================================================================
// API Actions
// ============================================================================

/**
 * Create a new API via API
 */
export async function createApiAction(data: CreateApiRequest): Promise<ActionResult<Api>> {
	try {
		const api = await createApiApi(data);
		apisStore.update(apis => [...apis, api]);
		return { success: true, data: api };
	} catch (err) {
		const message = handleApiError(err, 'create API');
		return { success: false, error: message };
	}
}

/**
 * Update an existing API via API with optimistic update
 */
export async function updateApiAction(
	id: string,
	updates: UpdateApiRequest
): Promise<ActionResult<Api>> {
	const previousApis = get(apisStore);

	// Optimistic update - normalize tags to ensure description is always a string
	// Destructure tags out and handle separately to avoid type conflicts
	const { tags: updateTags, ...restUpdates } = updates;
	const normalizedUpdates: Partial<Api> = { ...restUpdates };
	if (updateTags !== undefined) {
		normalizedUpdates.tags = updateTags.map(t => ({ name: t.name, description: t.description ?? '' }));
	}
	apisStore.update(apis =>
		apis.map(a =>
			a.id === id ? { ...a, ...normalizedUpdates, updatedAt: new Date().toISOString() } : a
		)
	);

	try {
		const api = await updateApiApi(id, updates);
		apisStore.update(apis => apis.map(a => (a.id === id ? api : a)));
		return { success: true, data: api };
	} catch (err) {
		apisStore.set(previousApis);
		const message = handleApiError(err, 'update API');
		return { success: false, error: message };
	}
}

/**
 * Delete an API via API with optimistic update
 * Also removes associated endpoints from local stores
 * Note: Tags are now embedded in APIs, so they are deleted with the API
 */
export async function deleteApiAction(id: string): Promise<ActionResult<void>> {
	const previousApis = get(apisStore);
	const previousEndpoints = get(endpointsStore);

	// Optimistic delete (including related endpoints)
	apisStore.update(apis => apis.filter(a => a.id !== id));
	endpointsStore.update(endpoints => endpoints.filter(e => e.apiId !== id));

	try {
		await deleteApiApi(id);
		return { success: true };
	} catch (err) {
		// Rollback all stores
		apisStore.set(previousApis);
		endpointsStore.set(previousEndpoints);
		const message = handleApiError(err, 'delete API');
		return { success: false, error: message };
	}
}

// ============================================================================
// Endpoint Actions
// ============================================================================

/**
 * Create a new endpoint via API
 */
export async function createEndpointAction(
	data: CreateEndpointRequest
): Promise<ActionResult<ApiEndpoint>> {
	try {
		const endpoint = await createEndpointApi(data);
		endpointsStore.update(endpoints => [...endpoints, endpoint]);
		return { success: true, data: endpoint };
	} catch (err) {
		const message = handleApiError(err, 'create endpoint');
		return { success: false, error: message };
	}
}

/**
 * Update an existing endpoint via API with optimistic update
 */
export async function updateEndpointAction(
	id: string,
	updates: UpdateEndpointRequest
): Promise<ActionResult<ApiEndpoint>> {
	const previousEndpoints = get(endpointsStore);

	// Convert null to undefined for tagName to match ApiEndpoint type
	const normalizedUpdates = {
		...updates,
		tagName: updates.tagName === null ? undefined : updates.tagName
	};

	// Optimistic update - cast to ApiEndpoint since we know the structure is valid
	endpointsStore.update(endpoints =>
		endpoints.map(e => (e.id === id ? { ...e, ...normalizedUpdates } as ApiEndpoint : e))
	);

	try {
		const endpoint = await updateEndpointApi(id, updates);
		endpointsStore.update(endpoints => endpoints.map(e => (e.id === id ? endpoint : e)));
		return { success: true, data: endpoint };
	} catch (err) {
		endpointsStore.set(previousEndpoints);
		const message = handleApiError(err, 'update endpoint');
		return { success: false, error: message };
	}
}

/**
 * Delete an endpoint via API with optimistic update
 */
export async function deleteEndpointAction(id: string): Promise<ActionResult<void>> {
	const previousEndpoints = get(endpointsStore);

	// Optimistic delete
	endpointsStore.update(endpoints => endpoints.filter(e => e.id !== id));

	try {
		await deleteEndpointApi(id);
		return { success: true };
	} catch (err) {
		endpointsStore.set(previousEndpoints);
		const message = handleApiError(err, 'delete endpoint');
		return { success: false, error: message };
	}
}

// ============================================================================
// Namespace Actions
// ============================================================================

/**
 * Create a new namespace via API
 */
export async function createNamespaceAction(
	data: CreateNamespaceRequest
): Promise<ActionResult<Namespace>> {
	try {
		const namespace = await createNamespaceApi(data);
		namespacesStore.update(namespaces => [...namespaces, namespace]);
		return { success: true, data: namespace };
	} catch (err) {
		const message = handleApiError(err, 'create namespace');
		return { success: false, error: message };
	}
}

/**
 * Update an existing namespace via API with optimistic update
 */
export async function updateNamespaceAction(
	id: string,
	updates: UpdateNamespaceRequest
): Promise<ActionResult<Namespace>> {
	const previousNamespaces = get(namespacesStore);

	// Optimistic update
	namespacesStore.update(namespaces =>
		namespaces.map(ns => (ns.id === id ? { ...ns, ...updates } : ns))
	);

	try {
		const namespace = await updateNamespaceApi(id, updates);
		namespacesStore.update(namespaces => namespaces.map(ns => (ns.id === id ? namespace : ns)));
		return { success: true, data: namespace };
	} catch (err) {
		namespacesStore.set(previousNamespaces);
		const message = handleApiError(err, 'update namespace');
		return { success: false, error: message };
	}
}

/**
 * Delete a namespace via API with optimistic update
 */
export async function deleteNamespaceAction(id: string): Promise<ActionResult<void>> {
	const previousNamespaces = get(namespacesStore);
	const wasActive = get(activeNamespaceId) === id;

	// Optimistic delete
	namespacesStore.update(namespaces => namespaces.filter(ns => ns.id !== id));

	// If this was the active namespace, switch to global
	if (wasActive) {
		activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
	}

	try {
		await deleteNamespaceApi(id);
		return { success: true };
	} catch (err) {
		// Rollback
		namespacesStore.set(previousNamespaces);
		if (wasActive) {
			activeNamespaceId.set(id);
		}
		const message = handleApiError(err, 'delete namespace');
		return { success: false, error: message };
	}
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type {
	CreateFieldRequest,
	UpdateFieldRequest
} from '$lib/api/fields';
export type {
	CreateObjectRequest,
	UpdateObjectRequest
} from '$lib/api/objects';
export type {
	CreateApiRequest,
	UpdateApiRequest
} from '$lib/api/apis';
export type {
	CreateEndpointRequest,
	UpdateEndpointRequest
} from '$lib/api/endpoints';
export type {
	CreateNamespaceRequest,
	UpdateNamespaceRequest
} from '$lib/api/namespaces';

// src/lib/domain/mutations.ts
//
// Canonical mutation pipeline. Every entity create/update/delete goes through here.
// Stores become read-only; routes import actions from this module.

import { get } from 'svelte/store';
import { mapApiError } from './errorMap';

// --- API transport functions ---
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
import {
	createFieldValidatorApi,
	updateFieldValidatorApi,
	deleteFieldValidatorApi,
	type CreateFieldValidatorRequest,
	type UpdateFieldValidatorRequest
} from '$lib/api/fieldValidators';

// --- Stores (used for optimistic updates and post-mutation commits) ---
import { fieldsStore, type Field } from '$lib/stores/fields';
import { objectsStore, type ObjectDefinition } from '$lib/stores/objects';
import { apisStore, endpointsStore } from '$lib/stores/apis';
import {
	namespacesStore,
	activeNamespaceId,
	getNamespaceById,
	getNamespaceEntityCount,
	getNamespaceEntityDetails,
	GLOBAL_NAMESPACE_ID
} from '$lib/stores/namespaces';
import { fieldValidatorsStore } from '$lib/stores/fieldValidators';

// --- Deletion guards ---
import { checkFieldDeletion, checkObjectDeletion } from '$lib/utils/references';

import type { Api, ApiEndpoint, Namespace, FieldValidator } from '$lib/types';

// ============================================================================
// Types
// ============================================================================

export interface ActionResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

// ============================================================================
// Field Actions
// ============================================================================

export async function createFieldAction(data: CreateFieldRequest): Promise<ActionResult<Field>> {
	try {
		const field = await createFieldApi(data);
		fieldsStore.update(fields => [...fields, field]);
		return { success: true, data: field };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'create field') };
	}
}

export async function updateFieldAction(
	id: string,
	updates: UpdateFieldRequest
): Promise<ActionResult<Field>> {
	const previousFields = get(fieldsStore);

	fieldsStore.update(fields =>
		fields.map(f => (f.id === id ? { ...f, ...updates } as Field : f))
	);

	try {
		const field = await updateFieldApi(id, updates);
		fieldsStore.update(fields => fields.map(f => (f.id === id ? field : f)));
		return { success: true, data: field };
	} catch (err) {
		fieldsStore.set(previousFields);
		return { success: false, error: mapApiError(err, 'update field') };
	}
}

export async function deleteFieldAction(id: string): Promise<ActionResult<void>> {
	// Pre-flight deletion guard
	const field = get(fieldsStore).find(f => f.id === id);
	if (field) {
		const check = checkFieldDeletion(field.name, field.usedInApis);
		if (!check.success) {
			return { success: false, error: check.error };
		}
	}

	try {
		await deleteFieldApi(id);
		fieldsStore.update(fields => fields.filter(f => f.id !== id));
		return { success: true };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'delete field') };
	}
}

// ============================================================================
// Object Actions
// ============================================================================

export async function createObjectAction(
	data: CreateObjectRequest
): Promise<ActionResult<ObjectDefinition>> {
	try {
		const object = await createObjectApi(data);
		objectsStore.update(objects => [...objects, object]);
		return { success: true, data: object };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'create object') };
	}
}

export async function updateObjectAction(
	id: string,
	updates: UpdateObjectRequest
): Promise<ActionResult<ObjectDefinition>> {
	const previousObjects = get(objectsStore);

	objectsStore.update(objects =>
		objects.map(o => (o.id === id ? { ...o, ...updates } : o))
	);

	try {
		const object = await updateObjectApi(id, updates);
		objectsStore.update(objects => objects.map(o => (o.id === id ? object : o)));
		return { success: true, data: object };
	} catch (err) {
		objectsStore.set(previousObjects);
		return { success: false, error: mapApiError(err, 'update object') };
	}
}

export async function deleteObjectAction(id: string): Promise<ActionResult<void>> {
	// Pre-flight deletion guard
	const obj = get(objectsStore).find(o => o.id === id);
	if (obj) {
		const check = checkObjectDeletion(obj.name, obj.usedInApis);
		if (!check.success) {
			return { success: false, error: check.error };
		}
	}

	try {
		await deleteObjectApi(id);
		objectsStore.update(objects => objects.filter(o => o.id !== id));
		return { success: true };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'delete object') };
	}
}

// ============================================================================
// API Actions
// ============================================================================

export async function createApiAction(data: CreateApiRequest): Promise<ActionResult<Api>> {
	try {
		const api = await createApiApi(data);
		apisStore.update(apis => [...apis, api]);
		return { success: true, data: api };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'create API') };
	}
}

export async function updateApiAction(
	id: string,
	updates: UpdateApiRequest
): Promise<ActionResult<Api>> {
	const previousApis = get(apisStore);

	apisStore.update(apis =>
		apis.map(a =>
			a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
		)
	);

	try {
		const api = await updateApiApi(id, updates);
		apisStore.update(apis => apis.map(a => (a.id === id ? api : a)));
		return { success: true, data: api };
	} catch (err) {
		apisStore.set(previousApis);
		return { success: false, error: mapApiError(err, 'update API') };
	}
}

export async function deleteApiAction(id: string): Promise<ActionResult<void>> {
	try {
		await deleteApiApi(id);
		apisStore.update(apis => apis.filter(a => a.id !== id));
		endpointsStore.update(endpoints => endpoints.filter(e => e.apiId !== id));
		return { success: true };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'delete API') };
	}
}

// ============================================================================
// Endpoint Actions
// ============================================================================

export async function createEndpointAction(
	data: CreateEndpointRequest
): Promise<ActionResult<ApiEndpoint>> {
	try {
		const endpoint = await createEndpointApi(data);
		endpointsStore.update(endpoints => [...endpoints, endpoint]);
		return { success: true, data: endpoint };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'create endpoint') };
	}
}

export async function updateEndpointAction(
	id: string,
	updates: UpdateEndpointRequest
): Promise<ActionResult<ApiEndpoint>> {
	const previousEndpoints = get(endpointsStore);

	// Normalize null tagName to undefined for local ApiEndpoint type
	const normalizedUpdates = {
		...updates,
		tagName: updates.tagName === null ? undefined : updates.tagName
	};

	endpointsStore.update(endpoints =>
		endpoints.map(e => (e.id === id ? { ...e, ...normalizedUpdates } as ApiEndpoint : e))
	);

	try {
		const endpoint = await updateEndpointApi(id, updates);
		endpointsStore.update(endpoints => endpoints.map(e => (e.id === id ? endpoint : e)));
		return { success: true, data: endpoint };
	} catch (err) {
		endpointsStore.set(previousEndpoints);
		return { success: false, error: mapApiError(err, 'update endpoint') };
	}
}

export async function deleteEndpointAction(id: string): Promise<ActionResult<void>> {
	try {
		await deleteEndpointApi(id);
		endpointsStore.update(endpoints => endpoints.filter(e => e.id !== id));
		return { success: true };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'delete endpoint') };
	}
}

// ============================================================================
// Namespace Actions
// ============================================================================

export async function createNamespaceAction(
	data: CreateNamespaceRequest
): Promise<ActionResult<Namespace>> {
	try {
		const namespace = await createNamespaceApi(data);
		namespacesStore.update(namespaces => [...namespaces, namespace]);
		return { success: true, data: namespace };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'create namespace') };
	}
}

export async function updateNamespaceAction(
	id: string,
	updates: UpdateNamespaceRequest
): Promise<ActionResult<Namespace>> {
	const previousNamespaces = get(namespacesStore);

	namespacesStore.update(namespaces =>
		namespaces.map(ns => (ns.id === id ? { ...ns, ...updates } : ns))
	);

	try {
		const namespace = await updateNamespaceApi(id, updates);
		namespacesStore.update(namespaces => namespaces.map(ns => (ns.id === id ? namespace : ns)));
		return { success: true, data: namespace };
	} catch (err) {
		namespacesStore.set(previousNamespaces);
		return { success: false, error: mapApiError(err, 'update namespace') };
	}
}

export async function deleteNamespaceAction(id: string): Promise<ActionResult<void>> {
	// Pre-flight: locked namespace guard
	const namespace = getNamespaceById(id);
	if (!namespace) {
		return { success: false, error: `Namespace with ID "${id}" not found.` };
	}
	if (namespace.locked) {
		return { success: false, error: `Cannot delete the "${namespace.name}" namespace because it is locked.` };
	}

	// Pre-flight: entity count guard
	const entityCount = getNamespaceEntityCount(id);
	if (entityCount > 0) {
		const details = getNamespaceEntityDetails(id);
		const parts: string[] = [];
		if (details.fields > 0) parts.push(`${details.fields} field${details.fields > 1 ? 's' : ''}`);
		if (details.fieldConstraints > 0) parts.push(`${details.fieldConstraints} field constraint${details.fieldConstraints > 1 ? 's' : ''}`);
		if (details.objects > 0) parts.push(`${details.objects} object${details.objects > 1 ? 's' : ''}`);
		if (details.endpoints > 0) parts.push(`${details.endpoints} endpoint${details.endpoints > 1 ? 's' : ''}`);
		if (details.apis > 0) parts.push(`${details.apis} API${details.apis > 1 ? 's' : ''}`);

		return {
			success: false,
			error: `Cannot delete namespace "${namespace.name}" because it contains ${parts.join(', ')}. Remove all entities before deleting.`
		};
	}

	const wasActive = get(activeNamespaceId) === id;

	try {
		await deleteNamespaceApi(id);
		namespacesStore.update(namespaces => namespaces.filter(ns => ns.id !== id));
		if (wasActive) {
			activeNamespaceId.set(GLOBAL_NAMESPACE_ID);
		}
		return { success: true };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'delete namespace') };
	}
}

// ============================================================================
// Field Validator Actions
// ============================================================================

export async function createFieldValidatorAction(
	data: CreateFieldValidatorRequest
): Promise<ActionResult<FieldValidator>> {
	try {
		const fieldValidator = await createFieldValidatorApi(data);
		fieldValidatorsStore.update(fvs => [...fvs, fieldValidator]);
		return { success: true, data: fieldValidator };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'create field validator') };
	}
}

export async function updateFieldValidatorAction(
	id: string,
	updates: UpdateFieldValidatorRequest
): Promise<ActionResult<FieldValidator>> {
	const previousFieldValidators = get(fieldValidatorsStore);

	fieldValidatorsStore.update(fvs =>
		fvs.map(fv => (fv.id === id ? { ...fv, ...updates } as FieldValidator : fv))
	);

	try {
		const fieldValidator = await updateFieldValidatorApi(id, updates);
		fieldValidatorsStore.update(fvs => fvs.map(fv => (fv.id === id ? fieldValidator : fv)));
		return { success: true, data: fieldValidator };
	} catch (err) {
		fieldValidatorsStore.set(previousFieldValidators);
		return { success: false, error: mapApiError(err, 'update field validator') };
	}
}

export async function deleteFieldValidatorAction(id: string): Promise<ActionResult<void>> {
	// Pre-flight deletion guard
	const fv = get(fieldValidatorsStore).find(f => f.id === id);
	if (fv && fv.usedInFields > 0) {
		return {
			success: false,
			error: `Cannot delete field validator "${fv.name}" because it is used in ${fv.usedInFields} field${fv.usedInFields > 1 ? 's' : ''}. Remove all usages before deleting.`
		};
	}

	try {
		await deleteFieldValidatorApi(id);
		fieldValidatorsStore.update(fvs => fvs.filter(f => f.id !== id));
		return { success: true };
	} catch (err) {
		return { success: false, error: mapApiError(err, 'delete field validator') };
	}
}

// ============================================================================
// Re-exports for convenience (preserves import compatibility)
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
export type {
	CreateFieldValidatorRequest,
	UpdateFieldValidatorRequest
} from '$lib/api/fieldValidators';

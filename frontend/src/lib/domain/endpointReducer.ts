// src/lib/domain/endpointReducer.ts
import { get } from 'svelte/store';
import type { ApiEndpoint, Field, ObjectDefinition, PathParam } from '$lib/types';
import { extractPathParameters } from '$lib/utils/urlParser';
import { fieldsStore } from '$lib/stores/stores';
import { deepClone, generateId } from '$lib/utils/ids';

export interface PathReconciliationResult {
	path: string;
	pathParams: PathParam[];
}

/**
 * Reconcile a path string with its existing parameters.
 * Extracts parameter names from the path and merges with existing definitions.
 * For new params, attempts best-effort field matching by name.
 */
export function reconcilePathParams(
	newPath: string,
	existingParams: PathParam[]
): PathReconciliationResult {
	const path = newPath.startsWith('/') ? newPath : '/' + newPath;
	const paramNames = extractPathParameters(path);
	const fields = get(fieldsStore);

	const pathParams: PathParam[] = paramNames.map(paramName => {
		const existing = existingParams.find(p => p.name === paramName);
		if (existing) return existing;

		const matchedField = fields.find(f => f.name === paramName);
		return { name: paramName, fieldId: matchedField?.id ?? '', field: '' };
	});

	return { path, pathParams };
}

/**
 * Normalize an endpoint to ensure all required response shape fields exist.
 */
export function normalizeEndpoint(endpoint: ApiEndpoint): ApiEndpoint {
	return {
		...endpoint,
		responseShape: endpoint.responseShape ?? 'object',
		pagination: endpoint.pagination ?? false,
		queryParams: endpoint.queryParams ?? [],
		pathParams: endpoint.pathParams.map(p => ({
			...p,
			field: p.field ?? '' // ensure field exists for legacy data
		}))
	};
}

/**
 * Fill ``PathParam.field`` from ``fieldId`` when the API omits the name.
 *
 * Prefers the scalar member name on the endpoint's target object (when
 * ``objectId`` is set), then falls back to the global field catalog.
 */
export function hydratePathParamsForEndpoint(
	endpoint: ApiEndpoint,
	objects: ObjectDefinition[],
	fields: Field[]
): ApiEndpoint {
	return {
		...endpoint,
		pathParams: endpoint.pathParams.map(p =>
			hydratePathParamField(p, endpoint.objectId, objects, fields)
		)
	};
}

function hydratePathParamField(
	p: PathParam,
	objectId: string | undefined,
	objects: ObjectDefinition[],
	fields: Field[]
): PathParam {
	if (!p.fieldId) {
		return { ...p, field: p.field ?? '' };
	}
	if (p.field?.trim()) {
		return p;
	}
	if (objectId) {
		const obj = objects.find(o => o.id === objectId);
		if (obj) {
			for (const m of obj.members) {
				if (m.memberType === 'scalar' && m.fieldId === p.fieldId) {
					return { ...p, field: m.name };
				}
			}
		}
	}
	const fld = fields.find(f => f.id === p.fieldId);
	if (fld) {
		return { ...p, field: fld.name };
	}
	return { ...p, field: p.field ?? '' };
}

/**
 * Create a duplicate of an endpoint with fresh IDs.
 * Does NOT write to any store — returns the duplicated endpoint for the caller to persist.
 */
export function buildDuplicateEndpoint(original: ApiEndpoint): ApiEndpoint {
	const normalized = normalizeEndpoint(original);
	return {
		...deepClone(normalized),
		id: generateId('endpoint'),
		path: `${original.path}-copy`,
		expanded: false,
		pathParams: original.pathParams.map(p => ({ ...p })),
		queryParams: (original.queryParams ?? []).map(q => ({ ...q }))
	};
}

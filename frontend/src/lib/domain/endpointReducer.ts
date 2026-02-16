// src/lib/domain/endpointReducer.ts
import { get } from 'svelte/store';
import type { ApiEndpoint, PathParam } from '$lib/types';
import { extractPathParameters } from '$lib/utils/urlParser';
import { fieldsStore } from '$lib/stores/fields';
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
		return { name: paramName, fieldId: matchedField?.id ?? '' };
	});

	return { path, pathParams };
}

/**
 * Normalize an endpoint to ensure all required response shape fields exist.
 */
export function normalizeEndpoint(endpoint: ApiEndpoint): ApiEndpoint {
	return {
		...endpoint,
		responseShape: endpoint.responseShape ?? 'object'
	};
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
		pathParams: original.pathParams.map(p => ({ ...p }))
	};
}

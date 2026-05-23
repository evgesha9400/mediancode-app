// src/lib/domain/endpointReducer.ts
import type { ApiEndpoint, PathParam } from '$lib/types';
import { extractPathParameters } from '$lib/utils/urlParser';
import { deepClone, generateId } from '$lib/utils/ids';

export interface PathReconciliationResult {
	path: string;
	pathParams: PathParam[];
}

export function reconcilePathParams(
	newPath: string,
	existingParams: PathParam[]
): PathReconciliationResult {
	const path = newPath.startsWith('/') ? newPath : '/' + newPath;
	const paramNames = extractPathParameters(path);

	const pathParams: PathParam[] = paramNames.map(paramName => {
		const existing = existingParams.find(p => p.name === paramName);
		if (existing) return existing;
		return { name: paramName, fieldMemberId: '' };
	});

	return { path, pathParams };
}

export function normalizeEndpoint(endpoint: ApiEndpoint): ApiEndpoint {
	return {
		...endpoint,
		responseShape: endpoint.responseShape ?? 'object',
		pagination: endpoint.pagination ?? false,
		queryParams: (endpoint.queryParams ?? []).map(param => ({
			...param,
			required: param.required ?? false
		})),
		pathParams: endpoint.pathParams.map(param => ({
			...param,
			fieldMemberId: param.fieldMemberId ?? ''
		}))
	};
}

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

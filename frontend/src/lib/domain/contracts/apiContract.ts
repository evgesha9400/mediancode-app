// src/lib/domain/contracts/apiContract.ts
import type { Api } from '$lib/types';
import type { CreateApiRequest, UpdateApiRequest } from '$lib/api/apis';

export interface ApiContractDeps {
	getActiveNamespaceId: () => string;
}

export type ApiPayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function apiValidate(item: Api): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!item.title.trim()) errors.title = 'API title is required';
	return errors;
}

export function apiCreateDraft(deps: ApiContractDeps): Api {
	return {
		id: '',
		namespaceId: deps.getActiveNamespaceId(),
		title: '',
		version: '1.0.0',
		description: '',
		baseUrl: '/api/v1',
		serverUrl: '',
		createdAt: '',
		updatedAt: ''
	};
}

export function apiToCreatePayload(item: Api): ApiPayloadResult<CreateApiRequest> {
	return {
		ok: true,
		data: {
			namespaceId: item.namespaceId,
			title: item.title,
			version: item.version,
			description: item.description,
			serverUrl: item.serverUrl,
			baseUrl: item.baseUrl
		}
	};
}

export function apiToUpdatePayload(item: Api): ApiPayloadResult<UpdateApiRequest> {
	return {
		ok: true,
		data: {
			title: item.title,
			version: item.version,
			description: item.description,
			serverUrl: item.serverUrl,
			baseUrl: item.baseUrl
		}
	};
}

export function apiDeletionGuard(_item: Api): { canDelete: boolean; tooltip: string } {
	return { canDelete: true, tooltip: '' };
}

// src/lib/domain/contracts/namespaceContract.ts
import type { Namespace } from '$lib/types';
import type {
	UpdateNamespaceRequest,
	CreateNamespaceRequest
} from '$lib/api/namespaces';

export interface NamespaceContractDeps {
	getNamespaceEntityDetails: (id: string) => {
		total: number;
		fields: number;
		fieldConstraints: number;
		objects: number;
		endpoints: number;
	};
}

export type NamespacePayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function namespaceValidate(item: Namespace): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!item.name.trim()) errors.name = 'Namespace name is required';
	return errors;
}

export function namespaceCreateDraft(): Namespace {
	return {
		id: '',
		name: '',
		description: '',
		locked: false,
		isDefault: false
	};
}

export function namespaceToCreatePayload(
	item: Namespace
): NamespacePayloadResult<CreateNamespaceRequest> {
	return {
		ok: true,
		data: {
			name: item.name.trim(),
			description: item.description?.trim() || undefined
		}
	};
}

export function namespaceToUpdatePayload(
	item: Namespace
): NamespacePayloadResult<UpdateNamespaceRequest> {
	return {
		ok: true,
		data: {
			name: item.name,
			description: item.description
		}
	};
}

export function namespaceDeletionGuard(
	item: Namespace,
	deps: NamespaceContractDeps
): { canDelete: boolean; tooltip: string } {
	if (item.locked) {
		return { canDelete: false, tooltip: 'Cannot delete locked namespaces' };
	}
	const details = deps.getNamespaceEntityDetails(item.id);
	if (details.total > 0) {
		return {
			canDelete: false,
			tooltip: `Cannot delete: Contains ${details.total} entities`
		};
	}
	return { canDelete: true, tooltip: '' };
}

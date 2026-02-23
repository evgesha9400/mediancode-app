// src/lib/domain/contracts/objectContract.ts
import type { ObjectDefinition } from '$lib/types';
import type { CreateObjectRequest, UpdateObjectRequest } from '$lib/api/objects';
import { buildDeletionTooltip } from '$lib/utils/references';

export interface ObjectContractDeps {
	getActiveNamespaceId: () => string;
}

export type ObjectPayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function objectValidate(item: ObjectDefinition): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!item.name.trim()) errors.name = 'Object name is required';
	return errors;
}

export function objectCreateDraft(deps: ObjectContractDeps): ObjectDefinition {
	return {
		id: '',
		namespaceId: deps.getActiveNamespaceId(),
		name: '',
		description: '',
		fields: [],
		validators: [],
		usedInApis: []
	};
}

export function objectToCreatePayload(
	item: ObjectDefinition
): ObjectPayloadResult<CreateObjectRequest> {
	return {
		ok: true,
		data: {
			namespaceId: item.namespaceId,
			name: item.name,
			description: item.description,
			fields: item.fields,
			validators:
				item.validators.length > 0
					? item.validators.map((v) => ({
							functionName: v.functionName,
							mode: v.mode,
							functionBody: v.functionBody,
							description: v.description
						}))
					: undefined
		}
	};
}

export function objectToUpdatePayload(
	item: ObjectDefinition
): ObjectPayloadResult<UpdateObjectRequest> {
	// Strip derived properties that may have been added by deriveExtra
	const { fieldCount, usedInApisCount, namespaceName, ...clean } = item as any;
	return {
		ok: true,
		data: {
			name: clean.name,
			description: clean.description,
			fields: clean.fields,
			validators: clean.validators.map((v: any) => ({
				functionName: v.functionName,
				mode: v.mode,
				functionBody: v.functionBody,
				description: v.description
			}))
		}
	};
}

export function objectDeletionGuard(
	item: ObjectDefinition
): { canDelete: boolean; tooltip: string } {
	const hasRefs = item.usedInApis.length > 0;
	return {
		canDelete: !hasRefs,
		tooltip: hasRefs
			? buildDeletionTooltip(
					'object',
					'API',
					item.usedInApis.map((api) => ({ name: api }))
				)
			: ''
	};
}

// src/lib/domain/contracts/fieldContract.ts
import type { Field } from '$lib/types';
import type { CreateFieldRequest, UpdateFieldRequest } from '$lib/api/fields';
import { buildDeletionTooltip } from '$lib/utils/references';

export interface FieldContractDeps {
	getActiveNamespaceId: () => string;
	getDefaultType: () => string;
	getTypeIdByName: (name: string) => string | undefined;
}

export type FieldPayloadResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function fieldValidate(item: Field): Record<string, string> {
	const errors: Record<string, string> = {};
	if (!item.name.trim()) errors.name = 'Field name is required';
	if (!item.type) errors.type = 'Type is required';
	const emptyParam = item.constraints.find((c) => c.value === null || c.value === '');
	if (emptyParam) errors.constraints = `Constraint "${emptyParam.name}" requires a value`;
	return errors;
}

export function fieldCreateDraft(deps: FieldContractDeps): Field {
	return {
		id: '',
		namespaceId: deps.getActiveNamespaceId(),
		name: '',
		type: deps.getDefaultType(),
		constraints: [],
		validators: [],
		usedInApis: [],
		description: '',
		defaultValue: ''
	};
}

export function fieldToCreatePayload(
	item: Field,
	deps: FieldContractDeps
): FieldPayloadResult<CreateFieldRequest> {
	const typeId = deps.getTypeIdByName(item.type);
	if (!typeId) return { ok: false, error: `Unknown type "${item.type}"` };
	return {
		ok: true,
		data: {
			namespaceId: item.namespaceId,
			name: item.name,
			typeId,
			description: item.description,
			defaultValue: item.defaultValue,
			constraints: item.constraints.map((c) => ({
				constraintId: c.constraintId,
				value: c.value
			})),
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

export function fieldToUpdatePayload(
	item: Field,
	deps: FieldContractDeps
): FieldPayloadResult<UpdateFieldRequest> {
	const typeId = deps.getTypeIdByName(item.type);
	if (!typeId) return { ok: false, error: `Unknown type "${item.type}"` };
	return {
		ok: true,
		data: {
			name: item.name,
			typeId,
			description: item.description,
			defaultValue: item.defaultValue,
			constraints: item.constraints.map((c) => ({
				constraintId: c.constraintId,
				value: c.value
			})),
			validators: item.validators.map((v) => ({
				functionName: v.functionName,
				mode: v.mode,
				functionBody: v.functionBody,
				description: v.description
			}))
		}
	};
}

export function fieldDeletionGuard(item: Field): { canDelete: boolean; tooltip: string } {
	const hasRefs = item.usedInApis.length > 0;
	return {
		canDelete: !hasRefs,
		tooltip: hasRefs
			? buildDeletionTooltip(
					'field',
					'API',
					item.usedInApis.map((api) => ({ name: api }))
				)
			: ''
	};
}

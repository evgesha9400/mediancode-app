// src/lib/domain/paramInference.ts
//
// Pure functions for parameter inference: operator compatibility,
// auto-suggestions, and Field Member reference validation.

import type { FilterOperator, PathParam, QueryParam } from '$lib/types';
import {
	FILTER_OPERATORS,
	COMPARABLE_TYPES,
	STRING_TYPES,
	OPERATOR_TYPE_COMPATIBILITY
} from '$lib/types';

/**
 * Suggestion result from auto-inference based on param naming conventions.
 */
export interface ParamSuggestion {
	fieldMemberId: string;
	operator: FilterOperator;
}

/**
 * Prefixes that imply a specific operator when stripped to reveal a Field Member name.
 * Order matters: longer/more-specific prefixes first.
 */
const PREFIX_RULES: { prefix: string; operator: FilterOperator }[] = [
	{ prefix: 'min_', operator: 'gte' },
	{ prefix: 'max_', operator: 'lte' },
	{ prefix: 'after_', operator: 'gte' },
	{ prefix: 'before_', operator: 'lte' }
];

/**
 * Returns the list of operators compatible with a given field type name.
 *
 * - Comparable types (numeric, date, datetime, time): eq, gte, lte, gt, lt, in
 * - String types (str): eq, like, ilike, in
 * - All other types: eq, in
 */
export function getCompatibleOperators(fieldTypeName: string): FilterOperator[] {
	const isComparable = (COMPARABLE_TYPES as readonly string[]).includes(fieldTypeName);
	const isString = (STRING_TYPES as readonly string[]).includes(fieldTypeName);

	return FILTER_OPERATORS.filter((op) => {
		const compat = OPERATOR_TYPE_COMPATIBILITY[op];
		if (compat === 'all') return true;
		if (compat === 'comparable') return isComparable;
		if (compat === 'string') return isString;
		return false;
	});
}

/**
 * Auto-suggest a Field Member ID and operator based on a query parameter's name.
 *
 * This is a UI convenience -- not schema validation. The user can always
 * accept or override the suggestion.
 *
 * Returns null if no suggestion can be made.
 */
export function suggestFieldAndOperator(
	paramName: string,
	targetFields: EndpointTargetFieldMember[]
): ParamSuggestion | null {
	if (!paramName) return null;

	// Try prefix rules first (min_price -> price Field Member, operator: gte)
	for (const rule of PREFIX_RULES) {
		if (paramName.startsWith(rule.prefix)) {
			const candidate = paramName.slice(rule.prefix.length);
			const field = targetFields.find(f => f.name === candidate);
			if (field) {
				return { fieldMemberId: field.id, operator: rule.operator };
			}
		}
	}

	// Exact match (category -> category Field Member, operator: eq)
	const field = targetFields.find(f => f.name === paramName);
	if (field) {
		return { fieldMemberId: field.id, operator: 'eq' };
	}

	return null;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * A Field Member on the Endpoint Target, as seen by validation.
 */
export interface EndpointTargetFieldMember {
	id: string;
	name: string;
	type: string;
	isPrimary: boolean;
}

/**
 * Input for endpoint param validation.
 */
export interface ValidationInput {
	method?: string;
	targetObjectId?: string;
	targetFields: EndpointTargetFieldMember[];
	pathParams: PathParam[];
	queryParams: QueryParam[];
	pagination?: boolean;
}

export type ValidationLocation =
	| { kind: 'targetObject'; field: 'targetObjectId' }
	| { kind: 'pathParam'; name: string; field: 'name' | 'fieldMemberId' }
	| { kind: 'queryParam'; index: number; field: 'name' | 'fieldMemberId' | 'operator' | 'required' };

/**
 * A single validation error with a rule number and human-readable message.
 */
export interface ValidationError {
	rule: number;
	message: string;
	param?: string; // the parameter name that triggered the error, if applicable
	location?: ValidationLocation;
}

/**
 * Validate endpoint parameters against the selected target Object's Field Members.
 * Endpoint Query Semantics owns availability and response shape constraints.
 */
export function validateEndpointParams(input: ValidationInput): ValidationError[] {
	const errors: ValidationError[] = [];
	const {
		targetObjectId,
		targetFields,
		pathParams,
		queryParams
	} = input;

	// Rule 1: Target is known when targetObjectId is set.
	if (!targetObjectId) {
		errors.push({
			rule: 1,
			message: 'Target object could not be determined',
			location: { kind: 'targetObject', field: 'targetObjectId' }
		});
		// Cannot validate further without a target
		return errors;
	}

	// Rule 2: Every param field exists on target
	const fieldMemberIds = new Set(targetFields.map(f => f.id));

	for (const pp of pathParams) {
		if (!pp.fieldMemberId) {
			errors.push({
				rule: 2,
				message: `Path parameter "${pp.name}" must be linked to a target Field Member`,
				param: pp.name,
				location: { kind: 'pathParam', name: pp.name, field: 'fieldMemberId' }
			});
		} else if (!fieldMemberIds.has(pp.fieldMemberId)) {
			errors.push({
				rule: 2,
				message: `Path parameter "${pp.name}" is not linked to a target Field Member`,
				param: pp.name,
				location: { kind: 'pathParam', name: pp.name, field: 'fieldMemberId' }
			});
		}
	}

	for (const [index, qp] of queryParams.entries()) {
		if (!qp.fieldMemberId) {
			errors.push({
				rule: 2,
				message: `Query parameter "${qp.name}" must be linked to a target Field Member`,
				param: qp.name,
				location: { kind: 'queryParam', index, field: 'fieldMemberId' }
			});
		} else if (!fieldMemberIds.has(qp.fieldMemberId)) {
			errors.push({
				rule: 2,
				message: `Query parameter "${qp.name}" is not linked to a target Field Member`,
				param: qp.name,
				location: { kind: 'queryParam', index, field: 'fieldMemberId' }
			});
		}
	}

	// Rule 6: Operator compatible with field type
	for (const [index, qp] of queryParams.entries()) {
		const field = targetFields.find(f => f.id === qp.fieldMemberId);
		if (!field) continue; // already caught by rule 2
		const compatible = getCompatibleOperators(field.type);
		if (!compatible.includes(qp.operator)) {
			errors.push({
				rule: 6,
				message: `Operator "${qp.operator}" is not valid for field type "${field.type}"`,
				param: qp.name,
				location: { kind: 'queryParam', index, field: 'operator' }
			});
		}
	}

	// Rule 7 is auto-enforced: param type is derived from field type, never user-editable

	return errors;
}

// src/lib/domain/paramInference.ts
//
// Pure functions for parameter inference: operator compatibility,
// auto-suggestions, and validation rules 1-7 from the design spec.

import type { FilterOperator, PathParam, QueryParam, ResponseShape, ObjectDefinition, Field } from '$lib/types';
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
	field: string;
	operator: FilterOperator;
}

/**
 * Prefixes that imply a specific operator when stripped to reveal a field name.
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
 * Auto-suggest a field name and operator based on a query parameter's name.
 *
 * This is a UI convenience -- not schema validation. The user can always
 * accept or override the suggestion.
 *
 * Returns null if no suggestion can be made.
 */
export function suggestFieldAndOperator(
	paramName: string,
	targetFieldNames: string[]
): ParamSuggestion | null {
	if (!paramName) return null;

	// Try prefix rules first (min_price -> field: price, operator: gte)
	for (const rule of PREFIX_RULES) {
		if (paramName.startsWith(rule.prefix)) {
			const candidate = paramName.slice(rule.prefix.length);
			if (candidate && targetFieldNames.includes(candidate)) {
				return { field: candidate, operator: rule.operator };
			}
		}
	}

	// Exact match (category -> field: category, operator: eq)
	if (targetFieldNames.includes(paramName)) {
		return { field: paramName, operator: 'eq' };
	}

	return null;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * A field on the resolved target object, as seen by validation.
 */
export interface TargetField {
	name: string;
	type: string;
	isPk: boolean;
}

/**
 * Input for endpoint param validation.
 */
export interface ValidationInput {
	responseShape: ResponseShape;
	objectId?: string; // the object used for request/response body AND param inference target
	targetFields: TargetField[];
	pathParams: PathParam[];
	queryParams: QueryParam[];
}

/**
 * A single validation error with a rule number and human-readable message.
 */
export interface ValidationError {
	rule: number;
	message: string;
	param?: string; // the parameter name that triggered the error, if applicable
}

/**
 * Validate an endpoint's parameter configuration against all 7 rules.
 * Returns an empty array when everything is valid.
 */
export function validateEndpointParams(input: ValidationInput): ValidationError[] {
	const errors: ValidationError[] = [];
	const {
		responseShape,
		objectId,
		targetFields,
		pathParams,
		queryParams
	} = input;

	const isDetail = responseShape === 'object';
	const isList = responseShape === 'list';

	// Rule 1: Target is known when objectId is set (for both detail and list)
	if (!objectId) {
		errors.push({
			rule: 1,
			message: isList
				? 'List endpoints require a target object'
				: 'Target object could not be determined'
		});
		// Cannot validate further without a target
		return errors;
	}

	// Rule 2: Every param field exists on target
	const fieldNameSet = new Set(targetFields.map(f => f.name));

	for (const pp of pathParams) {
		if (pp.field && !fieldNameSet.has(pp.field)) {
			errors.push({
				rule: 2,
				message: `Field "${pp.field}" does not exist on the target object`,
				param: pp.name
			});
		}
	}

	for (const qp of queryParams) {
		if (qp.field && !fieldNameSet.has(qp.field)) {
			errors.push({
				rule: 2,
				message: `Field "${qp.field}" does not exist on the target object`,
				param: qp.name
			});
		}
	}

	// Rule 3: Detail endpoint -- last path param maps to PK
	if (isDetail && pathParams.length > 0) {
		const lastParam = pathParams[pathParams.length - 1];
		const lastField = targetFields.find(f => f.name === lastParam.field);
		if (!lastField || !lastField.isPk) {
			errors.push({
				rule: 3,
				message: "Detail endpoint's identifying param must map to the primary key",
				param: lastParam.name
			});
		}
	}

	// Rule 4: Detail endpoint -- no field-mapped query params
	// Legacy query params without a field are allowed (backward compat with backend)
	if (isDetail && queryParams.some(qp => !!qp.field)) {
		errors.push({
			rule: 4,
			message: 'Detail endpoints cannot have query parameters with field references'
		});
	}

	// Rule 5: List endpoint -- no path param maps to PK
	if (isList) {
		const pkFieldNames = new Set(targetFields.filter(f => f.isPk).map(f => f.name));
		for (const pp of pathParams) {
			if (pp.field && pkFieldNames.has(pp.field)) {
				errors.push({
					rule: 5,
					message: `Path param "${pp.name}" maps to PK field "${pp.field}" -- use a detail endpoint instead`,
					param: pp.name
				});
			}
		}
	}

	// Rule 6: Operator compatible with field type
	for (const qp of queryParams) {
		const field = targetFields.find(f => f.name === qp.field);
		if (!field) continue; // already caught by rule 2
		const compatible = getCompatibleOperators(field.type);
		if (!compatible.includes(qp.operator)) {
			errors.push({
				rule: 6,
				message: `Operator "${qp.operator}" is not valid for field type "${field.type}"`,
				param: qp.name
			});
		}
	}

	// Rule 7 is auto-enforced: param type is derived from field type, never user-editable

	return errors;
}

// ============================================================================
// Store-to-Domain Bridge
// ============================================================================

/**
 * Resolve a target object ID into a flat array of TargetField objects.
 * This bridges the store data (objects + fields) to the pure validation input.
 */
export function resolveTargetFields(
	targetObjectId: string,
	objects: ObjectDefinition[],
	fields: Field[]
): TargetField[] {
	const obj = objects.find(o => o.id === targetObjectId);
	if (!obj) return [];

	const result: TargetField[] = [];
	for (const ref of obj.fields) {
		const field = fields.find(f => f.id === ref.fieldId);
		if (!field) continue;
		result.push({
			name: field.name,
			type: field.type,
			isPk: ref.isPk
		});
	}
	return result;
}

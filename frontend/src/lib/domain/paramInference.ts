// src/lib/domain/paramInference.ts
//
// Pure functions for parameter inference: operator compatibility,
// auto-suggestions, and validation rules 1-7 from the design spec.

import type { FilterOperator } from '$lib/types';
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

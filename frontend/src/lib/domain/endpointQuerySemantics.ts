import type { ApiEndpoint, HttpMethod, QueryParam, ResponseShape } from '$lib/types';
import { isValidSnakeCaseName } from '$lib/utils/validation';
import { reconcilePathParams } from './endpointReducer';
import {
	validateEndpointParams,
	type TargetField,
	type ValidationError,
	type ValidationLocation
} from './paramInference';

type EndpointTransitionEvent =
	| { type: 'methodChanged'; method: HttpMethod }
	| { type: 'pathChanged'; path: string }
	| { type: 'pathParamFieldSelected'; paramName: string; fieldMemberId: string }
	| { type: 'queryParamAddedFromField'; fieldMemberId: string }
	| { type: 'queryParamUpdated'; index: number; updates: Partial<QueryParam> }
	| { type: 'queryParamRemoved'; index: number }
	| { type: 'paginationToggled' }
	| { type: 'targetObjectSelected'; targetObjectId: string | undefined; targetFields: TargetField[] }
	| { type: 'envelopeToggled'; enabled: boolean }
	| { type: 'responseShapeSet'; shape: ResponseShape }
	| { type: 'responseDefaultsReset' };

export type EndpointQueryAvailability = 'available' | 'notApplicable' | 'unresolved';
export type EndpointQueryEditPolicy = 'editable' | 'hidden' | 'blocked';
export type EndpointResponseShapePolicy = 'editable' | 'locked';

export interface EndpointQuerySemanticsPolicy {
	queryParams: EndpointQueryEditPolicy;
	pagination: EndpointQueryEditPolicy;
	responseShape: EndpointResponseShapePolicy;
}

export interface EndpointQuerySuggestion {
	type: 'linkPathParam';
	paramName: string;
	fieldMemberId: string;
	label: string;
}

export interface EndpointQuerySemanticsResolution {
	endpoint: ApiEndpoint;
	availability: EndpointQueryAvailability;
	issues: EndpointIssue[];
	suggestions: EndpointQuerySuggestion[];
	policy: EndpointQuerySemanticsPolicy;
}

export type EndpointIssueLocation =
	| ValidationLocation
	| { kind: 'path'; field: 'path' }
	| { kind: 'method'; field: 'method' }
	| { kind: 'responseShape'; field: 'shape' }
	| { kind: 'pagination'; field: 'enabled' }
	| { kind: 'command' };

export interface EndpointIssue {
	code: string;
	message: string;
	location: EndpointIssueLocation;
	validationError?: ValidationError;
}

export interface EndpointSemanticsContext {
	targetFields: TargetField[];
	targetObjectName?: string;
}

export type EndpointCommandOutcome =
	| { status: 'ready'; endpoint: ApiEndpoint }
	| { status: 'blocked'; reasons: EndpointIssue[] };

const AVAILABLE_POLICY: EndpointQuerySemanticsPolicy = {
	queryParams: 'editable',
	pagination: 'editable',
	responseShape: 'locked'
};

const NOT_APPLICABLE_POLICY: EndpointQuerySemanticsPolicy = {
	queryParams: 'hidden',
	pagination: 'hidden',
	responseShape: 'locked'
};

const UNRESOLVED_POLICY: EndpointQuerySemanticsPolicy = {
	queryParams: 'blocked',
	pagination: 'blocked',
	responseShape: 'editable'
};

export function resolveEndpointQuerySemantics(
	endpoint: ApiEndpoint,
	context: EndpointSemanticsContext
): EndpointQuerySemanticsResolution {
	const pathNameIssues = getPathNameIssues(endpoint);
	const suggestions = getPathParamSuggestions(
		endpoint.pathParams,
		context.targetFields,
		context.targetObjectName
	);

	if (endpoint.method !== 'GET') {
		const sanitizedEndpoint = sanitizeNotApplicableEndpoint(endpoint);
		return {
			endpoint: sanitizedEndpoint,
			availability: 'notApplicable',
			issues: [
				...pathNameIssues,
				...getTargetAndPathIssues(sanitizedEndpoint, context)
			],
			suggestions,
			policy: NOT_APPLICABLE_POLICY
		};
	}

	const targetAndPathIssues = getTargetAndPathIssues(endpoint, context);
	const primaryFieldIssue = getPrimaryFieldIssue(endpoint, context.targetFields);
	const availabilityIssues = [
		...pathNameIssues,
		...targetAndPathIssues,
		...(primaryFieldIssue ? [primaryFieldIssue] : [])
	];

	if (targetAndPathIssues.length > 0 || primaryFieldIssue) {
		return {
			endpoint,
			availability: 'unresolved',
			issues: availabilityIssues,
			suggestions,
			policy: UNRESOLVED_POLICY
		};
	}

	const primaryField = context.targetFields.find(field => field.isPk);
	const finalPathParam = endpoint.pathParams[endpoint.pathParams.length - 1];
	if (finalPathParam && finalPathParam.fieldMemberId === primaryField?.fieldMemberId) {
		return {
			endpoint: sanitizeNotApplicableEndpoint(endpoint),
			availability: 'notApplicable',
			issues: pathNameIssues,
			suggestions,
			policy: NOT_APPLICABLE_POLICY
		};
	}

	const sanitizedEndpoint = sanitizeAvailableEndpoint(endpoint);
	return {
		endpoint: sanitizedEndpoint,
		availability: 'available',
		issues: [
			...pathNameIssues,
			...getQueryIssues(sanitizedEndpoint, context)
		],
		suggestions,
		policy: AVAILABLE_POLICY
	};
}

export function transitionEndpointDraft(
	endpoint: ApiEndpoint,
	event: EndpointTransitionEvent,
	context: EndpointSemanticsContext
): ApiEndpoint {
	const currentResolution = resolveEndpointQuerySemantics(endpoint, context);

	switch (event.type) {
		case 'methodChanged':
			return resolveEndpointQuerySemantics({ ...endpoint, method: event.method }, context).endpoint;
		case 'pathChanged':
			return resolveEndpointQuerySemantics(transitionPath(endpoint, event.path), context).endpoint;
		case 'pathParamFieldSelected':
			return resolveEndpointQuerySemantics(
				updatePathParamField(endpoint, event.paramName, event.fieldMemberId),
				context
			).endpoint;
		case 'queryParamAddedFromField':
			if (currentResolution.policy.queryParams !== 'editable') return currentResolution.endpoint;
			return resolveEndpointQuerySemantics(
				addQueryParamFromField(endpoint, event.fieldMemberId, context.targetFields),
				context
			).endpoint;
		case 'queryParamUpdated':
			if (currentResolution.policy.queryParams !== 'editable') return currentResolution.endpoint;
			return resolveEndpointQuerySemantics(updateQueryParam(endpoint, event.index, event.updates), context).endpoint;
		case 'queryParamRemoved':
			if (currentResolution.policy.queryParams === 'hidden') return currentResolution.endpoint;
			return resolveEndpointQuerySemantics(removeQueryParam(endpoint, event.index), context).endpoint;
		case 'paginationToggled':
			if (currentResolution.policy.pagination !== 'editable') return currentResolution.endpoint;
			return resolveEndpointQuerySemantics(
				{ ...endpoint, pagination: !(endpoint.pagination ?? false) },
				context
			).endpoint;
		case 'targetObjectSelected':
			return resolveEndpointQuerySemantics(
				selectTargetObject(endpoint, event.targetObjectId),
				{ targetFields: event.targetFields }
			).endpoint;
		case 'envelopeToggled':
			return resolveEndpointQuerySemantics({ ...endpoint, useEnvelope: event.enabled }, context).endpoint;
		case 'responseShapeSet':
			if (currentResolution.policy.responseShape !== 'editable') return currentResolution.endpoint;
			return resolveEndpointQuerySemantics({ ...endpoint, responseShape: event.shape }, context).endpoint;
		case 'responseDefaultsReset':
			return resolveEndpointQuerySemantics(
				{ ...endpoint, useEnvelope: true, responseShape: 'object', targetObjectId: undefined },
				{ targetFields: [] }
			).endpoint;
	}
}

export function getEndpointIssues(
	endpoint: ApiEndpoint,
	context: EndpointSemanticsContext
): EndpointIssue[] {
	return resolveEndpointQuerySemantics(endpoint, context).issues;
}

export function getEndpointValidationErrors(issues: EndpointIssue[]): ValidationError[] {
	return issues
		.map(issue => issue.validationError)
		.filter((error): error is ValidationError => error !== undefined);
}

export function prepareEndpointCommand(
	endpoint: ApiEndpoint,
	context: EndpointSemanticsContext
): EndpointCommandOutcome {
	const resolution = resolveEndpointQuerySemantics(endpoint, context);
	if (resolution.issues.length > 0) return { status: 'blocked', reasons: resolution.issues };
	return { status: 'ready', endpoint: resolution.endpoint };
}

export function formatEndpointBlockReasons(reasons: EndpointIssue[]): string {
	return reasons.map(reason => reason.message).join('\n');
}

function transitionPath(endpoint: ApiEndpoint, path: string): ApiEndpoint {
	const reconciled = reconcilePathParams(path, endpoint.pathParams);
	return { ...endpoint, path: reconciled.path, pathParams: reconciled.pathParams };
}

function updatePathParamField(
	endpoint: ApiEndpoint,
	paramName: string,
	fieldMemberId: string
): ApiEndpoint {
	return {
		...endpoint,
		pathParams: endpoint.pathParams.map(param =>
			param.name === paramName ? { ...param, fieldMemberId } : param
		)
	};
}

function addQueryParamFromField(
	endpoint: ApiEndpoint,
	fieldMemberId: string,
	targetFields: TargetField[]
): ApiEndpoint {
	const targetField = targetFields.find(field => field.fieldMemberId === fieldMemberId);
	if (!targetField) return endpoint;

	const newParam: QueryParam = {
		name: targetField.name,
		fieldMemberId,
		operator: 'eq',
		required: false
	};

	return {
		...endpoint,
		queryParams: [...(endpoint.queryParams ?? []), newParam]
	};
}

function updateQueryParam(
	endpoint: ApiEndpoint,
	index: number,
	updates: Partial<QueryParam>
): ApiEndpoint {
	const queryParams = [...(endpoint.queryParams ?? [])];
	const current = queryParams[index];
	if (!current) return endpoint;
	queryParams[index] = { ...current, ...updates };
	return { ...endpoint, queryParams };
}

function removeQueryParam(endpoint: ApiEndpoint, index: number): ApiEndpoint {
	const queryParams = [...(endpoint.queryParams ?? [])];
	queryParams.splice(index, 1);
	return { ...endpoint, queryParams };
}

function selectTargetObject(
	endpoint: ApiEndpoint,
	targetObjectId: string | undefined
): ApiEndpoint {
	return {
		...endpoint,
		targetObjectId,
		queryParams: [],
		pagination: false
	};
}

function sanitizeAvailableEndpoint(endpoint: ApiEndpoint): ApiEndpoint {
	return {
		...endpoint,
		responseShape: 'list',
		pagination: endpoint.pagination ?? false,
		queryParams: (endpoint.queryParams ?? []).map(param => ({
			...param,
			required: param.required ?? false
		}))
	};
}

function sanitizeNotApplicableEndpoint(endpoint: ApiEndpoint): ApiEndpoint {
	return {
		...endpoint,
		responseShape: 'object',
		queryParams: [],
		pagination: false
	};
}

function getTargetAndPathIssues(
	endpoint: ApiEndpoint,
	context: EndpointSemanticsContext
): EndpointIssue[] {
	return validateEndpointParams({
		targetObjectId: endpoint.targetObjectId,
		targetFields: context.targetFields,
		pathParams: endpoint.pathParams,
		queryParams: []
	}).map(validationErrorToIssue);
}

function getQueryIssues(
	endpoint: ApiEndpoint,
	context: EndpointSemanticsContext
): EndpointIssue[] {
	return validateEndpointParams({
		targetObjectId: endpoint.targetObjectId,
		targetFields: context.targetFields,
		pathParams: endpoint.pathParams,
		queryParams: endpoint.queryParams ?? []
	})
		.filter(error => error.location?.kind === 'queryParam')
		.map(validationErrorToIssue);
}

function getPrimaryFieldIssue(
	endpoint: ApiEndpoint,
	targetFields: TargetField[]
): EndpointIssue | null {
	if (!endpoint.targetObjectId) return null;

	const primaryFields = targetFields.filter(field => field.isPk);
	if (targetFields.length === 0) {
		return {
			code: 'target_field_members_unresolved',
			message: 'Target object Field Members could not be resolved',
			location: { kind: 'targetObject', field: 'targetObjectId' }
		};
	}
	if (primaryFields.length !== 1) {
		return {
			code: 'target_primary_field_unresolved',
			message: 'Target object must have exactly one primary Field Member',
			location: { kind: 'targetObject', field: 'targetObjectId' }
		};
	}
	return null;
}

function getPathNameIssues(endpoint: ApiEndpoint): EndpointIssue[] {
	return endpoint.pathParams
		.filter(param => param.name && !isValidSnakeCaseName(param.name))
		.map(param => ({
			code: 'path_param_name_invalid',
			message: `Path parameter '${param.name}' must be snake_case (e.g. user_id)`,
			location: { kind: 'pathParam', name: param.name, field: 'name' as const }
		}));
}

function getPathParamSuggestions(
	pathParams: ApiEndpoint['pathParams'],
	targetFields: TargetField[],
	targetObjectName?: string
): EndpointQuerySuggestion[] {
	return pathParams.flatMap(param => {
		const selectedField = targetFields.find(field => field.fieldMemberId === param.fieldMemberId);
		if (selectedField) return [];

		const matchingField = targetFields.find(
			field => field.name.toLowerCase() === param.name.toLowerCase()
		);
		if (!matchingField) return [];

		const labelTarget = targetObjectName
			? `${targetObjectName}.${matchingField.name}`
			: matchingField.name;
		return [{
			type: 'linkPathParam',
			paramName: param.name,
			fieldMemberId: matchingField.fieldMemberId,
			label: `Link ${param.name} to ${labelTarget}`
		}];
	});
}

function validationErrorToIssue(error: ValidationError): EndpointIssue {
	return {
		code: `endpoint_rule_${error.rule}`,
		message: error.message,
		location: error.location ?? { kind: 'command' },
		validationError: error
	};
}

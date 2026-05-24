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

export type EndpointIssueLocation =
	| ValidationLocation
	| { kind: 'path'; field: 'path' }
	| { kind: 'method'; field: 'method' }
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
}

export type EndpointCommandOutcome =
	| { status: 'ready'; endpoint: ApiEndpoint }
	| { status: 'blocked'; reasons: EndpointIssue[] };

const DETAIL_PATH_RE = /\{[^}]+\}$/;

export function isEndpointResponseShapeLocked(endpoint: ApiEndpoint | null): boolean {
	if (!endpoint) return false;
	return isDetailPath(endpoint.path) || endpoint.method !== 'GET';
}

export function getEndpointResponseShapeLockedReason(endpoint: ApiEndpoint | null): string {
	if (!endpoint) return '';
	if (isDetailPath(endpoint.path)) return 'Detail endpoints always return a single object';
	if (endpoint.method !== 'GET') return 'Only GET endpoints can return a list';
	return '';
}

export function transitionEndpointDraft(
	endpoint: ApiEndpoint,
	event: EndpointTransitionEvent,
	context: EndpointSemanticsContext
): ApiEndpoint {
	switch (event.type) {
		case 'methodChanged':
			return transitionMethod(endpoint, event.method);
		case 'pathChanged':
			return transitionPath(endpoint, event.path, context.targetFields);
		case 'pathParamFieldSelected':
			return updatePathParamField(endpoint, event.paramName, event.fieldMemberId);
		case 'queryParamAddedFromField':
			return addQueryParamFromField(endpoint, event.fieldMemberId, context.targetFields);
		case 'queryParamUpdated':
			return updateQueryParam(endpoint, event.index, event.updates);
		case 'queryParamRemoved':
			return removeQueryParam(endpoint, event.index);
		case 'paginationToggled':
			return { ...endpoint, pagination: !(endpoint.pagination ?? false) };
		case 'targetObjectSelected':
			return selectTargetObject(endpoint, event.targetObjectId, event.targetFields);
		case 'envelopeToggled':
			return { ...endpoint, useEnvelope: event.enabled };
		case 'responseShapeSet':
			if (isEndpointResponseShapeLocked(endpoint)) return endpoint;
			return { ...endpoint, responseShape: event.shape };
		case 'responseDefaultsReset':
			return { ...endpoint, useEnvelope: true, responseShape: 'object', targetObjectId: undefined };
	}
}

export function getEndpointIssues(
	endpoint: ApiEndpoint,
	context: EndpointSemanticsContext
): EndpointIssue[] {
	const validationErrors = validateEndpointParams({
		method: endpoint.method,
		responseShape: endpoint.responseShape,
		targetObjectId: endpoint.targetObjectId,
		targetFields: context.targetFields,
		pathParams: endpoint.pathParams,
		queryParams: endpoint.queryParams ?? [],
		pagination: endpoint.pagination ?? false
	}).filter(error => !(endpoint.method === 'DELETE' && error.rule === 4));

	return [
		...getPathNameIssues(endpoint),
		...validationErrors.map(validationErrorToIssue),
		...getMethodIssues(endpoint)
	];
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
	const reasons = getEndpointIssues(endpoint, context);
	if (reasons.length > 0) return { status: 'blocked', reasons };
	return { status: 'ready', endpoint };
}

export function formatEndpointBlockReasons(reasons: EndpointIssue[]): string {
	return reasons.map(reason => reason.message).join('\n');
}

function transitionMethod(endpoint: ApiEndpoint, method: HttpMethod): ApiEndpoint {
	return {
		...endpoint,
		method,
		responseShape: method === 'GET' ? endpoint.responseShape : 'object'
	};
}

function transitionPath(endpoint: ApiEndpoint, path: string, targetFields: TargetField[]): ApiEndpoint {
	const reconciled = reconcilePathParams(path, endpoint.pathParams);
	const detailPath = isDetailPath(reconciled.path);
	const autoLinkedParams = autoLinkPathParams(reconciled.pathParams, targetFields, {
		linkDetailPk: detailPath
	});
	const responseShape = detailPath ? 'object' : endpoint.responseShape;

	return { ...endpoint, path: reconciled.path, pathParams: autoLinkedParams, responseShape };
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
	targetObjectId: string | undefined,
	targetFields: TargetField[]
): ApiEndpoint {
	const pathParams = autoLinkPathParams(endpoint.pathParams, targetFields, {
		clearUnmatched: true,
		linkDetailPk: isDetailPath(endpoint.path)
	});

	return {
		...endpoint,
		targetObjectId,
		pathParams,
		queryParams: [],
		pagination: false
	};
}

function autoLinkPathParams(
	pathParams: ApiEndpoint['pathParams'],
	targetFields: TargetField[],
	options: { clearUnmatched?: boolean; linkDetailPk?: boolean } = {}
): ApiEndpoint['pathParams'] {
	const { clearUnmatched = false, linkDetailPk = false } = options;
	const linkedParams = pathParams.map(param => {
		if (param.fieldMemberId && !clearUnmatched) return param;
		const match = targetFields.find(field => field.name.toLowerCase() === param.name.toLowerCase());
		return { ...param, fieldMemberId: match ? match.fieldMemberId : clearUnmatched ? '' : param.fieldMemberId };
	});

	if (linkedParams.length === 0) return linkedParams;
	if (!linkDetailPk) return linkedParams;

	const lastIndex = linkedParams.length - 1;
	const lastParam = linkedParams[lastIndex];
	if (lastParam.fieldMemberId) return linkedParams;

	const pkField = targetFields.find(field => field.isPk);
	if (!pkField) return linkedParams;

	return linkedParams.map((param, index) =>
		index === lastIndex ? { ...param, fieldMemberId: pkField.fieldMemberId } : param
	);
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

function getMethodIssues(endpoint: ApiEndpoint): EndpointIssue[] {
	const issues: EndpointIssue[] = [];

	if (endpoint.method !== 'GET' && endpoint.responseShape === 'list') {
		issues.push({
			code: 'non_get_list_response',
			message: 'Only GET endpoints can return a list',
			location: { kind: 'responseShape', field: 'shape' }
		});
	}

	if (endpoint.responseShape === 'object' && (endpoint.pagination ?? false)) {
		issues.push({
			code: 'object_pagination',
			message: 'Pagination is only available for list endpoints',
			location: { kind: 'pagination', field: 'enabled' }
		});
	}

	if (endpoint.method === 'DELETE' && (endpoint.queryParams ?? []).length > 0) {
		issues.push({
			code: 'delete_query_params',
			message: 'DELETE endpoints cannot have query parameters',
			location: { kind: 'command' }
		});
	}

	if (endpoint.method === 'DELETE' && (endpoint.pagination ?? false)) {
		issues.push({
			code: 'delete_pagination',
			message: 'DELETE endpoints cannot have pagination',
			location: { kind: 'pagination', field: 'enabled' }
		});
	}

	return issues;
}

function validationErrorToIssue(error: ValidationError): EndpointIssue {
	return {
		code: `endpoint_rule_${error.rule}`,
		message: error.message,
		location: error.location ?? { kind: 'command' },
		validationError: error
	};
}

function isDetailPath(path: string): boolean {
	return DETAIL_PATH_RE.test(path);
}

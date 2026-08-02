import type { ApiEndpoint, HttpMethod, QueryParam, ResponseShape } from '$lib/types';
import { isValidSnakeCaseName } from '$lib/utils/validation';
import { buildDuplicateEndpoint, reconcilePathParams } from './endpointReducer';
import type { EndpointTarget } from './endpointTarget';
import {
	validateEndpointParams,
	type EndpointTargetFieldMember,
	type ValidationError,
	type ValidationLocation
} from './paramInference';

export type { EndpointTarget } from './endpointTarget';
export type { EndpointTargetFieldMember } from './paramInference';
export { getEndpointTarget } from './endpointTarget';

type EndpointTransitionEvent =
	| { type: 'methodChanged'; method: HttpMethod }
	| { type: 'pathChanged'; path: string }
	| { type: 'pathParamFieldSelected'; paramName: string; fieldMemberId: string }
	| { type: 'queryParamAddedFromField'; fieldMemberId: string }
	| { type: 'queryParamUpdated'; index: number; updates: Partial<QueryParam> }
	| { type: 'queryParamRemoved'; index: number }
	| { type: 'paginationToggled' }
	| { type: 'targetObjectSelected'; targetObjectId: string | undefined; endpointTarget: EndpointTarget }
	| { type: 'envelopeToggled'; enabled: boolean }
	| { type: 'responseShapeSet'; shape: ResponseShape }
	| { type: 'responseDefaultsReset' };

export type EndpointQueryAvailability = 'available' | 'notApplicable' | 'unresolved';
export type EndpointQueryControlMode = 'editable' | 'hidden' | 'blocked';
export type EndpointResponseShapeControlMode = 'editable' | 'locked';

export interface EndpointQueryControls {
	queryParameters: {
		mode: EndpointQueryControlMode;
	};
	pagination: {
		mode: EndpointQueryControlMode;
	};
	responseShape: {
		mode: EndpointResponseShapeControlMode;
		value: ResponseShape;
		reason: string;
	};
	responsePreview: {
		requestBodyVisible: boolean;
		responseBodyVisible: boolean;
		emptyMessage: string;
		targetNote: string;
	};
}

export interface EndpointQuerySuggestion {
	type: 'linkPathParam';
	paramName: string;
	fieldMemberId: string;
	label: string;
}

export interface EndpointQueryDraft {
	endpoint: ApiEndpoint;
	availability: EndpointQueryAvailability;
	issues: EndpointIssue[];
	suggestions: EndpointQuerySuggestion[];
	controls: EndpointQueryControls;
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

export type EndpointSavePreparation =
	| { status: 'ready'; endpoint: ApiEndpoint }
	| { status: 'blocked'; reasons: EndpointIssue[] };

export type EndpointDuplicatePreparation = EndpointSavePreparation;

// Caller question: What Endpoint draft should the editor use after applying query rules?
export function getEndpointQueryDraft(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): EndpointQueryDraft {
	const sanitizedEndpoint = getSanitizedEndpointQueryDraft(endpoint, endpointTarget);
	return {
		endpoint: sanitizedEndpoint,
		availability: getEndpointQueryAvailability(endpoint, endpointTarget),
		issues: getEndpointQueryIssues(endpoint, endpointTarget),
		suggestions: getPathParamSuggestions(endpoint.pathParams, endpointTarget),
		controls: getEndpointQueryControls(endpoint, endpointTarget)
	};
}

// Caller question: Can this Endpoint have query parameters?
export function getEndpointQueryAvailability(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): EndpointQueryAvailability {
	if (endpoint.method !== 'GET') return 'notApplicable';

	const targetAndPathIssues = getTargetAndPathIssues(endpoint, endpointTarget);
	const primaryFieldIssue = getPrimaryFieldIssue(endpoint, endpointTarget);
	if (targetAndPathIssues.length > 0 || primaryFieldIssue) return 'unresolved';

	const primaryField = getPrimaryFieldMember(endpointTarget);
	const finalPathParam = endpoint.pathParams[endpoint.pathParams.length - 1];
	if (finalPathParam && finalPathParam.fieldMemberId === primaryField?.id) {
		return 'notApplicable';
	}

	return 'available';
}

// Caller question: Which query controls should the Endpoint editor show?
export function getEndpointQueryControls(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): EndpointQueryControls {
	const availability = getEndpointQueryAvailability(endpoint, endpointTarget);
	const responseShapeValue = getEndpointResponseShapeValue(endpoint, availability);
	const responseShapeMode: EndpointResponseShapeControlMode =
		availability === 'unresolved' ? 'editable' : 'locked';

	return {
		queryParameters: {
			mode: getQueryControlMode(availability)
		},
		pagination: {
			mode: getQueryControlMode(availability)
		},
		responseShape: {
			mode: responseShapeMode,
			value: responseShapeValue,
			reason: responseShapeMode === 'locked'
				? getResponseShapeLockedReason(endpoint, availability, endpointTarget)
				: ''
		},
		responsePreview: getEndpointResponsePreviewControl(endpoint)
	};
}

// Caller question: What Endpoint draft should be displayed after applying query rules?
export function getSanitizedEndpointQueryDraft(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): ApiEndpoint {
	const availability = getEndpointQueryAvailability(endpoint, endpointTarget);
	if (availability === 'available') return sanitizeAvailableEndpoint(endpoint);
	if (availability === 'notApplicable') return sanitizeNotApplicableEndpoint(endpoint);
	return endpoint;
}

// Caller question: What query-related issues does this Endpoint have?
export function getEndpointQueryIssues(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): EndpointIssue[] {
	const pathNameIssues = getPathNameIssues(endpoint);
	const availability = getEndpointQueryAvailability(endpoint, endpointTarget);

	if (endpoint.method !== 'GET') {
		return [
			...pathNameIssues,
			...getTargetAndPathIssues(sanitizeNotApplicableEndpoint(endpoint), endpointTarget)
		];
	}

	if (availability === 'unresolved') {
		const primaryFieldIssue = getPrimaryFieldIssue(endpoint, endpointTarget);
		return [
			...pathNameIssues,
			...getTargetAndPathIssues(endpoint, endpointTarget),
			...(primaryFieldIssue ? [primaryFieldIssue] : [])
		];
	}

	if (availability === 'notApplicable') {
		return pathNameIssues;
	}

	const sanitizedEndpoint = sanitizeAvailableEndpoint(endpoint);
	return [
		...pathNameIssues,
		...getQueryIssues(sanitizedEndpoint, endpointTarget)
	];
}

export function transitionEndpointDraft(
	endpoint: ApiEndpoint,
	event: EndpointTransitionEvent,
	endpointTarget: EndpointTarget
): ApiEndpoint {
	const currentDraft = getEndpointQueryDraft(endpoint, endpointTarget);

	switch (event.type) {
		case 'methodChanged':
			return getSanitizedEndpointQueryDraft({ ...endpoint, method: event.method }, endpointTarget);
		case 'pathChanged':
			return getSanitizedEndpointQueryDraft(transitionPath(endpoint, event.path), endpointTarget);
		case 'pathParamFieldSelected':
			return getSanitizedEndpointQueryDraft(
				updatePathParamField(endpoint, event.paramName, event.fieldMemberId),
				endpointTarget
			);
		case 'queryParamAddedFromField':
			if (currentDraft.controls.queryParameters.mode !== 'editable') return currentDraft.endpoint;
			return getSanitizedEndpointQueryDraft(
				addQueryParamFromField(endpoint, event.fieldMemberId, endpointTarget.fieldMembers),
				endpointTarget
			);
		case 'queryParamUpdated':
			if (currentDraft.controls.queryParameters.mode !== 'editable') return currentDraft.endpoint;
			return getSanitizedEndpointQueryDraft(updateQueryParam(endpoint, event.index, event.updates), endpointTarget);
		case 'queryParamRemoved':
			if (currentDraft.controls.queryParameters.mode === 'hidden') return currentDraft.endpoint;
			return getSanitizedEndpointQueryDraft(removeQueryParam(endpoint, event.index), endpointTarget);
		case 'paginationToggled':
			if (currentDraft.controls.pagination.mode !== 'editable') return currentDraft.endpoint;
			return getSanitizedEndpointQueryDraft(
				{ ...endpoint, pagination: !(endpoint.pagination ?? false) },
				endpointTarget
			);
		case 'targetObjectSelected':
			return getSanitizedEndpointQueryDraft(
				selectTargetObject(endpoint, event.targetObjectId),
				event.endpointTarget
			);
		case 'envelopeToggled':
			return getSanitizedEndpointQueryDraft({ ...endpoint, useEnvelope: event.enabled }, endpointTarget);
		case 'responseShapeSet':
			if (currentDraft.controls.responseShape.mode !== 'editable') return currentDraft.endpoint;
			return getSanitizedEndpointQueryDraft({ ...endpoint, responseShape: event.shape }, endpointTarget);
		case 'responseDefaultsReset':
			return getSanitizedEndpointQueryDraft(
				{ ...endpoint, useEnvelope: true, responseShape: 'object', targetObjectId: undefined },
				{ status: 'missing', objectId: undefined, fieldMembers: [] }
			);
	}
}

export function getEndpointValidationErrors(issues: EndpointIssue[]): ValidationError[] {
	return issues
		.map(issue => issue.validationError)
		.filter((error): error is ValidationError => error !== undefined);
}

// Caller question: Can this Endpoint be saved, and what sanitized Endpoint should be saved?
export function prepareEndpointSave(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): EndpointSavePreparation {
	const draft = getEndpointQueryDraft(endpoint, endpointTarget);
	if (draft.issues.length > 0) return { status: 'blocked', reasons: draft.issues };
	return { status: 'ready', endpoint: draft.endpoint };
}

// Caller question: Can this Endpoint be duplicated, and what Endpoint should be created?
export function prepareEndpointDuplicate(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): EndpointDuplicatePreparation {
	return prepareEndpointSave(buildDuplicateEndpoint(endpoint), endpointTarget);
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
	fieldMembers: EndpointTargetFieldMember[]
): ApiEndpoint {
	const targetField = fieldMembers.find(field => field.id === fieldMemberId);
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

function getQueryControlMode(availability: EndpointQueryAvailability): EndpointQueryControlMode {
	if (availability === 'available') return 'editable';
	if (availability === 'notApplicable') return 'hidden';
	return 'blocked';
}

function getEndpointResponseShapeValue(
	endpoint: ApiEndpoint,
	availability: EndpointQueryAvailability
): ResponseShape {
	if (availability === 'available') return 'list';
	if (availability === 'notApplicable') return 'object';
	return endpoint.responseShape;
}

function getResponseShapeLockedReason(
	endpoint: ApiEndpoint,
	availability: EndpointQueryAvailability,
	endpointTarget: EndpointTarget
): string {
	if (availability === 'available') return 'Queryable endpoints return a list';
	if (endpoint.method !== 'GET') return 'Only GET endpoints can return a list';
	if (isPrimaryFieldEndpoint(endpoint, endpointTarget)) {
		return 'Primary-key endpoints return a single object';
	}
	return 'Query parameters are not applicable for this endpoint';
}

function getEndpointResponsePreviewControl(endpoint: ApiEndpoint): EndpointQueryControls['responsePreview'] {
	const requestBodyVisible = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
	const responseBodyVisible = endpoint.method !== 'DELETE';
	const emptyMessage = responseBodyVisible
		? ''
		: 'DELETE returns 204 No Content with no response body.';
	const targetNote = endpoint.method === 'DELETE'
		? 'For DELETE, this object defines path parameter types and which entity is addressed - not a response body.'
		: '';

	return {
		requestBodyVisible,
		responseBodyVisible,
		emptyMessage,
		targetNote
	};
}

function getTargetAndPathIssues(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): EndpointIssue[] {
	return validateEndpointParams({
		targetObjectId: endpoint.targetObjectId,
		targetFields: endpointTarget.fieldMembers,
		pathParams: endpoint.pathParams,
		queryParams: []
	}).map(validationErrorToIssue);
}

function getQueryIssues(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): EndpointIssue[] {
	return validateEndpointParams({
		targetObjectId: endpoint.targetObjectId,
		targetFields: endpointTarget.fieldMembers,
		pathParams: endpoint.pathParams,
		queryParams: endpoint.queryParams ?? []
	})
		.filter(error => error.location?.kind === 'queryParam')
		.map(validationErrorToIssue);
}

function getPrimaryFieldIssue(
	endpoint: ApiEndpoint,
	endpointTarget: EndpointTarget
): EndpointIssue | null {
	if (!endpoint.targetObjectId) return null;

	const primaryFields = endpointTarget.fieldMembers.filter(field => field.isPrimary);
	if (endpointTarget.fieldMembers.length === 0) {
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

function getPrimaryFieldMember(endpointTarget: EndpointTarget): EndpointTargetFieldMember | undefined {
	return endpointTarget.fieldMembers.find(field => field.isPrimary);
}

function isPrimaryFieldEndpoint(endpoint: ApiEndpoint, endpointTarget: EndpointTarget): boolean {
	const primaryField = getPrimaryFieldMember(endpointTarget);
	const finalPathParam = endpoint.pathParams[endpoint.pathParams.length - 1];
	return !!finalPathParam && finalPathParam.fieldMemberId === primaryField?.id;
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
	endpointTarget: EndpointTarget
): EndpointQuerySuggestion[] {
	return pathParams.flatMap(param => {
		const selectedField = endpointTarget.fieldMembers.find(field => field.id === param.fieldMemberId);
		if (selectedField) return [];

		const matchingField = endpointTarget.fieldMembers.find(
			field => field.name.toLowerCase() === param.name.toLowerCase()
		);
		if (!matchingField) return [];

		const labelTarget = endpointTarget.status === 'found'
			? `${endpointTarget.objectName}.${matchingField.name}`
			: matchingField.name;
		return [{
			type: 'linkPathParam',
			paramName: param.name,
			fieldMemberId: matchingField.id,
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

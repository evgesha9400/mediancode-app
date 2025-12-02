/**
 * Shared utility functions for generating example values and preview JSON
 * Used by both RequestBodyEditor and ResponseBodyEditor components
 */

import type { ResponseShape, ResponseItemShape, ObjectDefinition } from '$lib/types';
import { getFieldById } from '$lib/stores/fields';
import { getObjectById } from '$lib/stores/objects';

/**
 * Get an example value for a given field type
 *
 * @param type - The field type (e.g., 'str', 'int', 'float', 'bool', 'uuid', 'datetime', etc.)
 * @returns An example value appropriate for the type
 */
export function getExampleValueForType(type: string): any {
	const normalizedType = type.toLowerCase();

	if (normalizedType === 'str' || normalizedType === 'string') return 'string';
	if (normalizedType === 'int' || normalizedType === 'integer') return 0;
	if (normalizedType === 'float' || normalizedType === 'number') return 0.0;
	if (normalizedType === 'bool' || normalizedType === 'boolean') return true;
	if (normalizedType === 'uuid') return '00000000-0000-0000-0000-000000000000';
	if (normalizedType === 'datetime') return '2024-01-01T00:00:00Z';
	if (normalizedType === 'date') return '2024-01-01';
	if (normalizedType === 'time') return '00:00:00';

	return null;
}

/**
 * Build an object from field IDs
 *
 * @param fieldIds - Array of field IDs to include in the object
 * @param fields - Optional fields array for reactive dependencies (not used directly but ensures reactivity)
 * @returns An object with field names as keys and example values
 */
export function buildObjectFromFieldIds(fieldIds: string[], fields?: any[]): Record<string, any> {
	const obj: Record<string, any> = {};

	fieldIds.forEach(fieldId => {
		const field = getFieldById(fieldId);
		if (field) {
			obj[field.name] = getExampleValueForType(field.type);
		}
	});

	return obj;
}

/**
 * Build an object from an ObjectDefinition
 *
 * @param objectId - The ID of the object definition to build from
 * @param objects - Optional objects array for reactive dependencies (not used directly but ensures reactivity)
 * @returns An object with field names as keys and example values
 */
export function buildObjectFromObjectId(objectId: string | undefined, objects?: any[]): Record<string, any> {
	if (!objectId) {
		return {};
	}

	const objectDef = getObjectById(objectId);
	if (!objectDef) {
		return {};
	}

	const obj: Record<string, any> = {};

	objectDef.fields.forEach(fieldRef => {
		const field = getFieldById(fieldRef.fieldId);
		if (field) {
			obj[field.name] = getExampleValueForType(field.type);
		}
	});

	return obj;
}

/**
 * Build request body preview JSON (legacy - uses field IDs)
 *
 * @param fieldIds - Array of field IDs to include in the request body
 * @param fields - Optional fields array for reactive dependencies (not used directly but ensures reactivity)
 * @returns JSON string representation of the request body
 */
export function buildRequestPreview(fieldIds: string[], fields?: any[]): string {
	if (fieldIds.length === 0) {
		return '{}';
	}

	const bodyContent = buildObjectFromFieldIds(fieldIds, fields);
	return JSON.stringify(bodyContent, null, 2);
}

/**
 * Build request body preview JSON from an object ID
 *
 * @param objectId - The ID of the object definition to use for the request body
 * @param objects - Optional objects array for reactive dependencies (not used directly but ensures reactivity)
 * @returns JSON string representation of the request body
 */
export function buildRequestPreviewFromObject(objectId: string | undefined, objects?: any[]): string {
	const bodyContent = buildObjectFromObjectId(objectId, objects);
	return JSON.stringify(bodyContent, null, 2);
}

/**
 * Build response body preview JSON
 *
 * Supports two response shapes:
 * - object: Returns an object built from field IDs
 * - list: Returns an array of objects
 *
 * @param shape - The response shape ('object' or 'list')
 * @param fieldIds - Array of field IDs for object/list-of-objects shapes
 * @param primitiveFieldId - Deprecated parameter (kept for compatibility, not used)
 * @param itemShape - Deprecated parameter (kept for compatibility, always 'object')
 * @param useEnvelope - Whether to wrap the response in a { data: ... } envelope
 * @param fields - Optional fields array for reactive dependencies (not used directly but ensures reactivity)
 * @returns JSON string representation of the response body
 */
export function buildResponsePreview(
	shape: ResponseShape,
	fieldIds: string[],
	primitiveFieldId: string | undefined,
	itemShape: ResponseItemShape,
	useEnvelope: boolean,
	fields?: any[]
): string {
	let bodyContent: any;

	if (shape === 'object') {
		// Object shape: build object from field IDs
		if (fieldIds.length === 0) {
			bodyContent = {};
		} else {
			bodyContent = buildObjectFromFieldIds(fieldIds, fields);
		}
	} else if (shape === 'list') {
		// List shape: array of objects only
		if (fieldIds.length === 0) {
			bodyContent = [];
		} else {
			const itemObject = buildObjectFromFieldIds(fieldIds, fields);
			bodyContent = [itemObject, itemObject]; // Show 2 example items
		}
	}

	// Wrap in envelope if enabled
	if (useEnvelope) {
		bodyContent = {
			data: bodyContent
		};
	}

	return JSON.stringify(bodyContent, null, 2);
}

/**
 * Build response body preview JSON from an object ID
 *
 * Supports two response shapes:
 * - object: Returns a single object built from the object definition
 * - list: Returns an array of objects
 *
 * @param shape - The response shape ('object' or 'list')
 * @param objectId - The ID of the object definition to use for the response
 * @param useEnvelope - Whether to wrap the response in a { data: ... } envelope
 * @param objects - Optional objects array for reactive dependencies (not used directly but ensures reactivity)
 * @returns JSON string representation of the response body
 */
export function buildResponsePreviewFromObject(
	shape: ResponseShape,
	objectId: string | undefined,
	useEnvelope: boolean,
	objects?: any[]
): string {
	let bodyContent: any;

	const objectData = buildObjectFromObjectId(objectId, objects);

	if (shape === 'object') {
		// Object shape: return single object
		bodyContent = objectData;
	} else if (shape === 'list') {
		// List shape: array of objects
		if (Object.keys(objectData).length === 0) {
			bodyContent = [];
		} else {
			bodyContent = [objectData, objectData]; // Show 2 example items
		}
	}

	// Wrap in envelope if enabled
	if (useEnvelope) {
		bodyContent = {
			data: bodyContent
		};
	}

	return JSON.stringify(bodyContent, null, 2);
}

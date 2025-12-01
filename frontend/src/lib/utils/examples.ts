/**
 * Shared utility functions for generating example values and preview JSON
 * Used by both RequestBodyEditor and ResponseBodyEditor components
 */

import type { ResponseShape, ResponseItemShape } from '$lib/types';
import { getFieldById } from '$lib/stores/fields';

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
 * @returns An object with field names as keys and example values
 */
export function buildObjectFromFieldIds(fieldIds: string[]): Record<string, any> {
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
 * Build request body preview JSON
 *
 * @param fieldIds - Array of field IDs to include in the request body
 * @returns JSON string representation of the request body
 */
export function buildRequestPreview(fieldIds: string[]): string {
	if (fieldIds.length === 0) {
		return '{}';
	}

	const bodyContent = buildObjectFromFieldIds(fieldIds);
	return JSON.stringify(bodyContent, null, 2);
}

/**
 * Build response body preview JSON
 *
 * Supports multiple response shapes:
 * - object: Returns an object built from field IDs
 * - primitive: Returns a single primitive value from the selected field
 * - list: Returns an array of objects or primitives
 *
 * @param shape - The response shape ('object', 'primitive', or 'list')
 * @param fieldIds - Array of field IDs for object/list-of-objects shapes
 * @param primitiveFieldId - Field ID for primitive/list-of-primitives shapes
 * @param itemShape - Item shape for list responses ('object' or 'primitive')
 * @param useEnvelope - Whether to wrap the response in a { data: ... } envelope
 * @returns JSON string representation of the response body
 */
export function buildResponsePreview(
	shape: ResponseShape,
	fieldIds: string[],
	primitiveFieldId: string | undefined,
	itemShape: ResponseItemShape,
	useEnvelope: boolean
): string {
	let bodyContent: any;

	if (shape === 'object') {
		// Object shape: build object from field IDs
		if (fieldIds.length === 0) {
			bodyContent = {};
		} else {
			bodyContent = buildObjectFromFieldIds(fieldIds);
		}
	} else if (shape === 'primitive') {
		// Primitive shape: single value from selected field
		if (primitiveFieldId) {
			const field = getFieldById(primitiveFieldId);
			bodyContent = field ? getExampleValueForType(field.type) : null;
		} else {
			bodyContent = null;
		}
	} else if (shape === 'list') {
		// List shape: array of items (either objects or primitives)
		if (itemShape === 'object') {
			// List of objects
			if (fieldIds.length === 0) {
				bodyContent = [];
			} else {
				const itemObject = buildObjectFromFieldIds(fieldIds);
				bodyContent = [itemObject, itemObject]; // Show 2 example items
			}
		} else {
			// List of primitives
			if (primitiveFieldId) {
				const field = getFieldById(primitiveFieldId);
				if (field) {
					const exampleValue = getExampleValueForType(field.type);
					bodyContent = [exampleValue, exampleValue]; // Show 2 example items
				} else {
					bodyContent = [];
				}
			} else {
				bodyContent = [];
			}
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

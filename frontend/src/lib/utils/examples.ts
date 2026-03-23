/**
 * Shared utility functions for generating example values and preview JSON
 * Used by the ResponsePreview component for request/response previews
 */

import type { ResponseShape } from '$lib/types';
import { getFieldById } from '$lib/stores/fields';
import { getObjectById } from '$lib/stores/objects';

/**
 * Get the PK field type of a target object for FK type derivation.
 * Falls back to 'uuid' if the target or its PK field cannot be found.
 */
function getTargetPkType(targetObjectId: string): string {
	const targetObj = getObjectById(targetObjectId);
	if (!targetObj) return 'uuid';

	const pkRef = targetObj.fields.find(f => f.role === 'pk');
	if (!pkRef) return 'uuid';

	const pkField = getFieldById(pkRef.fieldId);
	return pkField?.type ?? 'uuid';
}

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
 * Build request body preview object, filtering by role.
 * Excludes PK, read-only, and auto-generated fields.
 */
export function buildRequestBodyFromObjectId(objectId: string | undefined, objects?: any[]): Record<string, any> {
	if (!objectId) return {};
	const objectDef = getObjectById(objectId);
	if (!objectDef) return {};

	const obj: Record<string, any> = {};
	objectDef.fields
		.filter(fieldRef => fieldRef.role === 'writable' || fieldRef.role === 'write_only')
		.forEach(fieldRef => {
			const field = getFieldById(fieldRef.fieldId);
			if (field) obj[field.name] = getExampleValueForType(field.type);
		});

	// Add FK ID fields for `references` relationships (needed in create/update requests)
	if (objectDef.relationships) {
		objectDef.relationships
			.filter(rel => rel.cardinality === 'references' && !rel.isInferred)
			.forEach(rel => {
				const fkName = rel.name + '_id';
				if (!(fkName in obj)) {
					obj[fkName] = getExampleValueForType(getTargetPkType(rel.targetObjectId));
				}
			});
	}

	return obj;
}

/**
 * Build response body preview object, filtering by role.
 * Excludes write-only fields (everything else appears in responses).
 */
export function buildResponseBodyFromObjectId(objectId: string | undefined, objects?: any[]): Record<string, any> {
	if (!objectId) return {};
	const objectDef = getObjectById(objectId);
	if (!objectDef) return {};

	const obj: Record<string, any> = {};
	objectDef.fields
		.filter(fieldRef => fieldRef.role !== 'write_only')
		.forEach(fieldRef => {
			const field = getFieldById(fieldRef.fieldId);
			if (field) obj[field.name] = getExampleValueForType(field.type);
		});

	// Add FK ID fields for `references` relationships
	if (objectDef.relationships) {
		objectDef.relationships
			.filter(rel => rel.cardinality === 'references' && !rel.isInferred)
			.forEach(rel => {
				const fkName = rel.name + '_id';
				if (!(fkName in obj)) {
					obj[fkName] = getExampleValueForType(getTargetPkType(rel.targetObjectId));
				}
			});
	}

	return obj;
}

/**
 * Build request body preview JSON from an object ID
 */
export function buildRequestPreviewFromObject(objectId: string | undefined, objects?: any[]): string {
	const bodyContent = buildRequestBodyFromObjectId(objectId, objects);
	return JSON.stringify(bodyContent, null, 2);
}

/**
 * Build response body preview JSON from an object ID
 */
export function buildResponsePreviewFromObject(
	shape: ResponseShape,
	objectId: string | undefined,
	useEnvelope: boolean,
	objects?: any[]
): string {
	let bodyContent: any;

	const objectData = buildResponseBodyFromObjectId(objectId, objects);

	if (shape === 'object') {
		bodyContent = objectData;
	} else if (shape === 'list') {
		if (Object.keys(objectData).length === 0) {
			bodyContent = [];
		} else {
			bodyContent = [objectData, objectData];
		}
	}

	if (useEnvelope) {
		bodyContent = { data: bodyContent };
	}

	return JSON.stringify(bodyContent, null, 2);
}

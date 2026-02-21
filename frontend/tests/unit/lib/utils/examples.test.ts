import { describe, it, expect, beforeEach } from 'vitest';
import {
	getExampleValueForType,
	buildObjectFromObjectId,
	buildRequestPreviewFromObject,
	buildResponsePreviewFromObject
} from '$lib/utils/examples';
import { fieldsStore } from '$lib/stores/fields';
import { objectsStore } from '$lib/stores/objects';
import { initialFields } from '../../../fixtures/seedData';
import type { ResponseShape } from '$lib/types';

import { initialObjects, SEED_OBJECT_IDS } from '../../../fixtures/seedData';

describe('examples - getExampleValueForType', () => {
	it('should return correct example for string types', () => {
		expect(getExampleValueForType('str')).toBe('string');
		expect(getExampleValueForType('string')).toBe('string');
		expect(getExampleValueForType('String')).toBe('string');
		expect(getExampleValueForType('STR')).toBe('string');
	});

	it('should return correct example for integer types', () => {
		expect(getExampleValueForType('int')).toBe(0);
		expect(getExampleValueForType('integer')).toBe(0);
		expect(getExampleValueForType('Integer')).toBe(0);
		expect(getExampleValueForType('INT')).toBe(0);
	});

	it('should return correct example for float types', () => {
		expect(getExampleValueForType('float')).toBe(0.0);
		expect(getExampleValueForType('number')).toBe(0.0);
		expect(getExampleValueForType('Float')).toBe(0.0);
		expect(getExampleValueForType('FLOAT')).toBe(0.0);
	});

	it('should return correct example for boolean types', () => {
		expect(getExampleValueForType('bool')).toBe(true);
		expect(getExampleValueForType('boolean')).toBe(true);
		expect(getExampleValueForType('Boolean')).toBe(true);
		expect(getExampleValueForType('BOOL')).toBe(true);
	});

	it('should return correct example for uuid type', () => {
		expect(getExampleValueForType('uuid')).toBe('00000000-0000-0000-0000-000000000000');
		expect(getExampleValueForType('UUID')).toBe('00000000-0000-0000-0000-000000000000');
	});

	it('should return correct example for datetime type', () => {
		expect(getExampleValueForType('datetime')).toBe('2024-01-01T00:00:00Z');
		expect(getExampleValueForType('DateTime')).toBe('2024-01-01T00:00:00Z');
	});

	it('should return correct example for date type', () => {
		expect(getExampleValueForType('date')).toBe('2024-01-01');
		expect(getExampleValueForType('Date')).toBe('2024-01-01');
	});

	it('should return correct example for time type', () => {
		expect(getExampleValueForType('time')).toBe('00:00:00');
		expect(getExampleValueForType('Time')).toBe('00:00:00');
	});

	it('should return null for unknown types', () => {
		expect(getExampleValueForType('unknown')).toBe(null);
		expect(getExampleValueForType('custom')).toBe(null);
		expect(getExampleValueForType('nonsense')).toBe(null);
		expect(getExampleValueForType('')).toBe(null);
	});

	it('should handle case-insensitive type matching', () => {
		expect(getExampleValueForType('sTrInG')).toBe('string');
		expect(getExampleValueForType('iNtEgEr')).toBe(0);
		expect(getExampleValueForType('bOoLeAn')).toBe(true);
	});
});

describe('examples - buildObjectFromObjectId', () => {
	beforeEach(() => {
		fieldsStore.set(initialFields);
		objectsStore.set(initialObjects as any);
	});

	it('should build object from object ID', () => {
		const obj = buildObjectFromObjectId(SEED_OBJECT_IDS.user);

		expect(obj).toHaveProperty('email');
		expect(obj).toHaveProperty('username');
		expect(Object.keys(obj).length).toBeGreaterThan(0);
	});

	it('should return empty object for undefined objectId', () => {
		expect(buildObjectFromObjectId(undefined)).toEqual({});
	});

	it('should return empty object for non-existent objectId', () => {
		expect(buildObjectFromObjectId('non-existent')).toEqual({});
	});
});

describe('examples - buildRequestPreviewFromObject', () => {
	beforeEach(() => {
		fieldsStore.set(initialFields);
		objectsStore.set(initialObjects as any);
	});

	it('should generate request preview from object ID', () => {
		const preview = buildRequestPreviewFromObject(SEED_OBJECT_IDS.user);

		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('email');
	});

	it('should return empty object JSON for undefined objectId', () => {
		const preview = buildRequestPreviewFromObject(undefined);

		expect(JSON.parse(preview)).toEqual({});
	});
});

describe('examples - buildResponsePreviewFromObject', () => {
	beforeEach(() => {
		fieldsStore.set(initialFields);
		objectsStore.set(initialObjects as any);
	});

	it('should generate object shape response from object ID', () => {
		const preview = buildResponsePreviewFromObject('object', SEED_OBJECT_IDS.user, false);

		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('email');
	});

	it('should generate list shape response from object ID', () => {
		const preview = buildResponsePreviewFromObject('list', SEED_OBJECT_IDS.user, false);

		const parsed = JSON.parse(preview);
		expect(Array.isArray(parsed)).toBe(true);
		expect(parsed).toHaveLength(2);
	});

	it('should return empty array for list shape with undefined object', () => {
		const preview = buildResponsePreviewFromObject('list', undefined, false);

		const parsed = JSON.parse(preview);
		expect(parsed).toEqual([]);
	});

	it('should wrap in envelope when enabled', () => {
		const preview = buildResponsePreviewFromObject('object', SEED_OBJECT_IDS.user, true);

		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('data');
		expect(parsed.data).toHaveProperty('email');
	});

	it('should wrap list in envelope when enabled', () => {
		const preview = buildResponsePreviewFromObject('list', SEED_OBJECT_IDS.user, true);

		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('data');
		expect(Array.isArray(parsed.data)).toBe(true);
		expect(parsed.data).toHaveLength(2);
	});
});

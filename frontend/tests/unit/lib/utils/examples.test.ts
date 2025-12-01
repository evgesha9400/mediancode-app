import { describe, it, expect, beforeEach } from 'vitest';
import {
	getExampleValueForType,
	buildObjectFromFieldIds,
	buildRequestPreview,
	buildResponsePreview
} from '$lib/utils/examples';
import { fieldsStore } from '$lib/stores/fields';
import { initialFields } from '$lib/stores/initialData';
import type { ResponseShape, ResponseItemShape } from '$lib/types';

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

describe('examples - buildObjectFromFieldIds', () => {
	beforeEach(() => {
		fieldsStore.set(initialFields);
	});

	it('should build object from multiple field IDs', () => {
		const obj = buildObjectFromFieldIds(['field-1', 'field-2']);

		// field-1 is 'email' with type 'str'
		// field-2 is another field from initialFields
		expect(obj).toHaveProperty('email');
		expect(typeof obj.email).toBe('string');
		expect(Object.keys(obj).length).toBeGreaterThan(0);
	});

	it('should return empty object for empty field IDs array', () => {
		const obj = buildObjectFromFieldIds([]);

		expect(obj).toEqual({});
		expect(Object.keys(obj)).toHaveLength(0);
	});

	it('should skip non-existent field IDs gracefully', () => {
		const obj = buildObjectFromFieldIds(['field-1', 'non-existent-field', 'field-2']);

		// Should include field-1 and field-2, skip non-existent
		expect(obj).toHaveProperty('email'); // field-1 is 'email'
		expect(obj).not.toHaveProperty('non-existent-field');
	});

	it('should handle only non-existent field IDs', () => {
		const obj = buildObjectFromFieldIds(['non-existent-1', 'non-existent-2']);

		expect(obj).toEqual({});
	});

	it('should use correct example values based on field types', () => {
		const obj = buildObjectFromFieldIds(['field-1']);

		// field-1 is 'email' with type 'str'
		expect(obj.email).toBe('string');
	});
});

describe('examples - buildRequestPreview', () => {
	beforeEach(() => {
		fieldsStore.set(initialFields);
	});

	it('should generate request preview JSON string', () => {
		const preview = buildRequestPreview(['field-1', 'field-2']);

		// Should be valid JSON
		expect(() => JSON.parse(preview)).not.toThrow();

		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('email'); // field-1
		expect(typeof parsed).toBe('object');
	});

	it('should return empty object JSON for empty fields', () => {
		const preview = buildRequestPreview([]);

		expect(preview).toBe('{}');
		expect(JSON.parse(preview)).toEqual({});
	});

	it('should format JSON with indentation', () => {
		const preview = buildRequestPreview(['field-1']);

		// Should have newlines (formatted with 2 spaces)
		expect(preview).toContain('\n');
		expect(preview).toMatch(/{\n/);
	});

	it('should handle non-existent fields gracefully', () => {
		const preview = buildRequestPreview(['field-1', 'non-existent']);

		expect(() => JSON.parse(preview)).not.toThrow();
		const parsed = JSON.parse(preview);
		expect(parsed).toHaveProperty('email');
		expect(parsed).not.toHaveProperty('non-existent');
	});
});

describe('examples - buildResponsePreview', () => {
	beforeEach(() => {
		fieldsStore.set(initialFields);
	});

	describe('object shape', () => {
		it('should generate object shape without envelope', () => {
			const shape: ResponseShape = 'object';
			const fieldIds = ['field-1', 'field-2'];
			const preview = buildResponsePreview(shape, fieldIds, undefined, 'object', false);

			const parsed = JSON.parse(preview);
			expect(parsed).toHaveProperty('email'); // field-1
			expect(parsed).not.toHaveProperty('data'); // No envelope
		});

		it('should generate object shape with envelope', () => {
			const shape: ResponseShape = 'object';
			const fieldIds = ['field-1', 'field-2'];
			const preview = buildResponsePreview(shape, fieldIds, undefined, 'object', true);

			const parsed = JSON.parse(preview);
			expect(parsed).toHaveProperty('data');
			expect(parsed.data).toHaveProperty('email'); // field-1 inside data
		});

		it('should handle empty fields for object shape', () => {
			const shape: ResponseShape = 'object';
			const preview = buildResponsePreview(shape, [], undefined, 'object', false);

			const parsed = JSON.parse(preview);
			expect(parsed).toEqual({});
		});

		it('should handle empty fields for object shape with envelope', () => {
			const shape: ResponseShape = 'object';
			const preview = buildResponsePreview(shape, [], undefined, 'object', true);

			const parsed = JSON.parse(preview);
			expect(parsed).toEqual({ data: {} });
		});
	});

	describe('primitive shape', () => {
		it('should generate primitive shape without envelope', () => {
			const shape: ResponseShape = 'primitive';
			const preview = buildResponsePreview(shape, [], 'field-1', 'object', false);

			const parsed = JSON.parse(preview);
			// field-1 is 'email' with type 'str', so example should be 'string'
			expect(parsed).toBe('string');
		});

		it('should generate primitive shape with envelope', () => {
			const shape: ResponseShape = 'primitive';
			const preview = buildResponsePreview(shape, [], 'field-1', 'object', true);

			const parsed = JSON.parse(preview);
			expect(parsed).toHaveProperty('data');
			expect(parsed.data).toBe('string');
		});

		it('should return null for primitive shape without field ID', () => {
			const shape: ResponseShape = 'primitive';
			const preview = buildResponsePreview(shape, [], undefined, 'object', false);

			const parsed = JSON.parse(preview);
			expect(parsed).toBe(null);
		});

		it('should return envelope with null for primitive shape without field ID', () => {
			const shape: ResponseShape = 'primitive';
			const preview = buildResponsePreview(shape, [], undefined, 'object', true);

			const parsed = JSON.parse(preview);
			expect(parsed).toEqual({ data: null });
		});

		it('should handle non-existent primitive field ID', () => {
			const shape: ResponseShape = 'primitive';
			const preview = buildResponsePreview(shape, [], 'non-existent-field', 'object', false);

			const parsed = JSON.parse(preview);
			expect(parsed).toBe(null);
		});
	});

	describe('list of objects', () => {
		it('should generate list of objects without envelope', () => {
			const shape: ResponseShape = 'list';
			const itemShape: ResponseItemShape = 'object';
			const fieldIds = ['field-1', 'field-2'];
			const preview = buildResponsePreview(shape, fieldIds, undefined, itemShape, false);

			const parsed = JSON.parse(preview);
			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed).toHaveLength(2); // Shows 2 example items
			expect(parsed[0]).toHaveProperty('email');
			expect(parsed[1]).toHaveProperty('email');
		});

		it('should generate list of objects with envelope', () => {
			const shape: ResponseShape = 'list';
			const itemShape: ResponseItemShape = 'object';
			const fieldIds = ['field-1', 'field-2'];
			const preview = buildResponsePreview(shape, fieldIds, undefined, itemShape, true);

			const parsed = JSON.parse(preview);
			expect(parsed).toHaveProperty('data');
			expect(Array.isArray(parsed.data)).toBe(true);
			expect(parsed.data).toHaveLength(2);
			expect(parsed.data[0]).toHaveProperty('email');
		});

		it('should return empty array for list of objects with no fields', () => {
			const shape: ResponseShape = 'list';
			const itemShape: ResponseItemShape = 'object';
			const preview = buildResponsePreview(shape, [], undefined, itemShape, false);

			const parsed = JSON.parse(preview);
			expect(parsed).toEqual([]);
		});

		it('should return envelope with empty array for list of objects with no fields', () => {
			const shape: ResponseShape = 'list';
			const itemShape: ResponseItemShape = 'object';
			const preview = buildResponsePreview(shape, [], undefined, itemShape, true);

			const parsed = JSON.parse(preview);
			expect(parsed).toEqual({ data: [] });
		});
	});

	describe('list of primitives', () => {
		it('should generate list of primitives without envelope', () => {
			const shape: ResponseShape = 'list';
			const itemShape: ResponseItemShape = 'primitive';
			const preview = buildResponsePreview(shape, [], 'field-1', itemShape, false);

			const parsed = JSON.parse(preview);
			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed).toHaveLength(2); // Shows 2 example items
			expect(parsed[0]).toBe('string');
			expect(parsed[1]).toBe('string');
		});

		it('should generate list of primitives with envelope', () => {
			const shape: ResponseShape = 'list';
			const itemShape: ResponseItemShape = 'primitive';
			const preview = buildResponsePreview(shape, [], 'field-1', itemShape, true);

			const parsed = JSON.parse(preview);
			expect(parsed).toHaveProperty('data');
			expect(Array.isArray(parsed.data)).toBe(true);
			expect(parsed.data).toHaveLength(2);
			expect(parsed.data[0]).toBe('string');
			expect(parsed.data[1]).toBe('string');
		});

		it('should return empty array for list of primitives without field ID', () => {
			const shape: ResponseShape = 'list';
			const itemShape: ResponseItemShape = 'primitive';
			const preview = buildResponsePreview(shape, [], undefined, itemShape, false);

			const parsed = JSON.parse(preview);
			expect(parsed).toEqual([]);
		});

		it('should return envelope with empty array for list of primitives without field ID', () => {
			const shape: ResponseShape = 'list';
			const itemShape: ResponseItemShape = 'primitive';
			const preview = buildResponsePreview(shape, [], undefined, itemShape, true);

			const parsed = JSON.parse(preview);
			expect(parsed).toEqual({ data: [] });
		});

		it('should handle non-existent primitive field for list', () => {
			const shape: ResponseShape = 'list';
			const itemShape: ResponseItemShape = 'primitive';
			const preview = buildResponsePreview(shape, [], 'non-existent-field', itemShape, false);

			const parsed = JSON.parse(preview);
			expect(parsed).toEqual([]);
		});
	});

	describe('edge cases', () => {
		it('should handle all response shapes with envelope enabled', () => {
			const shapes: ResponseShape[] = ['object', 'primitive', 'list'];

			shapes.forEach(shape => {
				const preview = buildResponsePreview(shape, ['field-1'], 'field-1', 'object', true);
				const parsed = JSON.parse(preview);
				expect(parsed).toHaveProperty('data');
			});
		});

		it('should format JSON with proper indentation', () => {
			const shape: ResponseShape = 'object';
			const preview = buildResponsePreview(shape, ['field-1'], undefined, 'object', true);

			// Should have newlines and indentation
			expect(preview).toContain('\n');
			expect(preview).toMatch(/{\n\s+"data":/);
		});

		it('should handle mixed scenarios correctly', () => {
			// Object with envelope
			let preview = buildResponsePreview('object', ['field-1'], undefined, 'object', true);
			let parsed = JSON.parse(preview);
			expect(parsed.data).toHaveProperty('email');

			// Primitive without envelope
			preview = buildResponsePreview('primitive', [], 'field-1', 'object', false);
			parsed = JSON.parse(preview);
			expect(parsed).toBe('string');

			// List of objects with envelope
			preview = buildResponsePreview('list', ['field-1'], undefined, 'object', true);
			parsed = JSON.parse(preview);
			expect(parsed.data).toHaveLength(2);

			// List of primitives without envelope
			preview = buildResponsePreview('list', [], 'field-1', 'primitive', false);
			parsed = JSON.parse(preview);
			expect(parsed).toHaveLength(2);
		});
	});
});

import { describe, it, expect, beforeEach } from 'vitest';
import { seedIdGenerator, generateId, generateParamId, deepClone } from '$lib/utils/ids';

describe('ids utility - generateId', () => {
	beforeEach(() => {
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should generate deterministic IDs with prefix', () => {
		const id1 = generateId('endpoint');
		const id2 = generateId('endpoint');
		const id3 = generateId('tag');

		expect(id1).toBe('endpoint-1000000-0');
		expect(id2).toBe('endpoint-1000000-1');
		expect(id3).toBe('tag-1000000-2');
	});

	it('should produce same IDs after reseeding with same values', () => {
		const firstRun: string[] = [];
		firstRun.push(generateId('test'));
		firstRun.push(generateId('test'));
		firstRun.push(generateId('test'));

		// Reset to same seed
		seedIdGenerator({ counter: 0, timestamp: 1000000 });

		const secondRun: string[] = [];
		secondRun.push(generateId('test'));
		secondRun.push(generateId('test'));
		secondRun.push(generateId('test'));

		expect(firstRun).toEqual(secondRun);
	});
});

describe('ids utility - generateParamId', () => {
	beforeEach(() => {
		seedIdGenerator({ counter: 0, timestamp: 1000000 });
	});

	it('should generate deterministic param IDs', () => {
		const id1 = generateParamId();
		const id2 = generateParamId();
		const id3 = generateParamId();

		expect(id1).toBe('param-1000000-0');
		expect(id2).toBe('param-1000000-1');
		expect(id3).toBe('param-1000000-2');
	});

	it('should share counter with generateId', () => {
		const endpointId = generateId('endpoint'); // Uses counter 0
		const paramId = generateParamId(); // Uses counter 1
		const tagId = generateId('tag'); // Uses counter 2

		expect(endpointId).toBe('endpoint-1000000-0');
		expect(paramId).toBe('param-1000000-1');
		expect(tagId).toBe('tag-1000000-2');
	});

	it('should produce same param IDs after reseeding with same values', () => {
		const firstRun: string[] = [];
		firstRun.push(generateParamId());
		firstRun.push(generateParamId());
		firstRun.push(generateParamId());

		// Reset to same seed
		seedIdGenerator({ counter: 0, timestamp: 1000000 });

		const secondRun: string[] = [];
		secondRun.push(generateParamId());
		secondRun.push(generateParamId());
		secondRun.push(generateParamId());

		expect(firstRun).toEqual(secondRun);
	});
});

describe('ids utility - seedIdGenerator', () => {
	it('should reset counter when seeded', () => {
		// Generate some IDs
		generateId('test');
		generateId('test');
		generateId('test');

		// Reset
		seedIdGenerator({ counter: 0, timestamp: 2000000 });

		const id = generateId('test');
		expect(id).toBe('test-2000000-0');
	});

	it('should use current timestamp if not provided', () => {
		seedIdGenerator({ counter: 5 });

		const id = generateId('test');
		// Should have counter 5 and some timestamp
		expect(id).toMatch(/^test-\d+-5$/);
	});
});

describe('ids utility - deepClone', () => {
	it('should create a deep copy of an object', () => {
		const original = {
			id: '1',
			nested: {
				value: 42,
				array: [1, 2, 3]
			}
		};

		const clone = deepClone(original);

		// Values should be equal
		expect(clone).toEqual(original);

		// But not the same reference
		expect(clone).not.toBe(original);
		expect(clone.nested).not.toBe(original.nested);
		expect(clone.nested.array).not.toBe(original.nested.array);
	});

	it('should allow modifying clone without affecting original', () => {
		const original = { value: 10, nested: { x: 1 } };
		const clone = deepClone(original);

		clone.value = 20;
		clone.nested.x = 100;

		expect(original.value).toBe(10);
		expect(original.nested.x).toBe(1);
	});
});

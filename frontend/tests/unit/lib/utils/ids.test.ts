import { describe, it, expect, beforeEach } from 'vitest';
import { seedIdGenerator, generateId, generateParamId, deepClone } from '$lib/utils/ids';

describe('ids utility - generateId', () => {
	beforeEach(() => {
		seedIdGenerator({ counter: 0 });
	});

	it('should generate deterministic UUIDs when seeded', () => {
		const id1 = generateId('endpoint');
		const id2 = generateId('endpoint');
		const id3 = generateId('tag');

		expect(id1).toBe('00000000-0000-4000-a000-000000000000');
		expect(id2).toBe('00000000-0000-4000-a000-000000000001');
		expect(id3).toBe('00000000-0000-4000-a000-000000000002');
	});

	it('should ignore the prefix parameter (backward compatibility)', () => {
		const id1 = generateId('endpoint');
		seedIdGenerator({ counter: 0 });
		const id2 = generateId('different-prefix');

		expect(id1).toBe(id2);
	});

	it('should produce same IDs after reseeding with same values', () => {
		const firstRun: string[] = [];
		firstRun.push(generateId('test'));
		firstRun.push(generateId('test'));
		firstRun.push(generateId('test'));

		// Reset to same seed
		seedIdGenerator({ counter: 0 });

		const secondRun: string[] = [];
		secondRun.push(generateId('test'));
		secondRun.push(generateId('test'));
		secondRun.push(generateId('test'));

		expect(firstRun).toEqual(secondRun);
	});

	it('should generate valid UUID format', () => {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
		const id = generateId();

		expect(id).toMatch(uuidRegex);
	});
});

describe('ids utility - generateParamId', () => {
	beforeEach(() => {
		seedIdGenerator({ counter: 0 });
	});

	it('should generate deterministic param UUIDs', () => {
		const id1 = generateParamId();
		const id2 = generateParamId();
		const id3 = generateParamId();

		expect(id1).toBe('00000000-0000-4000-a000-000000000000');
		expect(id2).toBe('00000000-0000-4000-a000-000000000001');
		expect(id3).toBe('00000000-0000-4000-a000-000000000002');
	});

	it('should share counter with generateId', () => {
		const endpointId = generateId('endpoint'); // Uses counter 0
		const paramId = generateParamId(); // Uses counter 1
		const tagId = generateId('tag'); // Uses counter 2

		expect(endpointId).toBe('00000000-0000-4000-a000-000000000000');
		expect(paramId).toBe('00000000-0000-4000-a000-000000000001');
		expect(tagId).toBe('00000000-0000-4000-a000-000000000002');
	});

	it('should produce same param IDs after reseeding with same values', () => {
		const firstRun: string[] = [];
		firstRun.push(generateParamId());
		firstRun.push(generateParamId());
		firstRun.push(generateParamId());

		// Reset to same seed
		seedIdGenerator({ counter: 0 });

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
		seedIdGenerator({ counter: 0 });
		generateId('test');
		generateId('test');
		generateId('test');

		// Reset with counter 0
		seedIdGenerator({ counter: 0 });

		const id = generateId('test');
		expect(id).toBe('00000000-0000-4000-a000-000000000000');
	});

	it('should start from specified counter value', () => {
		seedIdGenerator({ counter: 5 });

		const id = generateId('test');
		expect(id).toBe('00000000-0000-4000-a000-000000000005');
	});

	it('should generate random UUIDs when not seeded', () => {
		seedIdGenerator(); // Reset to random mode

		const id1 = generateId();
		const id2 = generateId();

		// Should be valid UUIDs
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
		expect(id1).toMatch(uuidRegex);
		expect(id2).toMatch(uuidRegex);

		// Should be different (random)
		expect(id1).not.toBe(id2);
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

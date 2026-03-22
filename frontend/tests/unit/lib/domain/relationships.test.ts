import { describe, it, expect } from 'vitest';
import { getFkHint } from '$lib/domain/relationships';
import type { ObjectRelationship, ObjectFieldReference } from '$lib/types';

function makeRelationship(overrides: Partial<ObjectRelationship> = {}): ObjectRelationship {
	return {
		id: 'rel-1',
		sourceObjectId: 'obj-order',
		targetObjectId: 'obj-customer',
		name: 'customer',
		cardinality: 'references',
		isInferred: false,
		...overrides
	};
}

function makeFieldRef(fieldId: string): ObjectFieldReference {
	return { fieldId, isPk: false, exposure: 'read_write', nullable: false };
}

const fieldLookup = (fieldId: string) => {
	const map: Record<string, { name: string }> = {
		'f-customer-id': { name: 'customer_id' },
		'f-name': { name: 'name' },
		'f-email': { name: 'email' }
	};
	return map[fieldId];
};

describe('getFkHint', () => {
	describe('returns null (no hint shown)', () => {
		it('for inferred relationships', () => {
			const rel = makeRelationship({ isInferred: true });
			const fields = [makeFieldRef('f-customer-id')];

			expect(getFkHint(rel, fields, fieldLookup, true)).toBeNull();
		});

		it('for has_one cardinality', () => {
			const rel = makeRelationship({ cardinality: 'has_one' });

			expect(getFkHint(rel, [], fieldLookup, true)).toBeNull();
		});

		it('for has_many cardinality', () => {
			const rel = makeRelationship({ cardinality: 'has_many' });

			expect(getFkHint(rel, [], fieldLookup, true)).toBeNull();
		});

		it('for many_to_many cardinality', () => {
			const rel = makeRelationship({ cardinality: 'many_to_many' });

			expect(getFkHint(rel, [], fieldLookup, true)).toBeNull();
		});

		it('when target object does not exist', () => {
			const rel = makeRelationship();

			expect(getFkHint(rel, [], fieldLookup, false)).toBeNull();
		});

		it('for inferred references (the main bug fix)', () => {
			// This is the exact scenario from the bug: an inferred relationship
			// with cardinality "references" was incorrectly showing "missing customer_id"
			const rel = makeRelationship({ isInferred: true, cardinality: 'references' });
			const fields = [makeFieldRef('f-name')]; // no customer_id field

			expect(getFkHint(rel, fields, fieldLookup, true)).toBeNull();
		});
	});

	describe('returns hint for user-defined references', () => {
		it('shows hasFk=true when FK field exists', () => {
			const rel = makeRelationship({ name: 'customer', cardinality: 'references' });
			const fields = [makeFieldRef('f-customer-id'), makeFieldRef('f-name')];

			const hint = getFkHint(rel, fields, fieldLookup, true);

			expect(hint).toEqual({ hasFk: true, fkName: 'customer_id' });
		});

		it('shows hasFk=false when FK field is missing', () => {
			const rel = makeRelationship({ name: 'customer', cardinality: 'references' });
			const fields = [makeFieldRef('f-name'), makeFieldRef('f-email')];

			const hint = getFkHint(rel, fields, fieldLookup, true);

			expect(hint).toEqual({ hasFk: false, fkName: 'customer_id' });
		});

		it('derives FK name from relationship name', () => {
			const rel = makeRelationship({ name: 'author', cardinality: 'references' });
			const lookup = (id: string) =>
				id === 'f-author-id' ? { name: 'author_id' } : undefined;
			const fields = [makeFieldRef('f-author-id')];

			const hint = getFkHint(rel, fields, lookup, true);

			expect(hint).toEqual({ hasFk: true, fkName: 'author_id' });
		});

		it('returns hasFk=false when field lookup returns undefined', () => {
			const rel = makeRelationship({ name: 'customer', cardinality: 'references' });
			const fields = [makeFieldRef('f-unknown')];
			const emptyLookup = () => undefined;

			const hint = getFkHint(rel, fields, emptyLookup, true);

			expect(hint).toEqual({ hasFk: false, fkName: 'customer_id' });
		});

		it('works with empty fields array', () => {
			const rel = makeRelationship({ name: 'customer', cardinality: 'references' });

			const hint = getFkHint(rel, [], fieldLookup, true);

			expect(hint).toEqual({ hasFk: false, fkName: 'customer_id' });
		});
	});
});

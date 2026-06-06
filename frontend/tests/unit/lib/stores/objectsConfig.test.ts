// tests/unit/lib/stores/objectsConfig.test.ts
//
// Entity contract factory for objects.

import { describe, it, expect } from 'vitest';
import { newTempMemberId } from '$lib/domain/objectMembership';
import { createObjectsContract } from '$lib/stores/objectsConfig.svelte';
import type { ObjectDefinition } from '$lib/types';

function makeObject(overrides: Partial<ObjectDefinition> = {}): ObjectDefinition {
	return {
		id: 'obj-1',
		namespaceId: 'ns-1',
		name: 'Alpha',
		description: 'desc',
		members: [],
		derivedRelationships: [],
		validators: [],
		usedInApis: [],
		...overrides
	};
}

describe('objectsConfig', () => {
	it('builds an object entity contract', () => {
		const contract = createObjectsContract({
			getActiveNamespaceId: () => 'ns-1'
		});
		expect(contract.entityLabel).toBe('Object');
		expect(contract.nameKey).toBe('name');
	});
});

describe('objectsConfig.toUpdatePayload', () => {
	const contract = createObjectsContract({ getActiveNamespaceId: () => 'ns-1' });

	it('preserves backend ids verbatim and omits id on tmp-* members', () => {
		const backendId = '550e8400-e29b-41d4-a716-446655440000';
		const tmpId = newTempMemberId();
		const item = makeObject({
			members: [
				{
					memberType: 'field',
					id: backendId,
					name: 'existing',
					fieldId: 'f-1',
					role: 'writable',
					isNullable: false
				},
				{
					memberType: 'field',
					id: tmpId,
					name: 'fresh',
					fieldId: 'f-2',
					role: 'writable',
					isNullable: false
				}
			]
		});

		const result = contract.toUpdatePayload(item);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		const members = result.data.members!;
		expect(members).toHaveLength(2);
		expect(members[0]).toMatchObject({ id: backendId, name: 'existing' });
		expect(Object.hasOwn(members[1] as object, 'id')).toBe(false);
		expect(members[1]).toMatchObject({ name: 'fresh' });
	});

	it('omits id on every member when all are tmp-*', () => {
		const item = makeObject({
			members: [
				{
					memberType: 'field',
					id: newTempMemberId(),
					name: 'a',
					fieldId: 'f-1',
					role: 'writable',
					isNullable: false
				},
				{
					memberType: 'relationship',
					id: newTempMemberId(),
					name: 'rel',
					targetObjectId: 'obj-2',
					kind: 'one_to_many',
					inverseName: 'parent',
					required: true
				}
			]
		});

		const result = contract.toUpdatePayload(item);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		for (const m of result.data.members!) {
			expect(Object.hasOwn(m as object, 'id')).toBe(false);
		}
	});

	it('keeps every id when all members carry backend uuids', () => {
		const ids = ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'];
		const item = makeObject({
			members: ids.map((id) => ({
				memberType: 'field' as const,
				id,
				name: `m-${id.slice(0, 4)}`,
				fieldId: 'f-x',
				role: 'writable' as const,
				isNullable: false
			}))
		});

		const result = contract.toUpdatePayload(item);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.data.members!.map((m) => (m as { id?: string }).id)).toEqual(ids);
	});
});

describe('objectsConfig.toCreatePayload', () => {
	const contract = createObjectsContract({ getActiveNamespaceId: () => 'ns-1' });

	it('never emits an id on any member, regardless of input', () => {
		const item = makeObject({
			members: [
				{
					memberType: 'field',
					id: '550e8400-e29b-41d4-a716-446655440000',
					name: 'stowaway-backend-id',
					fieldId: 'f-1',
					role: 'writable',
					isNullable: false
				},
				{
					memberType: 'field',
					id: newTempMemberId(),
					name: 'tmp',
					fieldId: 'f-2',
					role: 'writable',
					isNullable: false
				}
			]
		});

		const result = contract.toCreatePayload(item);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		for (const m of result.data.members) {
			expect(Object.hasOwn(m as object, 'id')).toBe(false);
		}
	});
});

import { describe, expect, it } from 'vitest';
import type { Field, ObjectDefinition, ObjectMember } from '$lib/types';
import {
	TEMP_MEMBER_ID_PREFIX,
	getObjectMembersForCreate,
	getObjectMembersForUpdate,
	isTempMemberId,
	newTempMemberId,
	transitionObjectMembership,
	validateObjectMembership,
	type ObjectMembershipTransitionFacts
} from '$lib/domain/objectMembership';

const uuidField: Field = {
	id: 'field-id',
	namespaceId: 'ns-1',
	name: 'id',
	type: 'uuid',
	container: null,
	constraints: [],
	validators: [],
	usedInApis: []
};

const nameField: Field = {
	id: 'field-name',
	namespaceId: 'ns-1',
	name: 'name',
	type: 'str',
	container: null,
	constraints: [],
	validators: [],
	usedInApis: []
};

const createdAtField: Field = {
	id: 'field-created-at',
	namespaceId: 'ns-1',
	name: 'created_at',
	type: 'datetime',
	container: null,
	constraints: [],
	validators: [],
	usedInApis: []
};

const targetObject: Pick<ObjectDefinition, 'id' | 'name'> = {
	id: 'obj-order',
	name: 'PurchaseOrder'
};

function facts(overrides: Partial<ObjectMembershipTransitionFacts> = {}): ObjectMembershipTransitionFacts {
	return {
		sourceObjectName: 'UserAccount',
		fieldsById: new Map([
			[uuidField.id, uuidField],
			[nameField.id, nameField],
			[createdAtField.id, createdAtField]
		]),
		objectsById: new Map([[targetObject.id, targetObject]]),
		createMemberId: () => 'tmp-member',
		...overrides
	};
}

function fieldMember(overrides: Partial<ObjectMember> = {}): ObjectMember {
	return {
		memberType: 'field',
		id: 'member-id',
		name: 'id',
		fieldId: uuidField.id,
		role: 'pk',
		isNullable: false,
		...overrides
	} as ObjectMember;
}

describe('Object Membership temp member ids', () => {
	it('creates and identifies temp member ids', () => {
		const id = newTempMemberId();
		expect(id.startsWith(TEMP_MEMBER_ID_PREFIX)).toBe(true);
		expect(isTempMemberId(id)).toBe(true);
		expect(isTempMemberId('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
		expect(isTempMemberId(undefined)).toBe(false);
	});
});

describe('transitionObjectMembership', () => {
	it('adds the first Field Member as primary and later Field Members as writable', () => {
		const withPrimary = transitionObjectMembership(
			[],
			{ type: 'fieldMemberAdded', fieldId: uuidField.id },
			facts({ createMemberId: () => 'tmp-id' })
		);
		const withWritable = transitionObjectMembership(
			withPrimary,
			{ type: 'fieldMemberAdded', fieldId: nameField.id },
			facts({ createMemberId: () => 'tmp-name' })
		);

		expect(withPrimary[0]).toEqual({
			memberType: 'field',
			id: 'tmp-id',
			name: 'id',
			fieldId: uuidField.id,
			role: 'pk',
			isNullable: false
		});
		expect(withWritable[1]).toEqual({
			memberType: 'field',
			id: 'tmp-name',
			name: 'name',
			fieldId: nameField.id,
			role: 'writable',
			isNullable: false
		});
	});

	it('does not assign primary role to an incompatible first Field Member', () => {
		const result = transitionObjectMembership(
			[],
			{ type: 'fieldMemberAdded', fieldId: nameField.id },
			facts({ createMemberId: () => 'tmp-name' })
		);

		expect(result[0]).toEqual({
			memberType: 'field',
			id: 'tmp-name',
			name: 'name',
			fieldId: nameField.id,
			role: 'writable',
			isNullable: false
		});
	});

	it('does nothing when adding a missing Field', () => {
		const members = [fieldMember()];
		const result = transitionObjectMembership(members, { type: 'fieldMemberAdded', fieldId: 'missing' }, facts());

		expect(result).toBe(members);
	});

	it('clears other primary Field Members when setting a new primary', () => {
		const members: ObjectMember[] = [
			fieldMember({ id: 'member-id', fieldId: uuidField.id, role: 'pk' }),
			fieldMember({ id: 'member-name', name: 'name', fieldId: nameField.id, role: 'writable' })
		];

		const result = transitionObjectMembership(
			members,
			{ type: 'fieldMemberRoleChanged', memberId: 'member-name', role: 'pk' },
			facts()
		);

		expect(result).toEqual([
			expect.objectContaining({ id: 'member-id', role: 'writable' }),
			expect.objectContaining({ id: 'member-name', role: 'pk' })
		]);
	});

	it('clears modifiers when switching to a role that does not allow them', () => {
		const members = [
			fieldMember({
				role: 'writable',
				isNullable: true,
				defaultValue: 'abc'
			})
		];

		const result = transitionObjectMembership(
			members,
			{ type: 'fieldMemberRoleChanged', memberId: 'member-id', role: 'generated_uuid' },
			facts()
		);

		expect(result[0]).toEqual(
			expect.objectContaining({
				role: 'generated_uuid',
				isNullable: false,
				defaultValue: null
			})
		);
	});

	it('changes nullable and default value only for modifier roles', () => {
		const members = [fieldMember({ role: 'writable', isNullable: false, defaultValue: null })];

		const nullable = transitionObjectMembership(
			members,
			{ type: 'fieldMemberNullableToggled', memberId: 'member-id' },
			facts()
		);
		const withDefault = transitionObjectMembership(
			nullable,
			{ type: 'fieldMemberDefaultValueChanged', memberId: 'member-id', value: '  abc  ' },
			facts()
		);
		const nonModifier = transitionObjectMembership(
			withDefault,
			{ type: 'fieldMemberRoleChanged', memberId: 'member-id', role: 'pk' },
			facts()
		);
		const unchanged = transitionObjectMembership(
			nonModifier,
			{ type: 'fieldMemberDefaultValueChanged', memberId: 'member-id', value: 'ignored' },
			facts()
		);

		expect(withDefault[0]).toEqual(
			expect.objectContaining({
				isNullable: true,
				defaultValue: 'abc'
			})
		);
		expect(unchanged[0]).toEqual(
			expect.objectContaining({
				role: 'pk',
				defaultValue: null
			})
		);
	});

	it('adds a Relationship Member with snake_case draft names', () => {
		const result = transitionObjectMembership(
			[fieldMember()],
			{ type: 'relationshipMemberAdded', targetObjectId: targetObject.id },
			facts({ createMemberId: () => 'tmp-rel' })
		);

		expect(result[1]).toEqual({
			memberType: 'relationship',
			id: 'tmp-rel',
			name: 'purchase_order',
			targetObjectId: targetObject.id,
			kind: 'one_to_many',
			inverseName: 'user_account',
			required: true
		});
	});

	it('does not rename Relationship Members when kind changes', () => {
		const members: ObjectMember[] = [
			fieldMember(),
			{
				memberType: 'relationship',
				id: 'member-rel',
				name: 'custom_orders',
				targetObjectId: targetObject.id,
				kind: 'one_to_many',
				inverseName: 'custom_user',
				required: true
			}
		];

		const result = transitionObjectMembership(
			members,
			{ type: 'relationshipMemberKindChanged', memberId: 'member-rel', kind: 'one_to_one' },
			facts()
		);

		expect(result[1]).toEqual(
			expect.objectContaining({
				kind: 'one_to_one',
				name: 'custom_orders',
				inverseName: 'custom_user'
			})
		);
	});

	it('forces many-to-many Relationship Members to not required', () => {
		const members: ObjectMember[] = [
			fieldMember(),
			{
				memberType: 'relationship',
				id: 'member-rel',
				name: 'orders',
				targetObjectId: targetObject.id,
				kind: 'one_to_many',
				inverseName: 'user',
				required: true
			}
		];

		const result = transitionObjectMembership(
			members,
			{ type: 'relationshipMemberKindChanged', memberId: 'member-rel', kind: 'many_to_many' },
			facts()
		);
		const toggled = transitionObjectMembership(
			result,
			{ type: 'relationshipMemberRequiredToggled', memberId: 'member-rel' },
			facts()
		);

		expect(result[1]).toEqual(expect.objectContaining({ kind: 'many_to_many', required: false }));
		expect(toggled[1]).toEqual(expect.objectContaining({ kind: 'many_to_many', required: false }));
	});
});

describe('validateObjectMembership', () => {
	it('requires exactly one primary Field Member', () => {
		expect(validateObjectMembership([], facts())).toEqual({
			object_membership_primary: 'Object must have exactly one primary Field Member'
		});

		const errors = validateObjectMembership(
			[fieldMember({ id: 'member-id-1', role: 'pk' }), fieldMember({ id: 'member-id-2', role: 'pk' })],
			facts()
		);

		expect(errors.object_membership_primary).toBe('Object must have exactly one primary Field Member');
	});

	it('validates Field Member name, Field reference, and role compatibility', () => {
		const errors = validateObjectMembership(
			[
				fieldMember({ id: 'member-name', name: 'NotSnake', role: 'writable' }),
				fieldMember({ id: 'member-missing', name: 'missing', fieldId: 'missing', role: 'writable' }),
				fieldMember({ id: 'member-pk', name: 'name', fieldId: nameField.id, role: 'pk' })
			],
			facts()
		);

		expect(errors['member_member-name_name']).toBe('Must be snake_case (e.g. user_email)');
		expect(errors['member_member-missing_fieldId']).toBe('Field Member must reference an existing Field');
		expect(errors['member_member-pk_role']).toBe(
			'Field "name" (str) cannot be a primary key - only int and uuid types are supported'
		);
	});

	it('validates timestamp and generated uuid role compatibility', () => {
		const errors = validateObjectMembership(
			[
				fieldMember({ id: 'member-id', role: 'pk' }),
				fieldMember({ id: 'member-created', name: 'created_at', fieldId: nameField.id, role: 'created_timestamp' }),
				fieldMember({ id: 'member-uuid', name: 'token', fieldId: nameField.id, role: 'generated_uuid' })
			],
			facts()
		);

		expect(errors['member_member-created_role']).toBe(
			'Field "name" (str) cannot be a created timestamp - only datetime and date types are supported'
		);
		expect(errors['member_member-uuid_role']).toBe(
			'Field "name" (str) cannot be a generated UUID - only uuid types are supported'
		);
	});

	it('validates Relationship Member names, target Object, and many-to-many requiredness', () => {
		const errors = validateObjectMembership(
			[
				fieldMember(),
				{
					memberType: 'relationship',
					id: 'member-rel',
					name: 'BadName',
					targetObjectId: 'missing',
					kind: 'many_to_many',
					inverseName: '',
					required: true
				}
			],
			facts()
		);

		expect(errors['member_member-rel_name']).toBe('Must be snake_case (e.g. orders)');
		expect(errors['member_member-rel_inverseName']).toBe('Inverse Relationship Member name is required');
		expect(errors['member_member-rel_targetObjectId']).toBe(
			'Relationship Member must reference an existing target Object'
		);
		expect(errors['member_member-rel_required']).toBe('Many-to-many relationships cannot be required');
	});
});

describe('Object Membership save sanitation', () => {
	it('removes every member id for create payloads', () => {
		const result = getObjectMembersForCreate([
			fieldMember({ id: 'backend-id' }),
			{
				memberType: 'relationship',
				id: 'tmp-rel',
				name: 'orders',
				targetObjectId: targetObject.id,
				kind: 'one_to_many',
				inverseName: 'user',
				required: true
			}
		]);

		expect(result.every((member) => !Object.hasOwn(member as object, 'id'))).toBe(true);
	});

	it('preserves backend ids and strips temp ids for update payloads', () => {
		const result = getObjectMembersForUpdate([
			fieldMember({ id: 'backend-id' }),
			fieldMember({ id: 'tmp-local', name: 'name', fieldId: nameField.id, role: 'writable' })
		]);

		expect((result[0] as { id?: string }).id).toBe('backend-id');
		expect(Object.hasOwn(result[1] as object, 'id')).toBe(false);
	});
});

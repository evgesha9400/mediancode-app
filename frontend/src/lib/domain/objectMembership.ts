import type {
	Field,
	FieldMember,
	FieldRole,
	ObjectDefinition,
	ObjectMember,
	RelationshipKind,
	RelationshipMember
} from '$lib/types';
import { roleHasModifiers } from '$lib/types';
import { isValidSnakeCaseName } from '$lib/utils/validation';

// Sentinel prefix for client-generated member ids. The editor assigns these
// so DnD has a stable key; save payloads strip them so backend reconcile treats
// them as inserts.
export const TEMP_MEMBER_ID_PREFIX = 'tmp-';

export const newTempMemberId = (): string => TEMP_MEMBER_ID_PREFIX + crypto.randomUUID();

export const isTempMemberId = (id: string | undefined): boolean => id?.startsWith(TEMP_MEMBER_ID_PREFIX) ?? false;

export interface ObjectMembershipLookupFacts {
	sourceObjectName: string;
	fieldsById: ReadonlyMap<string, Field>;
	objectsById: ReadonlyMap<string, Pick<ObjectDefinition, 'id' | 'name'>>;
}

export interface ObjectMembershipTransitionFacts extends ObjectMembershipLookupFacts {
	createMemberId: () => string;
}

export type ObjectMembershipTransitionEvent =
	| { type: 'fieldMemberAdded'; fieldId: string }
	| { type: 'relationshipMemberAdded'; targetObjectId: string }
	| { type: 'memberRemoved'; memberId: string }
	| { type: 'membersReordered'; members: ObjectMember[] }
	| { type: 'fieldMemberNameChanged'; memberId: string; name: string }
	| { type: 'fieldMemberRoleChanged'; memberId: string; role: FieldRole }
	| { type: 'fieldMemberNullableToggled'; memberId: string }
	| { type: 'fieldMemberDefaultValueChanged'; memberId: string; value: string }
	| { type: 'relationshipMemberNameChanged'; memberId: string; name: string }
	| { type: 'relationshipMemberInverseNameChanged'; memberId: string; inverseName: string }
	| { type: 'relationshipMemberKindChanged'; memberId: string; kind: RelationshipKind }
	| { type: 'relationshipMemberRequiredToggled'; memberId: string };

export type ObjectMembershipValidationErrors = Record<string, string>;

export type ObjectMemberCreatePayload = Omit<FieldMember, 'id'> | Omit<RelationshipMember, 'id'>;

// Caller question: What members result after this Object Membership change?
export function transitionObjectMembership(
	members: ObjectMember[],
	event: ObjectMembershipTransitionEvent,
	facts: ObjectMembershipTransitionFacts
): ObjectMember[] {
	switch (event.type) {
		case 'fieldMemberAdded':
			return addFieldMember(members, event.fieldId, facts);
		case 'relationshipMemberAdded':
			return addRelationshipMember(members, event.targetObjectId, facts);
		case 'memberRemoved':
			return members.filter((member) => member.id !== event.memberId);
		case 'membersReordered':
			return event.members;
		case 'fieldMemberNameChanged':
			return updateFieldMember(members, event.memberId, (member) => ({ ...member, name: event.name }));
		case 'fieldMemberRoleChanged':
			return setFieldMemberRole(members, event.memberId, event.role);
		case 'fieldMemberNullableToggled':
			return updateFieldMember(members, event.memberId, (member) => {
				if (!roleHasModifiers(member.role)) return member;
				return { ...member, isNullable: !member.isNullable };
			});
		case 'fieldMemberDefaultValueChanged':
			return updateFieldMember(members, event.memberId, (member) => {
				if (!roleHasModifiers(member.role)) return member;
				return { ...member, defaultValue: event.value.trim() || null };
			});
		case 'relationshipMemberNameChanged':
			return updateRelationshipMember(members, event.memberId, (member) => ({ ...member, name: event.name }));
		case 'relationshipMemberInverseNameChanged':
			return updateRelationshipMember(members, event.memberId, (member) => ({
				...member,
				inverseName: event.inverseName
			}));
		case 'relationshipMemberKindChanged':
			return updateRelationshipMember(members, event.memberId, (member) => {
				const updated = { ...member, kind: event.kind };
				if (updated.kind === 'many_to_many') {
					return { ...updated, required: false };
				}
				return updated;
			});
		case 'relationshipMemberRequiredToggled':
			return updateRelationshipMember(members, event.memberId, (member) => {
				if (member.kind === 'many_to_many') return { ...member, required: false };
				return { ...member, required: !member.required };
			});
	}
}

// Caller question: What Object Membership errors block saving this Object?
export function validateObjectMembership(
	members: ObjectMember[],
	facts: ObjectMembershipLookupFacts
): ObjectMembershipValidationErrors {
	const errors: ObjectMembershipValidationErrors = {};
	const primaryMembers = members.filter(
		(member): member is FieldMember => member.memberType === 'field' && member.role === 'pk'
	);

	if (primaryMembers.length !== 1) {
		errors.object_membership_primary = 'Object must have exactly one primary Field Member';
	}

	for (const [index, member] of members.entries()) {
		if (member.memberType === 'field') {
			addFieldMemberErrors(errors, member, index, facts);
		} else {
			addRelationshipMemberErrors(errors, member, index, facts);
		}
	}

	return errors;
}

// Caller question: Which Object Members should be sent when creating an Object?
export function getObjectMembersForCreate(members: ObjectMember[]): ObjectMemberCreatePayload[] {
	return members.map(removeMemberId);
}

// Caller question: Which Object Members should be sent when updating an Object?
export function getObjectMembersForUpdate(members: ObjectMember[]): ObjectMember[] {
	return members.map((member) => {
		if (isTempMemberId(member.id)) return removeMemberId(member) as ObjectMember;
		return { ...member };
	});
}

function addFieldMember(
	members: ObjectMember[],
	fieldId: string,
	facts: ObjectMembershipTransitionFacts
): ObjectMember[] {
	const field = facts.fieldsById.get(fieldId);
	if (!field) return members;

	const role: FieldRole = !hasPrimaryFieldMember(members) && canFieldUseRole(field, 'pk') ? 'pk' : 'writable';
	const newMember: FieldMember = {
		memberType: 'field',
		id: facts.createMemberId(),
		name: field.name,
		fieldId,
		role,
		isNullable: false
	};

	return [...members, newMember];
}

function addRelationshipMember(
	members: ObjectMember[],
	targetObjectId: string,
	facts: ObjectMembershipTransitionFacts
): ObjectMember[] {
	const targetObject = facts.objectsById.get(targetObjectId);
	if (!targetObject) return members;

	const newMember: RelationshipMember = {
		memberType: 'relationship',
		id: facts.createMemberId(),
		name: toSnakeCaseNameSuggestion(targetObject.name),
		targetObjectId,
		kind: 'one_to_many',
		inverseName: toSnakeCaseNameSuggestion(facts.sourceObjectName) || 'source',
		required: true
	};

	return [...members, newMember];
}

function setFieldMemberRole(members: ObjectMember[], memberId: string, role: FieldRole): ObjectMember[] {
	const updatedMembers = members.map((member) => {
		if (member.id !== memberId || member.memberType !== 'field') return member;
		return applyFieldRole(member, role);
	});

	if (role !== 'pk') return updatedMembers;

	return updatedMembers.map((member) => {
		if (member.id === memberId || member.memberType !== 'field' || member.role !== 'pk') {
			return member;
		}
		return applyFieldRole(member, 'writable');
	});
}

function applyFieldRole(member: FieldMember, role: FieldRole): FieldMember {
	const updated = { ...member, role };
	if (roleHasModifiers(role)) return updated;
	return { ...updated, isNullable: false, defaultValue: null };
}

function updateFieldMember(
	members: ObjectMember[],
	memberId: string,
	update: (member: FieldMember) => FieldMember
): ObjectMember[] {
	return members.map((member) => {
		if (member.id !== memberId || member.memberType !== 'field') return member;
		return update(member);
	});
}

function updateRelationshipMember(
	members: ObjectMember[],
	memberId: string,
	update: (member: RelationshipMember) => RelationshipMember
): ObjectMember[] {
	return members.map((member) => {
		if (member.id !== memberId || member.memberType !== 'relationship') return member;
		return update(member);
	});
}

function addFieldMemberErrors(
	errors: ObjectMembershipValidationErrors,
	member: FieldMember,
	index: number,
	facts: ObjectMembershipLookupFacts
): void {
	const prefix = getMemberErrorPrefix(member, index);
	if (!member.name.trim()) {
		errors[`${prefix}_name`] = 'Field Member name is required';
	} else if (!isValidSnakeCaseName(member.name)) {
		errors[`${prefix}_name`] = 'Must be snake_case (e.g. user_email)';
	}

	const field = facts.fieldsById.get(member.fieldId);
	if (!field) {
		errors[`${prefix}_fieldId`] = 'Field Member must reference an existing Field';
		return;
	}

	const roleError = getFieldRoleTypeError(member.role, field);
	if (roleError) {
		errors[`${prefix}_role`] = roleError;
	}
}

function addRelationshipMemberErrors(
	errors: ObjectMembershipValidationErrors,
	member: RelationshipMember,
	index: number,
	facts: ObjectMembershipLookupFacts
): void {
	const prefix = getMemberErrorPrefix(member, index);
	if (!member.name.trim()) {
		errors[`${prefix}_name`] = 'Relationship Member name is required';
	} else if (!isValidSnakeCaseName(member.name)) {
		errors[`${prefix}_name`] = 'Must be snake_case (e.g. orders)';
	}

	if (!member.inverseName.trim()) {
		errors[`${prefix}_inverseName`] = 'Inverse Relationship Member name is required';
	} else if (!isValidSnakeCaseName(member.inverseName)) {
		errors[`${prefix}_inverseName`] = 'Must be snake_case (e.g. user)';
	}

	if (!facts.objectsById.has(member.targetObjectId)) {
		errors[`${prefix}_targetObjectId`] = 'Relationship Member must reference an existing target Object';
	}

	if (member.kind === 'many_to_many' && member.required) {
		errors[`${prefix}_required`] = 'Many-to-many relationships cannot be required';
	}
}

function getFieldRoleTypeError(role: FieldRole, field: Field): string {
	if (role === 'pk' && !['int', 'uuid', 'uuid.UUID'].includes(field.type)) {
		return `Field "${field.name}" (${field.type}) cannot be a primary key - only int and uuid types are supported`;
	}

	if (
		(role === 'created_timestamp' || role === 'updated_timestamp') &&
		!['datetime', 'date', 'datetime.datetime', 'datetime.date'].includes(field.type)
	) {
		const timestampKind = role === 'created_timestamp' ? 'created' : 'updated';
		return `Field "${field.name}" (${field.type}) cannot be a ${timestampKind} timestamp - only datetime and date types are supported`;
	}

	if (role === 'generated_uuid' && !['uuid', 'uuid.UUID'].includes(field.type)) {
		return `Field "${field.name}" (${field.type}) cannot be a generated UUID - only uuid types are supported`;
	}

	return '';
}

function canFieldUseRole(field: Field, role: FieldRole): boolean {
	return getFieldRoleTypeError(role, field) === '';
}

function getMemberErrorPrefix(member: ObjectMember, index: number): string {
	return `member_${member.id ?? index}`;
}

function hasPrimaryFieldMember(members: ObjectMember[]): boolean {
	return members.some((member) => member.memberType === 'field' && member.role === 'pk');
}

function removeMemberId(member: ObjectMember): ObjectMemberCreatePayload {
	const { id: _id, ...rest } = member;
	return rest as ObjectMemberCreatePayload;
}

function toSnakeCaseNameSuggestion(value: string): string {
	return value
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[\s-]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '')
		.toLowerCase();
}

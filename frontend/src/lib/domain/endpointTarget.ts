import type { ApiEndpoint, Field, ObjectDefinition } from '$lib/types';
import type { EndpointTargetFieldMember } from './paramInference';

export type EndpointTarget =
	| {
			status: 'missing';
			objectId: string | undefined;
			objectName?: undefined;
			fieldMembers: EndpointTargetFieldMember[];
		}
	| {
			status: 'found';
			objectId: string;
			objectName: string;
			fieldMembers: EndpointTargetFieldMember[];
		};

// Caller question: Which Object and Field Members can this Endpoint reference?
export function getEndpointTarget(
	endpoint: Pick<ApiEndpoint, 'targetObjectId'>,
	objects: ObjectDefinition[],
	fields: Field[]
): EndpointTarget {
	const objectId = endpoint.targetObjectId;
	if (!objectId) {
		return { status: 'missing', objectId, fieldMembers: [] };
	}

	const object = objects.find(candidate => candidate.id === objectId);
	if (!object) {
		return { status: 'missing', objectId, fieldMembers: [] };
	}

	const fieldMembers: EndpointTargetFieldMember[] = [];
	for (const member of object.members) {
		if (member.memberType !== 'field') continue;
		const field = fields.find(candidate => candidate.id === member.fieldId);
		if (!field) continue;
		fieldMembers.push({
			id: member.id ?? '',
			name: member.name,
			type: field.type,
			isPrimary: member.role === 'pk'
		});
	}

	return {
		status: 'found',
		objectId: object.id,
		objectName: object.name,
		fieldMembers
	};
}

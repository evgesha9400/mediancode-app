import { describe, expect, it } from 'vitest';
import { getEndpointTarget } from '$lib/domain/endpointTarget';
import type { ApiEndpoint, Field, ObjectDefinition } from '$lib/types';

function makeEndpoint(targetObjectId: string | undefined): Pick<ApiEndpoint, 'targetObjectId'> {
	return { targetObjectId };
}

describe('getEndpointTarget', () => {
	const fields: Field[] = [
		{ id: 'f-1', namespaceId: 'ns', name: 'id', type: 'uuid', container: null, constraints: [], validators: [], usedInApis: [] },
		{ id: 'f-2', namespaceId: 'ns', name: 'price', type: 'float', container: null, constraints: [], validators: [], usedInApis: [] },
		{ id: 'f-3', namespaceId: 'ns', name: 'name', type: 'str', container: null, constraints: [], validators: [], usedInApis: [] }
	];

	const objects: ObjectDefinition[] = [
		{
			id: 'obj-1', namespaceId: 'ns', name: 'Product',
			members: [
				{ memberType: 'field', id: 'fm-id', name: 'id', fieldId: 'f-1', role: 'pk', isNullable: false },
				{ memberType: 'field', id: 'fm-price', name: 'price', fieldId: 'f-2', role: 'writable', isNullable: false },
				{ memberType: 'field', id: 'fm-name', name: 'name', fieldId: 'f-3', role: 'writable', isNullable: true }
			],
			derivedRelationships: [], validators: [], usedInApis: []
		}
	];

	it('returns the selected Object and its Field Members', () => {
		const result = getEndpointTarget(makeEndpoint('obj-1'), objects, fields);
		expect(result).toEqual({
			status: 'found',
			objectId: 'obj-1',
			objectName: 'Product',
			fieldMembers: [
				{ id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true },
				{ id: 'fm-price', name: 'price', type: 'float', isPrimary: false },
				{ id: 'fm-name', name: 'name', type: 'str', isPrimary: false }
			]
		});
	});

	it('returns missing when no Object is selected', () => {
		const result = getEndpointTarget(makeEndpoint(undefined), objects, fields);
		expect(result).toEqual({ status: 'missing', objectId: undefined, fieldMembers: [] });
	});

	it('returns missing when the selected Object cannot be found', () => {
		const result = getEndpointTarget(makeEndpoint('unknown'), objects, fields);
		expect(result).toEqual({ status: 'missing', objectId: 'unknown', fieldMembers: [] });
	});

	it('skips Field Members whose Field cannot be resolved', () => {
		const sparseObjects: ObjectDefinition[] = [
			{
				id: 'obj-2', namespaceId: 'ns', name: 'Sparse',
				members: [
					{ memberType: 'field', id: 'fm-id', name: 'id', fieldId: 'f-1', role: 'pk', isNullable: false },
					{ memberType: 'field', id: 'fm-missing', name: 'missing_field', fieldId: 'f-missing', role: 'writable', isNullable: false }
				],
				derivedRelationships: [], validators: [], usedInApis: []
			}
		];
		const result = getEndpointTarget(makeEndpoint('obj-2'), sparseObjects, fields);
		expect(result.fieldMembers).toEqual([{ id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true }]);
	});

	it('skips Relationship Members', () => {
		const mixedObjects: ObjectDefinition[] = [
			{
				id: 'obj-3', namespaceId: 'ns', name: 'Mixed',
				members: [
					{ memberType: 'field', id: 'fm-id', name: 'id', fieldId: 'f-1', role: 'pk', isNullable: false },
					{ memberType: 'relationship', name: 'orders', targetObjectId: 'o-2', kind: 'one_to_many', inverseName: 'product', required: true }
				],
				derivedRelationships: [], validators: [], usedInApis: []
			}
		];
		const result = getEndpointTarget(makeEndpoint('obj-3'), mixedObjects, fields);
		expect(result.fieldMembers).toEqual([{ id: 'fm-id', name: 'id', type: 'uuid', isPrimary: true }]);
	});
});

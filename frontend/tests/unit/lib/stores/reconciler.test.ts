import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { objectsStore } from '$lib/stores/objects';
import { fieldsStore } from '$lib/stores/fields';
import { applyGraphMutation } from '$lib/stores/reconciler';
import type { GraphMutationResult, ObjectDefinition, Field } from '$lib/types';
import { GLOBAL_NAMESPACE_ID } from '$lib/constants';

// Helper to create an object definition for seeding the store
function makeObject(overrides: Partial<ObjectDefinition> & { id: string; name: string }): ObjectDefinition {
	return {
		namespaceId: GLOBAL_NAMESPACE_ID,
		description: '',
		fields: [],
		relationships: [],
		validators: [],
		usedInApis: [],
		...overrides
	};
}

// Helper to create a field for seeding the store
function makeField(overrides: Partial<Field> & { id: string; name: string; type: string }): Field {
	return {
		namespaceId: GLOBAL_NAMESPACE_ID,
		container: null,
		description: '',
		defaultValue: '',
		constraints: [],
		validators: [],
		usedInApis: [],
		...overrides
	};
}

describe('reconciler - applyGraphMutation', () => {
	beforeEach(() => {
		objectsStore.set([]);
		fieldsStore.set([]);
	});

	it('should upsert updated objects into objectsStore', () => {
		const existingObj = makeObject({ id: 'o-1', name: 'User' });
		const updatedObj = makeObject({ id: 'o-1', name: 'User', description: 'Updated description' });

		objectsStore.set([existingObj]);

		const mutation: GraphMutationResult = {
			updatedObjects: [updatedObj],
			createdFields: [],
			deletedFieldIds: []
		};

		applyGraphMutation(mutation);

		const objects = get(objectsStore);
		expect(objects).toHaveLength(1);
		expect(objects[0].description).toBe('Updated description');
	});

	it('should add new fields to fieldsStore', () => {
		const newField = makeField({ id: 'f-1', name: 'user_id', type: 'int' });

		const mutation: GraphMutationResult = {
			updatedObjects: [],
			createdFields: [newField],
			deletedFieldIds: []
		};

		applyGraphMutation(mutation);

		const fields = get(fieldsStore);
		expect(fields).toHaveLength(1);
		expect(fields[0].name).toBe('user_id');
	});

	it('should remove deleted fields from fieldsStore', () => {
		const field1 = makeField({ id: 'f-1', name: 'user_id', type: 'int' });
		const field2 = makeField({ id: 'f-2', name: 'email', type: 'str' });

		fieldsStore.set([field1, field2]);

		const mutation: GraphMutationResult = {
			updatedObjects: [],
			createdFields: [],
			deletedFieldIds: ['f-1']
		};

		applyGraphMutation(mutation);

		const fields = get(fieldsStore);
		expect(fields).toHaveLength(1);
		expect(fields[0].id).toBe('f-2');
	});

	it('should handle empty mutation result as no-op', () => {
		const existingObj = makeObject({ id: 'o-1', name: 'User' });
		const existingField = makeField({ id: 'f-1', name: 'email', type: 'str' });

		objectsStore.set([existingObj]);
		fieldsStore.set([existingField]);

		const mutation: GraphMutationResult = {
			updatedObjects: [],
			createdFields: [],
			deletedFieldIds: []
		};

		applyGraphMutation(mutation);

		expect(get(objectsStore)).toHaveLength(1);
		expect(get(fieldsStore)).toHaveLength(1);
	});

	it('should not duplicate fields that already exist', () => {
		const existingField = makeField({ id: 'f-1', name: 'user_id', type: 'int' });

		fieldsStore.set([existingField]);

		const mutation: GraphMutationResult = {
			updatedObjects: [],
			createdFields: [existingField],
			deletedFieldIds: []
		};

		applyGraphMutation(mutation);

		const fields = get(fieldsStore);
		expect(fields).toHaveLength(1);
	});

	it('should not affect objects not in the mutation result', () => {
		const obj1 = makeObject({ id: 'o-1', name: 'User' });
		const obj2 = makeObject({ id: 'o-2', name: 'Product' });
		const updatedObj1 = makeObject({ id: 'o-1', name: 'User', description: 'Updated' });

		objectsStore.set([obj1, obj2]);

		const mutation: GraphMutationResult = {
			updatedObjects: [updatedObj1],
			createdFields: [],
			deletedFieldIds: []
		};

		applyGraphMutation(mutation);

		const objects = get(objectsStore);
		expect(objects).toHaveLength(2);
		expect(objects[0].description).toBe('Updated');
		expect(objects[1].name).toBe('Product');
		expect(objects[1].description).toBe('');
	});

	it('should handle delete and create fields in the same mutation', () => {
		const oldField = makeField({ id: 'f-old', name: 'old_fk', type: 'int' });
		const keptField = makeField({ id: 'f-kept', name: 'email', type: 'str' });
		const newField = makeField({ id: 'f-new', name: 'new_fk', type: 'uuid' });

		fieldsStore.set([oldField, keptField]);

		const mutation: GraphMutationResult = {
			updatedObjects: [],
			createdFields: [newField],
			deletedFieldIds: ['f-old']
		};

		applyGraphMutation(mutation);

		const fields = get(fieldsStore);
		expect(fields).toHaveLength(2);
		expect(fields.map(f => f.id).sort()).toEqual(['f-kept', 'f-new']);
	});

	it('should update multiple objects simultaneously', () => {
		const obj1 = makeObject({ id: 'o-1', name: 'User', relationships: [] });
		const obj2 = makeObject({ id: 'o-2', name: 'Order', relationships: [] });

		objectsStore.set([obj1, obj2]);

		const updatedObj1 = makeObject({
			id: 'o-1',
			name: 'User',
			relationships: [{ id: 'r-1', sourceObjectId: 'o-1', targetObjectId: 'o-2', name: 'orders', cardinality: 'has_many', isInferred: false }]
		});
		const updatedObj2 = makeObject({
			id: 'o-2',
			name: 'Order',
			relationships: [{ id: 'r-2', sourceObjectId: 'o-2', targetObjectId: 'o-1', name: 'user', cardinality: 'references', isInferred: true }]
		});

		const mutation: GraphMutationResult = {
			updatedObjects: [updatedObj1, updatedObj2],
			createdFields: [],
			deletedFieldIds: []
		};

		applyGraphMutation(mutation);

		const objects = get(objectsStore);
		expect(objects[0].relationships).toHaveLength(1);
		expect(objects[0].relationships[0].name).toBe('orders');
		expect(objects[1].relationships).toHaveLength(1);
		expect(objects[1].relationships[0].name).toBe('user');
	});
});

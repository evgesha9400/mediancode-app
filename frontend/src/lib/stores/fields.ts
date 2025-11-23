import { writable } from 'svelte/store';
import type { PrimitiveTypeName } from './types';
import { checkFieldDeletion } from '$lib/utils/references';
import type { DeletionResult } from '$lib/types';

export interface FieldValidator {
	name: string;
	params?: Record<string, any>;
}

export interface Field {
	id: string;
	name: string;
	type: PrimitiveTypeName;
	description?: string;
	defaultValue?: string;
	validators: FieldValidator[];
	usedInApis: string[];
}

const initialFields: Field[] = [
	{
		id: 'field-1',
		name: 'email',
		type: 'str',
		description: 'User email address',
		defaultValue: '',
		validators: [
			{ name: 'max_length', params: { value: 255 } },
			{ name: 'email_format' }
		],
		usedInApis: []
	},
	{
		id: 'field-2',
		name: 'username',
		type: 'str',
		description: 'Unique username for the user account',
		defaultValue: '',
		validators: [
			{ name: 'min_length', params: { value: 3 } },
			{ name: 'max_length', params: { value: 50 } }
		],
		usedInApis: []
	},
	{
		id: 'field-3',
		name: 'password',
		type: 'str',
		description: 'Encrypted user password',
		defaultValue: '',
		validators: [
			{ name: 'min_length', params: { value: 8 } },
			{ name: 'max_length', params: { value: 128 } }
		],
		usedInApis: []
	},
	{
		id: 'field-4',
		name: 'user_id',
		type: 'uuid',
		description: 'Unique identifier for user',
		defaultValue: 'uuid.uuid4()',
		validators: [],
		usedInApis: []
	},
	{
		id: 'field-5',
		name: 'created_at',
		type: 'datetime',
		description: 'Timestamp when the record was created',
		defaultValue: 'datetime.now()',
		validators: [],
		usedInApis: []
	},
	{
		id: 'field-6',
		name: 'updated_at',
		type: 'datetime',
		description: 'Timestamp when the record was last updated',
		defaultValue: 'datetime.now()',
		validators: [],
		usedInApis: []
	},
	{
		id: 'field-7',
		name: 'price',
		type: 'float',
		description: 'Product or service price',
		defaultValue: '0.0',
		validators: [],
		usedInApis: []
	},
	{
		id: 'field-8',
		name: 'status',
		type: 'str',
		description: 'Current status of the entity',
		defaultValue: "'active'",
		validators: [],
		usedInApis: []
	},
	{
		id: 'field-9',
		name: 'website',
		type: 'str',
		description: 'Company website URL',
		defaultValue: '',
		validators: [
			{ name: 'min_length', params: { value: 5 } },
			{ name: 'max_length', params: { value: 255 } },
			{ name: 'url_format' }
		],
		usedInApis: []
	},
	{
		id: 'field-10',
		name: 'phone',
		type: 'str',
		description: 'Contact phone number',
		defaultValue: '',
		validators: [
			{ name: 'phone_number' }
		],
		usedInApis: []
	}
];

export const fieldsStore = writable<Field[]>(initialFields);

export function getFieldById(id: string): Field | undefined {
	let result: Field | undefined;
	fieldsStore.subscribe(fields => {
		result = fields.find(f => f.id === id);
	})();
	return result;
}

export function getTotalFieldCount(): number {
	let count = 0;
	fieldsStore.subscribe(fields => {
		count = fields.length;
	})();
	return count;
}

export function getTotalApiCount(): number {
	let apiCount = 0;
	fieldsStore.subscribe(fields => {
		// Collect all unique API IDs from all fields
		const uniqueApis = new Set<string>();
		fields.forEach(field => {
			field.usedInApis.forEach(apiId => {
				uniqueApis.add(apiId);
			});
		});
		apiCount = uniqueApis.size;
	})();
	return apiCount;
}

export function searchFields(fields: Field[], query: string): Field[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return fields;
	}

	return fields.filter(field =>
		field.name.toLowerCase().includes(lowerQuery) ||
		field.type.toLowerCase().includes(lowerQuery) ||
		field.description?.toLowerCase().includes(lowerQuery) ||
		field.validators.some(v => v.name.toLowerCase().includes(lowerQuery))
	);
}

export function updateField(id: string, updates: Partial<Field>): void {
	fieldsStore.update(fields => {
		return fields.map(field =>
			field.id === id ? { ...field, ...updates } : field
		);
	});
}

/**
 * Delete a field by ID
 * Checks for API references before deletion to prevent breaking API dependencies
 *
 * @param id - The ID of the field to delete
 * @returns DeletionResult - Contains success status and error message if blocked by references
 */
export function deleteField(id: string): DeletionResult {
	// Reuse centralized getFieldById helper
	const fieldToDelete = getFieldById(id);

	if (!fieldToDelete) {
		return {
			success: false,
			error: `Field with ID "${id}" not found.`
		};
	}

	// Check if field can be safely deleted
	const deletionCheck = checkFieldDeletion(fieldToDelete.name, fieldToDelete.usedInApis);

	if (!deletionCheck.success) {
		return deletionCheck;
	}

	// Remove the field from the store
	fieldsStore.update(fields => {
		return fields.filter(field => field.id !== id);
	});

	return { success: true };
}

export function addField(field: Field): void {
	fieldsStore.update(fields => {
		return [...fields, field];
	});
}

/**
 * Fixture Validation Script
 * 
 * Validates that all fixtures maintain data integrity and consistency.
 * Run with: npm run test:fixtures:validate
 */

import {
	mockUsers,
	mockFields,
	mockValidators,
	mockTypes,
	mockApis,
	mockPermissions,
	mockRoles
} from './index';

interface ValidationError {
	entity: string;
	id: string;
	field: string;
	message: string;
}

const errors: ValidationError[] = [];

function addError(entity: string, id: string, field: string, message: string) {
	errors.push({ entity, id, field, message });
}

// Validate uniqueness
function validateUniqueness<T extends { id: string }>(
	entities: T[],
	entityName: string,
	field: keyof T = 'id' as keyof T
) {
	const values = entities.map((e) => e[field]);
	const duplicates = values.filter((v, i) => values.indexOf(v) !== i);

	if (duplicates.length > 0) {
		duplicates.forEach((dup) => {
			const entity = entities.find((e) => e[field] === dup);
			if (entity) {
				addError(entityName, entity.id, field as string, 'Duplicate value: ' + dup);
			}
		});
	}
}

// Validate field-validator compatibility
function validateFieldValidators() {
	mockFields.forEach((field) => {
		const fieldType = mockTypes.find((t) => t.name === field.type);
		if (!fieldType) {
			addError('Field', field.id, 'type', 'Type not found: ' + field.type);
			return;
		}

		field.validators.forEach((fv) => {
			const validator = mockValidators.find((v) => v.name === fv.name);
			if (!validator) {
				addError('Field', field.id, 'validators', 'Validator not found: ' + fv.name);
				return;
			}

			// Check category compatibility
			if (!fieldType.validatorCategories.includes(validator.category)) {
				addError(
					'Field',
					field.id,
					'validators',
					'Validator incompatible: ' + fv.name
				);
			}
		});
	});
}

// Validate field-API relationships
function validateFieldApiRelationships() {
	mockFields.forEach((field) => {
		field.usedInApis.forEach((apiId) => {
			const api = mockApis.find((a) => a.id === apiId);
			if (!api) {
				addError('Field', field.id, 'usedInApis', 'API not found: ' + apiId);
			} else if (!api.usedFields.includes(field.id)) {
				addError('Field', field.id, 'usedInApis', 'API does not reference field');
			}
		});
	});

	mockApis.forEach((api) => {
		api.usedFields.forEach((fieldId) => {
			const field = mockFields.find((f) => f.id === fieldId);
			if (!field) {
				addError('ApiEndpoint', api.id, 'usedFields', 'Field not found: ' + fieldId);
			} else if (!field.usedInApis.includes(api.id)) {
				addError('ApiEndpoint', api.id, 'usedFields', 'Field does not reference API');
			}
		});
	});
}

// Validate role-permission relationships
function validateRolePermissions() {
	mockRoles.forEach((role) => {
		role.permissions.forEach((permId) => {
			const permission = mockPermissions.find((p) => p.id === permId);
			if (!permission) {
				addError('Role', role.id, 'permissions', 'Permission not found: ' + permId);
			}
		});
	});
}

// Validate uniqueness by name for entities without ID
function validateUniquenessByName<T extends { name: string }>(
	entities: T[],
	entityName: string
) {
	const names = entities.map((e) => e.name);
	const duplicates = names.filter((v, i) => names.indexOf(v) !== i);

	if (duplicates.length > 0) {
		duplicates.forEach((dup) => {
			addError(entityName, dup, 'name', 'Duplicate name: ' + dup);
		});
	}
}

// Run all validations
function validate() {
	console.log('Validating fixtures...');

	// Entities with IDs
	validateUniqueness(mockUsers, 'User');
	validateUniqueness(mockFields, 'Field');
	validateUniqueness(mockApis, 'ApiEndpoint');
	validateUniqueness(mockPermissions, 'Permission');
	validateUniqueness(mockRoles, 'Role');

	// Entities identified by name
	validateUniquenessByName(mockValidators, 'Validator');
	validateUniquenessByName(mockTypes, 'Type');

	// Relationship checks
	validateFieldValidators();
	validateFieldApiRelationships();
	validateRolePermissions();

	if (errors.length === 0) {
		console.log('All fixtures are valid!');
		process.exit(0);
	} else {
		console.error('Found ' + errors.length + ' validation errors');
		errors.forEach((error) => {
			console.error('  [' + error.entity + ':' + error.id + '] ' + error.field + ': ' + error.message);
		});
		process.exit(1);
	}
}

validate();

/**
 * Fixture Validation Script
 *
 * Validates that all fixtures maintain data integrity and consistency.
 * Run with: bun run test:fixtures:validate
 */

import {
	mockUsers,
	mockFields,
	mockFieldConstraints,
	mockTypes,
	mockPermissions,
	mockRoles,
	mockFieldValidators,
	mockModelValidators
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

// Validate field-constraint compatibility
function validateFieldConstraints() {
	mockFields.forEach((field) => {
		const fieldType = mockTypes.find((t) => t.name === field.type);
		if (!fieldType) {
			addError('Field', field.id, 'type', 'Type not found: ' + field.type);
			return;
		}

		field.constraints.forEach((fc) => {
			const fieldConstraint = mockFieldConstraints.find((c) => c.name === fc.name);
			if (!fieldConstraint) {
				addError('Field', field.id, 'constraints', 'Field constraint not found: ' + fc.name);
				return;
			}

			// Check type compatibility using compatibleTypes array
			if (!fieldConstraint.compatibleTypes.includes(fieldType.name)) {
				addError(
					'Field',
					field.id,
					'constraints',
					'Field constraint incompatible: ' + fc.name
				);
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

// Validate field validators
function validateFieldValidators() {
	mockFieldValidators.forEach((fv) => {
		if (!fv.mode || !['before', 'after'].includes(fv.mode)) {
			addError('FieldValidator', fv.id, 'mode', 'Invalid mode: ' + fv.mode);
		}
		if (!fv.code || fv.code.trim().length === 0) {
			addError('FieldValidator', fv.id, 'code', 'Code must not be empty');
		}
		if (!fv.compatibleTypes || fv.compatibleTypes.length === 0) {
			addError('FieldValidator', fv.id, 'compatibleTypes', 'Must have at least one compatible type');
		}
	});
}

// Validate model validators
function validateModelValidators() {
	mockModelValidators.forEach((mv) => {
		if (!mv.mode || !['before', 'after'].includes(mv.mode)) {
			addError('ModelValidator', mv.id, 'mode', 'Invalid mode: ' + mv.mode);
		}
		if (!mv.code || mv.code.trim().length === 0) {
			addError('ModelValidator', mv.id, 'code', 'Code must not be empty');
		}
		if (!mv.requiredFields || mv.requiredFields.length === 0) {
			addError('ModelValidator', mv.id, 'requiredFields', 'Must have at least one required field');
		}
	});
}

// Run all validations
function validate() {
	console.log('Validating fixtures...');

	// Entities with IDs
	validateUniqueness(mockUsers, 'User');
	validateUniqueness(mockFields, 'Field');
	validateUniqueness(mockPermissions, 'Permission');
	validateUniqueness(mockRoles, 'Role');
	validateUniqueness(mockFieldValidators, 'FieldValidator');
	validateUniqueness(mockModelValidators, 'ModelValidator');

	// Entities identified by name
	validateUniquenessByName(mockFieldConstraints, 'FieldConstraint');
	validateUniquenessByName(mockTypes, 'Type');

	// Name uniqueness for validators (also have IDs but names should be unique)
	validateUniquenessByName(mockFieldValidators, 'FieldValidator');
	validateUniquenessByName(mockModelValidators, 'ModelValidator');

	// Relationship checks
	validateFieldConstraints();
	validateRolePermissions();
	validateFieldValidators();
	validateModelValidators();

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

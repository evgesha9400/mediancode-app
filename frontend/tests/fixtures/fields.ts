/**
 * Field Fixtures
 *
 * Mock field data for testing field registry features.
 *
 * IMPORTANT: This module now imports from the centralized initialData module
 * to ensure consistency between runtime stores and test fixtures.
 *
 * Single source of truth: src/lib/stores/initialData.ts
 */

import { initialFields, cloneFields, type Field, type FieldValidator } from '../../src/lib/stores/initialData';
import type { PrimitiveTypeName } from './types';

// Re-export types from centralized module
export type { Field, FieldValidator } from '../../src/lib/stores/initialData';

/**
 * Mock fields - uses centralized data
 * We clone the data to ensure test isolation
 */
export const mockFields = cloneFields(initialFields);

/**
 * Get a field by ID
 */
export function getFieldById(id: string): Field | undefined {
	return mockFields.find((field) => field.id === id);
}

/**
 * Get a field by name
 */
export function getFieldByName(name: string): Field | undefined {
	return mockFields.find((field) => field.name === name);
}

/**
 * Get fields by type
 */
export function getFieldsByType(type: PrimitiveTypeName): Field[] {
	return mockFields.filter((field) => field.type === type);
}

/**
 * Get fields used in a specific API
 */
export function getFieldsUsedInApi(apiId: string): Field[] {
	return mockFields.filter((field) => field.usedInApis.includes(apiId));
}

/**
 * Get fields that have no API usage
 */
export function getUnusedFields(): Field[] {
	return mockFields.filter((field) => field.usedInApis.length === 0);
}

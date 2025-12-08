import type { DeletionResult, Reference } from '$lib/types';
import { get } from 'svelte/store';
import { fieldsStore } from '$lib/stores/fields';
import { endpointsStore } from '$lib/stores/apis';

/**
 * Builds a tooltip message for deletion blocking references
 * Creates formatted text showing why deletion is blocked
 *
 * @param entityType - Type of entity being deleted (e.g., 'field', 'validator')
 * @param referenceType - Type of blocking references (e.g., 'API', 'field')
 * @param references - Array of references blocking deletion
 * @returns Formatted tooltip text with reference list
 */
export function buildDeletionTooltip(
  entityType: string,
  referenceType: string,
  references: Array<{ name: string; id?: string }>
): string {
  const count = references.length;
  const names = references.map(r => r.name);

  // Format: "Cannot delete: Used in X reference(s)" on first line
  // Then list reference names below
  const header = `Cannot delete: Used in ${count} ${referenceType}${count > 1 ? 's' : ''}`;

  if (count === 1) {
    // Single reference: show inline in parentheses
    return `${header}\n(${names[0]})`;
  } else if (count <= 5) {
    // Multiple references (up to 5): list them all
    const list = names.map(name => `- ${name}`).join('\n');
    return `${header}\n${list}`;
  } else {
    // More than 5: show first 4 and indicate remaining count
    const displayNames = names.slice(0, 4);
    const remaining = count - 4;
    const list = displayNames.map(name => `- ${name}`).join('\n');
    return `${header}\n${list}\n- and ${remaining} more...`;
  }
}

/**
 * Checks if a validator can be deleted safely
 * A validator cannot be deleted if it's currently used in any fields
 * Only checks references within the same namespace when namespaceId is provided
 *
 * @param validatorName - The name of the validator to check
 * @param fieldsUsingValidator - Array of fields using this validator
 * @param namespaceId - Optional namespace to filter references by (only checks same-namespace references)
 * @returns DeletionResult indicating whether deletion is safe
 */
export function checkValidatorDeletion(
  validatorName: string,
  fieldsUsingValidator: Array<{ name: string; fieldId: string }>,
  namespaceId?: string
): DeletionResult {
  // Filter by namespace if provided
  let filteredFields = fieldsUsingValidator;
  if (namespaceId) {
    const allFields = get(fieldsStore);
    const sameNamespaceFieldIds = new Set(
      allFields.filter(f => f.namespaceId === namespaceId).map(f => f.id)
    );
    filteredFields = fieldsUsingValidator.filter(f => sameNamespaceFieldIds.has(f.fieldId));
  }

  // If no fields are using this validator (in the same namespace), deletion is safe
  if (filteredFields.length === 0) {
    return { success: true };
  }

  // Build reference list for blocking fields
  const references: Reference[] = filteredFields.map(field => ({
    id: field.fieldId,
    name: field.name,
    type: 'field' as const
  }));

  // Generate user-friendly error message
  const fieldCount = filteredFields.length;
  const fieldNames = filteredFields
    .slice(0, 3)
    .map(f => `"${f.name}"`)
    .join(', ');

  const remainingCount = fieldCount - 3;
  const remainingText = remainingCount > 0 ? ` and ${remainingCount} more` : '';

  const error = `Cannot delete validator "${validatorName}" because it is used in ${fieldCount} field${fieldCount > 1 ? 's' : ''}: ${fieldNames}${remainingText}. Remove this validator from all fields before deleting.`;

  return {
    success: false,
    error,
    references
  };
}

/**
 * Checks if a field can be deleted safely
 * A field cannot be deleted if it's currently used in any APIs
 * Only checks references within the same namespace when namespaceId is provided
 *
 * @param fieldName - The name of the field being deleted
 * @param usedInApis - Array of API IDs where this field is used
 * @param namespaceId - Optional namespace to filter references by (only checks same-namespace references)
 * @returns DeletionResult indicating whether deletion is safe
 */
export function checkFieldDeletion(fieldName: string, usedInApis: string[], namespaceId?: string): DeletionResult {
  // Filter by namespace if provided
  let filteredApis = usedInApis;
  if (namespaceId) {
    const allEndpoints = get(endpointsStore);
    const sameNamespaceEndpointIds = new Set(
      allEndpoints.filter(e => e.namespaceId === namespaceId).map(e => e.id)
    );
    filteredApis = usedInApis.filter(apiId => sameNamespaceEndpointIds.has(apiId));
  }

  // If field is not used in any APIs (in the same namespace), deletion is safe
  if (filteredApis.length === 0) {
    return { success: true };
  }

  // Build reference list for blocking APIs
  const references: Reference[] = filteredApis.map(apiId => ({
    id: apiId,
    name: apiId,
    type: 'api' as const
  }));

  // Generate user-friendly error message
  const apiCount = filteredApis.length;
  const apiNames = filteredApis
    .slice(0, 3)
    .map(api => `"${api}"`)
    .join(', ');

  const remainingCount = apiCount - 3;
  const remainingText = remainingCount > 0 ? ` and ${remainingCount} more` : '';

  const error = `Cannot delete field "${fieldName}" because it is used in ${apiCount} API${apiCount > 1 ? 's' : ''}: ${apiNames}${remainingText}. Remove this field from all APIs before deleting.`;

  return {
    success: false,
    error,
    references
  };
}

/**
 * Checks if an object can be deleted safely
 * An object cannot be deleted if it's currently used in any APIs
 * Only checks references within the same namespace when namespaceId is provided
 *
 * @param objectName - The name of the object being deleted
 * @param usedInApis - Array of API IDs where this object is used
 * @param namespaceId - Optional namespace to filter references by (only checks same-namespace references)
 * @returns DeletionResult indicating whether deletion is safe
 */
export function checkObjectDeletion(objectName: string, usedInApis: string[], namespaceId?: string): DeletionResult {
  // Filter by namespace if provided
  let filteredApis = usedInApis;
  if (namespaceId) {
    const allEndpoints = get(endpointsStore);
    const sameNamespaceEndpointIds = new Set(
      allEndpoints.filter(e => e.namespaceId === namespaceId).map(e => e.id)
    );
    filteredApis = usedInApis.filter(apiId => sameNamespaceEndpointIds.has(apiId));
  }

  // If object is not used in any APIs (in the same namespace), deletion is safe
  if (filteredApis.length === 0) {
    return { success: true };
  }

  // Build reference list for blocking APIs
  const references: Reference[] = filteredApis.map(apiId => ({
    id: apiId,
    name: apiId,
    type: 'api' as const
  }));

  // Generate user-friendly error message
  const apiCount = filteredApis.length;
  const apiNames = filteredApis
    .slice(0, 3)
    .map(api => `"${api}"`)
    .join(', ');

  const remainingCount = apiCount - 3;
  const remainingText = remainingCount > 0 ? ` and ${remainingCount} more` : '';

  const error = `Cannot delete object "${objectName}" because it is used in ${apiCount} API${apiCount > 1 ? 's' : ''}: ${apiNames}${remainingText}. Remove this object from all APIs before deleting.`;

  return {
    success: false,
    error,
    references
  };
}

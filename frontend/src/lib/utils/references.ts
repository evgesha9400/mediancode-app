import type { DeletionResult, Reference } from '$lib/types';
import { get } from 'svelte/store';
import { apisStore } from '$lib/stores/apis';

/**
 * Builds a tooltip message for deletion blocking references
 * Creates formatted text showing why deletion is blocked
 *
 * @param entityType - Type of entity being deleted (e.g., 'field', 'field constraint')
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
 * Checks if a field constraint can be deleted safely
 * A field constraint cannot be deleted if it's currently used in any fields
 *
 * @param fieldConstraintName - The name of the field constraint to check
 * @param usedInFields - Count of fields using this field constraint
 * @returns DeletionResult indicating whether deletion is safe
 */
export function checkFieldConstraintDeletion(
  fieldConstraintName: string,
  usedInFields: number
): DeletionResult {
  if (usedInFields === 0) {
    return { success: true };
  }

  return {
    success: false,
    error: `Cannot delete field constraint "${fieldConstraintName}" because it is used in ${usedInFields} field${usedInFields > 1 ? 's' : ''}. Remove this field constraint from all fields before deleting.`
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
    const allApis = get(apisStore);
    const sameNamespaceApiIds = new Set(
      allApis.filter(a => a.namespaceId === namespaceId).map(a => a.id)
    );
    filteredApis = usedInApis.filter(apiId => sameNamespaceApiIds.has(apiId));
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
    const allApis = get(apisStore);
    const sameNamespaceApiIds = new Set(
      allApis.filter(a => a.namespaceId === namespaceId).map(a => a.id)
    );
    filteredApis = usedInApis.filter(apiId => sameNamespaceApiIds.has(apiId));
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

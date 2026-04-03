/**
 * Namespace utilities for detecting system (built-in) entities.
 *
 * The backend assigns a fixed namespace ID to all system-provided entities
 * (built-in types, field constraints, etc.). These entities are immutable
 * and should be displayed as read-only in the UI.
 */

/** Fixed UUID assigned by the backend to the system namespace */
export const SYSTEM_NAMESPACE_ID = '00000000-0000-0000-0000-000000000001';

/** Alias used in tests/fixtures; same UUID as SYSTEM_NAMESPACE_ID. */
export const GLOBAL_NAMESPACE_ID = SYSTEM_NAMESPACE_ID;

/**
 * Returns true when the entity belongs to the system namespace.
 * System entities are built-in and cannot be edited or deleted by users.
 */
export function isSystemEntity(entity: { namespaceId: string }): boolean {
	return entity.namespaceId === SYSTEM_NAMESPACE_ID;
}

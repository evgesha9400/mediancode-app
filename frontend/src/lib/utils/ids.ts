/**
 * ID Generation and Object Cloning Utilities
 *
 * Provides UUID generation and type-safe deep cloning for stores and tests.
 * All IDs are UUIDs to match the backend's UUID-based ID system.
 *
 * In production, IDs use crypto.randomUUID() for true randomness.
 * In tests, seedIdGenerator() enables deterministic UUID generation.
 */

/**
 * ID generator state
 * Exported for test seeding but should not be modified directly in production code
 */
export interface IdGeneratorState {
	counter: number;
	seeded: boolean;
}

let idState: IdGeneratorState = {
	counter: 0,
	seeded: false
};

/**
 * Build a deterministic UUID from a counter value.
 * Produces UUIDs in the format: `00000000-0000-4000-a000-{counter padded to 12 digits}`
 * The "4" in position 13 marks it as a v4 UUID, "a" in position 17 is a valid variant.
 *
 * @param counter - Numeric counter to encode into the UUID
 */
function deterministicUuid(counter: number): string {
	const hex = counter.toString(16).padStart(12, '0');
	return `00000000-0000-4000-a000-${hex}`;
}

/**
 * Seed the ID generator with a specific state (primarily for testing)
 * When seeded, generateId produces deterministic UUIDs based on a counter.
 *
 * @param state - Optional state to seed with. If not provided, resets to random mode.
 *
 * @example
 * // In tests:
 * seedIdGenerator({ counter: 0 });
 * const id1 = generateId(); // "00000000-0000-4000-a000-000000000000"
 * const id2 = generateId(); // "00000000-0000-4000-a000-000000000001"
 */
export function seedIdGenerator(state?: Partial<IdGeneratorState>): void {
	if (state) {
		idState = {
			counter: state.counter ?? 0,
			seeded: true
		};
	} else {
		idState = {
			counter: 0,
			seeded: false
		};
	}
}

/**
 * Generate a unique UUID.
 *
 * In production (not seeded): uses crypto.randomUUID() for true randomness.
 * In tests (seeded): produces deterministic UUIDs from a counter.
 *
 * @param _prefix - Deprecated. Kept for backward compatibility but ignored.
 *                  All IDs are now UUIDs regardless of entity type.
 * @returns A UUID string
 *
 * @example
 * generateId()           // "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" (random)
 * generateId('endpoint') // same - prefix is ignored
 */
export function generateId(_prefix?: string): string {
	if (idState.seeded) {
		return deterministicUuid(idState.counter++);
	}
	return crypto.randomUUID();
}

/**
 * Generate a unique UUID specifically for parameters
 * Uses the same deterministic counter as generateId for consistent, reproducible IDs
 *
 * @returns A UUID string
 *
 * @example
 * generateParamId() // "00000000-0000-4000-a000-000000000000" (seeded)
 */
export function generateParamId(): string {
	if (idState.seeded) {
		return deterministicUuid(idState.counter++);
	}
	return crypto.randomUUID();
}

/**
 * Deep clone an object using structured clone algorithm
 * Provides type safety and handles complex nested structures
 * Falls back to JSON parse/stringify in environments where structuredClone is not available
 *
 * @param obj - The object to clone
 * @returns A deep copy of the object
 *
 * @example
 * const original = { id: '1', nested: { value: 42 } };
 * const copy = deepClone(original);
 * copy.nested.value = 100;
 * console.log(original.nested.value); // 42 (unchanged)
 */
export function deepClone<T>(obj: T): T {
	// Try structuredClone first (modern environments)
	if (typeof structuredClone !== 'undefined') {
		try {
			return structuredClone(obj);
		} catch {
			// Fall through to JSON method
		}
	}

	// Fallback to JSON parse/stringify (works in all environments)
	return JSON.parse(JSON.stringify(obj));
}

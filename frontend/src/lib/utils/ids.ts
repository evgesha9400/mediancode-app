/**
 * ID Generation and Object Cloning Utilities
 *
 * Provides deterministic ID generation and type-safe deep cloning for stores and tests.
 * All IDs are prefixed and use a counter to ensure uniqueness and determinism.
 */

/**
 * ID generator state
 * Exported for test seeding but should not be modified directly in production code
 */
export interface IdGeneratorState {
	counter: number;
	timestamp: number;
}

let idState: IdGeneratorState = {
	counter: 0,
	timestamp: Date.now()
};

/**
 * Seed the ID generator with a specific state (primarily for testing)
 *
 * @param state - Optional state to seed with. If not provided, resets to defaults.
 *
 * @example
 * // In tests:
 * seedIdGenerator({ counter: 0, timestamp: 1000000 });
 * const id1 = generateId('test'); // "test-1000000-0"
 * const id2 = generateId('test'); // "test-1000000-1"
 */
export function seedIdGenerator(state?: Partial<IdGeneratorState>): void {
	idState = {
		counter: state?.counter ?? 0,
		timestamp: state?.timestamp ?? Date.now()
	};
}

/**
 * Generate a unique, deterministic ID with a prefix
 *
 * @param prefix - Prefix for the ID (e.g., 'endpoint', 'tag', 'param')
 * @returns A unique ID string in format: `{prefix}-{timestamp}-{counter}`
 *
 * @example
 * generateId('endpoint') // "endpoint-1234567890-0"
 * generateId('tag')      // "tag-1234567890-1"
 * generateId('param')    // "param-1234567890-2"
 */
export function generateId(prefix: string): string {
	return `${prefix}-${idState.timestamp}-${idState.counter++}`;
}

/**
 * Generate a unique ID specifically for parameters
 * Uses the same deterministic counter as generateId for consistent, reproducible IDs
 *
 * @returns A unique parameter ID in format: `param-{timestamp}-{counter}`
 *
 * @example
 * generateParamId() // "param-1234567890-0"
 */
export function generateParamId(): string {
	return `param-${idState.timestamp}-${idState.counter++}`;
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

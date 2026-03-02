// src/lib/utils/validation.ts

/**
 * Validates that a name follows snake_case rules.
 * Must start with lowercase letter, contain only lowercase letters, digits,
 * and single underscores (no leading/trailing/consecutive underscores).
 */
export function isValidSnakeCaseName(value: string): boolean {
	return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(value);
}

/**
 * Validates that a name follows PascalCase rules.
 * Must start with uppercase letter, contain only letters and digits,
 * no consecutive uppercase letters.
 */
export function isValidPascalCaseName(value: string): boolean {
	return /^[A-Z](?:[a-z0-9]+[A-Z])*[a-z0-9]*$/.test(value);
}

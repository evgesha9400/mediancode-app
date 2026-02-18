// src/lib/domain/errorMap.ts
import { ApiError } from '$lib/api/client';

/**
 * Map an error to a user-friendly message.
 * Preserves exact behavior from the former handleApiError in actions.ts.
 */
export function mapApiError(error: unknown, context: string): string {
	if (error instanceof ApiError) {
		if (error.status === 401) {
			return 'Session expired. Please sign in again.';
		}
		if (error.status === 402) {
			return "You've run out of credits. Please upgrade your plan to continue generating.";
		}
		if (error.status === 403) {
			return 'Permission denied';
		}
		if (error.status === 404) {
			return 'Resource not found';
		}
		if (error.status === 409) {
			return error.detail || 'A resource with this name already exists';
		}
		if (error.status >= 500) {
			return 'Server error - please try again';
		}
		return error.detail || error.message;
	}
	if (error instanceof TypeError && error.message.includes('fetch')) {
		return 'Network error - check your connection';
	}
	return `Failed to ${context}`;
}

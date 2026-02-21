import { writable, get } from 'svelte/store';
import type { ModelValidator } from '$lib/types';

// Re-export type for backwards compatibility
export type { ModelValidator } from '$lib/types';

// Initialize with empty array - data will be loaded from API via loader.ts
export const modelValidatorsStore = writable<ModelValidator[]>([]);

export function getModelValidatorById(id: string): ModelValidator | undefined {
	return get(modelValidatorsStore).find(mv => mv.id === id);
}

export function getTotalModelValidatorCount(): number {
	return get(modelValidatorsStore).length;
}

// ============================================================================
// Namespace Filtering
// ============================================================================

/**
 * Get all model validators for a specific namespace
 */
export function getModelValidatorsByNamespace(namespaceId: string): ModelValidator[] {
	return get(modelValidatorsStore).filter(mv => mv.namespaceId === namespaceId);
}

// ============================================================================
// Search
// ============================================================================

export function searchModelValidators(modelValidators: ModelValidator[], query: string): ModelValidator[] {
	const lowerQuery = query.toLowerCase().trim();

	if (!lowerQuery) {
		return modelValidators;
	}

	return modelValidators.filter(mv =>
		mv.name.toLowerCase().includes(lowerQuery) ||
		mv.description.toLowerCase().includes(lowerQuery) ||
		mv.requiredFields.some(f => f.toLowerCase().includes(lowerQuery)) ||
		mv.mode.toLowerCase().includes(lowerQuery) ||
		mv.code.toLowerCase().includes(lowerQuery)
	);
}

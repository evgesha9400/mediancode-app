import { writable, get } from 'svelte/store';
import type { ModelValidatorTemplate } from '$lib/types';

export const modelValidatorTemplatesStore = writable<ModelValidatorTemplate[]>([]);

// ============================================================================
// Search
// ============================================================================

export function searchModelValidatorTemplates(
	templates: ModelValidatorTemplate[],
	query: string
): ModelValidatorTemplate[] {
	const q = query.toLowerCase().trim();
	if (!q) return templates;
	return templates.filter(t =>
		t.name.toLowerCase().includes(q) ||
		t.description.toLowerCase().includes(q)
	);
}

export function getModelValidatorTemplateById(id: string): ModelValidatorTemplate | undefined {
	return get(modelValidatorTemplatesStore).find(t => t.id === id);
}

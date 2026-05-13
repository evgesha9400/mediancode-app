import { writable, get } from 'svelte/store';
import type { FieldValidatorTemplate } from '$lib/types';

export const fieldValidatorTemplatesStore = writable<FieldValidatorTemplate[]>([]);

// ============================================================================
// Search
// ============================================================================

export function searchFieldValidatorTemplates(
	templates: FieldValidatorTemplate[],
	query: string
): FieldValidatorTemplate[] {
	const q = query.toLowerCase().trim();
	if (!q) return templates;
	return templates.filter(t =>
		t.name.toLowerCase().includes(q) ||
		t.description.toLowerCase().includes(q) ||
		t.compatibleTypes.some(ct => ct.toLowerCase().includes(q))
	);
}

export function getFieldValidatorTemplateById(id: string): FieldValidatorTemplate | undefined {
	return get(fieldValidatorTemplatesStore).find(t => t.id === id);
}

// src/lib/utils/templatePreview.ts

/**
 * Replace {{placeholder}} tokens in a bodyTemplate with actual values.
 * Unreplaced placeholders are kept as-is (e.g. {{key}} stays if no mapping for key).
 */
export function previewBody(bodyTemplate: string, mappings: Record<string, string>): string {
	return bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => mappings[key] ?? `{{${key}}}`);
}

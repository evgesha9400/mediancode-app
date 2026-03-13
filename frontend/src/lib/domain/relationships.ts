import type { ObjectRelationship, ObjectFieldReference } from '$lib/types';

export interface FkHint {
	hasFk: boolean;
	fkName: string;
}

/**
 * Determines the FK hint to display for a relationship row.
 * Returns null when no hint should be shown (non-references cardinality, inferred, or no target).
 *
 * Only user-defined `references` relationships need the hint because the FK field
 * lives on the current object. Inferred relationships are the inverse side —
 * the FK lives on the *other* object, so the hint would be misleading.
 */
export function getFkHint(
	rel: ObjectRelationship,
	objectFields: ObjectFieldReference[],
	fieldLookup: (fieldId: string) => { name: string } | undefined,
	hasTarget: boolean
): FkHint | null {
	if (rel.isInferred || rel.cardinality !== 'references' || !hasTarget) {
		return null;
	}

	const fkName = rel.name + '_id';
	const hasFk = objectFields.some(f => {
		const field = fieldLookup(f.fieldId);
		return field?.name === fkName;
	});

	return { hasFk, fkName };
}

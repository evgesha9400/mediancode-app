/**
 * API Generator Dropdown Scroll Markup Tests
 *
 * Regression tests for scrollable dropdown list regions in API generator selectors.
 * Location mirrors: src/lib/components/api-generator/*.svelte
 *
 * IMPORTANT: These Svelte 5 components currently are not rendered in jsdom in this test suite.
 * This test verifies the source markup contract that keeps long dropdown menus scrollable.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const componentDir = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../../../../src/lib/components/api-generator'
);
const uiClassesPath = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../../../../src/lib/ui/classes.ts'
);

async function readComponentSource(fileName: string): Promise<string> {
	return readFile(resolve(componentDir, fileName), 'utf8');
}

describe('API generator dropdown scroll markup', () => {
	it('centralizes scroll wrapper on dropdownListScroll with overflow-y-auto', async () => {
		const ui = await readFile(uiClassesPath, 'utf8');
		expect(ui).toMatch(/export const dropdownListScroll[\s\S]*?overflow-y-auto/);
	});

	it('keeps the field selector list scrollable for long result sets', async () => {
		const source = await readComponentSource('FieldSelectorDropdown.svelte');

		expect(source).toContain('dropdownListScroll');
	});

	it('keeps the object selector list scrollable for long result sets', async () => {
		const source = await readComponentSource('ObjectSelectorDropdown.svelte');

		expect(source).toContain('dropdownListScroll');
	});

	it('keeps the type selector list scrollable for long result sets', async () => {
		const source = await readComponentSource('TypeSelectorDropdown.svelte');

		expect(source).toContain('dropdownListScroll');
	});

	it('keeps the field constraint selector list scrollable for long result sets', async () => {
		const source = await readComponentSource('FieldConstraintSelectorDropdown.svelte');

		expect(source).toContain('dropdownListScroll');
	});
});

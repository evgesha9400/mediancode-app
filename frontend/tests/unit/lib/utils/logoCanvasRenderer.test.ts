/**
 * logoCanvasRenderer tests
 *
 * Location mirrors: src/lib/utils/logoCanvasRenderer.ts
 */

import { describe, it, expect } from 'vitest';
import {
	LOGO_SIZE_MAP,
	LOGO_INITIAL_ROTATION,
	createLogoCanvasRenderer,
} from '$lib/utils/logoCanvasRenderer';

describe('logoCanvasRenderer', () => {
	it('LOGO_SIZE_MAP maps keys to pixel sizes', () => {
		expect(LOGO_SIZE_MAP.sm).toBe(32);
		expect(LOGO_SIZE_MAP.md).toBe(48);
		expect(LOGO_SIZE_MAP.lg).toBe(80);
		expect(LOGO_SIZE_MAP.xl).toBe(120);
	});

	it('exports default rotation constant', () => {
		expect(LOGO_INITIAL_ROTATION).toBe(Math.PI / 6);
	});

	it('createLogoCanvasRenderer is a function', () => {
		expect(typeof createLogoCanvasRenderer).toBe('function');
	});
});

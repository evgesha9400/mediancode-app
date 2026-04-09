/**
 * Location mirrors: src/lib/theme/appTheme.ts
 */

import { describe, expect, it } from 'vitest';
import { appThemeCssText, softThemeClerkVariables, softThemeColors } from '$lib/theme/appTheme';

function toHex(rgb: readonly [number, number, number]): string {
	return (
		'#' +
		rgb
			.map((channel) => Math.max(0, Math.min(255, channel)))
			.map((channel) => channel.toString(16).padStart(2, '0'))
			.join('')
	);
}

describe('appTheme', () => {
	it('defines the soft theme selector with the full green scale', () => {
		expect(appThemeCssText).toContain('html[data-theme="soft"]');

		const greenScales = ['50', '100', '200', '300', '400', '500', '600'] as const;

		for (const scale of greenScales) {
			expect(appThemeCssText).toContain(`--color-green-${scale}: ${softThemeColors.green[scale].join(' ')};`);
		}
	});

	it('defines semantic surface variables for drawer and sidebar chrome', () => {
		expect(appThemeCssText).toContain(`--color-accent: ${softThemeColors.green['400'].join(' ')};`);
		expect(appThemeCssText).toContain(`--color-accent-hover: ${softThemeColors.green['300'].join(' ')};`);
		expect(appThemeCssText).toContain(`--color-accent-strong: ${softThemeColors.green['500'].join(' ')};`);
		expect(appThemeCssText).toContain(`--color-accent-support: ${softThemeColors.blue['500'].join(' ')};`);
		expect(appThemeCssText).toContain('--drawer-panel-bg:');
		expect(appThemeCssText).toContain('--dropdown-panel-bg:');
		expect(appThemeCssText).toContain('--sidebar-nav-item-active-border:');
		expect(appThemeCssText).toContain('--sidebar-nav-item-active-surface:');
	});

	it('derives Clerk colors from the same soft-theme palette', () => {
		expect(softThemeClerkVariables).toEqual({
			colorBackground: toHex(softThemeColors.mono['900']),
			colorInputBackground: toHex(softThemeColors.mono['900']),
			colorText: toHex(softThemeColors.mono['100']),
			colorTextSecondary: toHex(softThemeColors.mono['400']),
			colorPrimary: toHex(softThemeColors.green['400']),
			colorInputText: toHex(softThemeColors.mono['100']),
			borderRadius: '16px',
			colorNeutral: toHex(softThemeColors.mono['400']),
			colorDanger: toHex(softThemeColors.red['600']),
			colorSuccess: toHex(softThemeColors.green['600']),
			colorWarning: toHex(softThemeColors.amber['400'])
		});
	});
});

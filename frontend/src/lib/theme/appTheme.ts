/**
 * Canonical app theme source.
 *
 * CSS custom properties and Clerk appearance variables are both derived here so the
 * soft theme can change in one place and future themes can follow the same pattern.
 */

type RgbChannels = readonly [number, number, number];
type ColorScale = Record<string, RgbChannels>;

const white: RgbChannels = [255, 255, 255];

export const softThemeColors = {
	mono: {
		'950': [16, 16, 18],
		'900': [29, 29, 31],
		'800': [43, 43, 46],
		'700': [68, 68, 73],
		'600': [85, 85, 91],
		'500': [116, 116, 123],
		'400': [160, 160, 168],
		'300': [207, 207, 214],
		'200': [224, 224, 230],
		'100': [240, 240, 245],
		'50': [246, 246, 250]
	},
	green: {
		'50': [240, 253, 246],
		'100': [214, 245, 228],
		'200': [170, 235, 200],
		'300': [140, 240, 180],
		'400': [82, 226, 140],
		'500': [64, 197, 118],
		'600': [46, 168, 96]
	},
	red: {
		'50': [254, 242, 242],
		'100': [254, 226, 226],
		'200': [254, 202, 202],
		'600': [220, 38, 38],
		'700': [185, 28, 28],
		'800': [153, 27, 27]
	},
	amber: {
		'50': [253, 246, 232],
		'100': [250, 232, 194],
		'200': [245, 212, 142],
		'400': [228, 168, 58],
		'600': [196, 138, 26],
		'800': [138, 92, 16]
	},
	blue: {
		'50': [240, 244, 252],
		'100': [218, 227, 247],
		'200': [180, 199, 240],
		'400': [91, 139, 224],
		'600': [61, 102, 184],
		'800': [43, 74, 138]
	}
} as const satisfies Record<string, ColorScale>;

function toRgbChannelsValue(rgb: RgbChannels): string {
	return rgb.join(' ');
}

function toRgbAlpha(rgb: RgbChannels, alpha: number): string {
	return `rgb(${toRgbChannelsValue(rgb)} / ${alpha})`;
}

function toHex(rgb: RgbChannels): string {
	return (
		'#' +
		rgb
			.map((channel) => Math.max(0, Math.min(255, channel)))
			.map((channel) => channel.toString(16).padStart(2, '0'))
			.join('')
	);
}

const softThemeCssVars = {
	'drawer-panel-radius': '1.5rem',
	'drawer-panel-border': toRgbAlpha(white, 0.14),
	'drawer-panel-ring': toRgbAlpha(white, 0.08),
	'drawer-panel-bg': toRgbAlpha(softThemeColors.mono['900'], 0.38),
	'drawer-panel-shadow': '0 0 50px rgb(0 0 0 / 0.5)',
	'drawer-panel-backdrop': 'blur(40px) saturate(1.35)',
	'drawer-scrim-bg': toRgbAlpha(softThemeColors.mono['950'], 0.38),
	'drawer-scrim-backdrop': 'blur(14px) saturate(1.15)',
	'drawer-stack-dimmer-bg': toRgbAlpha(softThemeColors.mono['950'], 0.22),
	'drawer-stack-dimmer-backdrop': 'blur(8px) saturate(1.05)',
	'drawer-footer-border': toRgbAlpha(white, 0.12),
	'drawer-footer-bg': toRgbAlpha(softThemeColors.mono['900'], 0.45),
	'drawer-footer-backdrop': 'blur(32px) saturate(1.25)',
	'drawer-inner-surface-bg': toRgbAlpha(softThemeColors.mono['900'], 0.28),
	'drawer-inner-surface-shadow': `inset 0 1px 0 ${toRgbAlpha(white, 0.08)}`,
	'dashboard-card-radius': '1rem',
	'dropdown-panel-radius': '0.75rem',
	'dropdown-panel-border': toRgbAlpha(softThemeColors.mono['700'], 0.8),
	'dropdown-panel-bg': toRgbAlpha(softThemeColors.mono['950'], 1),
	'dropdown-panel-elevation-shadow': '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
	'sidebar-nav-item-active-border': toRgbAlpha(softThemeColors.green['400'], 0.28),
	'sidebar-nav-item-active-highlight-strong': toRgbAlpha(white, 0.07),
	'sidebar-nav-item-active-highlight-soft': toRgbAlpha(white, 0.02),
	'sidebar-nav-item-active-accent-start': toRgbAlpha(softThemeColors.green['400'], 0.14),
	'sidebar-nav-item-active-accent-end': toRgbAlpha(softThemeColors.green['400'], 0.05),
	'sidebar-nav-item-active-surface': toRgbAlpha(softThemeColors.mono['900'], 0.22),
	'sidebar-nav-item-active-inset-light': toRgbAlpha(white, 0.1),
	'sidebar-nav-item-active-inset-border': toRgbAlpha(softThemeColors.green['400'], 0.1),
	'sidebar-nav-item-active-shadow': toRgbAlpha(softThemeColors.green['400'], 0.12)
} as const;

function buildPaletteCssVars(paletteName: string, scale: ColorScale): string[] {
	return Object.entries(scale).map(([step, rgb]) => `  --color-${paletteName}-${step}: ${toRgbChannelsValue(rgb)};`);
}

function buildCssVars(vars: Record<string, string>): string[] {
	return Object.entries(vars).map(([name, value]) => `  --${name}: ${value};`);
}

const softThemeColorVars = Object.entries(softThemeColors).flatMap(([paletteName, scale]) =>
	buildPaletteCssVars(paletteName, scale)
);

export const appThemeCssText = [
	'html[data-theme="soft"] {',
	...softThemeColorVars,
	'',
	...buildCssVars(softThemeCssVars),
	'}'
].join('\n');

export const appThemeHeadStyleTag = `<style>${appThemeCssText}</style>`;

export const softThemeClerkVariables = {
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
} as const;

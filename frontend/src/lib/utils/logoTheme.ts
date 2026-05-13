/**
 * Maps `html[data-theme]` to logo canvas variants.
 * Add branches when new appearance modes ship (e.g. light surfaces).
 */

import type { LogoVariant } from '$lib/utils/logoCanvasRenderer';

export function logoVariantForDataTheme(theme: string | undefined | null): LogoVariant {
	if (theme === 'light') return 'light';
	return 'dark';
}

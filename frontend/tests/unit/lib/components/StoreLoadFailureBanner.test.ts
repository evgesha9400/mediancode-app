/**
 * StoreLoadFailureBanner component contract tests.
 */

import { describe, expect, it } from 'vitest';
import {
	StoreLoadFailureBanner,
	type StoreLoadFailureBannerProps
} from '$lib/components';

describe('StoreLoadFailureBanner', () => {
	it('requires failed resources and a retry action', () => {
		const onRetry = () => {};
		const props: StoreLoadFailureBannerProps = {
			errors: ['Endpoints'],
			onRetry
		};

		expect(props.errors).toEqual(['Endpoints']);
		expect(props.onRetry).toBe(onRetry);
	});

	it('exports the component from the component library', () => {
		expect(StoreLoadFailureBanner).toBeDefined();
		expect(typeof StoreLoadFailureBanner).toBe('function');
	});
});

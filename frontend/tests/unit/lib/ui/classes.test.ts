/**
 * UI classes primitives tests
 *
 * Location mirrors: src/lib/ui/classes.ts
 */

import { describe, it, expect } from 'vitest';
import {
	inputGlass,
	dashboardMainColumn,
	dropdownPanel,
	marketingHeroCta,
	clerkCard,
} from '$lib/ui/classes';

describe('lib/ui/classes', () => {
	it('inputGlass encodes glass input surface', () => {
		expect(inputGlass).toContain('rounded-xl');
		expect(inputGlass).toContain('border-mono-700/80');
		expect(inputGlass).toContain('focus:ring-green-400');
	});

	it('dashboardMainColumn encodes flex column shell', () => {
		expect(dashboardMainColumn).toContain('flex-col');
		expect(dashboardMainColumn).toContain('min-h-0');
	});

	it('dropdownPanel encodes floating list container', () => {
		expect(dropdownPanel).toContain('absolute');
		expect(dropdownPanel).toContain('rounded-xl');
	});

	it('marketingHeroCta encodes primary landing CTA', () => {
		expect(marketingHeroCta).toContain('bg-green-400');
		expect(marketingHeroCta).toContain('rounded-xl');
	});

	it('clerkCard encodes Clerk modal surface', () => {
		expect(clerkCard).toContain('rounded-3xl');
		expect(clerkCard).toContain('backdrop-blur');
	});
});

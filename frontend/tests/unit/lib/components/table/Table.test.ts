/**
 * Table Component Tests
 *
 * Unit tests for the Table component.
 * Location mirrors: src/lib/components/table/Table.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * The mount() function requires a real browser environment or Vitest browser mode.
 *
 * Current test coverage:
 * - TypeScript interface validation (works in jsdom)
 * - Component export verification (works in jsdom)
 * - E2E tests via Playwright provide full rendering coverage (tests/e2e/scenarios/dashboard.spec.ts)
 *
 * To enable browser-mode rendering tests in CI/CD, configure Vitest browser mode:
 * ```typescript
 * // vitest.config.ts
 * export default defineConfig({
 *   test: {
 *     browser: {
 *       enabled: true,
 *       name: 'chromium',
 *       provider: 'playwright'
 *     }
 *   }
 * });
 * ```
 */

import { describe, it, expect } from 'vitest';
import { Table, type TableProps } from '$lib/components';

describe('Table Component', () => {
	describe('TypeScript Interface', () => {
		it('TableProps interface accepts isEmpty property', () => {
			const props: TableProps = {
				isEmpty: false
			};

			expect(props.isEmpty).toBe(false);
		});

		it('TableProps isEmpty is optional', () => {
			const props: TableProps = {};

			expect(props.isEmpty).toBeUndefined();
		});

		it('TableProps accepts all snippet properties', () => {
			const props: TableProps = {
				isEmpty: false,
				header: undefined,
				body: undefined,
				empty: undefined
			};

			expect(props).toBeDefined();
			expect('header' in props).toBe(true);
			expect('body' in props).toBe(true);
			expect('empty' in props).toBe(true);
		});
	});

	describe('Component Structure Verification', () => {
		it('Table component exports correctly from barrel export', () => {
			// Verify that Table is exported from the barrel export (not deep import)
			expect(Table).toBeDefined();
			expect(typeof Table).toBe('function');
		});

		it('TableProps type exports correctly from barrel export', () => {
			// Verify TypeScript compilation of imported types
			const props: TableProps = {
				isEmpty: false
			};

			// Type should compile without errors
			expect(props).toBeDefined();
		});
	});
});

/**
 * Rendering tests are covered by E2E tests in Playwright.
 *
 * Why: Svelte 5's mount() requires a browser environment. While @testing-library/svelte
 * is installed and jsdom is configured, the combination doesn't support Svelte 5 $props() components.
 *
 * See tests/e2e/scenarios/dashboard.spec.ts for comprehensive rendering tests including:
 * - Table structure validation
 * - Empty state rendering
 * - Header and body content
 * - Interactive features
 */

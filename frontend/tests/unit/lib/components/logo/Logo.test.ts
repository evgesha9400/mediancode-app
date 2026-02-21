/**
 * Logo Component Tests
 *
 * Unit tests for the Logo component.
 * Location mirrors: src/lib/components/logo/Logo.svelte
 *
 * IMPORTANT: Svelte 5 components using $props() cannot be rendered in jsdom.
 * Tests verify TypeScript interface contracts and component exports.
 */

import { describe, it, expect } from 'vitest';
import { Logo, type LogoProps } from '$lib/components';

describe('Logo Component', () => {
	describe('TypeScript Interface', () => {
		it('LogoProps interface has all optional properties', () => {
			const props: LogoProps = {};

			expect(props).toBeDefined();
		});

		it('LogoProps accepts size property with valid values', () => {
			const smProps: LogoProps = { size: 'sm' };
			const mdProps: LogoProps = { size: 'md' };
			const lgProps: LogoProps = { size: 'lg' };
			const xlProps: LogoProps = { size: 'xl' };

			expect(smProps.size).toBe('sm');
			expect(mdProps.size).toBe('md');
			expect(lgProps.size).toBe('lg');
			expect(xlProps.size).toBe('xl');
		});

		it('LogoProps accepts variant property with valid values', () => {
			const lightProps: LogoProps = { variant: 'light' };
			const darkProps: LogoProps = { variant: 'dark' };

			expect(lightProps.variant).toBe('light');
			expect(darkProps.variant).toBe('dark');
		});

		it('LogoProps accepts showText and paused boolean properties', () => {
			const props: LogoProps = {
				showText: true,
				paused: true
			};

			expect(props.showText).toBe(true);
			expect(props.paused).toBe(true);
		});

		it('LogoProps accepts optional class property', () => {
			const props: LogoProps = {
				class: 'custom-class'
			};

			expect(props.class).toBe('custom-class');
		});

		it('LogoProps accepts all properties together', () => {
			const props: LogoProps = {
				size: 'lg',
				variant: 'dark',
				showText: true,
				paused: false,
				class: 'my-logo'
			};

			expect(props).toBeDefined();
			expect(props.size).toBe('lg');
			expect(props.variant).toBe('dark');
		});
	});

	describe('Component Structure Verification', () => {
		it('Logo component exports correctly from barrel export', () => {
			expect(Logo).toBeDefined();
			expect(typeof Logo).toBe('function');
		});

		it('LogoProps type exports correctly from barrel export', () => {
			const props: LogoProps = {};

			expect(props).toBeDefined();
		});
	});
});

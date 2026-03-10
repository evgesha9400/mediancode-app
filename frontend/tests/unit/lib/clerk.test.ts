/**
 * Clerk Integration Tests
 *
 * Unit tests for the Clerk authentication module.
 * Location mirrors: src/lib/clerk.ts
 */

import { describe, it, expect, vi } from 'vitest';

// Mock dependencies that clerk.ts imports
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_CLERK_MOCK_MODE: 'false' }
}));

vi.mock('$lib/stores/organization', () => ({
	initOrgState: vi.fn(),
	refreshOrgState: vi.fn()
}));

import {
	clerkState,
	clerkAppearance,
	initializeClerk,
	getClerk,
	signOut,
	type ClerkState
} from '$lib/clerk';

describe('Clerk Integration', () => {
	describe('clerkState', () => {
		it('should be a writable store with subscribe method', () => {
			expect(clerkState).toBeDefined();
			expect(typeof clerkState.subscribe).toBe('function');
		});

		it('should have set method', () => {
			expect(typeof clerkState.set).toBe('function');
		});

		it('should have update method', () => {
			expect(typeof clerkState.update).toBe('function');
		});

		it('should have correct initial state', () => {
			let state: ClerkState | undefined;
			const unsubscribe = clerkState.subscribe((value) => {
				state = value;
			});

			expect(state).toBeDefined();
			expect(state!.isLoaded).toBe(false);
			expect(state!.isSignedIn).toBe(false);
			expect(state!.user).toBeNull();

			unsubscribe();
		});
	});

	describe('clerkAppearance', () => {
		it('should be an object', () => {
			expect(typeof clerkAppearance).toBe('object');
			expect(clerkAppearance).not.toBeNull();
		});

		it('should have variables property', () => {
			expect(clerkAppearance.variables).toBeDefined();
			expect(typeof clerkAppearance.variables).toBe('object');
		});

		it('should have elements property', () => {
			expect(clerkAppearance.elements).toBeDefined();
			expect(typeof clerkAppearance.elements).toBe('object');
		});

		it('should define colorPrimary in variables', () => {
			expect(clerkAppearance.variables.colorPrimary).toBe('#4ade80');
		});

		it('should define formButtonPrimary in elements', () => {
			expect(clerkAppearance.elements.formButtonPrimary).toBeDefined();
			expect(typeof clerkAppearance.elements.formButtonPrimary).toBe('string');
		});
	});

	describe('initializeClerk', () => {
		it('should be exported as a function', () => {
			expect(typeof initializeClerk).toBe('function');
		});
	});

	describe('getClerk', () => {
		it('should be exported as a function', () => {
			expect(typeof getClerk).toBe('function');
		});

		it('should return null before initialization', () => {
			expect(getClerk()).toBeNull();
		});
	});

	describe('signOut', () => {
		it('should be exported as a function', () => {
			expect(typeof signOut).toBe('function');
		});
	});

	describe('ClerkState type', () => {
		it('should accept valid ClerkState objects', () => {
			const state: ClerkState = {
				isLoaded: true,
				isSignedIn: true,
				user: { id: 'user-1' }
			};

			expect(state.isLoaded).toBe(true);
			expect(state.isSignedIn).toBe(true);
			expect(state.user).toEqual({ id: 'user-1' });
		});

		it('should accept null user', () => {
			const state: ClerkState = {
				isLoaded: false,
				isSignedIn: false,
				user: null
			};

			expect(state.user).toBeNull();
		});
	});
});

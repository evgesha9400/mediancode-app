/**
 * Global Vitest Setup
 * 
 * This file runs before all tests and sets up the testing environment.
 * It configures:
 * - Testing Library matchers (@testing-library/jest-dom)
 * - Fetch polyfill (whatwg-fetch)
 * - MSW (Mock Service Worker) for API mocking
 */

import '@testing-library/jest-dom/vitest';
import 'whatwg-fetch';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '../shared/msw/server';

// Start MSW server before all tests
beforeAll(() => {
	server.listen({
		onUnhandledRequest: 'warn'
	});
});

// Reset handlers after each test to ensure test isolation
afterEach(() => {
	server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
	server.close();
});

// Mock window.matchMedia for components that use responsive breakpoints
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => true
	})
});

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = class IntersectionObserver {
	constructor() {}
	disconnect() {}
	observe() {}
	takeRecords() {
		return [];
	}
	unobserve() {}
} as any;

// Mock ResizeObserver for components that use it
global.ResizeObserver = class ResizeObserver {
	constructor() {}
	disconnect() {}
	observe() {}
	unobserve() {}
} as any;

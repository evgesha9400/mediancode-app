/**
 * Additional Test Utilities
 * 
 * This module provides helper functions for common testing scenarios.
 */

import { waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

/**
 * Creates a configured user event instance for interactions
 * 
 * @returns UserEvent instance for simulating user interactions
 */
export function setupUserEvent() {
	return userEvent.setup();
}

/**
 * Waits for an element to be removed from the DOM
 * 
 * @param callback - Function that returns true when element is removed
 * @param options - Wait options
 */
export async function waitForElementToBeRemoved(
	callback: () => boolean,
	options?: { timeout?: number }
) {
	await waitFor(() => {
		if (!callback()) {
			throw new Error('Element still present');
		}
	}, options);
}

/**
 * Delays execution for testing async behaviors
 * 
 * @param ms - Milliseconds to wait
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock function with TypeScript support
 * 
 * @returns Mock function
 */
export function createMockFn<T extends (...args: any[]) => any>(): T & {
	calls: Parameters<T>[];
	mock: {
		calls: Parameters<T>[];
		results: ReturnType<T>[];
	};
} {
	const calls: Parameters<T>[] = [];
	const results: ReturnType<T>[] = [];

	const fn = ((...args: Parameters<T>) => {
		calls.push(args);
		const result = undefined as ReturnType<T>;
		results.push(result);
		return result;
	}) as T & {
		calls: Parameters<T>[];
		mock: {
			calls: Parameters<T>[];
			results: ReturnType<T>[];
		};
	};

	fn.calls = calls;
	fn.mock = { calls, results };

	return fn;
}

/**
 * Simulates a click on an element by text content
 * 
 * @param getByText - Testing Library's getByText query
 * @param text - Text content to search for
 */
export async function clickByText(
	getByText: (text: string) => HTMLElement,
	text: string
) {
	const user = setupUserEvent();
	const element = getByText(text);
	await user.click(element);
}

/**
 * Simulates typing into an input field
 * 
 * @param element - Input element
 * @param text - Text to type
 */
export async function typeInto(element: HTMLElement, text: string) {
	const user = setupUserEvent();
	await user.type(element, text);
}

/**
 * Clears an input field and types new text
 * 
 * @param element - Input element
 * @param text - Text to type
 */
export async function clearAndType(element: HTMLElement, text: string) {
	const user = setupUserEvent();
	await user.clear(element);
	await user.type(element, text);
}

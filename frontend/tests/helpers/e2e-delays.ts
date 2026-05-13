/**
 * E2E Action Delay Configuration
 *
 * Controls the delay (in ms) used between page object actions.
 * Replaces all hardcoded waitForTimeout calls.
 *
 * Set E2E_ACTION_DELAY in .env to override.
 * Default: 300ms (enough for animations/debounce)
 * Observation mode: 1500-2000ms (watch each step in headed mode)
 * Fast CI mode: 100ms
 */

export const ACTION_DELAY_MS = parseInt(process.env.E2E_ACTION_DELAY || '300', 10);

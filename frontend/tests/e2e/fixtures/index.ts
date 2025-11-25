/**
 * Playwright E2E Fixtures
 *
 * Re-exports shared fixtures for use in Playwright tests.
 * This ensures Playwright uses the same deterministic data as unit/integration tests.
 */

// Re-export all fixtures from the shared fixtures directory
export * from '../../fixtures';

// NOTE: MSW browser utilities are NOT exported here to avoid
// importing browser-only code in Node.js context during test discovery.
// If you need MSW in browser tests, import directly from:
// import { worker } from '../../shared/msw/browser';

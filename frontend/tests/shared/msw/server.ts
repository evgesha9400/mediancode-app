/**
 * MSW Server Setup
 * 
 * Configures Mock Service Worker for Node.js environment (Vitest tests).
 * This server is started in vitestSetup.ts before all tests run.
 * 
 * For Playwright (browser) tests, MSW will be configured differently
 * in the E2E setup (Phase 5).
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance for Node.js (Vitest) environment
 * 
 * Started before all tests, reset after each test, closed after all tests.
 * See: tests/setup/vitestSetup.ts
 */
export const server = setupServer(...handlers);

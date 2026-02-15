/**
 * Smoke Test Fixtures
 *
 * Alias to Playwright base fixtures. Frontend preflight now runs once in
 * global setup to fail the entire run early with a single clear error.
 */

export { test, expect } from '@playwright/test';

/**
 * Bun Test Guard
 *
 * This script is loaded as a preload by bunfig.toml when `bun test` is invoked.
 * It immediately throws an error directing the user to use `bun run test` instead,
 * which invokes Vitest (the correct test runner for this SvelteKit project).
 *
 * Why: Bun's native test runner cannot process Svelte 5 runes ($state, $derived)
 * in .svelte.ts files because it lacks the SvelteKit Vite plugin. Running `bun test`
 * directly causes all 45 apiGeneratorState tests to fail with "rune_outside_svelte"
 * and Svelte component imports to resolve incorrectly (typeof === 'string').
 *
 * The correct commands are:
 *   bun run test          - Run all unit + integration tests via Vitest
 *   bun run test:unit     - Run unit tests only
 *   bun run test:e2e      - Run E2E tests via Playwright
 */

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.error(`
${RED}${BOLD}ERROR: Do not use \`bun test\` directly.${RESET}

${YELLOW}This project uses Vitest with the SvelteKit Vite plugin, not Bun's native test runner.
Bun's test runner cannot compile .svelte.ts files or process Svelte 5 runes ($state, $derived).${RESET}

${CYAN}${BOLD}Use one of these commands instead:${RESET}
  ${CYAN}bun run test${RESET}              Run all unit + integration tests (Vitest)
  ${CYAN}bun run test:unit${RESET}         Run unit tests only
  ${CYAN}bun run test:unit:watch${RESET}   Run unit tests in watch mode
  ${CYAN}bun run test:coverage${RESET}     Run tests with coverage report
  ${CYAN}bun run test:e2e${RESET}          Run E2E tests (Playwright)
`);

process.exit(1);

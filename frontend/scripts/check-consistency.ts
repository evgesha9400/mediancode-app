#!/usr/bin/env tsx
/**
 * Consistency drift guard: detect stale doc references, missing test mirrors,
 * API contract drift, and test infrastructure mismatches.
 *
 * Checks:
 * 1. Stale path references in documentation files (README, CLAUDE.md, PR template, test docs)
 * 2. Unit test mirror coverage for src/lib/ files
 * 3. CamelCase query param keys in API client files (must use snake_case)
 * 4. Wrong base path in test setup files (/api instead of /v1)
 *
 * Run: bun run lint:consistency
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const errors: string[] = [];

// ============================================================================
// CHECK 1: Stale documentation references
// ============================================================================

/** Patterns that must NOT appear in any documentation file. */
const STALE_PATTERNS = [
	{ pattern: 'tests/e2e/scenarios', reason: 'Old test directory — use tests/smoke/ or tests/e2e/crud/' },
	{ pattern: 'tests/e2e/page-objects', reason: 'Page objects live at tests/page-objects/' },
	{ pattern: 'docs/PAGES_AND_FEATURES.md', reason: 'File was removed' },
	{ pattern: 'docs/testing.md', reason: 'File was removed' },
	{ pattern: 'docs/api-spec-guide.md', reason: 'File was removed' },
	{ pattern: 'VITE_CLERK_PUBLISHABLE_KEY', reason: 'Renamed to PUBLIC_CLERK_PUBLISHABLE_KEY' },
];

/** Files to scan for stale references. */
const DOC_FILES = [
	'README.md',
	'CLAUDE.md',
	'.github/PULL_REQUEST_TEMPLATE.md',
	'tests/README.md',
	'tests/e2e/E2E_TESTING_GUIDE.md',
];

function checkStaleReferences() {
	for (const relPath of DOC_FILES) {
		const absPath = path.join(ROOT, relPath);
		if (!fs.existsSync(absPath)) continue;

		const content = fs.readFileSync(absPath, 'utf-8');
		const lines = content.split('\n');

		for (const { pattern, reason } of STALE_PATTERNS) {
			lines.forEach((line, idx) => {
				if (line.includes(pattern)) {
					errors.push(`${relPath}:${idx + 1}: stale reference "${pattern}" — ${reason}`);
				}
			});
		}
	}
}

// ============================================================================
// CHECK 2: Unit test mirror coverage
// ============================================================================

const SRC_LIB = path.join(ROOT, 'src', 'lib');
const TESTS_UNIT_LIB = path.join(ROOT, 'tests', 'unit', 'lib');
const SOURCE_EXTENSIONS = ['.ts', '.svelte'];

/** Files/directories excluded from mirror requirement. */
const MIRROR_EXCLUSIONS = new Set([
	'index.ts',              // barrel exports
	'index.typecheck.ts',    // compile sentinel
]);

function walk(dirPath: string): string[] {
	if (!fs.existsSync(dirPath)) return [];
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...walk(fullPath));
		} else if (
			SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext)) &&
			!entry.name.endsWith('.d.ts') &&
			!MIRROR_EXCLUSIONS.has(entry.name)
		) {
			files.push(fullPath);
		}
	}
	return files;
}

function checkTestMirrors() {
	const sourceFiles = walk(SRC_LIB);
	const missing: string[] = [];

	for (const srcFile of sourceFiles) {
		const relToLib = path.relative(SRC_LIB, srcFile);

		// Derive expected test path: strip .svelte.ts → .test.ts, .svelte → .test.ts, .ts → .test.ts
		let testRel = relToLib;
		if (testRel.endsWith('.svelte.ts')) {
			testRel = testRel.replace(/\.svelte\.ts$/, '.test.ts');
		} else if (testRel.endsWith('.svelte')) {
			testRel = testRel.replace(/\.svelte$/, '.test.ts');
		} else {
			testRel = testRel.replace(/\.ts$/, '.test.ts');
		}

		const testPath = path.join(TESTS_UNIT_LIB, testRel);
		if (!fs.existsSync(testPath)) {
			missing.push(`src/lib/${relToLib} → tests/unit/lib/${testRel}`);
		}
	}

	if (missing.length > 0) {
		errors.push(
			`${missing.length} src/lib file(s) missing mirrored unit tests:\n` +
			missing.map(m => `  ${m}`).join('\n')
		);
	}
}

// ============================================================================
// CHECK 3: CamelCase query param keys in API client files
// ============================================================================

/** Matches query param patterns like `?namespaceId=` or `&namespaceId=` (camelCase keys). */
const CAMEL_CASE_QUERY_PARAM = /[?&][a-z]+[A-Z][a-zA-Z]*=/;

/** Known exceptions for camelCase query params (should be empty after full alignment). */
const QUERY_PARAM_EXCEPTIONS = new Set<string>();

function checkApiQueryParams() {
	const apiDir = path.join(ROOT, 'src', 'lib', 'api');
	if (!fs.existsSync(apiDir)) return;

	const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.ts'));

	for (const file of files) {
		if (QUERY_PARAM_EXCEPTIONS.has(file)) continue;

		const absPath = path.join(apiDir, file);
		const content = fs.readFileSync(absPath, 'utf-8');
		const lines = content.split('\n');

		lines.forEach((line, idx) => {
			const match = line.match(CAMEL_CASE_QUERY_PARAM);
			if (match) {
				errors.push(
					`src/lib/api/${file}:${idx + 1}: camelCase query param key "${match[0]}" — use snake_case (e.g. namespace_id)`
				);
			}
		});
	}
}

// ============================================================================
// CHECK 4: Test infrastructure base path
// ============================================================================

/** The wrong base path pattern that should not appear in test setup/config. */
const WRONG_BASE_PATHS = [
	{ pattern: /localhost:\d+\/api(?![-_])/g, reason: 'Use /v1 base path, not /api' },
];

const TEST_SETUP_FILES = [
	'tests/setup/vitestSetup.ts',
];

function checkTestBasePath() {
	for (const relPath of TEST_SETUP_FILES) {
		const absPath = path.join(ROOT, relPath);
		if (!fs.existsSync(absPath)) continue;

		const content = fs.readFileSync(absPath, 'utf-8');
		const lines = content.split('\n');

		for (const { pattern, reason } of WRONG_BASE_PATHS) {
			lines.forEach((line, idx) => {
				// Reset regex lastIndex for global patterns
				pattern.lastIndex = 0;
				if (pattern.test(line)) {
					errors.push(`${relPath}:${idx + 1}: ${reason}`);
				}
			});
		}
	}
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
	console.log('Checking consistency...');

	checkStaleReferences();
	checkTestMirrors();
	checkApiQueryParams();
	checkTestBasePath();

	if (errors.length === 0) {
		console.log('All consistency checks passed!');
		process.exit(0);
	} else {
		console.error(`Found ${errors.length} consistency issue(s):\n`);
		errors.forEach(e => console.error(`  ${e}\n`));
		process.exit(1);
	}
}

main();

#!/usr/bin/env tsx
/**
 * Dead code guard: detect orphan source files in src/.
 *
 * Scope:
 * - Includes: TypeScript and Svelte source files under src/
 * - Excludes: *.d.ts
 * - Resolves only local imports: $lib/*, ./, ../
 *
 * This check is intentionally file-level (orphan modules), not symbol-level
 * (unused exports).
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const SOURCE_EXTENSIONS = ['.ts', '.svelte'];
const INDEX_FILES = ['index.ts', 'index.svelte'];

function toPosix(filePath: string): string {
	return filePath.replace(/\\/g, '/');
}

function isSourceFile(filePath: string): boolean {
	const normalized = toPosix(filePath);
	if (normalized.endsWith('.d.ts')) return false;
	return SOURCE_EXTENSIONS.some((ext) => normalized.endsWith(ext));
}

function walk(dirPath: string): string[] {
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	const files: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			files.push(...walk(fullPath));
			continue;
		}

		if (entry.isFile() && isSourceFile(fullPath)) {
			files.push(path.resolve(fullPath));
		}
	}

	return files;
}

function resolveImport(fromFile: string, specifier: string, sourceSet: Set<string>): string | null {
	const candidateBases: string[] = [];

	if (specifier === '$lib') {
		candidateBases.push(path.join(SRC_DIR, 'lib'));
	} else if (specifier.startsWith('$lib/')) {
		candidateBases.push(path.join(SRC_DIR, 'lib', specifier.slice('$lib/'.length)));
	} else if (specifier.startsWith('./') || specifier.startsWith('../')) {
		candidateBases.push(path.resolve(path.dirname(fromFile), specifier));
	} else {
		return null;
	}

	const candidates: string[] = [];
	for (const base of candidateBases) {
		candidates.push(path.resolve(base));
		for (const ext of SOURCE_EXTENSIONS) {
			candidates.push(path.resolve(`${base}${ext}`));
		}
		for (const indexFile of INDEX_FILES) {
			candidates.push(path.resolve(path.join(base, indexFile)));
		}
	}

	for (const candidate of candidates) {
		if (sourceSet.has(candidate)) {
			return candidate;
		}
	}

	return null;
}

function shouldExcludeFromOrphanCheck(relativePath: string): boolean {
	// Route files are app entrypoints (file-system routing).
	if (relativePath.startsWith('src/routes/')) return true;

	// Compile-time verification files are intentionally import-free.
	if (relativePath.endsWith('.typecheck.ts')) return true;

	// Explicitly listed known app entrypoints.
	if (relativePath === 'src/app.html') return true;
	if (relativePath === 'src/app.css') return true;
	if (relativePath === 'src/app.d.ts') return true;

	return false;
}

function collectImportSpecifiers(fileText: string): string[] {
	const specifiers: string[] = [];

	const fromRe =
		/\b(?:import|export)\s+(?:type\s+)?[\w*\s{},\n\r]*?\sfrom\s+['"]([^'"]+)['"]/g;
	const bareImportRe = /\bimport\s+['"]([^'"]+)['"]/g;
	const dynamicImportRe = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

	let match: RegExpExecArray | null = null;

	while ((match = fromRe.exec(fileText)) !== null) {
		specifiers.push(match[1]);
	}
	while ((match = bareImportRe.exec(fileText)) !== null) {
		specifiers.push(match[1]);
	}
	while ((match = dynamicImportRe.exec(fileText)) !== null) {
		specifiers.push(match[1]);
	}

	return specifiers;
}

function run(): number {
	const sourceFiles = walk(SRC_DIR);
	const sourceSet = new Set(sourceFiles);
	const inboundCount = new Map<string, number>();

	for (const file of sourceFiles) {
		inboundCount.set(file, 0);
	}

	for (const file of sourceFiles) {
		const text = fs.readFileSync(file, 'utf8');
		const specifiers = collectImportSpecifiers(text);

		for (const specifier of specifiers) {
			const resolved = resolveImport(file, specifier, sourceSet);
			if (!resolved) continue;

			inboundCount.set(resolved, (inboundCount.get(resolved) ?? 0) + 1);
		}
	}

	const orphans = [...inboundCount.entries()]
		.filter(([filePath, count]) => {
			if (count !== 0) return false;
			const relativePath = toPosix(path.relative(ROOT, filePath));
			return !shouldExcludeFromOrphanCheck(relativePath);
		})
		.map(([filePath]) => toPosix(path.relative(ROOT, filePath)))
		.sort((a, b) => a.localeCompare(b));

	if (orphans.length === 0) {
		console.log('lint:dead passed - no orphan source files found.');
		return 0;
	}

	console.error('lint:dead failed - orphan source files detected:');
	for (const orphan of orphans) {
		console.error(`  - ${orphan}`);
	}

	return 1;
}

process.exit(run());

#!/usr/bin/env tsx
/**
 * Pre-flight check for E2E CRUD tests
 *
 * Validates that required environment variables are set before running tests.
 * Usage:
 *   tsx scripts/check-e2e-env.ts
 */

import * as dotenv from 'dotenv';

// Load .env file
dotenv.config();

interface EnvRequirement {
	name: string;
	required: boolean;
	description: string;
	example: string;
}

const requirements: EnvRequirement[] = [
	{
		name: 'E2E_TEST_USER_EMAIL',
		required: true,
		description: 'Email of pre-created test user in Clerk',
		example: 'test@example.com'
	},
	{
		name: 'E2E_TEST_USER_PASSWORD',
		required: true,
		description: 'Password for the test user',
		example: 'SecurePassword123!'
	},
	{
		name: 'PUBLIC_API_BASE_URL',
		required: false,
		description: 'Backend API URL (defaults to localhost)',
		example: 'http://localhost:8001/v1 or https://api-dev.mediancode.com/v1'
	},
	{
		name: 'PUBLIC_CLERK_PUBLISHABLE_KEY',
		required: true,
		description: 'Clerk publishable key',
		example: 'pk_test_xxx'
	}
];

console.log('\n🔍 Checking E2E test environment...\n');

const missing: EnvRequirement[] = [];
const configured: string[] = [];

for (const req of requirements) {
	const value = process.env[req.name];
	const hasValue = value && value.trim().length > 0;

	if (req.required && !hasValue) {
		missing.push(req);
	} else if (hasValue) {
		// Mask sensitive values
		const masked =
			req.name.includes('PASSWORD') || req.name.includes('SECRET')
				? '***'
				: value!.length > 20
					? value!.substring(0, 20) + '...'
					: value;
		configured.push(`  ✅ ${req.name}=${masked}`);
	} else {
		configured.push(`  ⚪ ${req.name} (optional, using default)`);
	}
}

if (configured.length > 0) {
	console.log('Configured:');
	configured.forEach((line) => console.log(line));
	console.log('');
}

if (missing.length > 0) {
	console.error('❌ Missing required environment variables:\n');
	for (const req of missing) {
		console.error(`  ${req.name}`);
		console.error(`    Description: ${req.description}`);
		console.error(`    Example: ${req.example}`);
		console.error('');
	}

	console.error('Add these to your .env file:\n');
	console.error('```');
	for (const req of missing) {
		console.error(`${req.name}=${req.example}`);
	}
	console.error('```\n');

	console.error('💡 Tip: For local development, you can run the backend locally:');
	console.error('   PUBLIC_API_BASE_URL=http://localhost:8001/v1\n');

	process.exit(1);
}

// Show which backend we're testing against
const apiUrl = process.env.PUBLIC_API_BASE_URL || 'https://api-dev.mediancode.com/v1';
const isLocal = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');

console.log(`🎯 Testing against: ${apiUrl}`);
console.log(`   ${isLocal ? '(local backend)' : '(hosted backend)'}\n`);

console.log('✅ All required environment variables are set!\n');

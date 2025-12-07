/**
 * MSW Request Handlers
 *
 * This file defines all Mock Service Worker handlers for API requests.
 * Handlers are consumed by BOTH Vitest (unit/integration) and Playwright (E2E)
 * to ensure deterministic behavior across all test layers.
 *
 * IMPORTANT: All handlers MUST use fixtures from tests/fixtures/
 * Never use inline mock data in handlers.
 */

import { http, HttpResponse } from 'msw';
import {
	mockUsers,
	mockFields,
	mockValidators,
	mockTypes,
	mockApis,
	mockPermissions,
	mockRoles,
	getUserById,
	getFieldById,
	getValidatorByName,
	getTypeByName,
	getApiById
} from '../../fixtures';

/**
 * API Request Handlers
 *
 * These handlers mirror the expected production API structure.
 * Adjust paths as needed when actual API endpoints are defined.
 */
export const handlers = [
	// ============================================
	// User Endpoints
	// ============================================
	http.get('/api/users', () => {
		return HttpResponse.json(mockUsers);
	}),

	http.get('/api/users/:id', ({ params }) => {
		const user = getUserById(params.id as string);
		if (!user) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(user);
	}),

	// ============================================
	// Field Endpoints
	// ============================================
	http.get('/api/fields', () => {
		return HttpResponse.json(mockFields);
	}),

	http.get('/api/fields/:id', ({ params }) => {
		const field = getFieldById(params.id as string);
		if (!field) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(field);
	}),

	http.post('/api/fields', async ({ request }) => {
		const newField = (await request.json()) as Record<string, unknown>;
		return HttpResponse.json(
			{ ...newField, id: `field-${Date.now()}` },
			{ status: 201 }
		);
	}),

	http.put('/api/fields/:id', async ({ params, request }) => {
		const field = getFieldById(params.id as string);
		if (!field) {
			return new HttpResponse(null, { status: 404 });
		}
		const updates = (await request.json()) as Record<string, unknown>;
		return HttpResponse.json({ ...field, ...updates });
	}),

	http.delete('/api/fields/:id', ({ params }) => {
		const field = getFieldById(params.id as string);
		if (!field) {
			return new HttpResponse(null, { status: 404 });
		}
		return new HttpResponse(null, { status: 204 });
	}),

	// ============================================
	// Validator Endpoints
	// ============================================
	http.get('/api/validators', () => {
		return HttpResponse.json(mockValidators);
	}),

	http.get('/api/validators/:name', ({ params }) => {
		const validator = getValidatorByName(params.name as string);
		if (!validator) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(validator);
	}),

	http.post('/api/validators', async ({ request }) => {
		const newValidator = await request.json();
		return HttpResponse.json(newValidator, { status: 201 });
	}),

	http.delete('/api/validators/:name', ({ params }) => {
		const validator = getValidatorByName(params.name as string);
		if (!validator) {
			return new HttpResponse(null, { status: 404 });
		}
		// Only custom validators can be deleted
		if (validator.category !== 'custom') {
			return new HttpResponse(
				JSON.stringify({ error: 'Cannot delete inline validators' }),
				{ status: 400 }
			);
		}
		return new HttpResponse(null, { status: 204 });
	}),

	// ============================================
	// Type Endpoints
	// ============================================
	http.get('/api/types', () => {
		return HttpResponse.json(mockTypes);
	}),

	http.get('/api/types/:name', ({ params }) => {
		const type = getTypeByName(params.name as any);
		if (!type) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(type);
	}),

	// ============================================
	// API Endpoint Management
	// ============================================
	http.get('/api/endpoints', () => {
		return HttpResponse.json(mockApis);
	}),

	http.get('/api/endpoints/:id', ({ params }) => {
		const api = getApiById(params.id as string);
		if (!api) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(api);
	}),

	http.post('/api/endpoints', async ({ request }) => {
		const newApi = (await request.json()) as Record<string, unknown>;
		return HttpResponse.json(
			{ ...newApi, id: `api-${Date.now()}` },
			{ status: 201 }
		);
	}),

	// ============================================
	// Permission & Role Endpoints
	// ============================================
	http.get('/api/permissions', () => {
		return HttpResponse.json(mockPermissions);
	}),

	http.get('/api/roles', () => {
		return HttpResponse.json(mockRoles);
	})
];

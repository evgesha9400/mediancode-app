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
	mockConstraints,
	mockTypes,
	mockApis,
	mockPermissions,
	mockRoles,
	getUserById,
	getFieldById,
	getConstraintByName,
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
	// Constraint Endpoints
	// ============================================
	http.get('/api/constraints', () => {
		return HttpResponse.json(mockConstraints);
	}),

	http.get('/api/constraints/:name', ({ params }) => {
		const constraint = getConstraintByName(params.name as string);
		if (!constraint) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(constraint);
	}),

	http.post('/api/constraints', async ({ request }) => {
		const newConstraint = await request.json();
		return HttpResponse.json(newConstraint, { status: 201 });
	}),

	http.delete('/api/constraints/:name', ({ params }) => {
		const constraint = getConstraintByName(params.name as string);
		if (!constraint) {
			return new HttpResponse(null, { status: 404 });
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

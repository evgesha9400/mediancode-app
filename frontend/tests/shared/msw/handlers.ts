/**
 * MSW Request Handlers
 *
 * This file defines all Mock Service Worker handlers for API requests.
 * Handlers are consumed by BOTH Vitest (unit) and Playwright (E2E)
 * to ensure deterministic behavior across all test layers.
 *
 * IMPORTANT: All handlers MUST use fixtures from tests/fixtures/
 * Never use inline mock data in handlers.
 */

import { http, HttpResponse } from 'msw';
import {
	mockUsers,
	mockFields,
	mockFieldConstraints,
	mockTypes,
	mockPermissions,
	mockRoles,
	getUserById,
	getFieldById,
	getFieldConstraintByName,
	getTypeByName
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
	http.get('/v1/users', () => {
		return HttpResponse.json(mockUsers);
	}),

	http.get('/v1/users/:id', ({ params }) => {
		const user = getUserById(params.id as string);
		if (!user) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(user);
	}),

	// ============================================
	// Field Endpoints
	// ============================================
	http.get('/v1/fields', () => {
		return HttpResponse.json(mockFields);
	}),

	http.get('/v1/fields/:id', ({ params }) => {
		const field = getFieldById(params.id as string);
		if (!field) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(field);
	}),

	http.post('/v1/fields', async ({ request }) => {
		const newField = (await request.json()) as Record<string, unknown>;
		return HttpResponse.json(
			{ ...newField, id: `field-${Date.now()}` },
			{ status: 201 }
		);
	}),

	http.put('/v1/fields/:id', async ({ params, request }) => {
		const field = getFieldById(params.id as string);
		if (!field) {
			return new HttpResponse(null, { status: 404 });
		}
		const updates = (await request.json()) as Record<string, unknown>;
		return HttpResponse.json({ ...field, ...updates });
	}),

	http.delete('/v1/fields/:id', ({ params }) => {
		const field = getFieldById(params.id as string);
		if (!field) {
			return new HttpResponse(null, { status: 404 });
		}
		return new HttpResponse(null, { status: 204 });
	}),

	// ============================================
	// Field Constraint Endpoints
	// ============================================
	http.get('/v1/field-constraints', () => {
		return HttpResponse.json(mockFieldConstraints);
	}),

	http.get('/v1/field-constraints/:name', ({ params }) => {
		const fieldConstraint = getFieldConstraintByName(params.name as string);
		if (!fieldConstraint) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(fieldConstraint);
	}),


	// ============================================
	// Type Endpoints
	// ============================================
	http.get('/v1/types', () => {
		return HttpResponse.json(mockTypes);
	}),

	http.get('/v1/types/:name', ({ params }) => {
		const type = getTypeByName(params.name as any);
		if (!type) {
			return new HttpResponse(null, { status: 404 });
		}
		return HttpResponse.json(type);
	}),

	// ============================================
	// Permission & Role Endpoints
	// ============================================
	http.get('/v1/permissions', () => {
		return HttpResponse.json(mockPermissions);
	}),

	http.get('/v1/roles', () => {
		return HttpResponse.json(mockRoles);
	})
];

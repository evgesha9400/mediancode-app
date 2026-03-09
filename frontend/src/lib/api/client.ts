/**
 * API Client Module
 *
 * Provides a type-safe fetch wrapper that automatically:
 * - Injects Clerk JWT token for authentication
 * - Handles API errors with typed responses
 * - Uses environment-based API URL configuration
 */

import { env } from '$env/dynamic/public';
import { getClerk } from '$lib/clerk';
import { getActiveOrganizationId } from '$lib/stores/organization';

/**
 * API Base URL - configured via environment variable at build time.
 * Uses SvelteKit's PUBLIC_ prefix convention for client-exposed variables.
 *
 * Set PUBLIC_API_BASE_URL in:
 * - .env.local for local development (defaults to localhost:8000)
 * - Vercel Dashboard for deployed environments:
 *   - Preview: https://api.dev.mediancode.com/v1
 *   - Production: https://api.mediancode.com/v1
 */
const API_BASE_URL = env.PUBLIC_API_BASE_URL || 'http://localhost:8000/v1';

/**
 * API error with status code and optional error details
 */
export class ApiError extends Error {
	status: number;
	statusText: string;
	detail?: string;

	constructor(response: Response, detail?: string) {
		super(detail || `API Error: ${response.status} ${response.statusText}`);
		this.name = 'ApiError';
		this.status = response.status;
		this.statusText = response.statusText;
		this.detail = detail;
	}
}

/**
 * Options for API requests, extending standard RequestInit
 */
export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
	body?: unknown;
	skipAuth?: boolean;
}

/**
 * Get the current Clerk session token for API authentication
 */
async function getAuthToken(): Promise<string | null> {
	const clerk = getClerk();
	if (!clerk?.session) {
		return null;
	}

	try {
		const token = await clerk.session.getToken();
		return token;
	} catch (error) {
		console.error('[API Client] Failed to get auth token:', error);
		return null;
	}
}

/**
 * Type-safe API client that wraps fetch with authentication and error handling
 *
 * @param endpoint - API endpoint path (will be appended to API_BASE_URL)
 * @param options - Request options including method, body, headers, etc.
 * @returns Parsed JSON response
 * @throws ApiError if the request fails or returns non-2xx status
 *
 * @example
 * ```ts
 * // GET request
 * const namespaces = await apiClient<Namespace[]>('/namespaces');
 *
 * // POST request with body
 * const newApi = await apiClient<Api>('/apis', {
 *   method: 'POST',
 *   body: { title: 'My API', version: '1.0.0' }
 * });
 * ```
 */
export async function apiClient<T>(
	endpoint: string,
	options: ApiRequestOptions = {}
): Promise<T> {
	const { body, skipAuth = false, ...fetchOptions } = options;

	// Build headers — only set Content-Type when there's a body to avoid
	// unnecessary CORS preflights on GET/DELETE requests
	const headers: HeadersInit = {
		...(body ? { 'Content-Type': 'application/json' } : {}),
		...(options.headers || {})
	};

	// Add authorization header if not skipped
	if (!skipAuth) {
		const token = await getAuthToken();
		if (token) {
			(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
		}
	}

	// Add organization context header if in org mode
	const orgId = getActiveOrganizationId();
	if (orgId) {
		(headers as Record<string, string>)['X-Organization-Id'] = orgId;
	}

	// Build request URL
	const url = `${API_BASE_URL}${endpoint}`;

	// Make the request
	const response = await fetch(url, {
		...fetchOptions,
		headers,
		body: body ? JSON.stringify(body) : undefined
	});

	// Handle non-2xx responses
	if (!response.ok) {
		let detail: string | undefined;
		try {
			const errorBody = await response.json();
			detail = errorBody.detail || errorBody.message;
		} catch {
			// Response body is not JSON or empty
		}
		throw new ApiError(response, detail);
	}

	// Handle 204 No Content
	if (response.status === 204) {
		return undefined as T;
	}

	// Parse and return JSON response
	return response.json();
}

/**
 * Convenience method for GET requests
 */
export function apiGet<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
	return apiClient<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export function apiPost<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
	return apiClient<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * Convenience method for PUT requests
 */
export function apiPut<T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
	return apiClient<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * Convenience method for DELETE requests
 */
export function apiDelete<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<T> {
	return apiClient<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * POST request that returns a Blob (for binary responses like zip files)
 *
 * @param endpoint - API endpoint path
 * @param body - Optional JSON body to send with the request
 * @param options - Additional request options
 */
export async function apiPostBlob(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<Blob> {
	const { skipAuth = false, ...fetchOptions } = options || {};

	const headers: HeadersInit = {
		...(body ? { 'Content-Type': 'application/json' } : {}),
		...(options?.headers || {})
	};

	if (!skipAuth) {
		const token = await getAuthToken();
		if (token) {
			(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
		}
	}

	const orgId = getActiveOrganizationId();
	if (orgId) {
		(headers as Record<string, string>)['X-Organization-Id'] = orgId;
	}

	const url = `${API_BASE_URL}${endpoint}`;

	const response = await fetch(url, {
		...fetchOptions,
		method: 'POST',
		headers,
		body: body ? JSON.stringify(body) : undefined
	});

	if (!response.ok) {
		let detail: string | undefined;
		try {
			const errorBody = await response.json();
			detail = errorBody.detail || errorBody.message;
		} catch {
			// Response body is not JSON or empty
		}
		throw new ApiError(response, detail);
	}

	return response.blob();
}

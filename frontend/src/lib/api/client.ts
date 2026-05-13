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

/** In-flight token fetch — deduplicates concurrent callers. */
let activeTokenRequest: Promise<string | null> | null = null;

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get a Clerk session token.
 * Concurrent callers share one in-flight fetch; Clerk's own cache handles freshness
 * and token rotation, so we don't maintain a separate local cache.
 */
async function getAuthToken(forceRefresh = false): Promise<string | null> {
	if (activeTokenRequest) {
		return activeTokenRequest;
	}

	activeTokenRequest = fetchAuthToken(forceRefresh);
	try {
		return await activeTokenRequest;
	} finally {
		activeTokenRequest = null;
	}
}

async function fetchAuthToken(skipCache = false): Promise<string | null> {
	const clerk = getClerk();
	if (!clerk) {
		return null;
	}

	// After a full page load, `user` is often set before `session` is attached.
	// Without waiting, we send unauthenticated requests (403/401) until Retry.
	const delayMs = 50;
	const maxSessionWait = 20;
	if (clerk.user) {
		for (let i = 0; i < maxSessionWait && !clerk.session; i++) {
			await sleep(delayMs);
		}
	}

	if (!clerk.session) {
		return null;
	}

	const maxTokenAttempts = 3;
	for (let attempt = 0; attempt < maxTokenAttempts; attempt++) {
		try {
			const token = await clerk.session.getToken(skipCache ? { skipCache: true } : undefined);
			if (token) {
				return token;
			}
		} catch (error) {
			console.error('[API Client] Failed to get auth token:', error);
		}
		if (attempt < maxTokenAttempts - 1) {
			await sleep(delayMs);
		}
	}
	return null;
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
	options: ApiRequestOptions = {},
	_retried = false
): Promise<T> {
	const { body, skipAuth = false, ...fetchOptions } = options;

	// Build headers — only set Content-Type when there's a body to avoid
	// unnecessary CORS preflights on GET/DELETE requests
	const headers: HeadersInit = {
		...(body ? { 'Content-Type': 'application/json' } : {}),
		...(options.headers || {})
	};

	// Add authorization header if not skipped
	// On retry (_retried), force-refresh bypasses both local + Clerk cache
	let hadAuthHeader = false;
	if (!skipAuth) {
		const token = await getAuthToken(_retried);
		if (token) {
			(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
			hadAuthHeader = true;
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

	// On 401, force-refresh the token and retry once. Handles two cases:
	// 1. Stale token (Clerk listener refreshed session mid-flight)
	// 2. Clock skew — Clerk's iat is ahead of backend clock ("not yet valid")
	//    The 1s delay lets the backend clock catch up to the JWT's iat.
	// 403 without Authorization: some stacks / proxies report missing bearer as 403.
	if (
		(response.status === 401 || (response.status === 403 && !hadAuthHeader)) &&
		!skipAuth &&
		!_retried
	) {
		await sleep(1000);
		return apiClient<T>(endpoint, options, true);
	}

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

export interface BlobResponse {
	blob: Blob;
	filename: string | null;
}

/**
 * POST request that returns a Blob with the server-provided filename
 * (for binary responses like zip files)
 *
 * @param endpoint - API endpoint path
 * @param body - Optional JSON body to send with the request
 * @param options - Additional request options
 */
export async function apiPostBlob(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>, _retried = false): Promise<BlobResponse> {
	const { skipAuth = false, ...fetchOptions } = options || {};

	const headers: HeadersInit = {
		...(body ? { 'Content-Type': 'application/json' } : {}),
		...(options?.headers || {})
	};

	let hadAuthHeader = false;
	if (!skipAuth) {
		const token = await getAuthToken(_retried);
		if (token) {
			(headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
			hadAuthHeader = true;
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

	if (
		(response.status === 401 || (response.status === 403 && !hadAuthHeader)) &&
		!skipAuth &&
		!_retried
	) {
		await sleep(1000);
		return apiPostBlob(endpoint, body, options, true);
	}

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

	const disposition = response.headers.get('Content-Disposition');
	const filenameMatch = disposition?.match(/filename="(.+?)"/);

	return {
		blob: await response.blob(),
		filename: filenameMatch?.[1] ?? null
	};
}

/**
 * API Client for E2E Tests
 *
 * Provides direct API calls for test setup, verification, and cleanup.
 * Uses the auth token from Playwright session to authenticate requests.
 *
 * This client is used to:
 * 1. Set up test data before tests
 * 2. Verify data state during tests
 * 3. Clean up test data after tests
 * 4. Bypass UI when direct API manipulation is faster
 */

import type { Page, APIRequestContext } from '@playwright/test';

/**
 * API base URL - defaults to dev API
 */
const API_BASE_URL = process.env.E2E_API_BASE_URL || 'https://api.dev.mediancode.com/v1';

/**
 * Generic API response wrapper
 */
interface ApiResponse<T> {
	data?: T;
	error?: string;
	status: number;
}

/**
 * Field entity from the API
 */
export interface ApiField {
	id: string;
	name: string;
	type: string;
	description?: string;
	default_value?: string;
	validators?: string[];
	namespace_id?: string;
}

/**
 * Object entity from the API
 */
export interface ApiObject {
	id: string;
	name: string;
	description?: string;
	namespace_id: string;
	fields?: Array<{ field_id: string; required: boolean }>;
}

/**
 * API entity from the API
 */
export interface ApiEntity {
	id: string;
	name: string;
	description?: string;
	version?: string;
}

/**
 * Namespace entity from the API
 */
export interface ApiNamespace {
	id: string;
	name: string;
	description?: string;
}

/**
 * Endpoint entity from the API
 */
export interface ApiEndpoint {
	id: string;
	name: string;
	path: string;
	method: string;
	api_id: string;
	description?: string;
}

/**
 * E2E API Client
 *
 * Provides methods to interact with the backend API directly.
 * Requires an authenticated Playwright request context.
 */
export class E2EApiClient {
	private request: APIRequestContext;
	private baseUrl: string;

	constructor(request: APIRequestContext, baseUrl: string = API_BASE_URL) {
		this.request = request;
		this.baseUrl = baseUrl;
	}

	/**
	 * Create a new E2EApiClient from a Playwright page
	 * Extracts cookies/auth from the page context
	 */
	static async fromPage(page: Page): Promise<E2EApiClient> {
		const request = page.context().request;
		return new E2EApiClient(request);
	}

	// ============================================================================
	// Fields API
	// ============================================================================

	async listFields(): Promise<ApiResponse<ApiField[]>> {
		const response = await this.request.get(`${this.baseUrl}/fields`);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async createField(field: Omit<ApiField, 'id'>): Promise<ApiResponse<ApiField>> {
		const response = await this.request.post(`${this.baseUrl}/fields`, {
			data: field
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async getField(id: string): Promise<ApiResponse<ApiField>> {
		const response = await this.request.get(`${this.baseUrl}/fields/${id}`);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async updateField(id: string, field: Partial<ApiField>): Promise<ApiResponse<ApiField>> {
		const response = await this.request.patch(`${this.baseUrl}/fields/${id}`, {
			data: field
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async deleteField(id: string): Promise<ApiResponse<void>> {
		const response = await this.request.delete(`${this.baseUrl}/fields/${id}`);
		return {
			status: response.status(),
			error: response.ok() ? undefined : await response.text()
		};
	}

	// ============================================================================
	// Objects API
	// ============================================================================

	async listObjects(): Promise<ApiResponse<ApiObject[]>> {
		const response = await this.request.get(`${this.baseUrl}/objects`);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async createObject(object: Omit<ApiObject, 'id'>): Promise<ApiResponse<ApiObject>> {
		const response = await this.request.post(`${this.baseUrl}/objects`, {
			data: object
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async getObject(id: string): Promise<ApiResponse<ApiObject>> {
		const response = await this.request.get(`${this.baseUrl}/objects/${id}`);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async updateObject(id: string, object: Partial<ApiObject>): Promise<ApiResponse<ApiObject>> {
		const response = await this.request.patch(`${this.baseUrl}/objects/${id}`, {
			data: object
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async deleteObject(id: string): Promise<ApiResponse<void>> {
		const response = await this.request.delete(`${this.baseUrl}/objects/${id}`);
		return {
			status: response.status(),
			error: response.ok() ? undefined : await response.text()
		};
	}

	// ============================================================================
	// APIs API
	// ============================================================================

	async listApis(): Promise<ApiResponse<ApiEntity[]>> {
		const response = await this.request.get(`${this.baseUrl}/apis`);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async createApi(api: Omit<ApiEntity, 'id'>): Promise<ApiResponse<ApiEntity>> {
		const response = await this.request.post(`${this.baseUrl}/apis`, {
			data: api
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async getApi(id: string): Promise<ApiResponse<ApiEntity>> {
		const response = await this.request.get(`${this.baseUrl}/apis/${id}`);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async updateApi(id: string, api: Partial<ApiEntity>): Promise<ApiResponse<ApiEntity>> {
		const response = await this.request.patch(`${this.baseUrl}/apis/${id}`, {
			data: api
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async deleteApi(id: string): Promise<ApiResponse<void>> {
		const response = await this.request.delete(`${this.baseUrl}/apis/${id}`);
		return {
			status: response.status(),
			error: response.ok() ? undefined : await response.text()
		};
	}

	// ============================================================================
	// Namespaces API
	// ============================================================================

	async listNamespaces(): Promise<ApiResponse<ApiNamespace[]>> {
		const response = await this.request.get(`${this.baseUrl}/namespaces`);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async createNamespace(namespace: Omit<ApiNamespace, 'id'>): Promise<ApiResponse<ApiNamespace>> {
		const response = await this.request.post(`${this.baseUrl}/namespaces`, {
			data: namespace
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async getNamespace(id: string): Promise<ApiResponse<ApiNamespace>> {
		const response = await this.request.get(`${this.baseUrl}/namespaces/${id}`);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async updateNamespace(
		id: string,
		namespace: Partial<ApiNamespace>
	): Promise<ApiResponse<ApiNamespace>> {
		const response = await this.request.patch(`${this.baseUrl}/namespaces/${id}`, {
			data: namespace
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async deleteNamespace(id: string): Promise<ApiResponse<void>> {
		const response = await this.request.delete(`${this.baseUrl}/namespaces/${id}`);
		return {
			status: response.status(),
			error: response.ok() ? undefined : await response.text()
		};
	}

	// ============================================================================
	// Endpoints API
	// ============================================================================

	async listEndpoints(apiId?: string): Promise<ApiResponse<ApiEndpoint[]>> {
		const url = apiId ? `${this.baseUrl}/endpoints?api_id=${apiId}` : `${this.baseUrl}/endpoints`;
		const response = await this.request.get(url);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async createEndpoint(endpoint: Omit<ApiEndpoint, 'id'>): Promise<ApiResponse<ApiEndpoint>> {
		const response = await this.request.post(`${this.baseUrl}/endpoints`, {
			data: endpoint
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async getEndpoint(id: string): Promise<ApiResponse<ApiEndpoint>> {
		const response = await this.request.get(`${this.baseUrl}/endpoints/${id}`);
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async updateEndpoint(
		id: string,
		endpoint: Partial<ApiEndpoint>
	): Promise<ApiResponse<ApiEndpoint>> {
		const response = await this.request.patch(`${this.baseUrl}/endpoints/${id}`, {
			data: endpoint
		});
		return {
			status: response.status(),
			data: response.ok() ? await response.json() : undefined,
			error: response.ok() ? undefined : await response.text()
		};
	}

	async deleteEndpoint(id: string): Promise<ApiResponse<void>> {
		const response = await this.request.delete(`${this.baseUrl}/endpoints/${id}`);
		return {
			status: response.status(),
			error: response.ok() ? undefined : await response.text()
		};
	}

	// ============================================================================
	// Cleanup Utilities
	// ============================================================================

	/**
	 * Delete all entities matching a filter predicate
	 * Useful for cleaning up E2E test data
	 */
	async cleanupFields(filter: (field: ApiField) => boolean): Promise<number> {
		const response = await this.listFields();
		if (!response.data) return 0;

		const toDelete = response.data.filter(filter);
		let deleted = 0;

		for (const field of toDelete) {
			const result = await this.deleteField(field.id);
			if (result.status === 200 || result.status === 204) {
				deleted++;
			}
		}

		return deleted;
	}

	async cleanupObjects(filter: (obj: ApiObject) => boolean): Promise<number> {
		const response = await this.listObjects();
		if (!response.data) return 0;

		const toDelete = response.data.filter(filter);
		let deleted = 0;

		for (const obj of toDelete) {
			const result = await this.deleteObject(obj.id);
			if (result.status === 200 || result.status === 204) {
				deleted++;
			}
		}

		return deleted;
	}

	async cleanupApis(filter: (api: ApiEntity) => boolean): Promise<number> {
		const response = await this.listApis();
		if (!response.data) return 0;

		const toDelete = response.data.filter(filter);
		let deleted = 0;

		for (const api of toDelete) {
			const result = await this.deleteApi(api.id);
			if (result.status === 200 || result.status === 204) {
				deleted++;
			}
		}

		return deleted;
	}

	async cleanupNamespaces(filter: (ns: ApiNamespace) => boolean): Promise<number> {
		const response = await this.listNamespaces();
		if (!response.data) return 0;

		const toDelete = response.data.filter(filter);
		let deleted = 0;

		for (const ns of toDelete) {
			const result = await this.deleteNamespace(ns.id);
			if (result.status === 200 || result.status === 204) {
				deleted++;
			}
		}

		return deleted;
	}
}

/**
 * API Client for E2E Tests
 *
 * Provides direct API calls for test setup, verification, and cleanup.
 * Extracts the Clerk JWT from the browser page to authenticate requests.
 *
 * Uses native fetch (not Playwright's APIRequestContext) to avoid
 * interference with Clerk's route interception on the browser context.
 */

import type { Page } from '@playwright/test';

const API_BASE_URL = process.env.PUBLIC_API_BASE_URL || 'http://localhost:8001/v1';
const API_TIMEOUT = 30_000;

interface ApiResponse<T> {
	data?: T;
	error?: string;
	status: number;
}

export interface ApiField {
	id: string;
	name: string;
	type: string;
	description?: string;
	default_value?: string;
	constraints?: string[];
	namespace_id?: string;
}

export interface ApiObject {
	id: string;
	name: string;
	description?: string;
	namespace_id: string;
	fields?: Array<{ field_id: string; required: boolean }>;
}

export interface ApiEntity {
	id: string;
	title: string;
	description?: string;
	version?: string;
	namespaceId?: string;
}

export interface ApiNamespace {
	id: string;
	name: string;
	description?: string;
	isDefault?: boolean;
	locked?: boolean;
}

export interface ApiEndpoint {
	id: string;
	name: string;
	path: string;
	method: string;
	api_id: string;
	description?: string;
}

export class E2EApiClient {
	private baseUrl: string;
	private authToken: string;

	constructor(authToken: string, baseUrl: string = API_BASE_URL) {
		this.authToken = authToken;
		this.baseUrl = baseUrl;
	}

	/**
	 * Create from a Playwright page. Extracts the Clerk JWT so API calls are authenticated.
	 */
	static async fromPage(page: Page): Promise<E2EApiClient> {
		const token = await page.evaluate(async () => {
			const clerk = (window as any).Clerk;
			if (!clerk?.session) throw new Error('Clerk session not available');
			return clerk.session.getToken();
		});
		if (!token) throw new Error('Failed to get Clerk session token from page');

		return new E2EApiClient(token);
	}

	// ---- internal helpers ----

	private headers() {
		return { Authorization: `Bearer ${this.authToken}`, 'Content-Type': 'application/json' };
	}

	private async get<T>(path: string): Promise<ApiResponse<T>> {
		const r = await fetch(`${this.baseUrl}${path}`, {
			headers: this.headers(),
			signal: AbortSignal.timeout(API_TIMEOUT)
		});
		return { status: r.status, data: r.ok ? ((await r.json()) as T) : undefined, error: r.ok ? undefined : await r.text() };
	}

	private async post<T>(path: string, data: unknown): Promise<ApiResponse<T>> {
		const r = await fetch(`${this.baseUrl}${path}`, {
			method: 'POST',
			headers: this.headers(),
			body: JSON.stringify(data),
			signal: AbortSignal.timeout(API_TIMEOUT)
		});
		return { status: r.status, data: r.ok ? ((await r.json()) as T) : undefined, error: r.ok ? undefined : await r.text() };
	}

	private async patch<T>(path: string, data: unknown): Promise<ApiResponse<T>> {
		const r = await fetch(`${this.baseUrl}${path}`, {
			method: 'PATCH',
			headers: this.headers(),
			body: JSON.stringify(data),
			signal: AbortSignal.timeout(API_TIMEOUT)
		});
		return { status: r.status, data: r.ok ? ((await r.json()) as T) : undefined, error: r.ok ? undefined : await r.text() };
	}

	private async put<T>(path: string, data: unknown): Promise<ApiResponse<T>> {
		const r = await fetch(`${this.baseUrl}${path}`, {
			method: 'PUT',
			headers: this.headers(),
			body: JSON.stringify(data),
			signal: AbortSignal.timeout(API_TIMEOUT)
		});
		return { status: r.status, data: r.ok ? ((await r.json()) as T) : undefined, error: r.ok ? undefined : await r.text() };
	}

	private async del(path: string): Promise<ApiResponse<void>> {
		const r = await fetch(`${this.baseUrl}${path}`, {
			method: 'DELETE',
			headers: this.headers(),
			signal: AbortSignal.timeout(API_TIMEOUT)
		});
		return { status: r.status, error: r.ok ? undefined : await r.text() };
	}

	// ---- Fields ----

	async listFields() { return this.get<ApiField[]>('/fields'); }
	async createField(field: Omit<ApiField, 'id'>) { return this.post<ApiField>('/fields', field); }
	async getField(id: string) { return this.get<ApiField>(`/fields/${id}`); }
	async updateField(id: string, field: Partial<ApiField>) { return this.patch<ApiField>(`/fields/${id}`, field); }
	async deleteField(id: string) { return this.del(`/fields/${id}`); }

	// ---- Objects ----

	async listObjects() { return this.get<ApiObject[]>('/objects'); }
	async createObject(obj: Omit<ApiObject, 'id'>) { return this.post<ApiObject>('/objects', obj); }
	async getObject(id: string) { return this.get<ApiObject>(`/objects/${id}`); }
	async updateObject(id: string, obj: Partial<ApiObject>) { return this.patch<ApiObject>(`/objects/${id}`, obj); }
	async deleteObject(id: string) { return this.del(`/objects/${id}`); }

	// ---- APIs ----

	async listApis() { return this.get<ApiEntity[]>('/apis'); }
	async createApi(api: Omit<ApiEntity, 'id'>) { return this.post<ApiEntity>('/apis', api); }
	async getApi(id: string) { return this.get<ApiEntity>(`/apis/${id}`); }
	async updateApi(id: string, api: Partial<ApiEntity>) { return this.patch<ApiEntity>(`/apis/${id}`, api); }
	async deleteApi(id: string) { return this.del(`/apis/${id}`); }

	// ---- Namespaces ----

	async listNamespaces() { return this.get<ApiNamespace[]>('/namespaces'); }
	async createNamespace(ns: Omit<ApiNamespace, 'id'>) { return this.post<ApiNamespace>('/namespaces', ns); }
	async getNamespace(id: string) { return this.get<ApiNamespace>(`/namespaces/${id}`); }
	async updateNamespace(id: string, ns: Partial<ApiNamespace>) { return this.put<ApiNamespace>(`/namespaces/${id}`, ns); }
	async deleteNamespace(id: string) { return this.del(`/namespaces/${id}`); }

	// ---- Endpoints ----

	async listEndpoints(namespaceId?: string) { return this.get<ApiEndpoint[]>(namespaceId ? `/endpoints?namespace_id=${namespaceId}` : '/endpoints'); }
	async createEndpoint(ep: Omit<ApiEndpoint, 'id'>) { return this.post<ApiEndpoint>('/endpoints', ep); }
	async getEndpoint(id: string) { return this.get<ApiEndpoint>(`/endpoints/${id}`); }
	async updateEndpoint(id: string, ep: Partial<ApiEndpoint>) { return this.patch<ApiEndpoint>(`/endpoints/${id}`, ep); }
	async deleteEndpoint(id: string) { return this.del(`/endpoints/${id}`); }

	// ---- Bulk cleanup (call at start of tests) ----

	async deleteAllFields(): Promise<number> {
		const { data } = await this.listFields();
		if (!data?.length) return 0;
		let n = 0;
		for (const f of data) { const r = await this.deleteField(f.id); if (r.status === 200 || r.status === 204) n++; }
		return n;
	}

	async deleteAllObjects(): Promise<number> {
		const { data } = await this.listObjects();
		if (!data?.length) return 0;
		let n = 0;
		for (const o of data) { const r = await this.deleteObject(o.id); if (r.status === 200 || r.status === 204) n++; }
		return n;
	}

	async deleteAllApis(): Promise<number> {
		const { data } = await this.listApis();
		if (!data?.length) return 0;
		let n = 0;
		for (const a of data) { const r = await this.deleteApi(a.id); if (r.status === 200 || r.status === 204) n++; }
		return n;
	}

	async deleteAllNamespaces(): Promise<number> {
		const { data } = await this.listNamespaces();
		if (!data?.length) return 0;
		let n = 0;
		for (const ns of data) { const r = await this.deleteNamespace(ns.id); if (r.status === 200 || r.status === 204) n++; }
		return n;
	}
}

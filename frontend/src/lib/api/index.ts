/**
 * API Services Index
 *
 * Re-exports all API service functions for convenient imports.
 */

// Client
export { apiClient, apiGet, apiPost, apiPut, apiDelete, ApiError } from './client';
export type { ApiRequestOptions } from './client';

// Entity services
export * from './namespaces';
export * from './apis';
export * from './types';
export * from './validators';
export * from './fields';
export * from './objects';
export * from './endpoints';

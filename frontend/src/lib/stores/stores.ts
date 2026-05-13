// src/lib/stores/stores.ts
//
// Public store barrel — keeps the existing import surface while delegating
// state, selectors, and store-produced types to focused modules.

export * from './storeTypes';
export * from './storeState';
export * from './storeSelectors';
export { GLOBAL_NAMESPACE_ID } from '$lib/utils/namespace';

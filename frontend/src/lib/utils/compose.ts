// src/lib/utils/compose.ts
//
// State composition utility for Svelte 5 reactive objects.
//
// When factories return objects with getter/setter property descriptors
// (the standard pattern for Svelte 5 rune-based state), plain object
// spread (`{ ...a, ...b }`) evaluates the getters at spread time,
// producing static snapshots that break reactivity.
//
// composeState uses Object.defineProperties to preserve the original
// getter/setter descriptors on a fresh target object, keeping reactivity
// intact across composition boundaries.

/**
 * Compose two objects preserving getter/setter property descriptors.
 *
 * This is designed for combining a base ListViewState with entity-specific
 * CRUD state without manually forwarding every property. Properties from
 * `extension` take precedence when keys collide.
 *
 * @example
 * ```ts
 * return composeState(listState, {
 *   get isSaving() { return isSaving; },
 *   closeDrawer,
 *   handleSave,
 * }) as MyModelState;
 * ```
 */
export function composeState<Base extends object, Extension extends object>(
  base: Base,
  extension: Extension
): Base & Extension {
  const target = {} as Base & Extension;
  Object.defineProperties(target, Object.getOwnPropertyDescriptors(base));
  Object.defineProperties(target, Object.getOwnPropertyDescriptors(extension));
  return target;
}

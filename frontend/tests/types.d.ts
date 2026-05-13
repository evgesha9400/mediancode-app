// Type declarations for test-only imports

// Svelte 5 internal client module used for effect_root() in rune-based tests.
// effect_root creates a root effect context so $effect runes can run outside
// of Svelte component initialization (required for unit testing .svelte.ts factories).
declare module 'svelte/internal/client' {
  /**
   * Creates a root effect context. Returns a cleanup function that destroys
   * all effects created within the root.
   */
  export function effect_root(fn: () => void): () => void;
}

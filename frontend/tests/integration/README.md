# Integration Tests

## Svelte 5 Component Rendering Limitation

**Status:** Blocked — Svelte 5 components using `$props()` cannot be rendered in jsdom.

### What was attempted

Route-level integration tests (fields, objects, apis, types, field-constraints pages) that
would mount Svelte 5 components with `@testing-library/svelte` in a jsdom environment.

### Why it fails

Svelte 5 introduced runes (`$state`, `$derived`, `$effect`) and the `$props()` pattern.
These require a real browser environment or Vitest browser mode to function. The `mount()`
function from `@testing-library/svelte` does not work in jsdom for components using `$props()`.

### Documented in

- `tests/unit/lib/components/table/Table.test.ts` — existing unit test documenting the limitation
- Svelte 5 migration guide acknowledges jsdom incompatibility with rune-based components

### Alternatives

1. **E2E tests via Playwright** — already cover route-level rendering comprehensively
2. **Vitest browser mode** — would enable component integration tests but requires additional
   infrastructure (browser install, CI configuration)
3. **Unit tests for store logic** — already covered in `tests/unit/lib/stores/` with full
   store selector and mutation testing

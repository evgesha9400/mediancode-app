# Endpoint-owned query semantics

Median Code endpoints own their filter and pagination facts directly. Query parameters and path parameters should reference the target Object's Field Members, not reusable query Objects or global Field definitions, because endpoint filtering is endpoint behavior and there is no current need for shared filter definitions that change multiple endpoints together.

**Status**: accepted

**Consequences**:

- The Endpoint contract should model query parameter name, target Field Member reference, filter operator, requiredness, and pagination directly.
- Query filters default to optional from the client perspective. Required query filters are explicit Endpoint Query Semantics and should be represented as `required`, not inverted `optional`, in persistence and schemas.
- Endpoints that do not filter have no query parameters; DELETE Endpoints should not have query parameters.
- This refactor keeps one target Object per Endpoint; path and query parameter Field Members must belong to that target Object.
- Endpoint parameter persistence should reference Field Members directly.
- DTO-style Endpoints with separate request, response, and target Objects are a valid future direction, but should be explored and recorded as a separate architecture decision rather than mixed into this refactor.
- The implementation should follow the Architecture Transition Rule: rewrite the persistence model, schemas, API Design Snapshot, Generation Target adapter, frontend store/API modules, tests, and migrations in one coherent refactor with no internal compatibility shims or parallel query Object path.
- Reusable filter definitions should be introduced only through a future architecture decision backed by real reuse requirements.

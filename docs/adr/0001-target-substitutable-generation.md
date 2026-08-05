# Target-substitutable generation

Median Code's architecture must treat FastAPI, SQLAlchemy, PostgreSQL, AWS CDK, and the current generated test modules as initial Generation Targets, not as the permanent shape of the product. Core design modules should keep portable API, Object Membership, and Relationship Derivation semantics separate from target-specific artifact names and rendering rules, so future adapters can generate different deploy artifacts, databases, test modules, frameworks, and languages without rewriting the design model.

**Status**: accepted

**Consequences**:

- Relationship Derivation should return portable semantic facts, not SQLAlchemy/PostgreSQL-specific field, table, or constraint rendering.
- Generation Targets own concrete representation choices such as foreign key field names, junction table names, imports, framework syntax, cloud artifact layout, and test module structure.
- When two Generation Targets share naming or rendering rules, those rules should be centralized in a target-neutral or target-family module instead of duplicated in each adapter.

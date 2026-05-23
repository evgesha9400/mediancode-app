# Mediancode Context

Domain language for the Mediancode backend. Use these names when discussing generated FastAPI project design and the persisted API design model.

## Language

**API**:
A user-defined service specification stored in Mediancode. An API owns endpoints and is generated into one or more API Implementations.
_Avoid_: App, project, spec

**API Implementation**:
A concrete generated implementation of an API for a chosen framework, language, database, deploy provider, and test strategy.
_Avoid_: FastAPI-only output, generated app

**API Design Snapshot**:
A portable, target-neutral view of persisted API data assembled from API, Object, Field, Object Member, Endpoint, and Catalog records before any Generation Target translates it into concrete implementation input.
_Avoid_: api_craft input, SQLAlchemy row bundle, FastAPI spec

**Generated FastAPI Project Plan**:
The filesystem plan created after an API has rendered components and before those components are written. It decides generated FastAPI project directories, file destinations, Alembic support files, and static CDK template copies.
_Avoid_: Rendered component map, writer internals

**Generation Target**:
A substitutable output target for generating an API Implementation, such as FastAPI with SQLAlchemy and PostgreSQL, another Python framework, another database, another cloud deploy artifact, or another language runtime.
_Avoid_: Hard-coded backend stack, template variant

**Prepared Endpoint/View Semantics**:
The generator step that turns API endpoints into prepared FastAPI view metadata, including request/response schema selection, target Object inference, path/query parameter typing, placeholder response decisions, ORM-backed filtering, pagination, signatures, and view imports.
_Avoid_: Endpoint helper soup, template conditionals

**Endpoint Query Semantics**:
Endpoint-owned filter and pagination facts. Includes query parameter name, target Field Member, filter operator, requiredness, and endpoint-level pagination. Path parameters and query parameters should reference target Field Members rather than reusable Field definitions or query Objects. Query filters default to optional from the client perspective; required query filters are explicit Endpoint Query Semantics.
_Avoid_: Query Object, reusable filter Object, Field-only parameter references

**Object**:
A named model definition that can be used as an endpoint request, response, or query parameter object. An Object has zero or more Object Members.
_Avoid_: Model, resource, table

**Object Membership**:
The lifecycle and rules for the members belonging to an Object, including Field Members, Relationship Members, ordering, reconcile-by-ID, role/default rules, and derived relationships.
_Avoid_: Field list, object schema internals

**Object Member**:
An ordered member of an Object. An Object Member is either a Field Member or a Relationship Member.
_Avoid_: Property, attribute

**Field Member**:
An Object Member backed by a Field. It carries the field role, nullability, and default value used during generation.
_Avoid_: Bare field, property

**Relationship Member**:
An Object Member that points from one Object to another Object. It authors the relationship on the source Object and produces a derived relationship on the target Object.
_Avoid_: Link, reference

**Relationship Derivation**:
The rules that turn an authored Relationship Member into portable derived relationship facts used by Object responses and Generation Targets, including inverse relationship side, reference ownership, cardinality, required/nullability, and source/target Object names.
_Avoid_: Relationship helper logic, ORM relationship internals

**Field**:
A reusable scalar definition that provides the generated Python type, constraints, validators, and description for Field Members and endpoint parameters.
_Avoid_: Object member

**Namespace**:
A user's workspace for APIs, Fields, Objects, and custom catalog entries. The system namespace stores seed catalog data.
_Avoid_: Folder, tenant

**Catalog**:
The shared type, field constraint, and validator-template data visible to users during API design.
_Avoid_: Lookup tables

## Example Dialogue

Developer: "Why is this not just part of Object?"

Domain expert: "Object is the named model definition. Object Membership is the rules for the ordered members inside it, especially when updates reconcile existing Field Members and Relationship Members by ID."

Developer: "Where does the inverse relationship come from?"

Domain expert: "A Relationship Member authored on the source Object creates a derived relationship on the target Object."

Developer: "Is Mediancode only generating FastAPI projects?"

Domain expert: "No. FastAPI is the first API Implementation. The architecture should support substitutable Generation Targets for deploy artifacts, databases, test modules, frameworks, and languages."

Developer: "Should persisted API rows be passed straight into the FastAPI generator?"

Domain expert: "No. Persisted rows are first assembled into an API Design Snapshot, then the current FastAPI Generation Target translates that snapshot into its concrete input model."

Developer: "Should Endpoint filters be represented by reusable Objects?"

Domain expert: "No. Endpoint Query Semantics live on the Endpoint. Reuse should be introduced only if multiple Endpoints need one shared filter definition that changes together, and that should be recorded as a new architecture decision."

Developer: "Why do Object responses and generated SQLAlchemy models both calculate relationship facts?"

Domain expert: "Those are Relationship Derivation facts. Object Membership authors the Relationship Member, Relationship Derivation explains the portable semantics, and each Generation Target translates those semantics into concrete artifact names."

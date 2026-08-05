# Median Code Context

Domain language for Median Code. Use these names when discussing what Median Code specifies and generates — the persisted design model and its generated implementations.

## Language

**Meta Framework**:
The engine and pattern schema that define, compose, and generate from reusable patterns — Component Kinds, Channel kinds, and Templates. The Meta Framework is the long-term shape of Median Code: Median Code is its reference instance, and any company can run the same engine against its own patterns. Work must be expressible as a pattern in the Meta Framework before Median Code can generate from it.
_Avoid_: platform, system, generator (the generator is one part)

**Pattern Registry**:
The stored, versioned set of patterns a Median Code Instance is configured with — its Component Kinds, Channel kinds, and Templates. The registry grows as recurring work is captured as new patterns.
_Avoid_: catalog (Catalog holds type, constraint, and validator data; the registry holds patterns), library

**Pattern**:
A named, reusable definition in the Pattern Registry that composes Templates, Channel Bindings, and scaffolding into a recognizable whole. The primary Pattern is the Component Kind — a pattern for a deployable workload such as an API or a Scheduled Job. Patterns are the unit the Meta Framework generates from and the unit developers author.
_Avoid_: template (a Pattern composes Templates), snippet, boilerplate

**Template**:
The artifact-level generator atom: one source that renders exactly one concrete artifact, such as a Mako file that renders a model module, a Dockerfile, or a pyproject file. Templates are reusable and composed by Patterns; a Pattern references many Templates.
_Avoid_: pattern (a Template renders one artifact; a Pattern composes many), file, snippet

**Median Code Instance**:
A configured Meta Framework: the shared engine plus one Pattern Registry. "Median Code" is the reference Instance, preloaded with the minimum median pattern set; a company's own version is a different Instance on the same engine.
_Avoid_: fork, deployment, tenant

**Authoring Gate**:
The rule that work cannot be generated beyond what existing Patterns cover until a Pattern is defined or extended to cover it. The gate is how Median Code forces pattern capture and grows the Pattern Registry by construction. The post-generation tail of truly one-off code stays free for humans or LLMs and is not gated.
_Avoid_: lint rule, approval workflow, lock

**Component**:
A buildable cloud unit that Median Code specifies and generates end to end. A Component has a Component Kind, carries its own logic, its own IaC, and its Channel Bindings, and plugs together with other Components like Lego. When deployed, a Component runs as a cloud process. Components share Catalog, Namespace, and Generation Targets.
_Avoid_: rendered file, generated module, building block

**Component Kind**:
A named preset a Component is created from, combining an Execution Shape, default Channel Bindings, and scaffolding. API is the first Component Kind; Data Process and others follow. The minimum median set is bounded by one Kind per Execution Shape × primary ingress trigger (API = Service × HTTP, Scheduled Job = Job × cron, and so on), so it grows only when a genuinely new ingress trigger appears. A Component Kind is itself a reusable pattern: the median set ships as built-in Kinds, and future instances of Median Code can define their own.
_Avoid_: type, category, template (a Kind composes templates; it is not one file)

**Execution Shape**:
The lifecycle primitive a Component Kind is built on, such as a long-running Service or a run-to-completion Job. The trigger that starts a shape is supplied by an ingress Channel, not by the shape itself. The set of Execution Shapes is kept deliberately tiny.
_Avoid_: runtime, process type, Kind (a Kind is a preset over a Shape)

**API**:
The first Component kind. A user-defined service specification stored in Median Code. An API owns Endpoints and is generated into one or more API Implementations.
_Avoid_: App, project, spec

**Channel**:
A shared transport-bound connection that carries messages or requests between Components, such as an HTTP route, queue, topic, or event bus. A Channel is a shared edge: it may have multiple producer and consumer Bindings. Channels are owned by the Wiring layer, never by a single Component.
_Avoid_: interface, port, endpoint (an HTTP route is one Channel kind)

**Binding**:
A Component's portable attachment to a Channel, declaring direction (producer or consumer) and the message or request type. Bindings are authored on the Component and stay target-neutral; the Wiring layer resolves them into concrete Channel resources, IAM, and event-source wiring.
_Avoid_: connection, wire, channel ownership

**Foundation**:
The substrate IaC layer: the shared environment resources every Component and Channel plugs into, such as network, cluster, database instance, and base IAM. The Foundation must exist before Channels or Components are provisioned.
_Avoid_: baseplate, full infra (the baseplate's wiring and ordering job belongs to Wiring)

**Wiring**:
The IaC layer that owns every Channel and the deterministic provisioning order of the whole system. Wiring resolves Component Bindings into concrete Channels and records the ordered topology so the system can be rebuilt from scratch in any environment.
_Avoid_: Foundation, baseplate, orchestration engine

**API Implementation**:
A concrete generated implementation of an API for a chosen framework, language, database, deploy provider, and test strategy.
_Avoid_: FastAPI-only output, generated app

**API Design Snapshot**:
A portable, target-neutral view of persisted API data assembled from API, Object, Field, Object Member, Endpoint, and Catalog records before any Generation Target translates it into concrete implementation input.
_Avoid_: api_craft input, SQLAlchemy row bundle, FastAPI spec

**Generated FastAPI Project Plan**:
The filesystem plan created after an API has rendered files and before those files are written. It decides generated FastAPI project directories, file destinations, Alembic support files, and static CDK template copies.
_Avoid_: Rendered component map, writer internals

**Generation Target**:
A substitutable output target for generating an API Implementation, such as FastAPI with SQLAlchemy and PostgreSQL, another Python framework, another database, another cloud deploy artifact, or another language runtime.
_Avoid_: Hard-coded backend stack, template variant

**Prepared Endpoint/View Semantics**:
The generator step that turns API endpoints into prepared FastAPI view metadata, including request/response schema selection, target Object inference, path/query parameter typing, placeholder response decisions, ORM-backed filtering, pagination, signatures, and view imports.
_Avoid_: Endpoint helper soup, template conditionals

**Endpoint Query Semantics**:
Endpoint-owned filter and pagination facts for endpoints that expose a queryable collection of target Objects. Includes query parameter name, target Field Member, filter operator, requiredness, and endpoint-level pagination. Path parameters and query parameters should reference target Object Field Members rather than reusable Field definitions or query Objects.

**Endpoint Target**:
The selected Object for an Endpoint plus the Object's Field Members as the Endpoint can reference them. Endpoint Query Semantics uses the Endpoint Target to decide Endpoint Query Availability, validate path and query parameter Field Member links, identify the primary Field Member, and derive control state for query parameters, pagination, response shape, and response preview.
_Avoid_: target context, semantics context, resolved object fields

The resolved frontend concept is Endpoint Query Availability:
- `available`: a GET endpoint with a selected target Object, every path parameter explicitly linked to a Field Member on that target Object, and no final path parameter linked to the target Object primary Field Member.
- `notApplicable`: query filters and pagination do not apply, such as non-GET endpoints or a GET endpoint whose final path parameter is linked to the target Object primary Field Member.
- `unresolved`: the frontend cannot safely decide because required target Object or Field Member facts are missing or invalid.

Query filters default to optional from the client perspective; required query filters are explicit Endpoint Query Semantics. Endpoint transitions sanitize invalid query facts immediately once availability is known. Committed availability only trusts explicit Field Member links; name-based matching may produce suggestions but must not silently write Field Member links. Unresolved Endpoint Query Semantics produce issues, suggestions, and controls instead of hidden blockers. Endpoint Query Semantics owns every user-visible consequence of Endpoint Query Availability, including response shape lock reasons, response preview applicability, query parameter persistence, pagination persistence, and create/update/duplicate command sanitation. Duplicate Endpoint commands are blocked when the original Endpoint has unresolved Endpoint Query Semantics rather than copying invalid unresolved facts forward. The frontend should expose question-based functions such as `getEndpointTarget`, `getEndpointQueryAvailability`, `getEndpointQueryControls`, `getSanitizedEndpointQueryDraft`, `prepareEndpointSave`, and `prepareEndpointDuplicate` rather than one broad resolver.
_Avoid_: Query Object, reusable filter Object, Field-only parameter references

**Object**:
A named model definition that can be used as an endpoint request, response, or query parameter object. An Object has zero or more Object Members.
_Avoid_: Model, resource, table

**Object Membership**:
The lifecycle and rules for the members belonging to an Object, including Field Members, Relationship Members, ordering, reconcile-by-ID, role/default rules, and derived relationships.
Object Membership must enforce exactly one primary Field Member on every saved Object; Endpoint Target can still report unresolved target facts, but primary Field Member validity is owned first by Object Membership.
_Avoid_: Field list, object schema internals

**Object Member**:
An ordered member of an Object. An Object Member is either a Field Member or a Relationship Member.
_Avoid_: Property, attribute

**Field Member**:
An Object Member backed by a Field. It carries the field role, nullability, and default value used during generation.
Frontend Object Membership treats Field Member name as the Object-local name. New Field Members default the Object-local name from the Field name, and Endpoint Target references Field Member names. Follow-up work item: review backend Generation Target behavior for scalar generated fields and query parameters so generated FastAPI output consistently uses Field Member names or explicitly documents why Field names remain authoritative there.
_Avoid_: Bare field, property

**Relationship Member**:
An Object Member that points from one Object to another Object. It authors the relationship on the source Object and produces a derived relationship on the target Object.
Relationship Member `name` and `inverseName` are explicit authored facts. The frontend may suggest draft names from source and target Object names, but Object Membership validation must require committed names rather than treating pluralization or generated defaults as authoritative domain truth. For the current Python/FastAPI Generation Target, both directions must be snake_case. Future non-Python Generation Targets should revisit this as a naming-policy decision instead of loosening Object Membership validation ad hoc.
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

Developer: "Is Median Code only generating FastAPI projects?"

Domain expert: "No. FastAPI is the first API Implementation. The architecture should support substitutable Generation Targets for deploy artifacts, databases, test modules, frameworks, and languages."

Developer: "Should persisted API rows be passed straight into the FastAPI generator?"

Domain expert: "No. Persisted rows are first assembled into an API Design Snapshot, then the current FastAPI Generation Target translates that snapshot into its concrete input model."

Developer: "Should Endpoint filters be represented by reusable Objects?"

Domain expert: "No. Endpoint Query Semantics live on the Endpoint. Reuse should be introduced only if multiple Endpoints need one shared filter definition that changes together, and that should be recorded as a new architecture decision."

Developer: "Why do Object responses and generated SQLAlchemy models both calculate relationship facts?"

Domain expert: "Those are Relationship Derivation facts. Object Membership authors the Relationship Member, Relationship Derivation explains the portable semantics, and each Generation Target translates those semantics into concrete artifact names."

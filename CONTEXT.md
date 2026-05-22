# Mediancode Context

Domain language for the Mediancode backend. Use these names when discussing generated FastAPI project design and the persisted API design model.

## Language

**API**:
A user-defined FastAPI project specification stored in Mediancode. An API owns endpoints and is generated into a standalone FastAPI project.
_Avoid_: App, project, spec

**Generated FastAPI Project Plan**:
The filesystem plan created after an API has rendered components and before those components are written. It decides generated FastAPI project directories, file destinations, Alembic support files, and static CDK template copies.
_Avoid_: Rendered component map, writer internals

**Object**:
A named model definition that can be used as an endpoint request, response, or query parameter object. An Object has zero or more Object Members.
_Avoid_: Model, resource, table

**Object Membership**:
The lifecycle and rules for the members belonging to an Object, including scalar members, relationship members, ordering, reconcile-by-ID, role/default rules, and derived relationships.
_Avoid_: Field list, object schema internals

**Object Member**:
An ordered member of an Object. An Object Member is either a Scalar Member or a Relationship Member.
_Avoid_: Property, attribute

**Scalar Member**:
An Object Member backed by a Field. It carries the field role, nullability, and default value used during generation.
_Avoid_: Field

**Relationship Member**:
An Object Member that points from one Object to another Object. It authors the relationship on the source Object and produces a derived relationship on the target Object.
_Avoid_: Link, reference

**Field**:
A reusable scalar definition that provides the generated Python type, constraints, validators, and description for Scalar Members and endpoint parameters.
_Avoid_: Object member

**Namespace**:
A user's workspace for APIs, Fields, Objects, and custom catalog entries. The system namespace stores seed catalog data.
_Avoid_: Folder, tenant

**Catalog**:
The shared type, field constraint, and validator-template data visible to users during API design.
_Avoid_: Lookup tables

## Example Dialogue

Developer: "Why is this not just part of Object?"

Domain expert: "Object is the named model definition. Object Membership is the rules for the ordered members inside it, especially when updates reconcile existing Scalar Members and Relationship Members by ID."

Developer: "Where does the inverse relationship come from?"

Domain expert: "A Relationship Member authored on the source Object creates a derived relationship on the target Object."

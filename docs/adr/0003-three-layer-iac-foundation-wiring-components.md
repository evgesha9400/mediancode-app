# Three-layer IaC: Foundation, Wiring, Components

Median Code generalizes from generating a single API into assembling many Component kinds (API, Data Process, and others) that plug together like Lego and deploy to the cloud. A Channel — an HTTP route, queue, topic, or event bus — connects Components. A Channel is a shared edge: it can have multiple producer and consumer Components, including fan-in and fan-out. The open question was where Channels live: on the Components, on a single Foundation baseplate, on the producing Component, or in their own layer.

Generated infrastructure is split into three layers with distinct, non-overlapping responsibilities:

- **Foundation** provisions the shared substrate every Component and Channel plugs into (network, cluster, database instance, base IAM).
- **Wiring** owns every Channel and the deterministic provisioning order of the whole system. It resolves Component Bindings into concrete Channel resources and records the ordered topology.
- **Components** own their own logic, their own IaC, and their Channel Bindings (portable declarations of producer/consumer intent and message type).

**Status**: accepted

**Consequences**:

- A Channel resource is never owned by a single Component. Components declare portable Bindings; the Wiring layer realizes them. This mirrors ADR-0001's portable-semantics-vs-target-rendering split: a Binding is portable intent, a Channel resource is target-specific rendering.
- Binding resolution is a deterministic graph reduction over the design model — the same pattern as `API Design Snapshot` (collect portable facts, then translate once). It produces the ordered provisioning manifest that lets a system be rebuilt from scratch in any environment.
- Fan-in and fan-out are native: N producer Bindings and M consumer Bindings reduce to one Channel with no ownership tiebreak.
- An HTTP route is one Channel kind. An API's Endpoints become operations on an HTTP ingress Channel. Reworking the existing Endpoint model to this framing is a separate, later refactor recorded as its own decision, not mixed into this one.
- Rejected — **Foundation owns all Channels** (Components as dumb plugins): forces the Foundation generator to reach into every Component's internals to inject wiring, creating a god-module that grows with every Component kind, and leaving Components unusable in isolation.
- Rejected — **Producer owns the Channel**: cross-Component generation ordering plus a fan-in ownership tiebreak introduce special cases that break determinism, and a coordinator is still needed for from-scratch redeploy.
- The three layers are adopted now rather than starting with Wiring folded into Foundation, on the judgment that substrate and connectivity are genuinely different concerns with different change rates, and a precise responsibility boundary is cheaper to hold from the start than to extract later.
- When two Generation Targets share Foundation, Wiring, or Component IaC rendering rules, those rules should be centralized in a target-neutral or target-family module rather than duplicated per adapter (consistent with ADR-0001).

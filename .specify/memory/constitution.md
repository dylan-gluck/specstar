<!--
  SYNC IMPACT REPORT
  ==================
  Version change: 0.0.0 (template) → 1.0.0
  Bump rationale: Initial adoption — all principles and governance defined.

  Modified principles:
    - [PRINCIPLE_1_NAME] → I. Contract-First Design (NEW)
    - [PRINCIPLE_2_NAME] → II. Separation of Concerns & SOLID (NEW)
    - [PRINCIPLE_3_NAME] → III. Service-Based Architecture (NEW)
    - [PRINCIPLE_4_NAME] → IV. Explicit State Machines (NEW)
    - [PRINCIPLE_5_NAME] → V. Event-Driven Actor Model (NEW)

  Added sections:
    - Architectural Constraints (was [SECTION_2_NAME])
    - Quality Gates (was [SECTION_3_NAME])
    - Governance (filled from template placeholder)

  Removed sections: None (all template slots used).

  Templates requiring updates:
    - .specify/templates/plan-template.md        ✅ compatible (Constitution Check is dynamic)
    - .specify/templates/spec-template.md         ✅ compatible (requirements use MUST language)
    - .specify/templates/tasks-template.md        ✅ compatible (contract tests, service structure)
    - README.md                                   ✅ no constitution references to update

  Follow-up TODOs: None.
-->

# Specstar Constitution

## Core Principles

### I. Contract-First Design

All inter-module and inter-service interfaces MUST be defined as
explicit contracts before implementation begins. A contract is a
versioned, machine-readable specification of inputs, outputs, errors,
and invariants.

- Every service boundary MUST have a contract artifact (TypeScript
  interface, JSON Schema, or protocol definition) committed to the
  repository before any implementation code is written.
- Contracts are the single source of truth. Implementation MUST
  conform to the contract; the contract MUST NOT be retroactively
  modified to match implementation drift.
- Contract changes MUST follow semantic versioning: breaking changes
  require a major bump, additive changes a minor bump, and
  documentation-only changes a patch bump.
- Consumer and provider MUST each have tests that validate conformance
  to the shared contract. A contract without tests on both sides is
  incomplete.
- Internal helper functions and private modules are exempt; this
  principle governs boundaries between independently deployable or
  independently testable units.

**Rationale**: Contracts decouple teams and modules. When the contract
is defined first, producers and consumers can develop in parallel,
misunderstandings surface at design time instead of integration time,
and breaking changes are caught by contract tests before they reach
production.

### II. Separation of Concerns & SOLID

Every module MUST have a single, well-defined responsibility.
Dependencies MUST flow toward abstractions, never toward concretions.

- **Single Responsibility (SRP)**: A module, class, or function MUST
  have one reason to change. If a description requires "and", it has
  too many responsibilities.
- **Open/Closed (OCP)**: Modules MUST be open for extension through
  composition or configuration, and closed for modification of
  existing behavior. New behavior MUST NOT require editing existing
  stable code.
- **Liskov Substitution (LSP)**: Any subtype MUST be usable wherever
  its parent type is expected without altering correctness. Subtypes
  MUST NOT strengthen preconditions or weaken postconditions.
- **Interface Segregation (ISP)**: Consumers MUST NOT be forced to
  depend on methods they do not use. Prefer narrow, role-specific
  interfaces over broad general-purpose ones.
- **Dependency Inversion (DIP)**: High-level policy modules MUST NOT
  import low-level implementation modules directly. Both MUST depend
  on shared abstractions (interfaces or type definitions).
- **Separation of Concerns (SOC)**: Presentation, business logic,
  data access, and infrastructure MUST reside in distinct layers.
  Cross-cutting concerns (logging, auth, telemetry) MUST be injected,
  never hard-coded inline.

**Rationale**: SOLID and SOC reduce coupling, increase testability,
and make the codebase navigable. Violating these principles produces
modules that are fragile, difficult to test in isolation, and
expensive to change.

### III. Service-Based Architecture

The system MUST be decomposed into discrete services, each owning a
bounded context. Services communicate exclusively through defined
contracts (see Principle I).

- Each service MUST own its data. No service may directly read or
  write another service's storage. Data sharing occurs via published
  contracts or events.
- Services MUST be independently testable. A service's test suite
  MUST pass without requiring other services to be running; use
  contract stubs or test doubles at service boundaries.
- Services MUST be independently deployable. A change to Service A
  MUST NOT require a simultaneous deployment of Service B, provided
  the shared contract has not changed in a breaking way.
- Service boundaries MUST align with business capabilities, not
  technical layers. A "database service" or "utility service" is not
  a valid service; it is a shared library.
- Shared code between services MUST be extracted into versioned
  libraries consumed as explicit dependencies, never as source-level
  symlinks or copy-paste.

**Rationale**: Service boundaries enforce modularity at the process
or deployment level. Data ownership prevents hidden coupling.
Independent deployability enables safe, incremental delivery.

### IV. Explicit State Machines

All stateful behavior MUST be modeled as declared state machines with
named states, explicit transitions, and guarded edges.

- Every stateful entity (workflow, session, process, UI view) MUST
  have its states enumerated as a finite, closed set. Ad-hoc boolean
  flags or implicit mode variables are prohibited.
- Transitions MUST be declared: `(currentState, event) → nextState`.
  Code MUST NOT transition state by direct assignment; it MUST go
  through the transition function.
- Guards (preconditions on transitions) MUST be explicit and testable.
  A guard that silently swallows an invalid transition is a bug.
- Invalid transitions MUST produce an error, not a silent no-op.
  The system MUST fail loudly when an event is received in a state
  that does not handle it.
- State machines MUST be testable in isolation: given a state and an
  event, the resulting state and side-effects MUST be deterministic
  and verifiable without instantiating the full system.
- State machine definitions MUST be co-located with or referenced
  from the contract that governs the entity's lifecycle.

**Rationale**: Implicit state is the leading source of "impossible"
bugs. Declared state machines make every possible state visible,
every transition auditable, and every edge case enumerable. They
eliminate entire classes of race conditions and forgotten-flag bugs.

### V. Event-Driven Actor Model

Concurrent and distributed behavior MUST follow the actor model:
isolated actors communicating through asynchronous, immutable events.

- An actor is the unit of concurrency. Each actor MUST encapsulate
  its own state; no shared mutable state between actors is permitted.
- Actors communicate exclusively via asynchronous message passing.
  Direct function calls between actors are prohibited; all
  cross-actor interaction is an event or command message.
- Events MUST be immutable, self-describing, and timestamped. Once
  published, an event MUST NOT be mutated or retracted.
- Event ordering MUST be preserved within a single actor's mailbox.
  Cross-actor ordering guarantees MUST be documented per contract;
  do not assume global ordering unless the infrastructure provides it.
- Actors MUST handle failure locally. If an actor cannot process a
  message, it MUST signal failure via an error event or supervision
  protocol, not crash the host process.
- Actor lifecycles (creation, supervision, termination) MUST be
  managed by a supervisor hierarchy. Orphan actors are prohibited.
- Event replay MUST be supported for debugging and recovery. Actor
  state MUST be reconstructible from its event history.

**Rationale**: The actor model eliminates shared-state concurrency
bugs by construction. Asynchronous events decouple producers from
consumers in time and space. Immutable events create an auditable
history and enable replay-based debugging and recovery.

## Architectural Constraints

- **Runtime**: Bun. All server-side code MUST target the Bun runtime.
  Node.js-specific APIs MUST NOT be used where Bun provides a native
  equivalent.
- **Language**: TypeScript in strict mode. `any` is prohibited at
  service boundaries; internal use MUST be justified and suppressed
  with an explanatory comment.
- **UI**: SolidJS via OpenTUI bindings. UI components MUST be
  reactive and stateless where possible; stateful components MUST
  use an explicit state machine (Principle IV).
- **Storage**: Bun SQLite for local persistence. Each service that
  persists data MUST own its schema; cross-service joins are
  prohibited.
- **Concurrency**: Bun Workers for actor isolation. Each actor or
  actor group MUST run in its own worker; the main thread MUST NOT
  perform blocking I/O.
- **Serialization**: JSON for all inter-service and inter-worker
  messages. Binary formats are permitted only where a contract
  explicitly specifies them with a documented rationale.
- **Dependencies**: Third-party packages MUST be audited before
  adoption. Prefer standard library and Bun built-ins. A new
  dependency MUST NOT duplicate functionality already present in
  the codebase.

## Quality Gates

- **Contract Tests**: Every service boundary MUST have contract tests
  that run in CI. A PR that changes a contract MUST include updated
  contract tests for both provider and consumer.
- **State Machine Coverage**: Every declared state machine MUST have
  tests covering all states and all transitions, including invalid
  transition rejection.
- **Actor Isolation Tests**: Actor tests MUST verify behavior using
  only the actor's public message interface. Tests that reach into
  actor internals are prohibited.
- **Integration Tests**: Cross-service flows MUST have integration
  tests that exercise the real contract (not mocks) in a controlled
  environment.
- **Linting & Formatting**: `oxlint` and `oxfmt` MUST pass with zero
  errors before merge. Lint suppressions MUST include a justification
  comment.
- **Type Checking**: `tsc --noEmit` (or Bun equivalent) MUST pass.
  Type errors are merge blockers.
- **Code Review**: Every change to a contract, state machine
  definition, or actor supervision tree MUST be reviewed by at least
  one other contributor before merge.

## Governance

This constitution is the highest-authority document governing
Specstar's architecture and development practices. All other
guidance documents, templates, and runtime rules are subordinate.

- **Supremacy**: Where a template, plan, or spec conflicts with this
  constitution, the constitution prevails. Contributors MUST flag
  the conflict and resolve it in favor of constitutional principles.
- **Amendment Procedure**: Amendments MUST be proposed as a PR that
  modifies this file. The PR description MUST state the rationale,
  the version bump (MAJOR/MINOR/PATCH), and a migration plan for
  any existing code that would violate the amended principle.
- **Versioning Policy**: This constitution follows semantic
  versioning. MAJOR: principle removed or incompatibly redefined.
  MINOR: principle added or materially expanded. PATCH: wording
  clarification or typo fix.
- **Compliance Review**: Every plan's "Constitution Check" gate MUST
  verify that the proposed design satisfies all five core principles
  and both constraint sections. Violations MUST be documented with
  justification in the plan's Complexity Tracking table.
- **Periodic Review**: This constitution SHOULD be reviewed quarterly
  or after any major architectural change, whichever comes first.

**Version**: 1.0.0 | **Ratified**: 2026-02-25 | **Last Amended**: 2026-02-25

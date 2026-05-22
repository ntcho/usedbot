## Context

Earlier phases establish the v1 local architecture. Hardening should make that architecture dependable without changing the core boundaries or expanding scope into a larger product rewrite.

## Goals / Non-Goals

**Goals:**

- Improve resilience of local data and service workflows.
- Make sidecar, core, and CLI failures diagnosable.
- Document common operational flows.
- Add tests for recovery and failure paths that matter for local use.

**Non-Goals:**

- Do not add browser frontend behavior.
- Do not replace the storage architecture chosen earlier.
- Do not introduce multi-user or hosted service assumptions.
- Do not expand notification channels beyond those already supported.

## Decisions

### Harden Existing Boundaries

Hardening should improve the sidecar, core, and CLI boundaries already created. It should not redesign them unless an earlier implementation exposes a concrete flaw.

Alternative considered: use hardening as a broad refactor phase. That would make the phase hard to review and could conflict with prior decisions.

### Favor Diagnostics Over Hidden Recovery

Recovery behavior should be explicit and observable. The user should be able to understand what was repaired, skipped, or retried.

Alternative considered: silently repair everything possible. That can hide data loss or scraper instability.

## Risks / Trade-offs

- Hardening can become an unbounded cleanup phase -> Limit work to reliability, diagnostics, recovery, maintenance, and docs.
- Recovery code can corrupt data if overconfident -> Prefer backups, validation, and explicit user-visible outcomes.
- More checks can slow local workflows -> Keep health checks targeted and measurable.

## Open Questions

Exact maintenance commands and recovery mechanisms should be based on the storage and CLI implementation that exists by this phase.

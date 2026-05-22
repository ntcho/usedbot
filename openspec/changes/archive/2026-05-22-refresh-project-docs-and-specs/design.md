## Context

The repository has moved past the bootstrap phase into a working local v1 split across the CLI, TypeScript packages, Python sidecar, and vendored upstream scraper project. The current documentation set does not reflect that state consistently: `README.md` is thin, `migration.md` still describes deferred work that now exists, some workspace READMEs still say "later change," and living OpenSpec specs still contain placeholder Purpose text or bootstrap-phase requirements that no longer describe the current repository.

Because this project uses OpenSpec and agent-assisted workflows, documentation drift is not just an onboarding problem. Stale repo docs and stale living specs become incorrect implementation context for later changes.

## Goals / Non-Goals

**Goals:**

- Establish a clear documentation hierarchy for getting started, architecture, operations, and workspace-level reference material.
- Replace outdated planning documents with living documentation that matches the implemented repository.
- Bring the living OpenSpec specs back to present-tense repo truth where they currently describe earlier phases rather than current capabilities.
- Make it obvious which files future contributors should trust for setup, boundaries, and current architecture.

**Non-Goals:**

- Do not add new product features, notification delivery, or contract changes.
- Do not redesign the sidecar, core, or CLI architecture.
- Do not introduce a large ADR catalog if a focused architecture document is sufficient.
- Do not change runtime behavior unless a documentation fix requires a tiny accompanying metadata correction.

## Decisions

### Use a layered documentation model

The change should split documentation by question type:

- `README.md` answers "how do I get this running on a clean machine?"
- `docs/ARCHITECTURE.md` answers "how is this system structured and why is it split this way?"
- `docs/local-toolchain.md` and vendor docs answer operational and maintenance workflows.
- workspace README files answer "what lives here?" without duplicating the full architecture document.

Alternative considered: put all repo truth into the root README. Rejected because setup, architecture, and maintenance guidance would become repetitive and harder to keep current.

### Replace `migration.md` with living sources of truth

`migration.md` was useful during the bootstrap sequence, but it now duplicates or contradicts the implemented repository. The better outcome is to migrate any durable decisions into `README.md`, `docs/ARCHITECTURE.md`, and the living OpenSpec specs, then remove `migration.md`.

Alternative considered: keep `migration.md` with a warning banner. Rejected because it preserves two competing sources of truth for architecture and roadmap assumptions.

### Treat living OpenSpec specs as current-state documentation

OpenSpec files under `openspec/specs/` should describe the current capability baseline, not the wording of the archived phase that first created them. This change should therefore update stale workspace-level requirements, remove obviously historical requirements such as deferred-runtime placeholders, and replace placeholder Purpose sections across the current specs.

Alternative considered: only update the README and leave the specs as historical artifacts. Rejected because later spec-driven work will continue to inherit stale context.

### Document enforced prerequisites from canonical metadata

The refreshed getting-started docs should point at the versions and tools that the repository actually enforces at implementation time, rather than restating historical expectations from archived plans. If the metadata itself needs correction, that should either be done as a minimal companion edit or called out explicitly during implementation.

Alternative considered: hardcode versions in prose without reconciling them against workspace metadata. Rejected because it recreates the same drift problem in a new file.

## Risks / Trade-offs

- Conflicting existing version references could make the refresh ambiguous -> Reconcile README and spec wording against current enforced metadata and remove obsolete references.
- Removing `migration.md` could hide historical context -> Move durable decisions into living docs first and rely on git history for obsolete phase planning.
- More documentation files can increase drift surface -> Give each file a narrow role and cross-link the canonical sources instead of repeating full explanations.
- Updating living specs may touch more than one capability -> Limit requirement changes to clearly stale documentation and workspace-layout behavior, not product features.

## Open Questions

- Whether the implementation should update only the obviously stale specs (`v1-workspace-bootstrap`, `v1-workspace-layout`) or also normalize titles and Purpose sections across every current spec in the same pass.
- Whether package-level READMEs should stay as short pointers or include small command/reference sections for each workspace.

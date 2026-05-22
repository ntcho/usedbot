# project-documentation Specification

## Purpose

Defines the canonical getting-started, architecture, workspace, and vendor-maintenance documentation surfaces for the current local usedbot repository.
## Requirements
### Requirement: Repository README provides getting started workflow
The repository SHALL provide a root README that describes the clean-machine setup and first-run workflow for the implemented local v1 system.

#### Scenario: Developer follows root setup guide
- **WHEN** a developer reads the root README on a clean machine
- **THEN** they can identify the required local tools, install the Node and Python dependencies, prepare Playwright for the sidecar, run `pnpm usedbot doctor`, run a monitor cycle, and find the main verification commands

### Requirement: Architecture document explains current system boundaries
The repository SHALL provide an architecture document that explains both the high-level system shape and the detailed boundaries between the CLI, TypeScript packages, Python sidecar, repo-local state, and vendored upstream code.

#### Scenario: Developer needs architectural context
- **WHEN** a developer reads `docs/ARCHITECTURE.md`
- **THEN** they can find a concise overview plus a deeper explanation of runtime flow, workspace ownership, state location, sidecar contract boundaries, and vendor isolation rules

### Requirement: Supporting docs stay aligned with implemented components
Operational docs and workspace-level README files SHALL describe the current implemented repository and point back to the canonical getting-started and architecture documents.

#### Scenario: Developer reads workspace or operations docs
- **WHEN** a developer reads `docs/local-toolchain.md` or a workspace README under `apps/`, `packages/`, or `services/`
- **THEN** the document reflects implemented behavior, avoids "later change" placeholder language for shipped components, and links to the canonical root documentation where appropriate

### Requirement: Obsolete bootstrap planning docs are retired
Once durable architecture and setup decisions have been migrated into living documentation, obsolete bootstrap planning documents SHALL be removed from the active repository surface.

#### Scenario: Bootstrap planning doc is no longer needed
- **WHEN** the current setup and architecture decisions are available in the root README, architecture docs, and living specs
- **THEN** obsolete planning files such as `migration.md` are removed instead of being kept as competing sources of truth


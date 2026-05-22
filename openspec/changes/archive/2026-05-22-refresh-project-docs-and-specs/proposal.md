## Why

The repository now has a usable local v1 shape across the Python sidecar, TypeScript packages, and CLI, but the living documentation still mixes current behavior with bootstrap-era placeholders. That drift makes onboarding slower and leaves future OpenSpec changes starting from stale repo truth.

## What Changes

- Rewrite the root README around a clean-machine getting-started flow, including prerequisites, install steps, first-run checks, and verification commands.
- Add `docs/ARCHITECTURE.md` with both a concise system overview and a deeper walkthrough of workspace boundaries, runtime flow, local state, sidecar contract, and vendor isolation.
- Refresh supporting docs and workspace READMEs so they describe implemented components instead of future placeholders, and cross-link the canonical runbooks.
- Remove `migration.md` after moving any still-relevant decisions into living docs and current OpenSpec specs.
- Refresh stale OpenSpec spec text so bootstrap-era documentation requirements and workspace descriptions match the implemented repository rather than archived change phases.

## Capabilities

### New Capabilities
- `project-documentation`: Defines the canonical getting-started, architecture, and workspace documentation surfaces for the local v1 repository.

### Modified Capabilities
- `v1-workspace-bootstrap`: Replace the `migration.md` requirement and bootstrap-only documentation assumptions with current living documentation sources.
- `v1-workspace-layout`: Update the workspace layout capability so it describes the active CLI, packages, and sidecar areas rather than a placeholder-only phase.

## Impact

- Affects `README.md`, `docs/ARCHITECTURE.md`, `docs/local-toolchain.md`, selected workspace README files, and `migration.md`.
- Affects OpenSpec living specs under `openspec/specs/`, especially documentation and workspace-layout related specs.
- Does not change runtime behavior or external APIs, but it changes the documentation and specification sources that future implementation work should trust.

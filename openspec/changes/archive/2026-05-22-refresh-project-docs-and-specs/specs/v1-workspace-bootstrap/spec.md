## MODIFIED Requirements

### Requirement: Root workspace docs and metadata exist
The repository SHALL include the root documentation and workspace metadata needed to identify, set up, and operate the implemented local v1 workspace.

#### Scenario: Root documentation and metadata are present
- **WHEN** a developer inspects the repository root and documentation directory
- **THEN** the repository contains `README.md`, `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `docs/ARCHITECTURE.md`, `docs/local-toolchain.md`, `docs/upstream-sync.md`, `docs/upstream-patches.md`, and `scripts/sync-upstream.sh`

### Requirement: Workspace defines Node 24 and pnpm
The repository SHALL define its supported runtime baselines in workspace metadata and document the same prerequisites in the getting-started documentation.

#### Scenario: Runtime baseline is documented consistently
- **WHEN** a developer reads the root workspace metadata and getting-started documentation
- **THEN** they see the same required Node runtime baseline, package manager, and Python sidecar tooling expectations

#### Scenario: pnpm workspace is configured
- **WHEN** a developer inspects `pnpm-workspace.yaml`
- **THEN** future v1 workspace packages under `apps/*` and `packages/*` are included

### Requirement: Architecture decisions are recorded in living documentation
The repository SHALL record durable v1 architecture and boundary decisions in living documentation rather than in an obsolete migration plan.

#### Scenario: Future implementation boundaries are visible
- **WHEN** a developer reads the root README, architecture document, or current OpenSpec specs
- **THEN** they can find the current boundaries for Python scraping, TypeScript product logic, CLI behavior, repo-local data, notification channels, vendor isolation, and local toolchain expectations

# v1-workspace-layout Specification

## Purpose
TBD - created by archiving change prepare-v1-workspace-layout. Update Purpose after archive.
## Requirements
### Requirement: Active v1 workspace areas exist
The repository SHALL provide separate active workspace areas for the v1 CLI, TypeScript packages, and Python scraper sidecar after the bootstrap change has established root conventions.

#### Scenario: Workspace areas are visible
- **WHEN** the workspace layout change is implemented
- **THEN** the repository contains active v1 areas for CLI, core engine, scraper client, shared code, and scraper sidecar work outside `vendor/used-market-notifier/`

### Requirement: Layout remains implementation-light
The workspace layout SHALL avoid adding runtime behavior that belongs to later phase changes.

#### Scenario: Runtime behavior is deferred
- **WHEN** the workspace layout change is implemented
- **THEN** created files are limited to placeholders, package metadata, or documentation and do not implement sidecar routes, monitoring logic, storage behavior, notification delivery, or CLI commands

### Requirement: Layout respects v1 boundaries
The workspace layout SHALL preserve the bootstrap guardrails around legacy upstream files and v2 frontend files.

#### Scenario: Forbidden areas remain absent
- **WHEN** the workspace layout change is implemented
- **THEN** legacy desktop app files are absent from the active root and v2 frontend directories such as `apps/web/` are not created

### Requirement: Vendor tree remains isolated
The workspace layout SHALL keep new v1 files outside the upstream vendor mirror.

#### Scenario: Vendor mirror is not used for new product code
- **WHEN** the workspace layout change is implemented
- **THEN** no new v1 workspace placeholders, package metadata, or documentation are added under `vendor/used-market-notifier/`


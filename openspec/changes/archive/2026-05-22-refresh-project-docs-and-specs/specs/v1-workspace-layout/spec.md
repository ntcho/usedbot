## MODIFIED Requirements

### Requirement: Active v1 workspace areas exist
The repository SHALL provide active workspace areas for the CLI, TypeScript packages, and Python scraper sidecar outside the vendored upstream tree.

#### Scenario: Workspace areas are visible
- **WHEN** a developer inspects the repository
- **THEN** active v1 areas exist for the CLI, core engine, scraper client, shared code, and scraper sidecar outside `vendor/used-market-notifier/`

### Requirement: Layout respects v1 boundaries
The workspace layout SHALL preserve the boundary between active local v1 code, the vendored upstream scraper tree, and excluded frontend or legacy desktop surfaces.

#### Scenario: Forbidden areas remain absent
- **WHEN** a developer inspects the active repository layout
- **THEN** legacy desktop files are absent from the active root and v2 frontend directories such as `apps/web/` are not present

### Requirement: Vendor tree remains isolated
The workspace layout SHALL keep new v1 code and documentation outside the upstream vendor mirror except for intentional, documented vendor patches.

#### Scenario: Vendor mirror is not used for new product code
- **WHEN** developers add or update active v1 workspaces and docs
- **THEN** those changes are outside `vendor/used-market-notifier/` unless an intentional vendor patch is documented

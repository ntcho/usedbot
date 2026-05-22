## ADDED Requirements

### Requirement: Root v1 workspace files exist
The repository SHALL include the root files needed to identify and operate the v1 workspace before runtime implementation begins.

#### Scenario: Bootstrap files are present
- **WHEN** the bootstrap change is implemented
- **THEN** the repository contains `migration.md`, `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `docs/upstream-sync.md`, `docs/upstream-patches.md`, and `scripts/sync-upstream.sh`

#### Scenario: Sync script is executable
- **WHEN** the bootstrap change is implemented on a POSIX-compatible filesystem
- **THEN** `scripts/sync-upstream.sh` is executable

### Requirement: Workspace uses Node 22 and pnpm
The repository SHALL define Node 22 as the v1 TypeScript runtime baseline and pnpm as the workspace package manager.

#### Scenario: Runtime baseline is documented
- **WHEN** a developer reads the root workspace metadata or migration documentation
- **THEN** Node 22 is identified as the required Node runtime baseline

#### Scenario: pnpm workspace is configured
- **WHEN** a developer inspects `pnpm-workspace.yaml`
- **THEN** future v1 workspace packages under `apps/*` and `packages/*` are included

### Requirement: Migration decisions are recorded
The repository SHALL include a migration document that records the v1 architecture decisions from the reviewed plan.

#### Scenario: Future implementation boundaries are visible
- **WHEN** a developer reads `migration.md`
- **THEN** it states that Python will own scraping, TypeScript will own product logic, the CLI will auto-start the sidecar, `uv` is the intended Python tool, repo-local `data/` is the default data path, v1 notifications are terminal plus webhook, and the CLI is command-only initially with headed mode available for scraper debugging

### Requirement: Active root excludes legacy desktop app files
The repository SHALL NOT recreate legacy upstream desktop application files at the active root layout.

#### Scenario: Forbidden legacy files are absent from active root
- **WHEN** the bootstrap change is implemented
- **THEN** active root paths such as `main.py`, `monitor_engine.py`, `db.py`, `settings_manager.py`, `gui/`, `notifiers/`, `scrapers/`, `legacy/`, and `used_market_notifier.spec` do not exist outside `vendor/used-market-notifier/`

### Requirement: V2 frontend files are excluded
The repository SHALL NOT create v2 frontend files or directories during the v1 bootstrap.

#### Scenario: V2 app is absent
- **WHEN** the bootstrap change is implemented
- **THEN** `apps/web/`, SolidJS application files, frontend component library files, and browser-only API implementation files are absent

### Requirement: Runtime implementation is deferred
The bootstrap change SHALL avoid implementing the Python sidecar, TypeScript engine, storage engine, notifications, and CLI behavior.

#### Scenario: Runtime source is not introduced
- **WHEN** the bootstrap change is implemented
- **THEN** any created `apps/`, `packages/`, or `services/` paths are limited to scaffold metadata or placeholders and do not include functioning sidecar routes, TypeScript monitoring logic, storage logic, notification delivery, or CLI commands

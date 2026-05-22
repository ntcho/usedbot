# command-cli Specification

## Purpose
Defines the command-only operator interface that configures searches, diagnoses the local toolchain, runs monitor cycles, and surfaces stored results.
## Requirements
### Requirement: CLI provides command-only v1 interface
The CLI SHALL expose usedbot behavior through commands rather than a TUI or browser frontend.

#### Scenario: User invokes CLI
- **WHEN** a user runs a supported CLI command
- **THEN** the command invokes TypeScript core behavior or local configuration behavior without requiring a TUI

### Requirement: CLI manages sidecar availability
The CLI SHALL ensure the local scraper sidecar is available for commands that require scraping.

#### Scenario: Scraping command runs
- **WHEN** a user runs a command that requires scraper access
- **THEN** the CLI connects to an available local sidecar or starts one according to the local toolchain rules

### Requirement: CLI supports headed debugging
The CLI SHALL provide an explicit way to run scraper-related flows in headed mode for debugging.

#### Scenario: User requests headed mode
- **WHEN** a user runs a scraper-related command with headed debugging enabled
- **THEN** the CLI passes that debugging intent through to the scraping workflow

### Requirement: CLI supports terminal and webhook notification workflows
The CLI SHALL expose configuration or test workflows for terminal output and webhook notification behavior supported by the core.

#### Scenario: User configures webhook notifications
- **WHEN** a user provides webhook configuration through the CLI
- **THEN** the configuration is made available to the core notification workflow

### Requirement: CLI excludes frontend scope
The CLI change SHALL NOT create browser frontend or TUI implementation files.

#### Scenario: CLI is implemented
- **WHEN** the CLI change is complete
- **THEN** it remains command-only and does not create `apps/web/` or TUI screens

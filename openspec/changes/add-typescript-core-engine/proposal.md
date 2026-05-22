## Why

The v1 application needs a TypeScript core that owns product behavior independently from the Python scraper sidecar and the upstream desktop runtime. This core becomes the durable engine for monitoring, state transitions, visible plain text storage, and notification decisions.

## What Changes

- Add TypeScript core capability for monitor orchestration and product rules.
- Add a scraper-client boundary for communicating with the local sidecar.
- Add shared domain types and normalization helpers where needed.
- Add repo-local plain text storage behavior with single-writer assumptions.
- Add notification decision behavior for terminal and webhook channels without building the CLI user interface.

## Capabilities

### New Capabilities

- `typescript-core-engine`: Defines the TypeScript-owned v1 engine behavior for scraping orchestration, listing state, storage, and notification decisions.

### Modified Capabilities

- None.

## Impact

- Adds TypeScript implementation and tests in the workspace areas established by earlier changes.
- Consumes the sidecar API contract rather than importing Python scraper code directly.
- Establishes behavior the command-only CLI will later invoke.

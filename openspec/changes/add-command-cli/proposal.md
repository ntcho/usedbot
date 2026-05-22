## Why

The v1 application needs a user-facing command-only interface that can configure searches, run monitoring, inspect recent results, and trigger debugging without creating a separate frontend or TUI. The CLI should be the first actual user interface for the TypeScript core.

## What Changes

- Add command-only CLI behavior in the CLI workspace area.
- Let the CLI start the local Python sidecar automatically when needed.
- Expose commands for configuration, monitoring, result inspection, and notification testing.
- Support headed scraper mode for debugging workflows.
- Defer TUI screens and browser frontend work.

## Capabilities

### New Capabilities

- `command-cli`: Defines the v1 command-only interface for invoking core behavior and managing local sidecar use.

### Modified Capabilities

- None.

## Impact

- Adds CLI implementation and tests in the CLI workspace area.
- Depends on the TypeScript core and local sidecar behavior from earlier changes.
- Does not add `apps/web/` or any v2 frontend implementation.

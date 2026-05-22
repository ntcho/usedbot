## 1. Align With Earlier Changes

- [ ] 1.1 Review completed sidecar and TypeScript core artifacts and implementation.
- [ ] 1.2 Confirm available core entry points before defining commands.
- [ ] 1.3 Confirm local sidecar startup expectations before adding process management.

## 2. Add CLI Commands

- [ ] 2.1 Add the command-only CLI entry point.
- [ ] 2.2 Add commands for configuring searches and local settings.
- [ ] 2.3 Add commands for running monitoring and inspecting recent results.
- [ ] 2.4 Add commands or flags for notification testing and headed scraper debugging.

## 3. Wire Local Services

- [ ] 3.1 Connect CLI commands to TypeScript core entry points.
- [ ] 3.2 Start or connect to the local sidecar for commands that need scraping.
- [ ] 3.3 Surface sidecar health and startup failures clearly.

## 4. Verify CLI

- [ ] 4.1 Add tests for command parsing and core invocation behavior.
- [ ] 4.2 Add tests or smoke checks for sidecar startup handling.
- [ ] 4.3 Verify no TUI or web frontend files were created.
- [ ] 4.4 Run `openspec status --change add-command-cli`.

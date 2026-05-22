## Why

After the repository bootstrap and upstream vendor mirror exist, the project needs a v1-only workspace layout that creates the active development areas without implementing runtime behavior. This keeps later sidecar, core, and CLI changes focused on product code instead of directory setup.

## What Changes

- Create the active v1 workspace directories established by the bootstrap change.
- Add only lightweight placeholders or package metadata needed to make the layout visible and navigable.
- Keep all new product areas outside `vendor/used-market-notifier/`.
- Keep legacy Python desktop app files and v2 frontend files out of the active root.
- Defer sidecar routes, TypeScript engine logic, CLI commands, storage behavior, and notification behavior to later changes.

## Capabilities

### New Capabilities

- `v1-workspace-layout`: Defines the active v1 app, package, service, docs, and script layout without adding runtime implementation.

### Modified Capabilities

- None.

## Impact

- Affects repository layout only.
- Depends on the conventions and guardrails established by `bootstrap-v1-workspace`.
- Prepares locations for later Python sidecar, TypeScript core, scraper client, shared domain code, and command-only CLI work.

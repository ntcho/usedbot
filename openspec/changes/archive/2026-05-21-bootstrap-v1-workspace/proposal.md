## Why

The project needs a fresh v1 repository layout that can reuse upstream scraper work without inheriting the upstream desktop application's runtime architecture. Bootstrapping the workspace and vendoring upstream first creates a clean boundary before implementing the Python sidecar or TypeScript engine.

## What Changes

- Initialize the repository as a v1-only monorepo scaffold for a Node 22 TypeScript application and a future Python scraper sidecar.
- Add root workspace files and planning documentation, including `migration.md`, `package.json`, `pnpm-workspace.yaml`, `.gitignore`, upstream sync docs, upstream patch docs, and an executable upstream sync script.
- Vendor `https://github.com/twbeatles/used-market-notifier` under `vendor/used-market-notifier/` using `git subtree` so scraper updates remain mechanically pullable.
- Document that `vendor/used-market-notifier/` is read-only except for unavoidable patches, which must be recorded in `docs/upstream-patches.md`.
- Preserve the v1 boundary: no v2 frontend files, no SolidJS setup, and no recreated legacy Python desktop app files at the active repo root.
- Defer Python Litestar sidecar implementation, TypeScript engine implementation, filesystem data store behavior, CLI commands, and notification delivery to later changes.

## Capabilities

### New Capabilities

- `v1-workspace-bootstrap`: Defines the required clean v1 repository scaffold, root tooling files, runtime version choices, repo-local data policy, and explicit exclusions for legacy root files and v2 frontend files.
- `upstream-vendor-management`: Defines how the upstream project is vendored, synchronized, and patched while keeping active v1 code outside the vendored tree.

### Modified Capabilities

- None.

## Impact

- Affects repository layout, root workspace metadata, documentation, and scripts.
- Adds an upstream Git remote and a `git subtree` mirror under `vendor/used-market-notifier/` during implementation.
- Establishes Node 22 and pnpm for the TypeScript workspace baseline.
- Establishes `uv` as the intended Python dependency tooling for later sidecar work, without creating sidecar implementation files in this change.
- Establishes repo-local `data/` as the default runtime data location for later implementation, without creating runtime data files now.

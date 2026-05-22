# V1 Migration Plan

## Scope

This repository is a fresh v1 workspace that keeps the upstream scraper project vendored under `vendor/used-market-notifier/` and keeps new product code outside the vendor mirror.

This bootstrap change stops after creating the workspace scaffold and vendoring upstream. It does not implement the Python sidecar, TypeScript engine, storage layer, notifications, or CLI behavior.

## Architecture Decisions

- Python owns scraping and upstream scraper compatibility.
- TypeScript owns v1 product logic and orchestration.
- The CLI will auto-start the Python sidecar when later runtime work is added.
- `uv` is the intended Python environment and dependency tool.
- Repo-local `data/` is the default runtime data path.
- V1 notifications are terminal output plus webhook delivery.
- The initial CLI remains command-only; headed browser mode stays available for scraper debugging.
- Node 22 is the TypeScript runtime baseline.
- pnpm is the workspace package manager for future `apps/*` and `packages/*` workspaces.

## Upstream Boundary

- `vendor/used-market-notifier/` mirrors the upstream project with `git subtree`.
- New v1 code must live outside `vendor/used-market-notifier/`.
- Unavoidable vendor patches must be minimal and recorded in `docs/upstream-patches.md`.

## Planned Change Order

1. `bootstrap-v1-workspace`
2. `prepare-v1-workspace-layout`
3. `add-python-scraper-sidecar`
4. `add-typescript-core-engine`
5. `add-command-cli`
6. `harden-v1-local-toolchain`

## Phase Summary

1. Create the root workspace metadata and guardrail documentation.
2. Vendor the upstream project under `vendor/used-market-notifier/`.
3. Add the Python sidecar in a later change.
4. Add the TypeScript engine and CLI in later changes.

## Deferred Work

- Litestar sidecar routes and typed API contract generation
- TypeScript monitoring logic and storage behavior
- Notification delivery beyond terminal and webhook targets
- Command implementations and TUI behavior

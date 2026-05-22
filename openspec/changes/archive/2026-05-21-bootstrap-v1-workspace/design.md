## Context

This repository is being prepared as a fresh v1 fork of `twbeatles/used-market-notifier`. The upstream project is a full Python desktop application, not a scraper-only package, so the new repository must isolate upstream code under a vendor mirror before adding new TypeScript or sidecar runtime code.

The reviewed migration plan establishes a two-part architecture: upstream scraping remains available through Python, while v1 product logic will later live in TypeScript. This change covers only Phase 0 and Phase 1: workspace bootstrap and upstream vendoring.

## Goals / Non-Goals

**Goals:**

- Create the minimal v1 repository scaffold and root workspace metadata.
- Record the migration plan and the architectural decisions made before implementation.
- Add upstream sync and patch documentation so future upstream intake is mechanical.
- Vendor the upstream project under `vendor/used-market-notifier/` using `git subtree`.
- Keep the active root layout free of legacy desktop app files.

**Non-Goals:**

- Do not implement the Litestar scraper sidecar in this change.
- Do not implement TypeScript core, scraper client, storage, notifications, CLI commands, or TUI behavior in this change.
- Do not create v2 frontend directories, SolidJS files, or browser-oriented API code.
- Do not rewrite, prune, or reorganize the upstream project inside the vendor mirror.

## Decisions

### Split Phase 0-1 From Runtime Implementation

This change will stop after creating the workspace scaffold and vendoring upstream. The Python sidecar skeleton and TypeScript package implementation will be proposed separately.

Alternative considered: include the sidecar skeleton immediately. That would couple repo bootstrapping with API design, dependency setup, and lifecycle decisions, making the first implementation harder to review and rollback.

### Use `git subtree` For Upstream Vendoring

The upstream project will be mirrored at `vendor/used-market-notifier/` with `git subtree add --prefix=vendor/used-market-notifier upstream main --squash`.

Alternative considered: `git submodule`. Submodules make local development and CI more fragile because consumers need an additional checkout step.

### Treat Vendor As Read-Only With Documented Exceptions

New product code must not be built inside `vendor/used-market-notifier/`. If an upstream patch is unavoidable, it can be applied directly in the vendor tree, but the reason and patch details must be recorded in `docs/upstream-patches.md`.

Alternative considered: wrapper-only workarounds. Wrapper-only workarounds keep vendor pristine but can become more complex than a small documented patch when upstream imports or scraper behavior require adaptation.

### Establish Node 22 For V1 Tooling

The workspace baseline will target Node 22. The current plan does not require Node 24-only features, so Node 22 gives a stable LTS baseline for the TypeScript packages and CLI.

Alternative considered: Node 24. It can be revisited later if a concrete dependency or platform feature requires it.

### Establish `uv` As The Future Python Tooling Direction

The migration plan will record `uv` as the intended Python dependency and environment tool for the future scraper sidecar. This change will not add sidecar dependencies or a Python package unless needed by the bootstrap files.

Alternative considered: Poetry or plain `pip`/`venv`. `uv` is preferred because it is fast and well-suited for local toolchain bootstrap.

### Preserve Plain Text Runtime Data Direction

The migration plan will keep repo-local `data/` as the intended default runtime data path for later implementation. The data store remains out of scope for this change, but the bootstrap should not introduce SQLite or another storage dependency.

Alternative considered: SQLite. SQLite is safer operationally, but the chosen v1 direction values plain text visibility and debuggability.

### Capture Later API Contract Direction Without Implementing It

Later sidecar work should use Litestar's typed route validation and OpenAPI schema generation as the API contract source, then generate or validate TypeScript client types from that schema. This answers the contract question without creating sidecar files now.

Alternative considered: hand-maintained Python and TypeScript DTOs only. That is faster initially but increases drift risk between the sidecar and client.

## Risks / Trade-offs

- Vendor subtree adds a large upstream snapshot -> Keep the active v1 layout isolated and document sync commands clearly.
- Upstream default branch may not be `main` -> Inspect the upstream remote before running the subtree add and adjust the command if needed.
- Documented vendor patches can still complicate future subtree pulls -> Keep patches minimal and record every exception in `docs/upstream-patches.md`.
- Empty directories are not tracked by Git -> Use placeholder README or `.gitkeep` files only where the bootstrap needs directories to exist before later implementation.
- Root scaffold may accidentally recreate legacy app files -> Add explicit `.gitignore` and documentation guardrails, then verify forbidden root paths are absent.

## Change Order

Apply the v1 migration changes in this order:

1. `bootstrap-v1-workspace`
2. `prepare-v1-workspace-layout`
3. `add-python-scraper-sidecar`
4. `add-typescript-core-engine`
5. `add-command-cli`
6. `harden-v1-local-toolchain`

Each later change should follow the concrete conventions established by completed earlier changes rather than duplicating or overriding those decisions.

## Migration Plan

1. Create the root v1 bootstrap files and documentation.
2. Initialize pnpm workspace metadata for future `apps/*` and `packages/*` workspaces.
3. Add upstream sync and patch documentation.
4. Add an executable `scripts/sync-upstream.sh` for future `git subtree pull` usage.
5. Add the upstream remote if missing and fetch it.
6. Add the upstream project under `vendor/used-market-notifier/` with `git subtree`.
7. Verify the vendor mirror exists and the active root does not contain forbidden legacy Python app files or v2 frontend files.

Rollback strategy: before the first implementation commit, remove the generated scaffold and vendor subtree. After commit, revert the bootstrap commit or create a follow-up cleanup change.

## Open Questions

None for this change. Later changes still need detailed sidecar API, TypeScript storage, notification delivery, and CLI command design.

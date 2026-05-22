## Context

The bootstrap change establishes the root workspace files and upstream vendor mirror. This change follows by creating the active v1 workspace layout, but intentionally avoids runtime implementation so future changes can define their own details without conflicting with scaffold assumptions.

## Goals / Non-Goals

**Goals:**

- Create the v1 workspace directories expected by the migration plan.
- Make intended ownership boundaries visible at the filesystem level.
- Avoid adding source code that would pre-decide sidecar, core, storage, notification, or CLI behavior.

**Non-Goals:**

- Do not implement the Python sidecar.
- Do not implement TypeScript packages or CLI commands.
- Do not create v2 frontend files.
- Do not change vendored upstream code.

## Decisions

### Use Placeholder-Only Workspace Areas

Workspace areas can be represented with minimal package metadata, README files, or `.gitkeep` files where needed. Runtime source files should wait for the specific phase that owns them.

Alternative considered: create skeleton source files now. That would make later changes inherit decisions that have not been reviewed yet.

### Keep Ownership Boundaries Visible

The layout should separate CLI, core engine, scraper client, shared types, and scraper sidecar areas. This mirrors the intended architecture while keeping details deferred.

Alternative considered: create one flat package first. That would be smaller but would obscure the boundary between scraping, engine behavior, and user interface.

## Risks / Trade-offs

- Empty placeholders can become stale -> Keep them minimal and replace them when the owning phase is implemented.
- Too much scaffold can constrain later work -> Avoid source files beyond metadata or documentation.
- Directory names may need refinement after bootstrap -> Follow the finalized bootstrap conventions when applying this change.

## Open Questions

None for this change. Later changes decide package internals and executable behavior.

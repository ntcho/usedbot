## Context

The Python sidecar owns live scraping and enrichment. The TypeScript core owns the application engine so v1 does not inherit the upstream desktop engine, SQLite database, GUI lifecycle, or notification stack.

## Goals / Non-Goals

**Goals:**

- Implement monitor orchestration in TypeScript.
- Communicate with the local scraper sidecar through a typed client boundary.
- Maintain visible repo-local plain text state with a single writer model.
- Preserve key listing update behaviors from the migration plan at a product-rule level.
- Decide terminal and webhook notification eligibility for later delivery.

**Non-Goals:**

- Do not implement a browser frontend.
- Do not import upstream Python runtime modules into TypeScript.
- Do not make the Python sidecar responsible for storage or notification policy.
- Do not finalize CLI command names in the core change.

## Decisions

### Core Owns Product Rules

The TypeScript core should own scheduling, dedupe, state transitions, storage, and notification decisions. This keeps Python focused on scraping.

Alternative considered: split product rules between Python and TypeScript. That would make behavior harder to test and reason about.

### Plain Text Storage Remains Visible

The core should persist state in repo-local plain text files using single-writer assumptions. Exact file formats and compaction details should follow the bootstrap conventions and be refined during implementation.

Alternative considered: SQLite. SQLite remains operationally safer, but v1 prioritizes inspectable data files.

### Scraper Communication Goes Through A Client Boundary

The core should call the sidecar through a TypeScript client package instead of scattering HTTP calls through engine code.

Alternative considered: direct fetch calls inside engine logic. That is simpler initially but couples transport behavior to product rules.

## Risks / Trade-offs

- Plain text storage can become database-like -> Keep a single writer model and write focused storage tests.
- Sidecar contract may shift -> Keep the scraper client boundary narrow and contract-tested.
- Ported behavior may accidentally copy upstream implementation details -> Prefer behavior tests over direct implementation translation.

## Open Questions

Exact storage file formats, snapshot cadence, and internal module boundaries should be finalized when this change is applied.

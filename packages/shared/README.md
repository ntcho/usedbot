# Shared Workspace

This workspace contains the shared TypeScript contract and helper layer used by the CLI, core, and scraper client.

## Owns

- search, enrich, health, and capabilities DTOs
- core state and notification setting shapes
- marketplace, sale-status, and notification enums
- parsing and normalization helpers shared across TypeScript workspaces

## Does Not Own

- filesystem I/O
- HTTP transport
- upstream scraper behavior

## Related Docs

- System boundaries: `docs/ARCHITECTURE.md`
- Core engine responsibilities: `packages/core/README.md`
- Sidecar client responsibilities: `packages/scraper-client/README.md`

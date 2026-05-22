# Scraper Client Workspace

This workspace contains the typed TypeScript client that talks to the local scraper sidecar.

## Owns

- the default local sidecar base URL
- typed client methods for `health`, `capabilities`, `search`, and `enrich`
- transport errors for unreachable sidecars
- contract mismatch errors when sidecar responses stop matching the shared DTOs

## Does Not Own

- starting or supervising the sidecar process
- scrape orchestration or persistence
- upstream scraper imports

## Related Docs

- System boundaries: `docs/ARCHITECTURE.md`
- Sidecar workspace details: `services/scraper-sidecar/README.md`
- Shared DTO definitions: `packages/shared/README.md`

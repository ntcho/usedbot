## Why

The v1 application needs a local Python scraping boundary that can reuse upstream Playwright scraper behavior without importing the upstream desktop application runtime. This sidecar lets TypeScript own product logic while Python owns scraping integration.

## What Changes

- Add a local-only Python scraper sidecar in the service area established by earlier changes.
- Provide a small contract for health, capability discovery, search, and enrichment behavior.
- Map upstream scraper results into stable API DTOs rather than exposing upstream internals directly.
- Return structured scraper failure outcomes suitable for TypeScript handling.
- Reuse browser/scraper lifecycle across requests where practical.
- Defer TypeScript scheduling, persistence, notification policy, and CLI user workflows to later changes.

## Capabilities

### New Capabilities

- `python-scraper-sidecar`: Defines the local Python service boundary for upstream-backed scraping and enrichment.

### Modified Capabilities

- None.

## Impact

- Adds Python service code and tests in the sidecar workspace area.
- Uses the vendored upstream scraper code as the source for scraping behavior.
- Establishes an API contract that later TypeScript scraper-client work can consume.

# Scraper Sidecar Workspace

This workspace contains the local-only Python scraper sidecar for v1.

## Owns

- the local HTTP boundary exposed to TypeScript callers
- marketplace adapter loading for the vendored upstream scrapers
- mapping upstream scraper objects into stable DTOs
- loopback-only process rules for local sidecar startup

## Boundaries

- runtime code stays outside `vendor/used-market-notifier/`
- upstream scraper imports stay inside the local adapter boundary
- the sidecar binds only to loopback interfaces
- scheduling, persistence, notification policy, and CLI workflows stay out of scope here

## HTTP Endpoints

- `GET /health`
- `GET /capabilities`
- `POST /search`
- `POST /enrich`

## Tooling

- install dependencies with `uv sync`
- install Playwright browsers with `uv run playwright install`
- start the sidecar with `uv run scraper-sidecar`
- run tests with `uv run python -m unittest discover -s tests -q`

## Environment

- `SCRAPER_SIDECAR_HOST` defaults to `127.0.0.1` and must remain local
- `SCRAPER_SIDECAR_PORT` defaults to `5111`
- `SCRAPER_SIDECAR_LOG_LEVEL` defaults to `info`

If the CLI doctor command reports missing Playwright browsers or startup failures, rerun `uv sync`, install the browsers, and then retry `pnpm usedbot doctor` from the repository root.

## Related Docs

- Setup and first run: `README.md`
- System boundaries: `docs/ARCHITECTURE.md`
- Daily workflows: `docs/local-toolchain.md`
- Sidecar client details: `packages/scraper-client/README.md`

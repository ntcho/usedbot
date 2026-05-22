# Architecture

## System Overview

usedbot is a local-only pipeline. The CLI owns operator-facing workflows, the TypeScript core owns state and monitor orchestration, the scraper client owns the typed HTTP boundary, and the Python sidecar owns upstream scraper execution.

```text
operator
  -> apps/cli
  -> packages/core
  -> packages/scraper-client
  -> services/scraper-sidecar
  -> vendor/used-market-notifier

packages/shared supports the CLI, core, and scraper client.
data/core stores the repo-local runtime state.
```

## Boundary Map

| Area | Owns | Does Not Own |
| --- | --- | --- |
| `apps/cli/` | command parsing, human-readable output, environment loading, local sidecar startup | scrape implementation, listing identity rules, persistent state writes |
| `packages/core/` | monitor orchestration, repo-local state, dedupe and change detection, notification eligibility, data repair | HTTP transport, sidecar lifecycle, upstream scraper imports |
| `packages/scraper-client/` | typed calls to `/health`, `/capabilities`, `/search`, and `/enrich` | starting the sidecar, retry policy, persistence |
| `packages/shared/` | shared DTOs, state shapes, enums, and parsing helpers | filesystem I/O, network I/O, scraper execution |
| `services/scraper-sidecar/` | local-only HTTP boundary, vendor adapter layer, DTO mapping, loopback-only process rules | scheduling, persistence, CLI workflows, notification policy |
| `data/core/` | visible runtime state files for the core | hidden database behavior or remote state |
| `vendor/used-market-notifier/` | upstream scraper implementation mirror | new product code or undocumented local features |

## Runtime Flow

1. An operator runs a CLI command such as `pnpm usedbot doctor` or `pnpm usedbot monitor run`.
2. The CLI loads the configured data directory and sidecar base URL, then builds the core engine and scraper client.
3. For scraping workflows, `LocalSidecarManager` checks whether the configured sidecar is already reachable. If the URL is local and unreachable, it starts `uv run scraper-sidecar` inside `services/scraper-sidecar/`.
4. The core loads repo-local state from `data/core/`, evaluates configured searches, and calls the scraper client.
5. The scraper client calls the local sidecar HTTP endpoints. The sidecar imports vendored upstream scrapers, runs search or enrich operations, and maps upstream objects into stable DTOs.
6. The core dedupes listings, updates price and sale-status history, records notification eligibility, writes the updated JSON files, and returns a summary for CLI output.

## Local State and Configuration

The default data directory is `data/core/`. The core writes one visible JSON file per concern:

- `meta.json`
- `settings.json`
- `searches.json`
- `listings.json`
- `price-history.json`
- `sale-status-history.json`
- `notification-decisions.json`

If a supported file is missing, the core recreates it on the next successful write. If a supported file is corrupted, `pnpm usedbot doctor` reports the issue and `pnpm usedbot data repair` backs up the broken file to `*.broken-<timestamp>` before rewriting supported state.

The main runtime environment variables are:

- `USEDBOT_SCRAPER_BASE_URL`: overrides the default sidecar URL (`http://127.0.0.1:5111`).
- `USEDBOT_DATA_DIR`: overrides the default repo-local data directory.
- `USEDBOT_SIDECAR_STARTUP_TIMEOUT_MS`: extends the CLI wait for local sidecar startup.
- `SCRAPER_SIDECAR_HOST`: controls the sidecar bind host and must remain local.
- `SCRAPER_SIDECAR_PORT`: controls the sidecar port.
- `SCRAPER_SIDECAR_LOG_LEVEL`: controls the sidecar log level.

## Sidecar Contract

The Python sidecar is a local-only Litestar app. It exposes four stable endpoints:

- `GET /health`: reports service health and whether adapters have started.
- `GET /capabilities`: reports supported marketplaces and adapter availability.
- `POST /search`: runs a marketplace search and returns stable listing DTOs.
- `POST /enrich`: enriches a listing through the marketplace adapter and returns a stable DTO.

The sidecar maps vendored upstream objects into DTOs before returning data to TypeScript callers. That keeps vendor-specific object shapes out of the CLI and core packages.

## Vendor Isolation

`vendor/used-market-notifier/` is a subtree mirror of the upstream scraper project. New usedbot product code and docs stay outside that tree. When an upstream update is needed, use `docs/upstream-sync.md`. When a vendor patch is unavoidable, keep it minimal and document it in `docs/upstream-patches.md`.

## Related Docs

- Root setup and first-run guide: `README.md`
- Daily workflows and debugging: `docs/local-toolchain.md`
- Upstream subtree sync: `docs/upstream-sync.md`
- Vendor patch policy: `docs/upstream-patches.md`

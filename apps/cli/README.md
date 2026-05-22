# CLI Workspace

This workspace contains the command-only usedbot entrypoint.

Run it with `pnpm usedbot <command>` from the repository root.

## Owns

- command parsing and help output
- environment-driven runtime setup
- starting a local sidecar for scraping commands when the configured base URL is local
- human-readable output for config, doctor, monitor, results, and notify workflows

## Current Command Groups

- `config` for search and notification settings
- `data` for local state repair workflows
- `doctor` for toolchain diagnostics
- `monitor` for manual monitoring runs
- `results` for recent stored listings
- `notify` for terminal and webhook test notifications

## Runtime Notes

- `USEDBOT_SCRAPER_BASE_URL` overrides the default sidecar URL.
- `USEDBOT_DATA_DIR` overrides the default repo-local state directory.
- `USEDBOT_SIDECAR_STARTUP_TIMEOUT_MS` extends the local sidecar startup wait.

## Related Docs

- Setup and first run: `README.md`
- System boundaries: `docs/ARCHITECTURE.md`
- Daily workflows: `docs/local-toolchain.md`

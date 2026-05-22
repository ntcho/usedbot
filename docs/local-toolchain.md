# Local Toolchain Workflows

Use `README.md` for clean-machine setup and `docs/ARCHITECTURE.md` for system ownership. This document covers recurring workflows after the repository is already installed.

## Daily CLI Workflow

1. Confirm the local state and sidecar are healthy.

```bash
pnpm usedbot doctor
```

2. Review or add saved searches.

```bash
pnpm usedbot config search list
pnpm usedbot config search add --marketplace danggeun --query "camera"
```

3. Run a monitor cycle.

```bash
pnpm usedbot monitor run
```

4. Review recent stored results.

```bash
pnpm usedbot results list --limit 10
```

## Configuration and Notification Checks

Show the current saved searches and notification settings:

```bash
pnpm usedbot config show
```

Update notification settings:

```bash
pnpm usedbot config notifications set --enabled true --terminal true --webhook false
```

Send test notifications:

```bash
pnpm usedbot notify test terminal --message "usedbot test notification"
pnpm usedbot notify test webhook --url "https://example.test/hook"
```

## Sidecar Debug Workflow

Start with the doctor command whenever scraper availability is unclear.

```bash
pnpm usedbot doctor
```

Run a headed scrape when you need to watch the browser session.

```bash
pnpm usedbot monitor run --headed
```

If you need to run the sidecar manually, start it from its workspace:

```bash
cd services/scraper-sidecar
uv run scraper-sidecar
```

If the sidecar reports missing browser support, reinstall the Playwright browsers:

```bash
cd services/scraper-sidecar
uv run playwright install
```

The CLI only auto-starts sidecars on loopback addresses. If `USEDBOT_SCRAPER_BASE_URL` points at a non-local host, start that sidecar yourself before running monitor commands.

Useful runtime variables:

- `USEDBOT_SCRAPER_BASE_URL`
- `USEDBOT_DATA_DIR`
- `USEDBOT_SIDECAR_STARTUP_TIMEOUT_MS`
- `SCRAPER_SIDECAR_LOG_LEVEL`

## Local Data Recovery Workflow

Repo-local state lives under `data/core/` by default.

Run the doctor command to detect supported state issues:

```bash
pnpm usedbot doctor
```

The current repair workflow handles invalid JSON and wrong top-level JSON shapes in the supported state files.

Repair the data when doctor reports that recovery is needed:

```bash
pnpm usedbot data repair
```

`data repair` moves each broken file to `*.broken-<timestamp>` before rewriting supported state from the remaining valid data.

Run doctor again after repair:

```bash
pnpm usedbot doctor
```

## Vendor Maintenance

Vendor maintenance is a separate workflow from daily usedbot operation.

- Use `docs/upstream-sync.md` for subtree sync commands.
- Use `docs/upstream-patches.md` for the vendor patch policy and patch log.

## Related Docs

- Setup and first run: `README.md`
- System boundaries and runtime flow: `docs/ARCHITECTURE.md`
- Vendor sync: `docs/upstream-sync.md`
- Vendor patch policy: `docs/upstream-patches.md`

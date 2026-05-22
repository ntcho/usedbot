# Local Toolchain Workflows

## Normal Run Workflow

Install the Node and Python dependencies first.

```bash
pnpm install
cd services/scraper-sidecar
uv sync
uv run playwright install
```

Return to the repository root after the Python setup.

```bash
cd ../..
```

Check the local toolchain state.

```bash
pnpm usedbot doctor
```

Add one or more searches.

```bash
pnpm usedbot config search add --marketplace danggeun --query "camera"
pnpm usedbot config search add --marketplace bunjang --query "speaker"
```

Run the configured monitor cycle.

```bash
pnpm usedbot monitor run
```

Inspect the most recent stored results.

```bash
pnpm usedbot results list --limit 10
```

## Sidecar Debug Workflow

Use the doctor command first when scraper startup or availability is unclear.

```bash
pnpm usedbot doctor
```

If the sidecar reports missing Playwright browsers, install them from the sidecar workspace.

```bash
cd services/scraper-sidecar
uv run playwright install
```

Run a headed scrape when you need to see the browser session.

```bash
pnpm usedbot monitor run --headed
```

The CLI only auto-starts sidecars on loopback addresses. If `USEDBOT_SCRAPER_BASE_URL` points at a non-local host, start that sidecar yourself before running monitor commands.

## Local Data Recovery Workflow

Repo-local v1 state lives under `data/core/` by default.

Run the doctor command to detect supported state issues.

```bash
pnpm usedbot doctor
```

The hardening workflow currently repairs these supported file-level issues:

- invalid JSON in a state file
- wrong top-level JSON shape for a state file

Repair the data when doctor reports that recovery is needed.

```bash
pnpm usedbot data repair
```

`data repair` moves each broken file to `*.broken-<timestamp>` before rewriting the supported state files from the remaining valid data.

Run doctor again after repair to confirm the toolchain is healthy.

```bash
pnpm usedbot doctor
```

## Maintenance Notes

- Missing state files are recreated automatically on the next successful write.
- `USEDBOT_DATA_DIR` can point the CLI at a different repo-local data directory.
- `USEDBOT_SIDECAR_STARTUP_TIMEOUT_MS` can extend the local sidecar startup wait during debugging.

## Upstream Sync Boundary

This hardening change does not alter the upstream sync or vendor patch workflow. Continue using `docs/upstream-sync.md` and `docs/upstream-patches.md` for vendor maintenance.

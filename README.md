# usedbot

Local-only v1 workspace for marketplace scraping, repo-local state, and command-line workflows.

## Workspace Overview

- `apps/cli/` contains the command-only operator interface.
- `packages/core/` owns monitor orchestration, repo-local state, and repair workflows.
- `packages/scraper-client/` contains the typed HTTP client for the local scraper sidecar.
- `packages/shared/` contains shared DTOs, state shapes, and parsing helpers.
- `services/scraper-sidecar/` contains the local-only Python sidecar backed by vendored upstream scrapers.
- `vendor/used-market-notifier/` remains an isolated upstream mirror.

## Prerequisites

- Node 24. The workspace currently enforces `"node": "=24"` in `package.json`.
- pnpm 10. The workspace currently declares `pnpm@10.0.0`.
- Python 3.10 or newer for `services/scraper-sidecar/`.
- `uv` for Python dependency and environment management.
- Playwright browser binaries for the sidecar scraping workflows.

If your shell is still on an older Node version, `pnpm` commands will warn about the unsupported engine. Switch to Node 24 before continuing.

## Install

1. Install the TypeScript workspace dependencies from the repository root.

```bash
pnpm install
```

2. Install the Python sidecar environment and Playwright browsers.

```bash
cd services/scraper-sidecar
uv sync
uv run playwright install
cd ../..
```

## First Run

1. Verify the local toolchain and sidecar availability.

```bash
pnpm usedbot doctor
```

2. Add a stored search.

```bash
pnpm usedbot config search add --marketplace danggeun --query "camera"
```

3. Run a monitor cycle.

```bash
pnpm usedbot monitor run
```

4. Review the stored results.

```bash
pnpm usedbot results list --limit 10
```

Use `pnpm usedbot monitor run --headed` when you want to watch the scraper browser session during debugging.

## Verification

```bash
pnpm usedbot --help
pnpm usedbot doctor
pnpm test
pnpm typecheck
```

```bash
cd services/scraper-sidecar
uv run python -m unittest discover -s tests -q
cd ../..
```

## Runtime Notes

- Repo-local state is stored under `data/core/` by default.
- The CLI auto-starts the scraper sidecar only when `USEDBOT_SCRAPER_BASE_URL` points at a loopback address.
- Vendor maintenance stays outside the active runtime flow. Use the vendor runbooks instead of editing `vendor/used-market-notifier/` directly.

## Documentation Map

- `docs/ARCHITECTURE.md`: system boundaries, runtime flow, local state, and vendor isolation.
- `docs/local-toolchain.md`: recurring operator and debugging workflows.
- `docs/upstream-sync.md`: subtree sync workflow for the vendored upstream project.
- `docs/upstream-patches.md`: vendor patch policy and patch log template.
- Workspace README files under `apps/`, `packages/`, and `services/`: area-specific ownership notes.

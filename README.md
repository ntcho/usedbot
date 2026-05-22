# usedbot

Local-only v1 workspace for marketplace scraping, repo-local state, and command-line workflows.

## Quick Start

1. Install the Node workspace dependencies.

```bash
pnpm install
```

2. Install the Python sidecar environment.

```bash
cd services/scraper-sidecar
uv sync
uv run playwright install
```

3. Check the local toolchain before the first monitor run.

```bash
pnpm usedbot doctor
```

## Common Commands

| Command | Description |
| --- | --- |
| `pnpm usedbot doctor` | Validate repo-local data and sidecar availability |
| `pnpm usedbot data repair` | Back up broken local data files and rebuild supported state |
| `pnpm usedbot config search add --marketplace danggeun --query "camera"` | Add a stored search |
| `pnpm usedbot monitor run` | Run the configured searches |
| `pnpm usedbot monitor run --headed` | Run a headed scraper session for debugging |
| `pnpm usedbot results list --limit 10` | Show recent stored listings |
| `pnpm test` | Run the TypeScript test suite |
| `pnpm typecheck` | Run TypeScript type checking |

## Architecture

- `services/scraper-sidecar/` owns the local Python scraper boundary.
- `packages/core/` owns repo-local state, monitor orchestration, and repair workflows.
- `apps/cli/` owns command parsing, operator workflows, and sidecar startup.
- `vendor/used-market-notifier/` stays read-only except for documented upstream patches.

## Operations

Operational runbooks live in `docs/local-toolchain.md`.

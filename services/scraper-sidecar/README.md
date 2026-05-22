# Scraper Sidecar Workspace

This workspace contains the local Python scraper sidecar for v1.

## Boundaries

- Runtime code stays outside `vendor/used-market-notifier/`.
- Upstream scraper imports stay inside the local adapter boundary.
- The sidecar binds only to loopback interfaces.
- Scheduling, persistence, notification policy, and CLI workflows stay out of scope here.

## Tooling

- `uv` is the intended Python environment and dependency tool.
- Install dependencies with `uv sync`.
- Install Playwright browsers with `uv run playwright install`.
- Start the sidecar with `uv run scraper-sidecar`.
- Run tests with `uv run python -m unittest discover -s tests -q`.

If the CLI doctor command reports missing Playwright browsers or startup failures, rerun `uv sync`, install the browsers, and then retry `pnpm usedbot doctor` from the repository root.

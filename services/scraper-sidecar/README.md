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
- Start the sidecar with `uv run scraper-sidecar`.
- Run tests with `uv run python -m unittest discover -s tests -q`.
